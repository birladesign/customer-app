// PR-01 — the proactive prompts Home surfaces without being asked.
//
// The bar for interrupting somebody is high, so this is deliberately not a
// digest of everything in flight. A card earns its place only if something
// has gone wrong, or a decision is needed that only the customer can make.
// "Your order is on track" is not a prompt — the order list below already
// says that, and a Home full of reassurance trains people to ignore it.
//
// Ordered by what it costs the customer to keep ignoring the card.

import { ORDERS, getExpectedDelivery, getDeliveredDate } from './orders.js';
import { getPhase, PHASES, isDelivered, isTerminal } from './phases.js';
import { isMattressProduct } from './mattressRules.js';
import { daysSince } from './clock.js';

// phases.js cuts D11_100 at the same 100-day boundary; the nudge fires while
// there is still room to act on the answer, not on the last night.
const TRIAL_NIGHTS = 100;
const TRIAL_WARNING_DAYS = 14;
const MAX_PROMPTS = 3;

const SEVERITY_RANK = { attention: 0, action: 1, info: 2 };

// Severity drives visual weight only — never the wording. A lost or damaged
// parcel is still described as lost or damaged (§CV-03: severity is never
// softened into "delayed").
function buildPrompt(order) {
  const phase = getPhase(order);

  // Something the customer paid for and hasn't got. Highest cost to ignore.
  const edd = getExpectedDelivery(order);
  if (edd && !isDelivered(order) && !isTerminal(order) && daysSince(edd) > 0) {
    return {
      key: `late-${order.id}`,
      type: 'late',
      severity: 'attention',
      title: 'This is running late',
      body: `${order.product} was due ${edd}. Tell us and we'll chase the courier properly.`,
      ctaLabel: 'Look into it',
      target: { screen: 'orderDetails', params: { orderId: order.id } },
      orderId: order.id,
    };
  }

  // A claim stalled on something only the customer can supply — nothing
  // moves until they act, so this is the one prompt that is genuinely a
  // request rather than an alert.
  const currentStep = order.timeline?.steps?.[order.timeline.currentIndex];
  if (/awaiting evidence/i.test(currentStep?.description ?? '')) {
    return {
      key: `evidence-${order.id}`,
      type: 'evidence',
      severity: 'action',
      title: 'We need a photo to carry on',
      body: `Your claim on ${order.product} is paused until we can see the damage.`,
      ctaLabel: 'Add a photo',
      target: { screen: 'orderDetails', params: { orderId: order.id } },
      orderId: order.id,
    };
  }

  // A visit needs somebody at home on a particular morning — worth one
  // reminder they can reschedule from. Only while it's still ahead of them:
  // a slot that has already passed is history, and announcing it as
  // upcoming is worse than saying nothing.
  if (order.installationSlot && phase !== PHASES.TERMINAL && daysSince(order.installationSlot.date) <= 0) {
    return {
      key: `install-${order.id}`,
      type: 'install',
      severity: 'action',
      title: 'A technician is coming',
      body: `${order.installationSlot.date}, ${order.installationSlot.window} for ${order.product}. Someone needs to be in.`,
      ctaLabel: 'Manage the visit',
      target: { screen: 'orderDetails', params: { orderId: order.id } },
      orderId: order.id,
    };
  }

  // Money already in motion — the single most common reason anyone contacts
  // anyone. Drops off the moment it has actually landed.
  if (order.refund?.timeline) {
    const { steps, currentIndex } = order.refund.timeline;
    if (currentIndex < steps.length - 1) {
      return {
        key: `refund-${order.id}`,
        type: 'refund',
        severity: 'info',
        title: 'Your refund is on its way',
        body: `₹${order.refund.amount.toLocaleString('en-IN')} to your ${order.refund.method}, expected ${order.refund.expectedDate}.`,
        ctaLabel: 'Track it',
        target: { screen: 'orderDetails', params: { orderId: order.id } },
        orderId: order.id,
      };
    }
  }

  // Retention, honestly applied. Hearing "this isn't right for me" on night
  // 88 leaves room to fix it; hearing it on night 105 leaves only an
  // apology. Surfaced while the answer can still be yes.
  if (isDelivered(order) && isMattressProduct(order.product)) {
    const left = TRIAL_NIGHTS - daysSince(getDeliveredDate(order));
    if (left > 0 && left <= TRIAL_WARNING_DAYS) {
      return {
        key: `trial-${order.id}`,
        type: 'trial',
        severity: 'info',
        title: `${left} ${left === 1 ? 'night' : 'nights'} left on your trial`,
        body: `If ${order.product} isn't right, now is the time to say so — after night ${TRIAL_NIGHTS} we can't swap it on comfort alone.`,
        ctaLabel: 'It’s not quite right',
        target: { screen: 'returnReplace', params: { orderId: order.id } },
        orderId: order.id,
      };
    }
  }

  return null;
}

// Six cards all reading "this is running late" is six times the noise for
// one fact, and it crowds out the other things worth seeing. Same-kind
// prompts collapse into one card that names the count.
const AGGREGATE = {
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
    body: 'Both are heading back to their original payment methods.',
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
  for (const p of prompts) {
    if (!byType.has(p.type)) byType.set(p.type, []);
    byType.get(p.type).push(p);
  }

  return [...byType.entries()].map(([type, group]) => {
    if (group.length === 1) return group[0];
    const first = ORDERS.find((o) => o.id === group[0].orderId);
    // An aggregate can't open one order's page, so it opens the list.
    return { ...group[0], key: `${type}-group`, ...AGGREGATE[type](group.length, first), target: { screen: 'orders', params: {} } };
  });
}

export function getHomePrompts() {
  return collapse(ORDERS.map(buildPrompt).filter(Boolean))
    .sort((a, b) => SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity])
    .slice(0, MAX_PROMPTS);
}
