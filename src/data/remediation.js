// Mocked stand-in for the PRD's C3 (verdict) contract and §7.2 retention
// ladder (replace/sendPart before return, cheapest-first). This is a UI
// prototype shortcut — a few branches keyed on the selected reason, not the
// real M/N/A rule tables in §7.7-7.9. Every lever list is deliberately ordered
// cheapest-outcome-first, and "Return for Refund" is always last, matching the
// PRD's "Cancel and Return are never first-class, always last resort" rule.
import { parseOrderDate } from './orders.js';

// A mattress carries its own reasons (trial-window discomfort, the retention
// ladder) that a non-mattress item doesn't, and vice versa (installer-visit
// damage assessment) — PRD §7.7 vs §7.8. Products are plain names in this
// prototype (no explicit category field), so the same substring check the
// rest of the catalogue already reads by (product name) is enough here too.
export function isMattressProduct(productName) {
  return /mattress/i.test(productName);
}

const MATTRESS_REASONS = ['Mattress Damage', 'Packaging Damage', 'Defective / Not working', 'Wrong size or model', 'Missing parts', 'Discomfort / Not as expected'];
const NON_MATTRESS_REASONS = ['Damaged', 'Defective / Not working', 'Wrong size or model', 'Missing parts'];

export function getReturnReasons(order) {
  return isMattressProduct(order.product) ? MATTRESS_REASONS : NON_MATTRESS_REASONS;
}

// Anchor for both the 100-night mattress trial window and the 10-day
// non-mattress reporting window — PRD §7.7 (M5) / §7.8 (N1-N2).
const MATTRESS_TRIAL_DAYS = 100;
const NON_MATTRESS_REPORT_DAYS = 10;
// PRD §7.11's own number for how long to actually try a mattress before
// deciding it's uncomfortable.
const POSTURE_CORRECTION_WEEKS = 4;

export function getDaysSinceOrder(order) {
  const ms = Date.now() - parseOrderDate(order.date).getTime();
  return Math.floor(ms / (1000 * 60 * 60 * 24));
}

const LEVER_LABELS = {
  sendPart: 'Send Missing Part',
  replace: 'Replace Item',
  return: 'Return for Refund',
  postureCorrection: 'Continue with Posture Correction Window',
  installerVisit: 'Schedule Installer Visit',
  videoConsult: 'Video Consulting',
};

// Damage/packaging-damage on a mattress is squarely on TSC (M1, §7.7) — no
// manager approval sits in front of it (Inv row), so both levers clear
// automatically instead of "Return for Refund" waiting on review like every
// other reason's does.
const AUTO_APPROVE_REASONS = new Set(['Mattress Damage', 'Packaging Damage']);

// A non-mattress item damaged before install, reported inside the window,
// needs a technician to actually look at it before any remedy is offered
// (N1/N2, §7.8) — Video Consulting is the self-serve alternative to waiting
// for that visit.
const DAMAGE_ASSESSMENT_LEVERS = [
  { id: 'installerVisit', label: LEVER_LABELS.installerVisit, chargeLabel: 'No charge', description: `A technician will visit within ${NON_MATTRESS_REPORT_DAYS} days to assess the damage before we proceed.`, needsApproval: false },
  { id: 'videoConsult', label: LEVER_LABELS.videoConsult, chargeLabel: 'No charge', description: "Skip the wait for a visit — show us the damage over a quick video call instead.", needsApproval: false },
];

