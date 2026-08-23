// Intent trees for the Support chat — the CSV use-case sheet
// (TSC_Mobile_App_All_Use_Cases) expressed as navigable journeys rather than
// one free-text box per lane.
//
// Shape mirrors the PRD's three legal endings (§8): every leaf resolves to
// exactly one of
//   - answer   self-resolved, no case (FCR)
//   - case     handover to a lane, with a case reference
//   - redirect hand off to an existing in-app flow
//
// Availability predicates keep impossible options off the screen (DL-01:
// reasons are status-filtered) without hiding real severity (CV-03).

import { getExpectedDelivery, getDeliveredDate, getOrderStatus, getShipmentInfo, parseOrderDate } from './orders.js';

const DAY_MS = 24 * 60 * 60 * 1000;

const DISPATCHED_LABELS = ['Shipped', 'Dispatched', 'Out for Delivery', 'Delivered'];

function reachedStep(entity, labels) {
  const steps = entity?.timeline?.steps;
  if (!steps) return false;
  const idx = steps.findIndex((s) => labels.includes(s.label));
  return idx !== -1 && idx <= entity.timeline.currentIndex;
}

function daysBetween(fromDate, toDate) {
  if (!fromDate || !toDate) return null;
  return Math.floor((toDate - fromDate) / DAY_MS);
}

// Everything an intent's predicate or copy might need, derived once so the
// tree itself stays declarative.
export function getJourneyContext(order, item) {
  const entity = item ?? order;
  const now = new Date();
  const statusLabel = item ? item.status?.label : order ? getOrderStatus(order).label : null;
  const deliveredDate = order ? getDeliveredDate(entity) : null;
  const eddRaw = order ? getExpectedDelivery(entity) : null;
  const edd = eddRaw ? parseOrderDate(eddRaw) : null;
  const orderedOn = order ? parseOrderDate(order.date) : null;

  return {
    order,
    item,
    statusLabel,
    // Derived from the timeline, not the status label: an order that's been
    // delivered and moved on ("Installation Scheduled", "Damaged —
    // Reported", "Exchange Completed") is still delivered, and every
    // post-delivery intent depends on knowing that.
    isDelivered: order ? reachedStep(entity, ['Delivered']) : false,
    isDispatched: order ? reachedStep(entity, DISPATCHED_LABELS) : false,
    isPreDispatch: order ? !reachedStep(entity, DISPATCHED_LABELS) : false,
    isCancelled: order?.section === 'closed',
    edd,
    eddLabel: eddRaw,
    beforeEdd: edd ? now < edd : false,
    eddBreached: edd ? now > edd : false,
    deliveredDate: deliveredDate ? parseOrderDate(deliveredDate) : null,
    deliveredLabel: deliveredDate,
    daysSinceDelivery: deliveredDate ? daysBetween(parseOrderDate(deliveredDate), now) : null,
    daysSinceOrder: orderedOn ? daysBetween(orderedOn, now) : null,
    hasRefund: Boolean(order?.refund),
    hasInstallation: Boolean(order?.installationSlot),
    installationDone: order ? reachedStep(entity, ['Installation Completed']) : false,
    shipment: order ? getShipmentInfo(order.id) : null,
  };
}

// ── Resolution helpers ──────────────────────────────────────────────

const answer = (title, body, opts = {}) => ({ kind: 'answer', title, body, ...opts });
const caseOf = (prefix, opts = {}) => ({
  kind: 'case',
  prefix,
  needsDescription: true,
  ...opts,
});
const redirect = (screen, params = {}) => ({ kind: 'redirect', screen, params });

// ── DELIVERY / LOGISTICS ────────────────────────────────────────────

