// PRD §7.16 — the price-match approval ladder. Previously absent entirely:
// "found cheaper" was a cancel reason with no deflection (CX-02), so every
// price objection fell straight through to a generic hold-or-cancel sheet.

export const PRICE_MATCH_TIERS = [
  { max: 2000, approver: 'Agent', autoApprove: true },
  { max: 3500, approver: 'Team Lead', autoApprove: false },
  { max: 5000, approver: 'Area Manager', autoApprove: false },
  { max: Infinity, approver: 'HOD', autoApprove: false },
];

export function getPriceMatchTier(diff) {
  return PRICE_MATCH_TIERS.find((tier) => diff <= tier.max);
}