export function getRemediationOptions(order, reason) {
  const base = { orderId: order.id, reason };

  if (AUTO_APPROVE_REASONS.has(reason)) {
    return [
      { id: 'replace', label: LEVER_LABELS.replace, chargeLabel: 'No charge · Auto-approved', description: 'We collect the damaged unit and ship a new one in the same visit.', needsApproval: false, ...base },
      { id: 'return', label: LEVER_LABELS.return, chargeLabel: 'Refund to original payment · Auto-approved', description: 'Return the item for a full refund.', needsApproval: false, ...base },
    ];
  }

  switch (reason) {
    case 'Missing parts':
      return [
        { id: 'sendPart', label: LEVER_LABELS.sendPart, chargeLabel: 'No charge', description: 'We ship the missing part directly — no need to send anything back.', needsApproval: false, ...base },
      ];
    case 'Damaged':
      // Non-mattress damage, reported within the window, goes to assessment
      // first — replace/return only unlock once a visit or video call has
      // actually confirmed the damage (N1/N2).
      if (!isMattressProduct(order.product) && getDaysSinceOrder(order) <= NON_MATTRESS_REPORT_DAYS) {
        return DAMAGE_ASSESSMENT_LEVERS.map((lever) => ({ ...lever, ...base }));
      }
      return [
        { id: 'replace', label: LEVER_LABELS.replace, chargeLabel: 'No charge', description: 'We collect the damaged unit and ship a new one in the same visit.', needsApproval: false, ...base },
        { id: 'return', label: LEVER_LABELS.return, chargeLabel: 'Refund to original payment', description: 'Return the item for a full refund.', needsApproval: true, ...base },
      ];
    case 'Defective / Not working':
      return [
        { id: 'replace', label: LEVER_LABELS.replace, chargeLabel: 'No charge', description: 'We collect the damaged unit and ship a new one in the same visit.', needsApproval: false, ...base },
        { id: 'return', label: LEVER_LABELS.return, chargeLabel: 'Refund to original payment', description: 'Return the item for a full refund.', needsApproval: true, ...base },
      ];
    case 'Wrong size or model':
      return [
        { id: 'replace', label: LEVER_LABELS.replace, chargeLabel: 'No charge', description: "We'll swap it for the right size or model.", needsApproval: false, ...base },
        { id: 'return', label: LEVER_LABELS.return, chargeLabel: 'Refund to original payment', description: 'Return the item for a full refund.', needsApproval: true, ...base },
      ];
    case 'Discomfort / Not as expected': {
      // Only a mattress carries a trial window at all — the retention ladder
      // (§7.11) starts with posture-correction education, not an immediate
      // replace/return offer, and closes entirely once the 100-night window
      // has passed.
      const days = getDaysSinceOrder(order);
      if (days > MATTRESS_TRIAL_DAYS) return [];
      return [
        {
          id: 'postureCorrection',
          label: LEVER_LABELS.postureCorrection,
          chargeLabel: 'Free guidance',
          description: `A new mattress often feels different for the first few weeks — we recommend using it for at least ${POSTURE_CORRECTION_WEEKS} weeks before deciding. Continue with our posture-correction guidance first.`,
          needsApproval: false,
          ...base,
        },
        { id: 'replace', label: LEVER_LABELS.replace, chargeLabel: 'No charge', description: 'Try a different variant of this product instead.', needsApproval: false, ...base },
        { id: 'return', label: LEVER_LABELS.return, chargeLabel: 'Refund to original payment', description: 'Return the item for a full refund.', needsApproval: true, ...base },
      ];
    }
    default:
      return [
        { id: 'replace', label: LEVER_LABELS.replace, chargeLabel: 'No charge', description: 'Try a different variant of this product instead.', needsApproval: false, ...base },
        { id: 'return', label: LEVER_LABELS.return, chargeLabel: 'Refund to original payment', description: 'Return the item for a full refund.', needsApproval: true, ...base },
      ];
  }
}

// getRemediationOptions returns [] exactly when there's nothing left to
// offer (mattress discomfort past its 100-night trial window) — this is the
// inform-only copy OptionsStep shows instead of an empty list (N7-style
// "honesty screen", §7.8).
export function getDenialNotice(order, reason) {
  if (reason === 'Discomfort / Not as expected' && getDaysSinceOrder(order) > MATTRESS_TRIAL_DAYS) {
    return {
      title: 'Your 100-night trial window is over',
      body: "We're unable to offer a replacement or return for comfort preference beyond the 100-night trial window. We're happy to help with any other issue with this order.",
    };
  }
  return null;
}