const DELIVERY_INTENTS = [
  {
    key: 'where-is-it',
    label: 'Where is my order?',
    when: (c) => !c.isDelivered && !c.isCancelled,
    // Before the promised date this is a question, not a complaint — answer
    // it and close (DL-03). After it, it becomes a real delay case.
    resolve: (c) =>
      c.beforeEdd
        ? answer(
            'On track',
            `${c.order.product} is ${c.statusLabel.toLowerCase()}${
              c.shipment ? ` with ${c.shipment.courier} (AWB ${c.shipment.awb})` : ''
            }. It's expected by ${c.eddLabel}. Nothing's gone wrong — we'll notify you at every step.`,
            { stillNeedHelp: true }
          )
        : caseOf('CMP', {
            lane: 'logistics',
            title: 'Delivery delayed',
            sla: "We'll chase the courier and update you within 24 hours",
            prefill: c.eddLabel
              ? `My order is past its expected delivery date of ${c.eddLabel} and still shows "${c.statusLabel}".`
              : `My order still shows "${c.statusLabel}" and I don't have a delivery date for it.`,
          }),
  },
  {
    key: 'not-received',
    label: "It says delivered, but I don't have it",
    // Only offerable once something actually claims to be delivered (DL-01).
    when: (c) => c.isDelivered,
    resolve: (c) =>
      caseOf('CMP', {
        lane: 'logistics',
        severity: 'high',
        title: 'Delivery not received (marked delivered)',
        sla: 'Investigation opens now — verdict within 24–48 hours',
        investigation: true,
        prefill: `This was marked delivered on ${c.deliveredLabel}, but I never received it.`,
      }),
  },
  {
    key: 'no-movement',
    label: 'Tracking hasn’t moved in days',
    when: (c) => c.isDispatched && !c.isDelivered,
    resolve: () =>
      caseOf('CMP', {
        lane: 'logistics',
        title: 'No movement in tracking',
        sla: "We'll raise it with the courier within 24 hours",
        prefill: 'The tracking status has not updated for several days.',
      }),
  },
  {
    key: 'damaged-in-transit',
    label: 'It arrived damaged',
    when: (c) => c.isDelivered,
    // Damage after delivery is a remediation decision (M/N/A rules), not a
    // logistics complaint — hand off to the flow that can actually price it.
    resolve: (c) => redirect('returnReplace', { orderId: c.order.id, sku: c.item?.sku }),
  },
  {
    key: 'missing-items',
    label: 'Part of my order is missing',
    when: (c) => c.isDelivered,
    resolve: () =>
      caseOf('CMP', {
        lane: 'logistics',
        title: 'Items missing from delivery',
        sla: "We'll reconcile the manifest and update you within 24–48 hours",
        needsPhoto: true,
        prefill: 'Some items from this order were missing when it arrived.',
      }),
  },
  {
    key: 'double-delivery',
    label: 'I received more than I ordered',
    when: (c) => c.isDelivered,
    resolve: () =>
      caseOf('CMP', {
        lane: 'logistics',
        title: 'Double delivery — pickup needed',
        sla: "We'll arrange a pickup within 48 hours",
        prefill: 'I received more units than I ordered and need the extra collected.',
      }),
  },
  {
    key: 'courier-behaviour',
    label: 'A problem with the delivery agent',
    when: (c) => c.isDispatched,
    children: [
      {
        key: 'rude',
        label: 'They were rude or unprofessional',
        resolve: () =>
          caseOf('CMP', {
            lane: 'logistics',
            title: 'Courier conduct complaint',
            sla: "We'll review this with the courier partner within 48 hours",
            prefill: 'The delivery agent was rude or unprofessional.',
          }),
      },
      {
        key: 'refused',
        label: 'They refused to deliver',
        resolve: () =>
          caseOf('CMP', {
            lane: 'logistics',
            title: 'Delivery refused by courier',
            sla: "We'll re-attempt and update you within 24 hours",
            prefill: 'The delivery agent refused to complete the delivery.',
          }),
      },
    ],
  },
  {
    key: 'reschedule',
    label: 'I need it on a different day',
    when: (c) => !c.isDelivered && !c.isCancelled,
    resolve: () =>
      caseOf('CMP', {
        lane: 'logistics',
        title: 'Reschedule delivery',
        sla: "We'll confirm the new slot within 24 hours",
        prefill: 'I would like to reschedule this delivery.',
      }),
  },
  {
    key: 'expedite',
    label: 'Can it come sooner?',
    when: (c) => !c.isDelivered && !c.isCancelled,
    resolve: (c) =>
      caseOf('CMP', {
        lane: 'logistics',
        title: 'Expedite request',
        sla: "We'll check what's possible and confirm within 24 hours",
        prefill: `I'd like this delivered sooner than ${c.eddLabel ?? 'the current estimate'} if possible.`,
      }),
  },
  {
    key: 'split-order',
    // Phrased to work either side of delivery — the same question gets asked
    // when the parcels are still in transit and after they land.
    label: 'Why is my order in several parcels?',
    when: (c) => Boolean(c.order?.shipmentId),
    resolve: (c) =>
      answer(
        'Your order ships in more than one parcel',
        `Larger orders are split so each item leaves the warehouse closest to you as soon as it's ready — you get the earlier items sooner instead of waiting for the slowest one. Each parcel tracks separately under shipment ${c.order.shipmentId}.`,
        { stillNeedHelp: true }
      ),
  },
  {
    key: 'pickup-delayed',
    label: 'My return pickup hasn’t happened',
    when: (c) => c.isDelivered,
    resolve: () =>
      caseOf('CMP', {
        lane: 'logistics',
        title: 'Reverse pickup delayed',
        sla: 'Pickup TAT is 3 days metro / 6 days elsewhere — we’ll chase it now',
        prefill: 'The scheduled reverse pickup has not happened yet.',
      }),
  },
];

