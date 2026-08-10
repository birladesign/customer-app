// Mocked stand-in for the PRD's C2 (action-availability) contract — §7.1 says
// the app should carry zero policy logic and just render a server verdict.
// This file is that shortcut for a UI prototype: a handful of if/else branches
// derived from the order's own timeline, not a rules engine. Real eligibility
// (§7.7-7.9 M/N/A tables) is out of scope here.

const INTENT_LABELS = {
  modify: 'Modify Order',
  cancel: 'Cancel Order',
  returnReplace: 'Return or Replace',
  warranty: 'Warranty',
  invoice: 'Download Invoice',
  paymentDetails: 'Payment & Refund Details',
  needHelp: 'Need Help',
};

const INTENT_ORDER = ['returnReplace', 'modify', 'cancel', 'warranty', 'invoice', 'paymentDetails', 'needHelp'];

// Only "returnReplace" and "payment" actually navigate anywhere in this pass —
// the rest render enabled/disabled for completeness but have no onClick yet,
// same precedent as this app's own inert Need-Help/Back buttons.
export const NAVIGABLE_INTENTS = new Set(['returnReplace', 'paymentDetails']);

function hasReachedStep(order, label) {
  if (!order.timeline) return false;
  const idx = order.timeline.steps.findIndex((s) => s.label === label);
  return idx !== -1 && idx <= order.timeline.currentIndex;
}

export function getOrderIntents(order) {
  const isDelivered = hasReachedStep(order, 'Delivered');
  const isShipped = hasReachedStep(order, 'Shipped');
  const isClosed = order.section === 'closed';

  const state = {
    returnReplace: isDelivered
      ? { enabled: true }
      : { enabled: false, reason: 'Available once the order is delivered' },
    modify: isDelivered
      ? { enabled: false, reason: 'Order already delivered' }
      : isShipped
      ? { enabled: false, reason: 'Order already shipped' }
      : { enabled: true },
    cancel:
      !isDelivered && !isClosed
        ? { enabled: true }
        : { enabled: false, reason: isClosed ? 'Order already closed' : 'Order already delivered' },
    warranty: isDelivered ? { enabled: true } : { enabled: false, reason: 'Available after delivery' },
    invoice: { enabled: true },
    paymentDetails: { enabled: true },
    needHelp: { enabled: true },
  };

  // Per-order overrides always win — they represent a more specific reason
  // than the generic section/timeline-derived default above.
  for (const [key, reason] of Object.entries(order.intentOverrides || {})) {
    state[key] = { enabled: false, reason };
  }

  return INTENT_ORDER.map((key) => ({
    key,
    label: INTENT_LABELS[key],
    navigable: NAVIGABLE_INTENTS.has(key),
    ...state[key],
  }));
}
