// Mocked stand-in for the PRD's C2 (action-availability) contract — §7.1 says
// the app should carry zero policy logic and just render a server verdict.
// This file is that shortcut for a UI prototype: a handful of if/else branches
// derived from the order's own timeline, not a rules engine. Real eligibility
// (§7.7-7.9 M/N/A tables) is out of scope here.

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

function hasReachedStep(order, label) {
  if (!order.timeline) return false;
  const idx = order.timeline.steps.findIndex((s) => s.label === label);
  return idx !== -1 && idx <= order.timeline.currentIndex;
}

export function getOrderIntents(order) {
  const isDelivered = hasReachedStep(order, 'Delivered');
  const isClosed = order.section === 'closed';

  const state = {
    returnReplace: isDelivered
      ? { enabled: true }
      : { enabled: false, reason: 'Available once the order is delivered' },
    cancel:
      !isDelivered && !isClosed
        ? { enabled: true }
        : { enabled: false, reason: isClosed ? 'Order already closed' : 'Order already delivered' },
    warranty: isDelivered ? { enabled: true } : { enabled: false, reason: 'Available after delivery' },
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

// Per-item counterpart to getOrderIntents, for a line item inside a
// multi-SKU order. Each item's own delivery state decides its own
// Return/Warranty eligibility — a mattress that arrived doesn't wait on a
// still-in-transit bed frame from the same order, and vice versa.
export function getItemIntents(item) {
  const isDelivered = item.status.label === 'Delivered';
  return {
    returnReplace: isDelivered
      ? { enabled: true }
      : { enabled: false, reason: 'Available once this item is delivered' },
    warranty: isDelivered ? { enabled: true } : { enabled: false, reason: 'Available after delivery' },
  };
}

// Deliberately excludes "Packed" — packing still precedes the courier
// pickup, so it's still within the pre-shipment edit window; only a step
// that means the item has actually left the warehouse locks editing.
const SHIPPED_LABELS = ['Shipped', 'Dispatched', 'Out for Delivery', 'Delivered'];

// Works for either a whole order or a single line item — both shapes carry
// their own `timeline`. True once the courier already has it, which is the
// line PRD §8.2/8.3 draws between an instant OMS/POS cancel (CX-03) and the
// RTO-intercept → RTO-Replacement sub-flow (CX-04, §8.11).
export function isPostDispatch(entity) {
  const idx = entity.timeline?.steps.findIndex((s) => SHIPPED_LABELS.includes(s.label)) ?? -1;
  return idx !== -1 && idx <= entity.timeline.currentIndex;
}

// Editing (qty/size/address) closes the moment whatever's being edited has
// left the warehouse; once it's shipped, the courier already has the old
// version.
export function getEditEligibility(entity) {
  if (entity.section === 'closed') return { enabled: false, reason: 'Order already closed' };
  if (isPostDispatch(entity)) return { enabled: false, reason: 'Editing is locked once it ships' };
  return { enabled: true };
}

// Shipment-aware counterpart to getEditEligibility — a shipment's units
// always ship and arrive together, so editing (qty/size/address) is one
// availability decision for the whole parcel: if any unit has already left
// the warehouse (or is closed), every unit is locked, not just the one the
// customer happens to be looking at. `units` is the full set for the
// shipment — the order being viewed plus its shipmentId siblings, in any
// order.
export function getShipmentEditEligibility(units) {
  if (units.some((u) => u.section === 'closed')) return { enabled: false, reason: 'Order already closed' };
  if (units.some((u) => isPostDispatch(u))) {
    return { enabled: false, reason: 'Editing is locked once the shipment ships' };
  }
  return { enabled: true };
}