// ── INSTALLATION / TECHNICIAN ───────────────────────────────────────

const TECH_INTENTS = [
  {
    key: 'book-install',
    label: 'I need installation booked',
    when: (c) => c.isDelivered && !c.hasInstallation,
    resolve: (c) => redirect('installationSchedule', { orderId: c.order.id }),
  },
  {
    key: 'when-is-visit',
    label: 'When is my technician coming?',
    when: (c) => c.hasInstallation && !c.installationDone,
    resolve: (c) =>
      answer(
        'Your visit is scheduled',
        `${c.order.technician?.name ?? 'A technician'} is booked for ${c.order.installationSlot.date}, ${
          c.order.installationSlot.window
        }. You'll get a call before they arrive.`,
        { stillNeedHelp: true }
      ),
  },
  {
    key: 'reschedule-visit',
    label: 'I need to change the visit slot',
    when: (c) => c.hasInstallation && !c.installationDone,
    resolve: (c) => redirect('installationSchedule', { orderId: c.order.id, reschedule: true }),
  },
  {
    key: 'visit-overdue',
    label: 'The visit was missed or is overdue',
    when: (c) => c.hasInstallation,
    resolve: () =>
      caseOf('CMP', {
        lane: 'tech',
        severity: 'high',
        title: 'Technician visit overdue',
        sla: 'Escalated to the tech team — new slot within 24 hours',
        prefill: 'My scheduled technician visit did not happen.',
      }),
  },
  {
    key: 'technician-problem',
    label: 'A problem with the technician',
    when: (c) => c.hasInstallation,
    children: [
      {
        key: 'unreachable',
        label: 'They aren’t responding',
        resolve: () =>
          caseOf('CMP', {
            lane: 'tech',
            title: 'Technician not responding',
            sla: "We'll reassign within 24 hours",
            prefill: 'I cannot reach the assigned technician.',
          }),
      },
      {
        key: 'refused',
        label: 'They refused to visit',
        resolve: () =>
          caseOf('CMP', {
            lane: 'tech',
            title: 'Technician refused visit',
            sla: "We'll reassign within 24 hours",
            prefill: 'The assigned technician refused to come.',
          }),
      },
    ],
  },
  {
    key: 'dismantle',
    label: 'I need something dismantled or moved',
    when: (c) => c.isDelivered,
    resolve: () =>
      caseOf('CMP', {
        lane: 'tech',
        title: 'Dismantle / relocation request',
        sla: 'Chargeable service — we’ll confirm the fee and slot within 24 hours',
        prefill: 'I need a technician to dismantle or relocate this item.',
      }),
  },
  {
    key: 'diy',
    label: 'Can I set it up myself?',
    when: (c) => c.isDelivered,
    resolve: () =>
      answer(
        'Most items are self-assembly',
        'Mattresses need no installation — unroll, let them expand for a few hours, and they’re ready. Frames and chairs ship with an illustrated guide in the box. If you’d rather we did it, book a technician instead and we’ll send someone.',
        { stillNeedHelp: true }
      ),
  },
];

// ── PAYMENTS / REFUNDS ──────────────────────────────────────────────

