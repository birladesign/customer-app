// PRD §8.11 — the RTO-Replacement shared sub-flow: return-to-origin, then
// either a replacement or a refund. One flow, three callers (RT-01):
// post-dispatch cancel (§8.3 CX-04), post-dispatch order-edit (§8.2 OM-07),
// and damaged-delivery-rejection (§8.4). Previously this only had the first
// caller and only the refund branch — the other two didn't exist and the
// replacement branch was explicitly unwired.

// Per-origin copy — same tracker and mechanics underneath, but a cancelled
// order, an edit that missed its window, and a refused-at-the-door parcel
// are different situations and shouldn't read as the same screen.
export const RTO_ORIGINS = {
  cancel: {
    headerTitle: 'Cancelling Your Order',
    confirmTitle: 'Cancellation requested',
    confirmBody:
      "We're attempting to intercept your order before it's delivered. If it can't be stopped in time, it'll be returned to our warehouse before your refund is processed.",
  },
  edit: {
    headerTitle: 'Updating Your Order',
    confirmTitle: 'Return-to-origin requested',
    confirmBody:
      "This change can't be applied once it's shipped, so we're routing the current item back to our warehouse first — then we'll apply what you asked for.",
  },
  damagedRejection: {
    headerTitle: 'Refusing Delivery',
    confirmTitle: 'Delivery refused',
    confirmBody:
      "Thanks for flagging the damage at the door. The courier is returning it to our warehouse, and we'll act on your replacement/refund choice once that's confirmed.",
  },
};

const REFUND_TRACKER_LABELS = ['Return to Origin', 'Return Confirmed', 'Refund Initiated'];
const REPLACEMENT_TRACKER_LABELS = ['Return to Origin', 'Return Confirmed', 'Replacement Booked', 'New Item Dispatched'];

export function getRtoExecutionSteps(outcome = 'refund') {
  const labels = outcome === 'replace' ? REPLACEMENT_TRACKER_LABELS : REFUND_TRACKER_LABELS;
  return { steps: labels.map((label) => ({ label })), currentIndex: 0 };
}

export function getRtoPostCancelUpdate() {
  return {
    status: { dot: 'blue', label: REFUND_TRACKER_LABELS[0] },
    trackerSteps: REFUND_TRACKER_LABELS,
    caption: 'Return in progress — refund follows once confirmed.',
    description: 'Cancellation requested — attempting to intercept before delivery.',
    actions: [{ label: 'Track Delay', variant: 'secondary' }],
    overrideReason: 'A delivery-delay cancellation is already in progress for this order',
  };
}

// RT-02's replacement branch: OM books a replacement once RTO confirms,
// carrying the new spec/price the customer picked in the RTO flow's variant
// step (only reachable from the `edit` origin — a cancel or a damaged
// rejection is never "give me a different one").
export function getRtoReplacementUpdate({ description } = {}) {
  return {
    status: { dot: 'blue', label: REPLACEMENT_TRACKER_LABELS[0] },
    trackerSteps: REPLACEMENT_TRACKER_LABELS,
    caption: 'Return in progress — your replacement ships once the original is confirmed back with us.',
    description: description ?? 'Return-to-origin requested — replacement to follow.',
    actions: [{ label: 'Track Return', variant: 'secondary' }],
    overrideReason: 'A return-to-origin replacement is already in progress for this order',
  };
}
