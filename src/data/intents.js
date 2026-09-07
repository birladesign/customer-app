// PRD C2 (action-availability). The app renders which actions are on the
// table and why the rest aren't; it does not decide policy itself (§7.1).
//
// Eligibility here is derived from the C1 phase projection (phases.js), not
// from matching timeline label strings — so a new status label can't silently
// change what the customer is allowed to do. Verdict-level policy (the
// §7.7-7.9 M/N/A tables) still lives in the rules modules, not here.

import { PHASES, PHASE_LABELS, getPhase, isDelivered, isPostDispatch, isTerminal } from './phases.js';

export { isPostDispatch };

const INTENT_LABELS = {
  cancel: 'Cancel Order',
  returnReplace: 'Return or Replace',
  warranty: 'Warranty',
  needHelp: 'Need Help',
};

const INTENT_ORDER = ['returnReplace', 'cancel', 'warranty', 'needHelp'];

// Only "returnReplace" navigates anywhere — OrderDetails.jsx reads the other
// three (cancel/warranty/needHelp) directly for their enabled/reason state,
// each with its own dedicated on-page treatment rather than a generic list.
export const NAVIGABLE_INTENTS = new Set(['returnReplace']);

// Ineligible actions render greyed *with the reason* (§9), so every deny
// branch has to name the phase that produced it rather than just refusing.
function notYetDeliveredReason(entity, subject = 'the order') {
  const phase = getPhase(entity);
  if (phase === PHASES.OFD) return `Available once ${subject} is delivered — it's out for delivery now`;
  return `Available once ${subject} is delivered`;
}

export function getOrderIntents(order) {
  const delivered = isDelivered(order);
  const closed = isTerminal(order);

  const state = {
    returnReplace: delivered ? { enabled: true } : { enabled: false, reason: notYetDeliveredReason(order) },
    cancel:
      !delivered && !closed
        ? { enabled: true }
        : { enabled: false, reason: closed ? 'Order already closed' : 'Order already delivered' },
    // Warranty coverage is tied to the product, not to where the order is in
    // its timeline, so it isn't phase-gated.
    warranty: { enabled: true },
    needHelp: { enabled: true },
  };

  // Per-order overrides always win — they represent a more specific reason
  // than the generic phase-derived default above.
  for (const [key, reason] of Object.entries(order.intentOverrides || {})) {
    state[key] = { enabled: false, reason };
  }

  return INTENT_ORDER.map((key) => ({
    key,
    label: INTENT_LABELS[key],
    navigable: NAVIGABLE_INTENTS.has(key),
    phase: getPhase(order),
    ...state[key],
  }));
}

// Per-item counterpart, for a line item inside a multi-SKU order. Each item
// carries its own timeline, so it projects to its own phase — a mattress that
// arrived doesn't wait on a still-in-transit bed frame from the same order.
export function getItemIntents(item) {
  return {
    returnReplace: isDelivered(item)
      ? { enabled: true }
      : { enabled: false, reason: notYetDeliveredReason(item, 'this item') },
    warranty: { enabled: true },
  };
}

// Editing (qty/size/address) closes the moment whatever's being edited has
// left the warehouse; once it's shipped, the courier already has the old
// version. Post-dispatch is not a dead end though — §8.2 OM-07 routes it into
// the RTO-Replacement sub-flow, which is what `offerRto` tells the screen.
export function getEditEligibility(entity) {
  if (isTerminal(entity)) return { enabled: false, reason: 'Order already closed' };
  if (isPostDispatch(entity)) {
    return { enabled: false, reason: 'Editing is locked once it ships', offerRto: true };
  }
  return { enabled: true };
}

// Shipment-aware counterpart — a shipment's units always ship and arrive
// together, so editing is one availability decision for the whole parcel: if
// any unit has already left the warehouse (or is closed), every unit is
// locked, not just the one the customer happens to be looking at.
export function getShipmentEditEligibility(units) {
  if (units.some((u) => isTerminal(u))) return { enabled: false, reason: 'Order already closed' };
  if (units.some((u) => isPostDispatch(u))) {
    return { enabled: false, reason: 'Editing is locked once the shipment ships', offerRto: true };
  }
  return { enabled: true };
}

// Address editing locks on the same cutoff as qty/variant editing — once the
// courier has the parcel, it's also been handed whatever address was on file.
export function getAddressEditEligibility(entity) {
  if (isTerminal(entity)) return { enabled: false, reason: 'Order already closed' };
  if (isPostDispatch(entity)) {
    return { enabled: false, reason: 'Address can no longer be edited once it’s dispatched', offerRto: true };
  }
  return { enabled: true };
}

export function getShipmentAddressEditEligibility(units) {
  if (units.some((u) => isTerminal(u))) return { enabled: false, reason: 'Order already closed' };
  if (units.some((u) => isPostDispatch(u))) {
    return {
      enabled: false,
      reason: 'Address can no longer be edited once the shipment is dispatched',
      offerRto: true,
    };
  }
  return { enabled: true };
}

export { PHASES, PHASE_LABELS, getPhase };