const REFUND_INTENTS = [
  {
    key: 'where-is-refund',
    label: 'Where is my refund?',
    when: (c) => c.hasRefund,
    resolve: (c) => {
      const { timeline, amount, expectedDate } = c.order.refund;
      const done = timeline && timeline.currentIndex >= timeline.steps.length - 1;
      return done
        ? answer(
            'Refund completed',
            `₹${amount.toLocaleString('en-IN')} was credited back to your original payment method on ${expectedDate}. If your bank hasn't shown it yet, it can take another 1–2 business days to appear.`,
            { stillNeedHelp: true }
          )
        : answer(
            'Refund on the way',
            `₹${amount.toLocaleString('en-IN')} is being returned to your original payment method, expected by ${expectedDate}. Refunds start once the item is picked up and clear in 3–5 business days.`,
            { stillNeedHelp: true }
          );
    },
  },
  {
    key: 'refund-not-received',
    label: 'My refund is late',
    when: (c) => c.hasRefund,
    resolve: () =>
      caseOf('CMP', {
        lane: 'refunds',
        severity: 'high',
        title: 'Refund not received',
        sla: 'Escalated to the refunds team — response within 24 hours',
        prefill: 'My refund has not arrived within the promised window.',
      }),
  },
  {
    key: 'payment-failed',
    label: 'Payment failed but I was charged',
    resolve: () =>
      caseOf('CMP', {
        lane: 'refunds',
        title: 'Payment failure — charged without an order',
        sla: 'Reconciled with the gateway within 24–48 hours',
        prefill: 'My payment failed but the amount was deducted from my account.',
      }),
  },
  {
    key: 'price-match',
    label: 'I found it cheaper elsewhere',
    resolve: () =>
      caseOf('CMP', {
        lane: 'refunds',
        title: 'Price-match request',
        sla: "We'll verify the price and respond within 24 hours",
        needsPhoto: true,
        prefill: 'I found this product at a lower price and would like a price match.',
      }),
  },
  {
    key: 'invoice',
    label: 'I need an invoice',
    children: [
      {
        key: 'normal',
        label: 'A regular invoice',
        resolve: (c) =>
          c.order
            ? answer(
                'Your invoice is ready',
                'Open this order and tap Download Invoice under Bill Summary — it includes the full price breakup and GST already paid.',
                { stillNeedHelp: true }
              )
            : answer('Find any invoice', 'Open My Orders, pick the order, and tap Download Invoice under Bill Summary.', {
                stillNeedHelp: true,
              }),
      },
      {
        key: 'gst',
        label: 'A GST invoice for my business',
        resolve: () =>
          caseOf('CMP', {
            lane: 'refunds',
            title: 'GST invoice request',
            sla: 'Issued within 24–48 hours once details are confirmed',
            prefill: 'I need a GST invoice raised against my business details for this order.',
          }),
      },
      {
        key: 'gst-update',
        label: 'Correct the GST details on my invoice',
        resolve: () =>
          caseOf('CMP', {
            lane: 'refunds',
            title: 'GST invoice correction',
            sla: 'Re-issued within 24–48 hours',
            prefill: 'The GST details on my invoice need to be corrected.',
          }),
      },
    ],
  },
];

// ── ORDER CHANGES (edit / hold / cancel) ────────────────────────────
// Retention-first (CV-01): Cancel is never a first-class option — it sits
// behind "I don't want this any more", after the cheaper levers.

const ORDER_CHANGE_INTENTS = [
  {
    key: 'change-address',
    label: 'Change the delivery address',
    when: (c) => !c.isDelivered && !c.isCancelled,
    resolve: (c) =>
      c.isPreDispatch
        ? redirect('editOrder', { orderId: c.order.id })
        : caseOf('CMP', {
            lane: 'logistics',
            title: 'Address change after dispatch',
            sla: "We'll try to redirect the parcel and confirm within 24 hours",
            prefill: 'I need to change the delivery address for this order.',
          }),
  },
  {
    key: 'change-product',
    label: 'Change the size, model or quantity',
    when: (c) => !c.isDelivered && !c.isCancelled,
    resolve: (c) =>
      c.isPreDispatch
        ? redirect('editOrder', { orderId: c.order.id })
        : answer(
            'It’s already on its way',
            'Once a parcel is with the courier we can’t change what’s inside it. The cleanest route is to let it arrive and then swap it — you’ll get the replacement without paying twice.',
            {
              stillNeedHelp: true,
              chips: [{ key: 'rr', label: 'Plan the swap', redirect: 'returnReplace' }],
            }
          ),
  },
  {
    key: 'hold',
    label: 'Pause it — I’m not ready to receive it',
    when: (c) => !c.isDelivered && !c.isCancelled,
    resolve: () =>
      caseOf('CMP', {
        lane: 'logistics',
        title: 'Hold delivery',
        sla: "We'll pause dispatch and hold it for you — confirmed within 24 hours",
        prefill: 'Please hold this order — I am not ready to receive it yet.',
      }),
  },
  {
    key: 'unhold',
    label: 'Resume a paused order',
    when: (c) => !c.isDelivered && !c.isCancelled,
    resolve: () =>
      caseOf('CMP', {
        lane: 'logistics',
        title: 'Resume held order',
        sla: "We'll release it for dispatch within 24 hours",
        prefill: 'Please resume my held order and send it out.',
      }),
  },
  {
    key: 'dont-want',
    label: 'I don’t want this any more',
    when: (c) => !c.isCancelled,
    // The deflection ladder itself lives in the cancel flow — this only
    // routes into it, so Cancel is never reached without passing through
    // the retention step (CX-09).
    resolve: (c) =>
      c.isDelivered
        ? redirect('returnReplace', { orderId: c.order.id, sku: c.item?.sku })
        : redirect('orderDetails', { orderId: c.order.id, openCancel: true }),
  },
];

