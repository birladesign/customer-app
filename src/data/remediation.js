// Mocked stand-in for the PRD's C3 (verdict) contract and §7.2 retention
// ladder (replace/sendPart before return, cheapest-first). This is a UI
// prototype shortcut — a few branches keyed on the selected reason, not the
// real M/N/A rule tables in §7.7-7.9. Every lever list is deliberately ordered
// cheapest-outcome-first, and "Return for Refund" is always last, matching the
// PRD's "Cancel and Return are never first-class, always last resort" rule.

export const RETURN_REASONS = [
  'Damaged',
  'Defective / Not working',
  'Wrong size or model',
  'Missing parts',
  'Discomfort / Not as expected',
];

const LEVER_LABELS = {
  sendPart: 'Send Missing Part',
  replace: 'Replace Item',
  return: 'Return for Refund',
};

export function getRemediationOptions(order, reason) {
  const base = { orderId: order.id, reason };

  switch (reason) {
    case 'Missing parts':
      return [
        { id: 'sendPart', label: LEVER_LABELS.sendPart, chargeLabel: 'No charge', description: 'We ship the missing part directly — no need to send anything back.', needsApproval: false, ...base },
        { id: 'return', label: LEVER_LABELS.return, chargeLabel: 'Refund to original payment', description: 'Return the full item for a refund instead.', needsApproval: true, ...base },
      ];
    case 'Damaged':
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
    case 'Discomfort / Not as expected':
    default:
      return [
        { id: 'replace', label: LEVER_LABELS.replace, chargeLabel: 'No charge', description: 'Try a different variant of this product instead.', needsApproval: false, ...base },
        { id: 'return', label: LEVER_LABELS.return, chargeLabel: 'Refund to original payment', description: 'Return the item for a full refund.', needsApproval: true, ...base },
      ];
  }
}

export function getExecutionSteps(leverId) {
  switch (leverId) {
    case 'sendPart':
      return { steps: [{ label: 'Part Dispatched' }, { label: 'Out for Delivery' }, { label: 'Delivered' }], currentIndex: 0 };
    case 'replace':
      return { steps: [{ label: 'Replacement Confirmed' }, { label: 'Pickup Scheduled' }, { label: 'New Item Dispatched' }, { label: 'Delivered' }], currentIndex: 0 };
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
};

export function getPostBookingUpdate(leverId) {
  const stepLabels = getExecutionSteps(leverId).steps.map((s) => s.label);
  const label = leverId === 'return' ? `Return ${stepLabels[0]}` : stepLabels[0];
  return { label, trackerSteps: stepLabels, ...POST_BOOKING_COPY[leverId] };
}
