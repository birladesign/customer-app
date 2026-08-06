// Mocked stand-in for the PRD's C3 (verdict) contract and §7.2 retention
// ladder (repair/replace before return, cheapest-first). This is a UI
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
  repair: 'Repair',
  sendPart: 'Send Missing Part',
  replace: 'Replace Item',
  return: 'Return for Refund',
};

export function getRemediationOptions(order, reason) {
  const base = { orderId: order.id, reason };

  switch (reason) {
    case 'Missing parts':
      return [
        { id: 'sendPart', label: LEVER_LABELS.sendPart, tag: 'Recommended', chargeLabel: 'No charge', description: 'We ship the missing part directly — no need to send anything back.', needsApproval: false, ...base },
        { id: 'return', label: LEVER_LABELS.return, tag: 'Last resort', chargeLabel: 'Refund to original payment', description: 'Return the full item for a refund instead.', needsApproval: true, ...base },
      ];
    case 'Damaged':
    case 'Defective / Not working':
      return [
        { id: 'repair', label: LEVER_LABELS.repair, tag: 'Recommended', chargeLabel: 'No charge', description: 'A technician repairs the item at your address.', needsApproval: false, ...base },
        { id: 'replace', label: LEVER_LABELS.replace, tag: null, chargeLabel: 'No charge', description: 'We collect the damaged unit and ship a new one in the same visit.', needsApproval: false, ...base },
        { id: 'return', label: LEVER_LABELS.return, tag: 'Last resort', chargeLabel: 'Refund to original payment', description: 'Return the item for a full refund.', needsApproval: true, ...base },
      ];
    case 'Wrong size or model':
      return [
        { id: 'replace', label: LEVER_LABELS.replace, tag: 'Recommended', chargeLabel: 'No charge', description: "We'll swap it for the right size or model.", needsApproval: false, ...base },
        { id: 'return', label: LEVER_LABELS.return, tag: 'Last resort', chargeLabel: 'Refund to original payment', description: 'Return the item for a full refund.', needsApproval: true, ...base },
      ];
    case 'Discomfort / Not as expected':
    default:
      return [
        { id: 'replace', label: LEVER_LABELS.replace, tag: 'Recommended', chargeLabel: 'No charge', description: 'Try a different variant of this product instead.', needsApproval: false, ...base },
        { id: 'return', label: LEVER_LABELS.return, tag: 'Last resort', chargeLabel: 'Refund to original payment', description: 'Return the item for a full refund.', needsApproval: true, ...base },
      ];
  }
}

export function getExecutionSteps(leverId) {
  switch (leverId) {
    case 'repair':
      return { steps: [{ label: 'Technician Assigned' }, { label: 'Repair Scheduled' }, { label: 'Repair Completed' }], currentIndex: 0 };
    case 'sendPart':
      return { steps: [{ label: 'Part Dispatched' }, { label: 'Out for Delivery' }, { label: 'Delivered' }], currentIndex: 0 };
    case 'replace':
      return { steps: [{ label: 'Replacement Confirmed' }, { label: 'Pickup Scheduled' }, { label: 'New Item Dispatched' }, { label: 'Delivered' }], currentIndex: 0 };
    case 'return':
    default:
      return { steps: [{ label: 'Pickup Scheduled' }, { label: 'Picked Up' }, { label: 'Quality Check' }, { label: 'Refund Initiated' }], currentIndex: 0 };
  }
}
