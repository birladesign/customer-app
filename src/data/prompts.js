// Proactive prompt cards for Home (PRD PR-01).
//
// The bar for interrupting someone is high: a card earns its place only if
// something has gone wrong, or something is genuinely needed from them.
// "Your order is on track" is not a prompt — it's the absence of one, and
// the order list already says it. Everything here is either a problem the
// customer hasn't noticed yet, or a decision only they can make.
//
// Ordered by how much it costs them to keep ignoring it.

import { ORDERS } from './orders.js';
import { getJourneyContext } from './journeys.js';
import { isMattressProduct } from './remediation.js';
import { getNightsSinceDelivery, TRIAL_NIGHTS } from './retention.js';

const TRIAL_WARNING_WINDOW = 14;
const MAX_PROMPTS = 3;

// severity drives the visual weight, not the wording — the copy stays plain
// either way. LOST/damaged states are never softened into "delayed" (CV-03).
const SEVERITY_RANK = { attention: 0, action: 1, info: 2 };

function buildPrompt(order) {
  const ctx = getJourneyContext(order, null);

  // Something the customer is owed and hasn't got. Highest cost to ignore.
  if (ctx.eddBreached && !ctx.isDelivered && !ctx.isCancelled) {
    return {
      key: `late-${order.id}`,
      type: 'late',
      severity: 'attention',
      title: 'This is running late',
      body: `${order.product} was due ${ctx.eddLabel}. We'll chase the courier — or tell us and we'll open it properly.`,
      ctaLabel: 'Look into it',
      target: { screen: 'support', params: { openChat: true, orderId: order.id, laneKey: 'logistics' } },
      orderId: order.id,
    };
  }

  // A case is waiting on the customer — nothing moves until they act.
  if (/awaiting evidence/i.test(order.caption ?? '')) {
    return {
      key: `evidence-${order.id}`,
      type: 'evidence',
      severity: 'action',
      title: 'We need a photo to continue',
      body: `Your claim on ${order.product} is paused until we can see the damage.`,
      ctaLabel: 'Add a photo',
      target: { screen: 'orderDetails', params: { orderId: order.id } },
      orderId: order.id,
    };
  }

  // A visit needs somebody home — worth a reminder they can act on.
  if (order.installationSlot && !ctx.installationDone) {
    return {
      key: `install-${order.id}`,
      type: 'install',
      severity: 'action',
      title: 'A technician is coming',
      body: `${order.installationSlot.date}, ${order.installationSlot.window} for ${order.product}. Someone needs to be there.`,
      ctaLabel: 'Manage the visit',
      target: { screen: 'support', params: { openChat: true, orderId: order.id, laneKey: 'tech' } },
      orderId: order.id,
    };
  }

  // Money in motion — the single most common reason people contact anyone.
  if (order.refund) {
    const done = order.refund.timeline && order.refund.timeline.currentIndex >= order.refund.timeline.steps.length - 1;
    if (!done) {
      return {
        key: `refund-${order.id}`,
        type: 'refund',
        severity: 'info',
        title: 'Your refund is on its way',
        body: `₹${order.refund.amount.toLocaleString('en-IN')} back to your original payment method, expected ${order.refund.expectedDate}.`,
        ctaLabel: 'Track it',
        target: { screen: 'orderDetails', params: { orderId: order.id } },
        orderId: order.id,
      };
    }
  }

  // Retention-first, honestly applied: it is far better for everyone to
  // hear "this isn't working for me" on night 88 than on night 105, when
  // the only remaining answer is no. Surfaced only while there is still
  // time to do something about it.
  if (ctx.isDelivered && isMattressProduct(order.product)) {
    const nights = getNightsSinceDelivery(order);
    const left = TRIAL_NIGHTS - nights;
    if (left > 0 && left <= TRIAL_WARNING_WINDOW) {
      return {
        key: `trial-${order.id}`,
        type: 'trial',
        severity: 'info',
        title: `${left} nights left on your trial`,
        body: `If ${order.product} isn't right, now is the time to tell us — after night ${TRIAL_NIGHTS} we can't swap it for comfort.`,
        ctaLabel: 'It’s not quite right',
        target: { screen: 'returnReplace', params: { orderId: order.id } },
        orderId: order.id,
      };
    }
  }

  return null;
}

// Three cards all saying "this is running late" is three times the noise
// for one piece of information. Same-kind prompts collapse into a single
// card that names the count, so the space goes to showing a range of what
// needs attention rather than the same thing repeated.
const AGGREGATE_COPY = {
  late: (n, first) => ({
    title: `${n} orders are running late`,
    body: `${first.product} and ${n - 1} other${n > 2 ? 's' : ''} are past their delivery date.`,
    ctaLabel: 'See what’s late',
  }),
  evidence: (n) => ({
    title: `${n} claims need a photo`,
    body: 'They stay paused until we can see what happened.',
    ctaLabel: 'Add photos',
  }),
  install: (n, first) => ({
    title: `${n} technician visits booked`,
    body: `Next up: ${first.installationSlot.date}, ${first.installationSlot.window}.`,
    ctaLabel: 'Manage visits',
  }),
  refund: (n) => ({
    title: `${n} refunds on the way`,
    body: 'Both are heading back to your original payment method.',
    ctaLabel: 'Track them',
  }),
  trial: (n) => ({
    title: `${n} trials ending soon`,
    body: 'If either isn’t right, now is the time to tell us.',
    ctaLabel: 'Review them',
  }),
};

function collapse(prompts) {
  const byType = new Map();
  for (const prompt of prompts) {
    if (!byType.has(prompt.type)) byType.set(prompt.type, []);
    byType.get(prompt.type).push(prompt);
  }

  return [...byType.entries()].map(([type, group]) => {
    if (group.length === 1) return group[0];
    const order = ORDERS.find((o) => o.id === group[0].orderId);
    const copy = AGGREGATE_COPY[type](group.length, order);
    return {
      ...group[0],
      key: `${type}-group`,
      ...copy,
      // An aggregate can't open one order's chat — it opens the list.
      target: { screen: 'orders', params: {} },
    };
  });
}

export function getHomePrompts() {
  return collapse(ORDERS.map(buildPrompt).filter(Boolean))
    .sort((a, b) => SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity])
    .slice(0, MAX_PROMPTS);
}
