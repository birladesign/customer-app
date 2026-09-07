// PRD §7.3 — the C1 phase projection.
//
// The PRD's model is 29 order states projected onto 7 UI phases, and the
// action matrix (C2) keys off the phase, not the state. This prototype ships
// hand-authored status labels rather than a state machine, so this module is
// the projection layer: it collapses whatever an order or line item's
// timeline says into exactly one phase, and everything that gates an action
// reads the phase instead of matching label strings.
//
// That indirection is the point. Before this existed, eligibility was
// `timeline.steps.find(s => s.label === 'Delivered')` scattered across the
// data layer, so adding a status label ("Redelivery Scheduled", "On Hold —
// Decision Needed") silently changed what the customer was allowed to do.
// New labels now only need a line in STEP_PHASE below.

import { getDeliveredDate } from './orders.js';
import { daysSince } from './clock.js';

export const PHASES = {
  PRE_DISPATCH: 'pre_dispatch',
  IN_TRANSIT: 'in_transit',
  OFD: 'ofd',
  DELIVERED_0_10: 'delivered_0_10',
  D11_100: 'd11_100',
  POST_100_WARRANTY: 'post_100_warranty',
  TERMINAL: 'terminal',
};

// The day boundaries the PRD's phases are cut on (§7.3). They live here, not
// in a screen (§7.1) — the remediation windows in mattressRules.js are a
// separate, deliberately independent set: a phase says where the order is,
// a rule says what may be done about it.
const EARLY_WINDOW_DAYS = 10;
const RETURN_WINDOW_DAYS = 100;

// Timeline step labels that mean the courier already has it. "Packed" is
// deliberately absent — packing still precedes handover, so it's inside the
// pre-dispatch edit window.
const STEP_PHASE = [
  { labels: ['Delivered', 'All Items Delivered'], phase: PHASES.DELIVERED_0_10 },
  { labels: ['Out for Delivery'], phase: PHASES.OFD },
  { labels: ['Shipped', 'Dispatched', 'In Transit'], phase: PHASES.IN_TRANSIT },
];

// A status label alone can put an entity in a terminal phase even when its
// timeline hasn't been truncated to match.
const TERMINAL_STATUS_LABELS = ['Cancelled', 'Refund Completed', 'Delivery Delayed — Refund Processed'];

function hasReachedStep(entity, labels) {
  const steps = entity?.timeline?.steps;
  if (!steps) return false;
  const idx = steps.findIndex((s) => labels.includes(s.label));
  return idx !== -1 && idx <= entity.timeline.currentIndex;
}

// Works for a whole order or a single line item — both carry their own
// `timeline` and `status`, which is what every caller here relies on.
export function getPhase(entity) {
  if (!entity) return PHASES.PRE_DISPATCH;
  if (entity.section === 'closed') return PHASES.TERMINAL;
  if (TERMINAL_STATUS_LABELS.includes(entity.status?.label)) return PHASES.TERMINAL;

  const reached = STEP_PHASE.find((rule) => hasReachedStep(entity, rule.labels));
  if (!reached) return PHASES.PRE_DISPATCH;
  if (reached.phase !== PHASES.DELIVERED_0_10) return reached.phase;

  // Delivered splits three ways on age. A line item inside a multi-item order
  // carries its own delivery timestamp, so each item ages on its own clock.
  const days = daysSince(getDeliveredDate(entity));
  if (days <= EARLY_WINDOW_DAYS) return PHASES.DELIVERED_0_10;
  if (days <= RETURN_WINDOW_DAYS) return PHASES.D11_100;
  return PHASES.POST_100_WARRANTY;
}

const DELIVERED_PHASES = [PHASES.DELIVERED_0_10, PHASES.D11_100, PHASES.POST_100_WARRANTY];
const DISPATCHED_PHASES = [PHASES.IN_TRANSIT, PHASES.OFD, ...DELIVERED_PHASES];

export function isDelivered(entity) {
  return DELIVERED_PHASES.includes(getPhase(entity));
}

// True once the courier has it — the line the PRD draws between an instant
// OMS/POS cancel (CX-03) and the RTO-intercept sub-flow (CX-04, §8.11).
export function isPostDispatch(entity) {
  return DISPATCHED_PHASES.includes(getPhase(entity));
}

export function isTerminal(entity) {
  return getPhase(entity) === PHASES.TERMINAL;
}

// Human-readable phase, for the disabled-reason copy C2 renders and for
// anything that wants to explain *why* rather than just refuse.
export const PHASE_LABELS = {
  [PHASES.PRE_DISPATCH]: 'Preparing for dispatch',
  [PHASES.IN_TRANSIT]: 'In transit',
  [PHASES.OFD]: 'Out for delivery',
  [PHASES.DELIVERED_0_10]: 'Delivered',
  [PHASES.D11_100]: 'Delivered',
  [PHASES.POST_100_WARRANTY]: 'In warranty',
  [PHASES.TERMINAL]: 'Closed',
};
