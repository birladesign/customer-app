// PRD §8.4 — delivery issues. Reasons are status-filtered (DL-01): what a
// customer can report depends on where the parcel actually is, not a fixed
// menu. This module holds that taxonomy plus the fake-delivery investigation
// clock (DL-05) and the proof-of-delivery block (OT-07) — none of which
// existed before; the only delivery-issue surface in the app was a single
// canned "Did not Receive" chat chip.
//
// Scope boundary from §8.5 (remediation): a *logistics* problem — visibility,
// a parcel that says delivered but wasn't, one that arrived twice, one
// that's missing something the manifest promised — lives here. A *product*
// problem (arrived damaged, defective, wrong item) already has a real home
// in the M/N/A rule tables via Return & Replace, so this module routes there
// instead of re-implementing it.

import { PHASES } from './phases.js';
import { daysSince, today } from './clock.js';

// §7.17 TAT master — fake-delivery investigation is 24-48h; this prototype
// picks the upper bound as the visible commitment (DL-05's countdown).
export const FAKE_DELIVERY_INVESTIGATION_HOURS = 48;
// A "marked delivered, not received" report only makes sense recently —
// past this, sagging/warranty-style rules apply instead, not a courier
// investigation.
const FAKE_DELIVERY_REPORT_WINDOW_DAYS = 10;

export const ISSUE_TYPES = [
  {
    key: 'noMovement',
    label: "No movement / hasn't updated in a while",
    phases: [PHASES.IN_TRANSIT],
    lane: 'logistics',
    voc: 'No-Movement',
  },
  {
    key: 'courierBehaviour',
    label: 'Courier behaviour issue',
    phases: [PHASES.IN_TRANSIT, PHASES.OFD],
    lane: 'logistics',
    voc: 'Courier-Behaviour',
  },
  {
    key: 'refuseDamaged',
    label: "Refuse this delivery — it's visibly damaged",
    phases: [PHASES.OFD],
    lane: 'logistics',
    voc: 'Damaged-Delivery-Rejected',
    // Handled by the shared RTO sub-flow, not a case filed here directly —
    // see DeliveryIssueFlow.
    routesToRto: true,
  },
  {
    key: 'fakeDelivery',
    label: "Marked delivered, but I haven't received it",
    phases: [PHASES.DELIVERED_0_10],
    lane: 'logistics',
    voc: 'Fake-Delivery',
    investigation: true,
  },
  {
    key: 'missingFromParcel',
    label: 'Something is missing from the parcel',
    phases: [PHASES.DELIVERED_0_10, PHASES.D11_100],
    lane: 'logistics',
    voc: 'Missing',
  },
  {
    key: 'doubleDelivery',
    label: 'I received this order twice',
    phases: [PHASES.DELIVERED_0_10, PHASES.D11_100],
    lane: 'logistics',
    voc: 'Double-Delivery',
  },
];

export function getAvailableIssueTypes(phase) {
  return ISSUE_TYPES.filter((issue) => issue.phases.includes(phase));
}

export function getIssueType(key) {
  return ISSUE_TYPES.find((issue) => issue.key === key) ?? null;
}

// DL-03: self-resolvable before the min-EDD, on-time — an answer card, no
// case, first-contact resolution. Only "no movement" has an honest
// self-resolve path; everything else always needs a human or the tracker.
export function isSelfResolvable(issueKey, { edd, isOnTime }) {
  if (issueKey !== 'noMovement') return false;
  if (!edd) return false;
  const eddDate = new Date(edd);
  return isOnTime !== false && today().getTime() < eddDate.getTime();
}

// DL-05 — the investigation clock. `openedAt` is the case's own createdAt so
// the countdown is stable across re-renders instead of drifting on every tap.
export function getInvestigationClock(openedAt) {
  const deadline = new Date(openedAt);
  deadline.setHours(deadline.getHours() + FAKE_DELIVERY_INVESTIGATION_HOURS);
  const msRemaining = deadline.getTime() - today().getTime();
  return {
    deadline,
    breached: msRemaining <= 0,
    hoursRemaining: Math.max(0, Math.ceil(msRemaining / 3600000)),
  };
}

export function isFakeDeliveryReportable(deliveredDateStr) {
  return daysSince(deliveredDateStr) <= FAKE_DELIVERY_REPORT_WINDOW_DAYS;
}

// OT-07 — proof of delivery. Derived from whatever timeline the caller is
// showing (order-level or a single line item's own), since a multi-item
// order's units can each carry their own delivery timestamp.
const DELIVERY_STEP_LABELS = ['Delivered', 'All Items Delivered'];

export function getProofOfDelivery(timeline, { signedBy, address } = {}) {
  const step = timeline?.steps?.find((s) => s.timestamp && DELIVERY_STEP_LABELS.includes(s.label));
  if (!step) return null;
  return {
    timestamp: step.timestamp,
    signedBy: signedBy ?? 'Signed for at the doorstep',
    address: address ?? null,
    method: 'signature',
  };
}