export function getExecutionSteps(leverId) {
  switch (leverId) {
    case 'sendPart':
      return { steps: [{ label: 'Part Dispatched' }, { label: 'Out for Delivery' }, { label: 'Delivered' }], currentIndex: 0 };
    case 'replace':
      return { steps: [{ label: 'Replacement Confirmed' }, { label: 'Pickup Scheduled' }, { label: 'New Item Dispatched' }, { label: 'Delivered' }], currentIndex: 0 };
    case 'installerVisit':
      return { steps: [{ label: 'Visit Scheduled' }, { label: 'Technician Assigned' }, { label: 'Damage Assessed' }], currentIndex: 0 };
    case 'videoConsult':
      return { steps: [{ label: 'Call Requested' }, { label: 'Agent Assigned' }, { label: 'Damage Assessed' }], currentIndex: 0 };
    case 'postureCorrection':
      return { steps: [{ label: 'Guidance Sent' }], currentIndex: 0 };
    case 'return':
    default:
      return { steps: [{ label: 'Pickup Scheduled' }, { label: 'Picked Up' }, { label: 'Quality Check' }, { label: 'Refund Initiated' }], currentIndex: 0 };
  }
}

// What to apply to the order (or, for a multi-SKU order, the one line item)
// once its journey has actually been booked — ExecutionStep's "Back to Order
// Details" tap. The execution tracker's own first step doubles as the new
// status/tracker label, so there's one source of truth per lever rather than
// a second parallel status table. Mirrors the exact override phrasing already
// used by the hand-authored in-progress demo orders (TSC85611, TSC83940).
const POST_BOOKING_COPY = {
  sendPart: {
    description: 'Missing part requested — track its delivery below.',
    actions: [{ label: 'Track Order', variant: 'secondary' }],
    overrideReason: 'A missing-part request is already in progress for this order',
  },
  replace: {
    description: 'Replacement requested — track its progress below.',
    actions: [{ label: 'Track Replacement', variant: 'secondary' }],
    overrideReason: 'A replacement is already in progress for this order',
  },
  return: {
    description: 'Return requested — track pickup and refund status below.',
    actions: [{ label: 'Track Return', variant: 'secondary' }, { label: 'Manage Return', variant: 'secondary' }],
    overrideReason: 'A return is already in progress for this order',
  },
  installerVisit: {
    description: 'Installer visit requested — track the assessment below.',
    actions: [{ label: 'Track Visit', variant: 'secondary' }],
    overrideReason: 'An installer visit is already scheduled to assess this order',
  },
  videoConsult: {
    description: 'Video consultation requested — track the assessment below.',
    actions: [{ label: 'Track Request', variant: 'secondary' }],
    overrideReason: 'A video consultation is already scheduled for this order',
  },
  postureCorrection: {
    description: "Posture-correction guidance sent — we'll check back in with you before the trial window closes.",
    actions: [{ label: 'Report an Issue', variant: 'secondary' }],
    overrideReason: 'Posture-correction guidance is already in progress for this order',
  },
};

// A needsApproval lever (currently only Return for Refund) hasn't actually
// started moving yet at this point — a human reviews it next, so jumping
// straight to the execution tracker's first step (e.g. "Pickup Scheduled")
// would claim progress that hasn't happened. This is its own terminal state
// instead, matching ApprovalPendingStep's own "Request Sent" copy.
const APPROVAL_PENDING_UPDATE = {
  label: 'Return Request Created',
  trackerSteps: ['Request Created', 'Under Review', 'Approved'],
  description: "We've sent your request for review — we'll notify you once it's approved.",
  actions: [{ label: 'Track Return', variant: 'secondary' }],
  overrideReason: 'A return request is already awaiting approval for this order',
};

export function getPostBookingUpdate(leverId, needsApproval) {
  if (needsApproval) return APPROVAL_PENDING_UPDATE;
  const stepLabels = getExecutionSteps(leverId).steps.map((s) => s.label);
  const label = leverId === 'return' ? `Return ${stepLabels[0]}` : stepLabels[0];
  return { label, trackerSteps: stepLabels, ...POST_BOOKING_COPY[leverId] };
}