// ── PRODUCT & WARRANTY INFORMATION ──────────────────────────────────

const INFO_INTENTS = [
  {
    key: 'warranty-cover',
    label: 'What does my warranty cover?',
    resolve: () =>
      answer(
        'Warranty at a glance',
        'Mattresses carry a 10-year warranty against manufacturing defects such as sagging beyond 1 inch. Frames and chairs carry 1–3 years on mechanisms and structure. Normal wear, stains and damage from misuse aren’t covered. Your warranty starts on the delivery date — no registration needed, we do it automatically.',
        { stillNeedHelp: true }
      ),
  },
  {
    key: 'warranty-claim',
    label: 'I want to claim under warranty',
    when: (c) => c.isDelivered,
    resolve: () =>
      caseOf('WTY', {
        lane: 'tech',
        title: 'Warranty claim',
        sla: 'An inspection will be booked within 48 hours',
        needsPhoto: true,
        prefill: 'I would like to raise a warranty claim for a defect with this product.',
      }),
  },
  {
    key: 'trial',
    label: 'How does the 100-night trial work?',
    resolve: () =>
      answer(
        'The 100-night trial',
        'Sleep on your mattress for at least 3–4 weeks — your body needs that long to adjust to a new support level, and most discomfort settles in that window. If it still isn’t right, you can swap or return it any time within 100 nights of delivery. Trial applies to mattresses only.',
        { stillNeedHelp: true }
      ),
  },
  {
    key: 'care',
    label: 'How do I care for my product?',
    resolve: () =>
      answer(
        'Keeping it in good shape',
        'Rotate your mattress head-to-toe every 3 months for the first year — never flip it, the support layer is built to face up. Use a breathable protector rather than a plastic sheet. Spot-clean with mild soap and cold water; never dry-clean or steam. For chairs and frames, re-tighten bolts once every 6 months.',
        { stillNeedHelp: true }
      ),
  },
  {
    key: 'size',
    label: 'Confirm the size I ordered',
    when: (c) => Boolean(c.order),
    resolve: (c) =>
      answer(
        'What’s on your order',
        `Your order is for ${c.order.product}. Indian standard sizes: Single 36x75in, Double 48x75in, Queen 60x78in, King 72x78in. If what arrived doesn’t match this, tell us — a wrong size sent by us is always fixed free.`,
        { stillNeedHelp: true }
      ),
  },
];

// ── Lane definitions ────────────────────────────────────────────────

export const JOURNEY_LANES = [
  {
    key: 'logistics',
    label: 'Delivery',
    blurb: 'Tracking, delays, or something wrong with the parcel',
    intents: DELIVERY_INTENTS,
    requiresOrder: true,
  },
  {
    key: 'returns',
    label: 'Something’s wrong with the product',
    blurb: 'Damaged, faulty, wrong item, or not right for you',
    // The remediation engine owns every product-fault decision.
    intents: [],
    requiresOrder: true,
    redirectsTo: 'returnReplace',
  },
  {
    key: 'tech',
    label: 'Installation & Service',
    blurb: 'Setup, technician visits, repairs',
    intents: TECH_INTENTS,
    requiresOrder: true,
  },
  {
    key: 'orderChange',
    label: 'Change my order',
    blurb: 'Address, size, hold, or cancel',
    intents: ORDER_CHANGE_INTENTS,
    requiresOrder: true,
  },
  {
    key: 'refunds',
    label: 'Payments & Refunds',
    blurb: 'Refund status, invoices, billing',
    intents: REFUND_INTENTS,
    requiresOrder: true,
  },
  {
    key: 'general',
    label: 'Product & warranty info',
    blurb: 'Care, warranty, trial, sizing',
    intents: INFO_INTENTS,
    requiresOrder: false,
  },
];

export function getLane(laneKey) {
  return JOURNEY_LANES.find((l) => l.key === laneKey) ?? null;
}

// Filters a lane's intents down to the ones that make sense for this order's
// actual state — an option that can't apply is never rendered (DL-01), which
// is different from hiding a real problem (CV-03).
export function getIntentsFor(laneKey, ctx) {
  const lane = getLane(laneKey);
  if (!lane) return [];
  return lane.intents.filter((intent) => !intent.when || intent.when(ctx));
}

export function getChildIntents(intent, ctx) {
  if (!intent.children) return [];
  return intent.children.filter((child) => !child.when || child.when(ctx));
}

// A leaf's terminal. Children are navigated to first, so only call this on a
// node with no remaining children.
export function resolveIntent(intent, ctx) {
  return typeof intent.resolve === 'function' ? intent.resolve(ctx) : null;
}
