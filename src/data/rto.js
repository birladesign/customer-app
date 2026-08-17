// Mocked stand-in for the PRD's §8.11 RTO-Replacement shared sub-flow,
// scoped here to its refund-only branch: a post-dispatch cancellation
// reached from OrderDetails once the "Delivery taking too long" EDD/Expedite
// retention offer has been declined. The sub-flow's other branch (OM books a
// replacement, for a post-dispatch order edit per OM-07) isn't wired up
// anywhere yet, so this always ends in a refund.

const TRACKER_LABELS = ['RTO Requested', 'RTO Confirmed', 'Refund Initiated'];

export function getRtoExecutionSteps() {
  return { steps: TRACKER_LABELS.map((label) => ({ label })), currentIndex: 0 };
}

export function getRtoPostCancelUpdate() {
  return {
    status: { dot: 'blue', label: TRACKER_LABELS[0] },
    trackerSteps: TRACKER_LABELS,
    caption: 'Return-to-origin in progress — refund follows once confirmed.',
    description: 'Cancellation requested — attempting to intercept before delivery.',
    actions: [{ label: 'Track RTO', variant: 'secondary' }],
    overrideReason: 'An RTO-Replacement cancellation is already in progress for this order',
  };
}
