// Demo data for the My Orders screen. In production this comes from the C1
// (status projection) and C2 (action-availability) server contracts — see
// PRD §7.1. Nothing here should encode policy; it's just display content.
//
// Product names and images are sourced from thesleepcompany.in's real catalogue
// (fetched 2026-08-06) so the demo reads as authentic TSC inventory rather than
// invented placeholder SKUs.
//
// Images are imported (not referenced as /public string paths) so a production
// build can inline them as base64 — see vite.config.js's assetsInlineLimit —
// which is what lets this app ship as one self-contained HTML file.
import imgMattressOrthoPro from '../assets/mattress-ortho-pro.jpg';
import imgBedElev8Adjustable from '../assets/bed-elev8-adjustable.jpg';
import imgChairStyluxErgonomic from '../assets/chair-stylux-ergonomic.jpg';
import imgMattressOrthoHybrid from '../assets/mattress-ortho-hybrid.jpg';
import imgPillowHybrid from '../assets/pillow-hybrid.jpg';
import imgPillowPregnancy from '../assets/pillow-pregnancy.jpg';
import imgSofaLuxeGrande from '../assets/sofa-luxe-grande.png';
import imgChairOnyxOrthopedic from '../assets/chair-onyx-orthopedic.jpg';
import imgMattressOrthoRoyale from '../assets/mattress-ortho-royale.jpg';
import imgChairElitePremium from '../assets/chair-elite-premium.jpg';
import imgMattressLuxeRoyale from '../assets/mattress-luxe-royale.jpg';
import imgDeskAeroplus from '../assets/desk-aeroplus.png';
import imgMattressOrtho from '../assets/mattress-ortho.jpg';
import imgPillowCervical from '../assets/pillow-cervical.jpg';

// Sections still back the tab filter (Active/Closed are shown as tabs; Action
// and Done are folded into All) and their counts — they're a filter dimension,
// not a display grouping. The list itself always renders in date order, never
// grouped/sorted by these tags.
export const SECTIONS = [
  { key: 'needsAttention', label: 'Needs Attention', tabKey: 'action', tabLabel: 'Action' },
  { key: 'inProgress', label: 'In Progress', tabKey: 'active', tabLabel: 'Active' },
  { key: 'deliveredDone', label: 'Delivered & Done', tabKey: 'done', tabLabel: 'Done' },
  { key: 'closed', label: 'Closed', tabKey: 'closed', tabLabel: 'Closed' },
];

const MONTHS = { Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5, Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11 };

// Dates are stored as "DD Mon YYYY" strings for display; parse explicitly
// rather than relying on engine-specific Date string parsing.
export function parseOrderDate(dateStr) {
  const [day, mon, year] = dateStr.split(' ');
  return new Date(Number(year), MONTHS[mon], Number(day));
}

// "Smart Ortho Pro Mattress (Queen)" -> name "Smart Ortho Pro Mattress",
// spec "Queen" — reused wherever a card/screen needs the variant separated
// from the product title (My Orders cards, Order Details) rather than
// inventing a parallel `variant` field on every order.
export function splitProductSpec(product) {
  const match = product.match(/^(.*)\(([^)]+)\)\s*$/);
  return match ? { name: match[1].trim(), spec: match[2].trim() } : { name: product, spec: null };
}

// Not every pending step with an expectedDate is about delivery — a
// delivered item can still have "Installation Completed" or "Refund
// Initiated" pending, each with its own expectedDate that isn't a delivery
// promise. Only a step actually named for delivery counts.
const DELIVERY_STEP_LABELS = ['Delivered', 'All Items Delivered'];

export function getExpectedDelivery(entity) {
  const step = entity.timeline?.steps.find((s) => s.expectedDate && DELIVERY_STEP_LABELS.includes(s.label));
  return step?.expectedDate ?? null;
}

// Same DELIVERY_STEP_LABELS, but for the date it actually happened rather
// than the date it was promised — timeline timestamps carry a time too
// ("16 Aug 2026, 11:00 AM"), so this keeps just the date for the plain
// "Delivered on {date}" line order/shipment cards show once delivered.
export function getDeliveredDate(entity) {
  const step = entity.timeline?.steps.find((s) => s.timestamp && DELIVERY_STEP_LABELS.includes(s.label));
  return step ? step.timestamp.split(',')[0] : null;
}

// Shared by getOrderStatus (a multi-item order's line items) and
// getShipmentStatus (a multi-product shipment's sibling orders) — both are
// "N things with their own status, roll up into one pill" the same way. A
// unit needing attention (payment failed, damage reported, on hold...)
// always outranks the delivered/in-transit count — the pill should surface
// the one thing blocking things, not dilute it into "3 of 4 delivered" as if
// everything were just running late.
function deriveGroupStatus(units) {
  const flagged = units.find((unit) => unit.status.dot === 'red');
  if (flagged) return flagged.status;
  const total = units.length;
  const delivered = units.filter((unit) => unit.status.label === 'Delivered').length;
  if (delivered === total) return { dot: 'green', label: 'All Items Delivered' };
  if (delivered === 0) return { dot: 'blue', label: `${total} Items · In Transit` };
  return { dot: 'blue', label: `${delivered} of ${total} Items Delivered` };
}

// Multi-item orders don't carry a static status — it's derived from each line
// item's own status, so the parent pill always reflects reality (one item
// still in transit while the rest are delivered) instead of a hand-authored
// order.status drifting from what the items actually say.
export function getOrderStatus(order) {
  if (!order.items) return order.status;
  return deriveGroupStatus(order.items);
}

// Same idea, for a shipment made of sibling top-level orders (different
// products, each with its own order.status) rather than one order's line
// items — used by ShipmentCard when the units in a shipment aren't all the
// same SKU.
export function getShipmentStatus(units) {
  return deriveGroupStatus(units);
}

// After Edit Order changes a line item's price (qty or size change), the
// order's own amount/priceBreakup are re-derived from its items rather than
// left stale — same discount/shipping/tax, new item total.
export function recomputeOrderTotals(order) {
  if (!order.items) return;
  const itemPrice = order.items.reduce((sum, item) => sum + item.price, 0);
  const { discount = 0, shipping = 0, tax = 0 } = order.priceBreakup ?? {};
  const total = itemPrice - discount + shipping + tax;
  order.priceBreakup = { ...order.priceBreakup, itemPrice, total };
  order.amount = total;
}

// One shared demo shipping address — real apps show a per-order address, but
// for this prototype a single consistent one is enough.
const DEMO_ADDRESS = 'H.No. 24, Sector 44, Gurugram, Haryana 122003';

// Shipment-level detail (courier + tracking/AWB number) — the thing Amazon
// and Flipkart always surface once a parcel is actually with a courier, and
// this app didn't carry at all until now. Keyed by order id for a
// single-shipment order, or by the line item's own `sku` for a multi-item
// order where each item can travel with a different courier. Deliberately
// absent for anything not yet handed to a courier (on hold, payment failed,
// still packing) — same reasoning as a real AWB not existing before pickup.
// Items shipped in the same parcel (per their own timeline copy) share one
// courier + AWB; a backordered/split item gets its own.
const SHIPMENTS = {
  TSC89203: { courier: 'Ecom Express', awb: 'EE38291056473' },
  TSC91100: { courier: 'Delhivery', awb: '3455102938201' },
  TSC88320: { courier: 'Bluedart', awb: '77048291056' },
  TSC96210: { courier: 'Ecom Express', awb: 'EE29384756102' },
  TSC85611: { courier: 'Delhivery', awb: '1029384756123' },
  TSC83940: { courier: 'Xpressbees', awb: 'XB8172635401' },
  TSC82341: { courier: 'Delhivery', awb: '1084756392017' },
  TSC79902: { courier: 'DTDC', awb: 'D7283910456' },
  TSC75890: { courier: 'Bluedart', awb: '77029384756' },
  TSC70021: { courier: 'Delhivery', awb: '1057382910234' },
  TSC93001: { courier: 'Delhivery', awb: '1046372819501' },
  TSC93002: { courier: 'Delhivery', awb: '1046372819502' },
  TSC93003: { courier: 'Delhivery', awb: '1046372819503' },
};

export function getShipmentInfo(key) {
  return SHIPMENTS[key] ?? null;
}

export const ORDERS = [

  {
    id: 'TSC89203',
    section: 'needsAttention',
    date: '15 Jul 2026',
    image: imgBedElev8Adjustable,
    status: { dot: 'red', label: 'Damaged — Reported' },
    product: 'Elev8 Smart Adjustable Bed Frame (Queen / Grey)',
    caption: 'Reported on 14 Jul 2026 · Investigation in progress',
    actions: [{ label: 'Track Investigation', variant: 'secondary' }],
    amount: 22999,
    address: DEMO_ADDRESS,
    payment: { method: 'Credit Card', status: 'Paid' },
    priceBreakup: { itemPrice: 24999, shipping: 0, discount: 2000, tax: 0, total: 22999 },
    timeline: {
      steps: [
        {
          label: 'Order Confirmed',
          timestamp: '15 Jul 2026, 11:20 AM',
          updates: [
            { text: 'Order has been confirmed', timestamp: '15 Jul 2026, 11:20 AM' },
            { text: 'We are preparing your order', timestamp: '15 Jul 2026, 2:00 PM' },
          ],
        },
        {
          label: 'Delivered',
          timestamp: '20 Jul 2026, 4:10 PM',
          updates: [
            { text: 'Item has been shipped', timestamp: '18 Jul 2026, 10:00 AM' },
            { text: 'Out for delivery', timestamp: '20 Jul 2026, 9:00 AM' },
            { text: 'Delivered — signed for at the doorstep', timestamp: '20 Jul 2026, 4:10 PM' },
          ],
        },
        {
          label: 'Damage Reported',
          timestamp: '14 Jul 2026, 6:00 PM',
          description: 'Awaiting evidence photos',
          updates: [
            { text: 'Damage reported by customer', timestamp: '14 Jul 2026, 6:00 PM' },
            { text: 'Warranty claim opened — awaiting evidence photos', timestamp: '14 Jul 2026, 6:05 PM' },
          ],
        },
      ],
      currentIndex: 2,
    },
    intentOverrides: { warranty: 'Already mid-claim — see the evidence request above' },
  },

  {
    id: 'TSC91100',
    section: 'inProgress',
    date: '08 Aug 2026',
    image: imgPillowHybrid,
    badge: 'Express',
    status: { dot: 'blue', label: 'Out for Delivery' },
    product: 'Smart Hybrid Pillow (Set of 2 / Memory Foam)',
    qty: 2,
    caption: 'Arriving today by 6 PM',
    // Already out for delivery — "Reschedule" doesn't apply once it's with the
    // courier, so this only offers Track (no default-paired reschedule action).
    tracker: { steps: ['Confirmed', 'Shipped', 'Out for Delivery', 'Delivered'], currentIndex: 2 },
    actions: [{ label: 'Track Order', variant: 'secondary' }],
    amount: 4398,
    address: DEMO_ADDRESS,
    payment: { method: 'UPI', status: 'Paid' },
    priceBreakup: { itemPrice: 4398, shipping: 0, discount: 0, tax: 0, total: 4398 },
    timeline: {
      steps: [
        {
          label: 'Confirmed',
          timestamp: '06 Aug 2026, 11:00 AM',
          updates: [
            { text: 'Order processing has been initiated', timestamp: '06 Aug 2026, 11:00 AM' },
            { text: 'Order has been confirmed', timestamp: '06 Aug 2026, 11:02 AM' },
            { text: 'We are processing your order', timestamp: '06 Aug 2026, 1:15 PM' },
          ],
        },
        {
          label: 'Shipped',
          timestamp: '07 Aug 2026, 8:30 AM',
          updates: [
            { text: 'We have handed over the item to courier', timestamp: '07 Aug 2026, 8:30 AM' },
            { text: 'Item has reached the courier facility in Gurugram, Haryana', timestamp: '07 Aug 2026, 11:45 AM' },
            { text: 'Item has left the courier facility in Gurugram, Haryana', timestamp: '07 Aug 2026, 9:20 PM' },
            { text: 'Item has reached the courier facility in Delhi Hub', timestamp: '08 Aug 2026, 3:10 AM' },
          ],
        },
        {
          label: 'Out for Delivery',
          timestamp: '08 Aug 2026, 9:00 AM',
          updates: [
            { text: 'Item has left the courier facility in Delhi Hub', timestamp: '08 Aug 2026, 6:40 AM' },
            { text: 'Out for delivery, arriving today by 6 PM', timestamp: '08 Aug 2026, 9:00 AM' },
          ],
        },
        { label: 'Delivered', timestamp: null, expectedDate: '08 Aug 2026' },
      ],
      currentIndex: 2,
    },
    homeTracker: {
      steps: [
        { label: 'Confirmed', date: '06 Aug' },
        { label: 'Shipped', date: '07 Aug' },
        { label: 'Out for Delivery', date: '08 Aug' },
        { label: 'Delivered', date: '08 Aug' },
      ],
      currentIndex: 2,
    },
  },
  {
    id: 'TSC90677',
    section: 'inProgress',
    date: '01 Aug 2026',
    image: imgPillowPregnancy,
    status: { dot: 'blue', label: 'Confirmed · Packing' },
    product: 'Smart Pregnancy Pillow (U-Shape / Memory Foam)',
    caption: 'Estimated delivery: 06 Aug 2026',
    tracker: { steps: ['Confirmed', 'Packing', 'Shipped', 'Delivered'], currentIndex: 1 },
    actions: [{ label: 'Track Order', variant: 'secondary' }],
    amount: 1999,
    address: DEMO_ADDRESS,
    payment: { method: 'COD', status: 'Pending' },
    priceBreakup: { itemPrice: 1999, shipping: 0, discount: 0, tax: 0, total: 1999 },
    timeline: {
      steps: [
        {
          label: 'Confirmed',
          timestamp: '01 Aug 2026, 6:05 PM',
          updates: [
            { text: 'Order has been confirmed', timestamp: '01 Aug 2026, 6:05 PM' },
            { text: 'Cash on Delivery confirmation received', timestamp: '01 Aug 2026, 6:10 PM' },
          ],
        },
        {
          label: 'Packing',
          timestamp: '02 Aug 2026, 10:00 AM',
          updates: [{ text: 'We have started packing your order', timestamp: '02 Aug 2026, 10:00 AM' }],
        },
        { label: 'Shipped', timestamp: null },
        { label: 'Delivered', timestamp: null, expectedDate: '06 Aug 2026' },
      ],
      currentIndex: 1,
    },
    homeTracker: {
      steps: [
        { label: 'Confirmed', date: '01 Aug' },
        { label: 'Packing', date: '02 Aug' },
        { label: 'Shipped' },
        { label: 'Delivered', date: '06 Aug' },
      ],
      currentIndex: 1,
    },
  },
  {
    id: 'TSC88320',
    section: 'inProgress',
    date: '28 Jul 2026',
    image: imgSofaLuxeGrande,
    status: { dot: 'blue', label: 'Installation Scheduled' },
    product: 'Luxe Grande Recliner Sofa (Royal Blue / 3 Seater)',
    caption: 'Technician visit: 06 Aug 2026, 10 AM – 12 PM',
    technician: { name: 'Rajesh Kumar', phone: '+919876543210', phoneDisplay: '+91 98765 43210' },
    installationStatus: 'confirmed',
    installationSlot: { date: '06 Aug 2026', window: '10 AM – 12 PM' },
    actions: [],
    amount: 44999,
    address: DEMO_ADDRESS,
    payment: { method: 'EMI', status: 'Paid' },
    priceBreakup: { itemPrice: 44999, shipping: 0, discount: 0, tax: 0, total: 44999 },
    timeline: {
      steps: [
        {
          label: 'Order Confirmed',
          timestamp: '28 Jul 2026, 1:00 PM',
          updates: [
            { text: 'Order has been confirmed', timestamp: '28 Jul 2026, 1:00 PM' },
            { text: 'We are processing your order', timestamp: '28 Jul 2026, 4:30 PM' },
          ],
        },
        {
          label: 'Delivered',
          timestamp: '02 Aug 2026, 3:20 PM',
          updates: [
            { text: 'Item has been shipped from the warehouse', timestamp: '30 Jul 2026, 10:15 AM' },
            { text: 'Out for delivery', timestamp: '02 Aug 2026, 11:00 AM' },
            { text: 'Delivered — signed for at the doorstep', timestamp: '02 Aug 2026, 3:20 PM' },
          ],
        },
        {
          label: 'Installation Scheduled',
          timestamp: '03 Aug 2026, 9:00 AM',
          description: '06 Aug 2026, 10 AM – 12 PM',
          updates: [
            { text: 'Installation request raised', timestamp: '03 Aug 2026, 9:00 AM' },
            { text: 'Technician Rajesh Kumar assigned', timestamp: '03 Aug 2026, 2:45 PM' },
            { text: 'Visit slot confirmed: 06 Aug 2026, 10 AM – 12 PM', timestamp: '03 Aug 2026, 2:50 PM' },
          ],
        },
        { label: 'Installation Completed', timestamp: null, expectedDate: '06 Aug 2026' },
      ],
      currentIndex: 2,
    },
    // Home's ongoing-orders preview cards read from homeTracker, not
    // section — any inProgress order can opt in with a dated tracker.
    homeTracker: {
      steps: [
        { label: 'Ordered', date: '28 Jul' },
        { label: 'Delivered', date: '02 Aug' },
        { label: 'Installation', date: '06 Aug' },
        { label: 'Complete', date: '06 Aug' },
      ],
      currentIndex: 2,
    },
  },
  // Delivered, but installation hasn't been booked yet — the app proposes a
  // default slot 48 hours out and surfaces it for confirmation rather than
  // auto-booking it, so "Schedule Installation" always ends in an explicit
  // confirm tap (see InstallationSchedule.jsx).
  {
    id: 'TSC96210',
    section: 'inProgress',
    date: '10 Aug 2026',
    image: imgBedElev8Adjustable,
    status: { dot: 'blue', label: 'Installation Pending' },
    product: 'Elev8 Smart Adjustable Bed Frame (Queen / Grey)',
    caption: 'Delivered — confirm your installation slot',
    installationStatus: 'pending',
    installationSlot: { date: '12 Aug 2026', window: '10 AM – 12 PM' },
    actions: [{ label: 'Reschedule Installation', variant: 'secondary' }],
    amount: 22999,
    address: DEMO_ADDRESS,
    payment: { method: 'UPI', status: 'Paid' },
    priceBreakup: { itemPrice: 22999, shipping: 0, discount: 0, tax: 0, total: 22999 },
    timeline: {
      steps: [
        {
          label: 'Order Confirmed',
          timestamp: '08 Aug 2026, 11:00 AM',
          updates: [
            { text: 'Order has been confirmed', timestamp: '08 Aug 2026, 11:00 AM' },
            { text: 'We are processing your order', timestamp: '08 Aug 2026, 1:30 PM' },
          ],
        },
        {
          label: 'Delivered',
          timestamp: '10 Aug 2026, 2:15 PM',
          updates: [
            { text: 'Item has been shipped', timestamp: '09 Aug 2026, 9:00 AM' },
            { text: 'Out for delivery', timestamp: '10 Aug 2026, 9:30 AM' },
            { text: 'Delivered — signed for at the doorstep', timestamp: '10 Aug 2026, 2:15 PM' },
          ],
        },
        {
          label: 'Installation Pending',
          timestamp: '10 Aug 2026, 2:20 PM',
          description: 'We propose 12 Aug 2026, 10 AM – 12 PM — confirm or choose another slot',
          updates: [
            {
              text: 'A default installation slot has been proposed within 48 hours of delivery',
              timestamp: '10 Aug 2026, 2:20 PM',
            },
          ],
        },
        { label: 'Installation Completed', timestamp: null, expectedDate: '12 Aug 2026' },
      ],
      currentIndex: 2,
    },
    homeTracker: {
      steps: [
        { label: 'Delivered', date: '10 Aug' },
        { label: 'Installation', date: '12 Aug' },
        { label: 'Complete', date: '12 Aug' },
      ],
      currentIndex: 1,
    },
  },
  {
    id: 'TSC85611',
    section: 'inProgress',
    date: '18 Jul 2026',
    image: imgChairOnyxOrthopedic,
    status: { dot: 'blue', label: 'Return Pickup Scheduled' },
    product: 'Onyx Orthopedic Office Chair (Black)',
    color: 'Black',
    caption: 'Pickup 05 Aug 2026, 2 PM – 6 PM',
    tracker: { steps: ['Pickup Scheduled', 'Picked Up', 'Quality Check', 'Refund Initiated'], currentIndex: 0 },
    actions: [
      { label: 'Track Return', variant: 'secondary' },
      { label: 'Manage Return', variant: 'secondary' },
    ],
    intentOverrides: { returnReplace: 'A return is already in progress for this order' },
    amount: 10999,
    address: DEMO_ADDRESS,
    payment: { method: 'UPI', status: 'Paid' },
    priceBreakup: { itemPrice: 10999, shipping: 0, discount: 0, tax: 0, total: 10999 },
    timeline: {
      steps: [
        {
          label: 'Order Confirmed',
          timestamp: '18 Jul 2026, 4:00 PM',
          updates: [
            { text: 'Order has been confirmed', timestamp: '18 Jul 2026, 4:00 PM' },
            { text: 'We are processing your order', timestamp: '18 Jul 2026, 6:00 PM' },
          ],
        },
        {
          label: 'Delivered',
          timestamp: '23 Jul 2026, 12:40 PM',
          updates: [
            { text: 'Item has been shipped', timestamp: '20 Jul 2026, 9:00 AM' },
            { text: 'Out for delivery', timestamp: '23 Jul 2026, 9:00 AM' },
            { text: 'Delivered — signed for at the doorstep', timestamp: '23 Jul 2026, 12:40 PM' },
          ],
        },
        {
          label: 'Return Requested',
          timestamp: '02 Aug 2026, 10:00 AM',
          updates: [
            { text: 'Return request submitted', timestamp: '02 Aug 2026, 10:00 AM' },
            { text: 'Return approved', timestamp: '02 Aug 2026, 2:00 PM' },
          ],
        },
        {
          label: 'Pickup Scheduled',
          timestamp: '03 Aug 2026, 9:15 AM',
          updates: [{ text: 'Pickup slot confirmed: 05 Aug 2026, 2 PM – 6 PM', timestamp: '03 Aug 2026, 9:15 AM' }],
        },
        { label: 'Refund Initiated', timestamp: null, expectedDate: '05 Aug 2026' },
      ],
      currentIndex: 3,
    },
  },
  {
    id: 'TSC83940',
    section: 'inProgress',
    date: '12 Jul 2026',
    image: imgMattressOrthoRoyale,
    status: { dot: 'blue', label: 'Replacement Dispatched' },
    product: 'Smart Ortho Royale Mattress (King / 8 inch / 72x78 in)',
    caption: 'Replacing damaged unit. ETA 07 Aug 2026',
    tracker: { steps: ['Confirmed', 'Dispatched', 'Out for Delivery', 'Delivered'], currentIndex: 1 },
    actions: [{ label: 'Track Replacement', variant: 'secondary' }],
    intentOverrides: { returnReplace: 'A replacement is already in progress for this order' },
    amount: 40990,
    address: DEMO_ADDRESS,
    payment: { method: 'Net Banking', status: 'Paid' },
    priceBreakup: { itemPrice: 40990, shipping: 0, discount: 0, tax: 0, total: 40990 },
    timeline: {
      steps: [
        {
          label: 'Order Confirmed',
          timestamp: '12 Jul 2026, 2:00 PM',
          updates: [
            { text: 'Order has been confirmed', timestamp: '12 Jul 2026, 2:00 PM' },
            { text: 'We are processing your order', timestamp: '12 Jul 2026, 4:00 PM' },
          ],
        },
        {
          label: 'Delivered',
          timestamp: '17 Jul 2026, 11:00 AM',
          updates: [
            { text: 'Item has been shipped', timestamp: '14 Jul 2026, 10:00 AM' },
            { text: 'Out for delivery', timestamp: '17 Jul 2026, 8:00 AM' },
            { text: 'Delivered — signed for at the doorstep', timestamp: '17 Jul 2026, 11:00 AM' },
          ],
        },
        {
          label: 'Replacement Confirmed',
          timestamp: '30 Jul 2026, 9:00 AM',
          updates: [{ text: 'Replacement approved after damage assessment', timestamp: '30 Jul 2026, 9:00 AM' }],
        },
        {
          label: 'Replacement Dispatched',
          timestamp: '01 Aug 2026, 8:00 AM',
          updates: [{ text: 'Replacement unit packed and handed to courier', timestamp: '01 Aug 2026, 8:00 AM' }],
        },
        { label: 'Delivered', timestamp: null, expectedDate: '07 Aug 2026' },
      ],
      currentIndex: 3,
    },
  },
  {
    id: 'TSC82341',
    section: 'deliveredDone',
    date: '02 Mar 2026',
    image: imgChairElitePremium,
    status: { dot: 'green', label: 'Delivered' },
    product: 'Elite Premium Office Chair (Charcoal Grey)',
    color: 'Charcoal Grey',
    caption: 'Delivered on 15 May 2026',
    rating: 0,
    actions: [],
    amount: 44999,
    address: DEMO_ADDRESS,
    payment: { method: 'Credit Card', status: 'Paid' },
    priceBreakup: { itemPrice: 57344, shipping: 0, discount: 12345, tax: 0, total: 44999 },
    timeline: {
      steps: [
        {
          label: 'Order Confirmed',
          timestamp: '02 Mar 2026, 10:00 AM',
          updates: [
            { text: 'Order has been confirmed', timestamp: '02 Mar 2026, 10:00 AM' },
            { text: 'We are processing your order', timestamp: '02 Mar 2026, 1:00 PM' },
          ],
        },
        {
          label: 'Shipped',
          timestamp: '05 Mar 2026, 2:00 PM',
          updates: [
            { text: 'Item has been handed over to courier', timestamp: '05 Mar 2026, 2:00 PM' },
            { text: 'Item has reached the courier facility in Gurugram, Haryana', timestamp: '06 Mar 2026, 9:00 AM' },
          ],
        },
        {
          label: 'Delivered',
          timestamp: '15 May 2026, 1:48 PM',
          updates: [
            { text: 'Out for delivery', timestamp: '15 May 2026, 9:00 AM' },
            { text: 'Delivered — signed for at the doorstep', timestamp: '15 May 2026, 1:48 PM' },
          ],
        },
      ],
      currentIndex: 2,
    },
  },
  {
    id: 'TSC79902',
    section: 'deliveredDone',
    date: '10 Jan 2026',
    image: imgMattressLuxeRoyale,
    status: { dot: 'green', label: 'Exchange Completed' },
    product: 'Smart Luxe Royale Mattress (Queen / 8 inch / 60x78 in)',
    color: 'Ivory White',
    caption: 'Completed on 11 Apr 2026',
    savings: 'You saved ₹12,345 on this item',
    actions: [],
    amount: 40990,
    address: DEMO_ADDRESS,
    payment: { method: 'UPI', status: 'Paid' },
    priceBreakup: { itemPrice: 53335, shipping: 0, discount: 12345, tax: 0, total: 40990 },
    timeline: {
      steps: [
        {
          label: 'Order Confirmed',
          timestamp: '10 Jan 2026, 9:00 AM',
          updates: [
            { text: 'Order has been confirmed', timestamp: '10 Jan 2026, 9:00 AM' },
            { text: 'We are processing your order', timestamp: '10 Jan 2026, 11:30 AM' },
          ],
        },
        {
          label: 'Delivered',
          timestamp: '15 Jan 2026, 3:30 PM',
          updates: [
            { text: 'Item has been shipped', timestamp: '12 Jan 2026, 10:00 AM' },
            { text: 'Out for delivery', timestamp: '15 Jan 2026, 9:00 AM' },
            { text: 'Delivered — signed for at the doorstep', timestamp: '15 Jan 2026, 3:30 PM' },
          ],
        },
        {
          label: 'Exchange Requested',
          timestamp: '02 Apr 2026, 10:00 AM',
          updates: [
            { text: 'Exchange request submitted', timestamp: '02 Apr 2026, 10:00 AM' },
            { text: 'Exchange approved', timestamp: '02 Apr 2026, 3:00 PM' },
          ],
        },
        {
          label: 'Exchange Completed',
          timestamp: '11 Apr 2026, 4:00 PM',
          updates: [{ text: 'Replacement unit delivered and old unit picked up', timestamp: '11 Apr 2026, 4:00 PM' }],
        },
      ],
      currentIndex: 3,
    },
  },
  {
    id: 'TSC75890',
    section: 'deliveredDone',
    date: '20 Dec 2025',
    image: imgDeskAeroplus,
    badge: 'Express',
    status: { dot: 'green', label: 'Installation Completed' },
    product: 'AeroPlus Adjustable Desk (Oak / 120x60 cm)',
    caption: 'Installed on 23 Dec 2025',
    savings: 'You saved ₹8,200 on this item',
    rating: 0,
    actions: [{ label: 'Report an Issue', variant: 'secondary' }],
    amount: 20999,
    address: DEMO_ADDRESS,
    payment: { method: 'UPI', status: 'Paid' },
    priceBreakup: { itemPrice: 29199, shipping: 0, discount: 8200, tax: 0, total: 20999 },
    timeline: {
      steps: [
        {
          label: 'Order Confirmed',
          timestamp: '20 Dec 2025, 11:30 AM',
          updates: [
            { text: 'Order has been confirmed', timestamp: '20 Dec 2025, 11:30 AM' },
            { text: 'We are processing your order', timestamp: '20 Dec 2025, 2:00 PM' },
          ],
        },
        {
          label: 'Delivered',
          timestamp: '22 Dec 2025, 2:00 PM',
          updates: [
            { text: 'Item has been shipped', timestamp: '21 Dec 2025, 9:00 AM' },
            { text: 'Out for delivery', timestamp: '22 Dec 2025, 10:00 AM' },
            { text: 'Delivered — signed for at the doorstep', timestamp: '22 Dec 2025, 2:00 PM' },
          ],
        },
        {
          label: 'Installation Completed',
          timestamp: '23 Dec 2025, 5:00 PM',
          updates: [{ text: 'Technician visit completed and desk assembled', timestamp: '23 Dec 2025, 5:00 PM' }],
        },
      ],
      currentIndex: 2,
    },
  },
  {
    id: 'TSC70021',
    section: 'closed',
    date: '05 Nov 2025',
    image: imgMattressOrtho,
    status: { dot: 'muted', label: 'Refund Completed' },
    product: 'Smart Ortho Mattress (Single / 5 inch / 36x75 in)',
    refundNote: '₹32,235 refunded to source account',
    actions: [],
    amount: 9490,
    address: DEMO_ADDRESS,
    payment: { method: 'Credit Card', status: 'Refunded' },
    priceBreakup: { itemPrice: 9490, shipping: 0, discount: 0, tax: 0, total: 9490 },
    timeline: {
      steps: [
        {
          label: 'Order Confirmed',
          timestamp: '20 Oct 2025, 10:00 AM',
          updates: [
            { text: 'Order has been confirmed', timestamp: '20 Oct 2025, 10:00 AM' },
            { text: 'We are processing your order', timestamp: '20 Oct 2025, 1:00 PM' },
          ],
        },
        {
          label: 'Delivered',
          timestamp: '25 Oct 2025, 1:00 PM',
          updates: [
            { text: 'Item has been shipped', timestamp: '22 Oct 2025, 9:00 AM' },
            { text: 'Out for delivery', timestamp: '25 Oct 2025, 9:00 AM' },
            { text: 'Delivered — signed for at the doorstep', timestamp: '25 Oct 2025, 1:00 PM' },
          ],
        },
        {
          label: 'Return Picked Up',
          timestamp: '02 Nov 2025, 11:00 AM',
          updates: [{ text: 'Courier picked up the returned item', timestamp: '02 Nov 2025, 11:00 AM' }],
        },
        {
          label: 'Refund Completed',
          timestamp: '05 Nov 2025, 11:30 AM',
          updates: [{ text: 'Refund processed to source account', timestamp: '05 Nov 2025, 11:30 AM' }],
        },
      ],
      currentIndex: 3,
    },
    refund: {
      amount: 32235,
      method: 'Source account (UPI)',
      expectedDate: '05 Nov 2025',
      timeline: {
        steps: [
          { label: 'Refund Triggered', timestamp: '02 Nov 2025, 11:00 AM' },
          { label: 'Initiated at Bank', timestamp: '03 Nov 2025, 9:00 AM' },
          { label: 'Credited', timestamp: '05 Nov 2025, 11:30 AM' },
        ],
        currentIndex: 2,
      },
    },
  },
  {
    id: 'TSC68441',
    section: 'closed',
    date: '15 Oct 2025',
    image: imgPillowCervical,
    status: { dot: 'muted', label: 'Cancelled' },
    product: 'Smart Cervical Pillow (Standard / Memory Foam)',
    caption: 'Cancelled on 16 Oct 2025',
    actions: [{ label: 'Reorder', variant: 'secondary' }],
    amount: 2199,
    address: DEMO_ADDRESS,
    payment: { method: 'UPI', status: 'Refunded' },
    priceBreakup: { itemPrice: 2199, shipping: 0, discount: 0, tax: 0, total: 2199 },
    timeline: {
      steps: [
        {
          label: 'Order Confirmed',
          timestamp: '15 Oct 2025, 8:00 AM',
          updates: [{ text: 'Order has been confirmed', timestamp: '15 Oct 2025, 8:00 AM' }],
        },
        {
          label: 'Cancelled',
          timestamp: '16 Oct 2025, 10:00 AM',
          description: 'Cancelled as per your request',
          updates: [
            { text: 'Order cancelled as per your request', timestamp: '16 Oct 2025, 10:00 AM' },
            { text: 'Refund of ₹2,199 initiated to original payment method', timestamp: '16 Oct 2025, 10:05 AM' },
          ],
        },
      ],
      currentIndex: 1,
    },
  },
  // RTO (Return to Origin): the courier couldn't complete delivery and the
  // parcel is heading back to the warehouse instead — distinct from a
  // customer-initiated return (TSC85611) or a pre-delivery cancellation
  // intercept (rto.js's post-cancel sub-flow, which lands an order here too
  // once triggered — see RtoReplaceFlow.jsx). One order mid-transit back to
  // origin, one already refunded, so the RTO tab shows both live states.
  {
    id: 'TSC80215',
    section: 'inProgress',
    date: '10 Aug 2026',
    image: imgMattressOrthoRoyale,
    banner: { icon: 'alert', text: 'Delivery Failed' },
    status: { dot: 'red', label: 'Delivery Delayed' },
    product: 'Smart Ortho Royale Mattress (King / 8 inch / 72x78 in)',
    caption: 'Courier could not deliver after 3 attempts · Returning to warehouse',
    tracker: { steps: ['Delivery Failed', 'Delivery Delayed', 'Received at Warehouse', 'Refund Initiated'], currentIndex: 1 },
    actions: [{ label: 'Track Delay', variant: 'secondary' }],
    amount: 40990,
    address: DEMO_ADDRESS,
    payment: { method: 'UPI', status: 'Paid' },
    priceBreakup: { itemPrice: 40990, shipping: 0, discount: 0, tax: 0, total: 40990 },
    timeline: {
      steps: [
        {
          label: 'Order Confirmed',
          timestamp: '01 Aug 2026, 10:00 AM',
          updates: [
            { text: 'Order has been confirmed', timestamp: '01 Aug 2026, 10:00 AM' },
            { text: 'We are processing your order', timestamp: '01 Aug 2026, 1:00 PM' },
          ],
        },
        {
          label: 'Shipped',
          timestamp: '03 Aug 2026, 9:00 AM',
          updates: [{ text: 'Item has been handed over to courier', timestamp: '03 Aug 2026, 9:00 AM' }],
        },
        {
          label: 'Delivery Attempts Failed',
          timestamp: '09 Aug 2026, 1:00 PM',
          description: 'Recipient unavailable at address',
          updates: [
            { text: 'First delivery attempt failed — recipient unavailable', timestamp: '07 Aug 2026, 2:00 PM' },
            { text: 'Second attempt failed — recipient unavailable', timestamp: '08 Aug 2026, 3:00 PM' },
            { text: 'Third attempt failed — marked undeliverable', timestamp: '09 Aug 2026, 1:00 PM' },
          ],
        },
        {
          label: 'Delivery Delayed',
          timestamp: '10 Aug 2026, 10:00 AM',
          description: 'Courier returning parcel to origin warehouse',
          updates: [{ text: 'Shipment marked return-to-origin after failed delivery attempts', timestamp: '10 Aug 2026, 10:00 AM' }],
        },
        { label: 'Received at Warehouse', timestamp: null },
        { label: 'Refund Initiated', timestamp: null },
      ],
      currentIndex: 3,
    },
  },
  {
    id: 'TSC77320',
    section: 'closed',
    date: '20 Jun 2026',
    image: imgChairElitePremium,
    status: { dot: 'green', label: 'Delivery Delayed — Refund Processed' },
    product: 'Elite Premium Office Chair (Charcoal Grey)',
    color: 'Onyx Black',
    refundNote: '₹38,499 refunded to source account',
    actions: [],
    amount: 38499,
    address: DEMO_ADDRESS,
    payment: { method: 'Credit Card', status: 'Refunded' },
    priceBreakup: { itemPrice: 38499, shipping: 0, discount: 0, tax: 0, total: 38499 },
    timeline: {
      steps: [
        {
          label: 'Order Confirmed',
          timestamp: '01 Jun 2026, 11:00 AM',
          updates: [{ text: 'Order has been confirmed', timestamp: '01 Jun 2026, 11:00 AM' }],
        },
        {
          label: 'Shipped',
          timestamp: '03 Jun 2026, 9:00 AM',
          updates: [{ text: 'Item has been handed over to courier', timestamp: '03 Jun 2026, 9:00 AM' }],
        },
        {
          label: 'Delivery Attempts Failed',
          timestamp: '07 Jun 2026, 4:00 PM',
          description: 'Address could not be located',
          updates: [{ text: 'Delivery attempts failed — address undeliverable', timestamp: '07 Jun 2026, 4:00 PM' }],
        },
        {
          label: 'Delivery Delayed',
          timestamp: '08 Jun 2026, 10:00 AM',
          updates: [{ text: 'Shipment marked return-to-origin after failed delivery attempts', timestamp: '08 Jun 2026, 10:00 AM' }],
        },
        {
          label: 'Received at Warehouse',
          timestamp: '14 Jun 2026, 2:00 PM',
          updates: [{ text: 'Returned parcel received and quality-checked at warehouse', timestamp: '14 Jun 2026, 2:00 PM' }],
        },
        {
          label: 'Refund Completed',
          timestamp: '20 Jun 2026, 11:30 AM',
          updates: [{ text: 'Refund processed to source account', timestamp: '20 Jun 2026, 11:30 AM' }],
        },
      ],
      currentIndex: 5,
    },
    refund: {
      amount: 38499,
      method: 'Source account (Credit Card)',
      expectedDate: '20 Jun 2026',
      timeline: {
        steps: [
          { label: 'Refund Triggered', timestamp: '15 Jun 2026, 9:00 AM' },
          { label: 'Initiated at Bank', timestamp: '16 Jun 2026, 9:00 AM' },
          { label: 'Credited', timestamp: '20 Jun 2026, 11:30 AM' },
        ],
        currentIndex: 2,
      },
    },
  },
  // Three units of the same SKU shipped together — the one demo shipment
  // with multiple line items, grouped under a shared shipment-level status
  // by ShipmentCard (see MyOrders.jsx) instead of three separate cards each
  // repeating "Delivered". Each still has a real id/timeline of its own so
  // OrderDetails/ReturnReplace continue to work per line item, unchanged.
  {
    id: 'TSC93001',
    shipmentId: 'SHP93001',
    section: 'deliveredDone',
    date: '20 Nov 2025',
    image: imgBedElev8Adjustable,
    status: { dot: 'green', label: 'Delivered' },
    product: 'Recliner Bed with Italia Frame (King / Walnut Finish)',
    qty: 1,
    actions: [],
    amount: 54999,
    address: DEMO_ADDRESS,
    payment: { method: 'Credit Card', status: 'Paid' },
    priceBreakup: { itemPrice: 54999, shipping: 0, discount: 0, tax: 0, total: 54999 },
    timeline: {
      steps: [
        {
          label: 'Order Confirmed',
          timestamp: '15 Nov 2025, 11:00 AM',
          updates: [
            { text: 'Order has been confirmed', timestamp: '15 Nov 2025, 11:00 AM' },
            { text: 'We are processing your order', timestamp: '15 Nov 2025, 2:00 PM' },
          ],
        },
        {
          label: 'Shipped',
          timestamp: '17 Nov 2025, 9:00 AM',
          updates: [
            { text: 'Item has been handed over to courier', timestamp: '17 Nov 2025, 9:00 AM' },
            { text: 'Item has reached the courier facility in Gurugram, Haryana', timestamp: '17 Nov 2025, 3:00 PM' },
          ],
        },
        {
          label: 'Delivered',
          timestamp: '20 Nov 2025, 2:00 PM',
          updates: [
            { text: 'Out for delivery', timestamp: '20 Nov 2025, 9:00 AM' },
            { text: 'Delivered — signed for at the doorstep', timestamp: '20 Nov 2025, 2:00 PM' },
          ],
        },
      ],
      currentIndex: 2,
    },
  },
  {
    id: 'TSC93002',
    shipmentId: 'SHP93001',
    section: 'deliveredDone',
    date: '20 Nov 2025',
    image: imgBedElev8Adjustable,
    status: { dot: 'green', label: 'Delivered' },
    product: 'Recliner Bed with Italia Frame (King / Walnut Finish)',
    qty: 1,
    actions: [],
    amount: 54999,
    address: DEMO_ADDRESS,
    payment: { method: 'Credit Card', status: 'Paid' },
    priceBreakup: { itemPrice: 54999, shipping: 0, discount: 0, tax: 0, total: 54999 },
    timeline: {
      steps: [
        {
          label: 'Order Confirmed',
          timestamp: '15 Nov 2025, 11:00 AM',
          updates: [
            { text: 'Order has been confirmed', timestamp: '15 Nov 2025, 11:00 AM' },
            { text: 'We are processing your order', timestamp: '15 Nov 2025, 2:00 PM' },
          ],
        },
        {
          label: 'Shipped',
          timestamp: '17 Nov 2025, 9:00 AM',
          updates: [
            { text: 'Item has been handed over to courier', timestamp: '17 Nov 2025, 9:00 AM' },
            { text: 'Item has reached the courier facility in Gurugram, Haryana', timestamp: '17 Nov 2025, 3:00 PM' },
          ],
        },
        {
          label: 'Delivered',
          timestamp: '20 Nov 2025, 2:00 PM',
          updates: [
            { text: 'Out for delivery', timestamp: '20 Nov 2025, 9:00 AM' },
            { text: 'Delivered — signed for at the doorstep', timestamp: '20 Nov 2025, 2:00 PM' },
          ],
        },
      ],
      currentIndex: 2,
    },
  },
  {
    id: 'TSC93003',
    shipmentId: 'SHP93001',
    section: 'deliveredDone',
    date: '20 Nov 2025',
    image: imgBedElev8Adjustable,
    status: { dot: 'green', label: 'Delivered' },
    product: 'Recliner Bed with Italia Frame (King / Walnut Finish)',
    qty: 1,
    actions: [],
    amount: 54999,
    address: DEMO_ADDRESS,
    payment: { method: 'Credit Card', status: 'Paid' },
    priceBreakup: { itemPrice: 54999, shipping: 0, discount: 0, tax: 0, total: 54999 },
    timeline: {
      steps: [
        {
          label: 'Order Confirmed',
          timestamp: '15 Nov 2025, 11:00 AM',
          updates: [
            { text: 'Order has been confirmed', timestamp: '15 Nov 2025, 11:00 AM' },
            { text: 'We are processing your order', timestamp: '15 Nov 2025, 2:00 PM' },
          ],
        },
        {
          label: 'Shipped',
          timestamp: '17 Nov 2025, 9:00 AM',
          updates: [
            { text: 'Item has been handed over to courier', timestamp: '17 Nov 2025, 9:00 AM' },
            { text: 'Item has reached the courier facility in Gurugram, Haryana', timestamp: '17 Nov 2025, 3:00 PM' },
          ],
        },
        {
          label: 'Delivered',
          timestamp: '20 Nov 2025, 2:00 PM',
          updates: [
            { text: 'Out for delivery', timestamp: '20 Nov 2025, 9:00 AM' },
            { text: 'Delivered — signed for at the doorstep', timestamp: '20 Nov 2025, 2:00 PM' },
          ],
        },
      ],
      currentIndex: 2,
    },
  },
  // The large end of the combination range (5 items). All five travelled
  // and were delivered together on the same shared timeline below — the one
  // unit that's damaged only diverges *after* that shared delivery, via its
  // own extra Damaged step, so getShipmentStatus's red-flag-wins rule
  // surfaces that one unit's own status instead of a delivered count, same
  // as a flagged line item would in a multi-SKU order.
  {
    id: 'TSC98801',
    shipmentId: 'SHP98801',
    section: 'needsAttention',
    date: '13 Aug 2026',
    image: imgMattressLuxeRoyale,
    status: { dot: 'green', label: 'Delivered' },
    product: 'Smart Luxe Royale Mattress (Queen / 8 inch / 60x78 in)',
    qty: 1,
    actions: [],
    amount: 32999,
    address: DEMO_ADDRESS,
    payment: { method: 'Credit Card', status: 'Paid' },
    priceBreakup: { itemPrice: 32999, shipping: 0, discount: 0, tax: 0, total: 32999 },
    timeline: {
      steps: [
        {
          label: 'Order Confirmed',
          timestamp: '13 Aug 2026, 10:00 AM',
          updates: [{ text: 'Order has been confirmed', timestamp: '13 Aug 2026, 10:00 AM' }],
        },
        {
          label: 'Shipped',
          timestamp: '14 Aug 2026, 9:00 AM',
          updates: [{ text: 'Item has been handed over to courier', timestamp: '14 Aug 2026, 9:00 AM' }],
        },
        {
          label: 'Delivered',
          timestamp: '16 Aug 2026, 11:00 AM',
          updates: [{ text: 'Delivered — signed for at the doorstep', timestamp: '16 Aug 2026, 11:00 AM' }],
        },
      ],
      currentIndex: 2,
    },
  },
  {
    id: 'TSC98802',
    shipmentId: 'SHP98801',
    section: 'needsAttention',
    date: '13 Aug 2026',
    image: imgChairOnyxOrthopedic,
    status: { dot: 'green', label: 'Delivered' },
    product: 'Onyx Orthopedic Office Chair (Black)',
    qty: 1,
    actions: [],
    amount: 21999,
    address: DEMO_ADDRESS,
    payment: { method: 'Credit Card', status: 'Paid' },
    priceBreakup: { itemPrice: 21999, shipping: 0, discount: 0, tax: 0, total: 21999 },
    timeline: {
      steps: [
        {
          label: 'Order Confirmed',
          timestamp: '13 Aug 2026, 10:00 AM',
          updates: [{ text: 'Order has been confirmed', timestamp: '13 Aug 2026, 10:00 AM' }],
        },
        {
          label: 'Shipped',
          timestamp: '14 Aug 2026, 9:00 AM',
          updates: [{ text: 'Item has been handed over to courier', timestamp: '14 Aug 2026, 9:00 AM' }],
        },
        {
          label: 'Delivered',
          timestamp: '16 Aug 2026, 11:00 AM',
          updates: [{ text: 'Delivered — signed for at the doorstep', timestamp: '16 Aug 2026, 11:00 AM' }],
        },
      ],
      currentIndex: 2,
    },
  },
  {
    id: 'TSC98803',
    shipmentId: 'SHP98801',
    section: 'needsAttention',
    date: '13 Aug 2026',
    image: imgPillowHybrid,
    status: { dot: 'red', label: 'Damaged — Reported' },
    product: 'Smart Hybrid Pillow (Set of 2 / Memory Foam)',
    qty: 1,
    caption: 'Reported on 16 Aug 2026 · Investigation in progress',
    actions: [],
    amount: 2499,
    address: DEMO_ADDRESS,
    payment: { method: 'Credit Card', status: 'Paid' },
    priceBreakup: { itemPrice: 2499, shipping: 0, discount: 0, tax: 0, total: 2499 },
    timeline: {
      steps: [
        {
          label: 'Order Confirmed',
          timestamp: '13 Aug 2026, 10:00 AM',
          updates: [{ text: 'Order has been confirmed', timestamp: '13 Aug 2026, 10:00 AM' }],
        },
        {
          label: 'Shipped',
          timestamp: '14 Aug 2026, 9:00 AM',
          updates: [{ text: 'Item has been handed over to courier', timestamp: '14 Aug 2026, 9:00 AM' }],
        },
        {
          label: 'Delivered',
          timestamp: '16 Aug 2026, 11:00 AM',
          updates: [{ text: 'Delivered — signed for at the doorstep', timestamp: '16 Aug 2026, 11:00 AM' }],
        },
        {
          label: 'Damaged — Reported',
          timestamp: '16 Aug 2026, 4:00 PM',
          description: 'Awaiting evidence photos',
          updates: [{ text: 'Damage reported by customer', timestamp: '16 Aug 2026, 4:00 PM' }],
        },
      ],
      currentIndex: 3,
    },
  },
  {
    id: 'TSC98804',
    shipmentId: 'SHP98801',
    section: 'needsAttention',
    date: '13 Aug 2026',
    image: imgBedElev8Adjustable,
    status: { dot: 'green', label: 'Delivered' },
    product: 'Elev8 Smart Adjustable Bed Frame (Queen / Grey)',
    qty: 1,
    actions: [],
    amount: 22999,
    address: DEMO_ADDRESS,
    payment: { method: 'Credit Card', status: 'Paid' },
    priceBreakup: { itemPrice: 22999, shipping: 0, discount: 0, tax: 0, total: 22999 },
    timeline: {
      steps: [
        {
          label: 'Order Confirmed',
          timestamp: '13 Aug 2026, 10:00 AM',
          updates: [{ text: 'Order has been confirmed', timestamp: '13 Aug 2026, 10:00 AM' }],
        },
        {
          label: 'Shipped',
          timestamp: '14 Aug 2026, 9:00 AM',
          updates: [{ text: 'Item has been handed over to courier', timestamp: '14 Aug 2026, 9:00 AM' }],
        },
        {
          label: 'Delivered',
          timestamp: '16 Aug 2026, 11:00 AM',
          updates: [{ text: 'Delivered — signed for at the doorstep', timestamp: '16 Aug 2026, 11:00 AM' }],
        },
      ],
      currentIndex: 2,
    },
  },
  {
    id: 'TSC98805',
    shipmentId: 'SHP98801',
    section: 'needsAttention',
    date: '13 Aug 2026',
    image: imgPillowCervical,
    status: { dot: 'green', label: 'Delivered' },
    product: 'Smart Cervical Pillow (Standard / Memory Foam)',
    qty: 1,
    actions: [],
    amount: 2199,
    address: DEMO_ADDRESS,
    payment: { method: 'Credit Card', status: 'Paid' },
    priceBreakup: { itemPrice: 2199, shipping: 0, discount: 0, tax: 0, total: 2199 },
    timeline: {
      steps: [
        {
          label: 'Order Confirmed',
          timestamp: '13 Aug 2026, 10:00 AM',
          updates: [{ text: 'Order has been confirmed', timestamp: '13 Aug 2026, 10:00 AM' }],
        },
        {
          label: 'Shipped',
          timestamp: '14 Aug 2026, 9:00 AM',
          updates: [{ text: 'Item has been handed over to courier', timestamp: '14 Aug 2026, 9:00 AM' }],
        },
        {
          label: 'Delivered',
          timestamp: '16 Aug 2026, 11:00 AM',
          updates: [{ text: 'Delivered — signed for at the doorstep', timestamp: '16 Aug 2026, 11:00 AM' }],
        },
      ],
      currentIndex: 2,
    },
  },
  // A same-SKU shipment still in progress (not yet delivered) — exercises
  // ShipmentCard's "arriving together" caption branch, since the one other
  // same-SKU demo (SHP93001) is already fully delivered.
  {
    id: 'TSC99401',
    shipmentId: 'SHP99401',
    section: 'inProgress',
    date: '15 Aug 2026',
    image: imgMattressOrthoRoyale,
    status: { dot: 'blue', label: 'Shipped' },
    product: 'Smart Ortho Royale Mattress (King / 8 inch / 72x78 in)',
    qty: 1,
    actions: [{ label: 'Track Order', variant: 'secondary' }],
    amount: 34999,
    address: DEMO_ADDRESS,
    payment: { method: 'UPI', status: 'Paid' },
    priceBreakup: { itemPrice: 34999, shipping: 0, discount: 0, tax: 0, total: 34999 },
    timeline: {
      steps: [
        {
          label: 'Order Confirmed',
          timestamp: '15 Aug 2026, 10:00 AM',
          updates: [{ text: 'Order has been confirmed', timestamp: '15 Aug 2026, 10:00 AM' }],
        },
        {
          label: 'Shipped',
          timestamp: '16 Aug 2026, 9:00 AM',
          updates: [{ text: 'Item has been handed over to courier', timestamp: '16 Aug 2026, 9:00 AM' }],
        },
        { label: 'Delivered', timestamp: null, expectedDate: '19 Aug 2026' },
      ],
      currentIndex: 1,
    },
  },
  {
    id: 'TSC99402',
    shipmentId: 'SHP99401',
    section: 'inProgress',
    date: '15 Aug 2026',
    image: imgMattressOrthoRoyale,
    status: { dot: 'blue', label: 'Shipped' },
    product: 'Smart Ortho Royale Mattress (King / 8 inch / 72x78 in)',
    qty: 1,
    actions: [{ label: 'Track Order', variant: 'secondary' }],
    amount: 34999,
    address: DEMO_ADDRESS,
    payment: { method: 'UPI', status: 'Paid' },
    priceBreakup: { itemPrice: 34999, shipping: 0, discount: 0, tax: 0, total: 34999 },
    timeline: {
      steps: [
        {
          label: 'Order Confirmed',
          timestamp: '15 Aug 2026, 10:00 AM',
          updates: [{ text: 'Order has been confirmed', timestamp: '15 Aug 2026, 10:00 AM' }],
        },
        {
          label: 'Shipped',
          timestamp: '16 Aug 2026, 9:00 AM',
          updates: [{ text: 'Item has been handed over to courier', timestamp: '16 Aug 2026, 9:00 AM' }],
        },
        { label: 'Delivered', timestamp: null, expectedDate: '19 Aug 2026' },
      ],
      currentIndex: 1,
    },
  },
  // A pre-dispatch multi-product shipment — two different products still
  // being packed, neither shipped yet. Every other shipment demo above has
  // already left the warehouse, so this is the one reachable path for Edit
  // Order's shipment-level flow: getShipmentEditEligibility locks the whole
  // parcel together once ANY unit reaches Shipped/Dispatched/Out for
  // Delivery/Delivered, which every other shipment here already has.
  {
    id: 'TSC95301',
    shipmentId: 'SHP95300',
    section: 'inProgress',
    date: '17 Aug 2026',
    image: imgMattressOrthoPro,
    status: { dot: 'blue', label: 'Confirmed · Packing' },
    product: 'Smart Ortho Pro Mattress (Queen / 8 inch / 60x78 in)',
    qty: 1,
    actions: [{ label: 'Track Order', variant: 'secondary' }],
    amount: 17990,
    address: DEMO_ADDRESS,
    payment: { method: 'UPI', status: 'Paid' },
    priceBreakup: { itemPrice: 17990, shipping: 0, discount: 0, tax: 0, total: 17990 },
    timeline: {
      steps: [
        {
          label: 'Order Confirmed',
          timestamp: '17 Aug 2026, 10:00 AM',
          updates: [{ text: 'Order has been confirmed', timestamp: '17 Aug 2026, 10:00 AM' }],
        },
        {
          label: 'Packing',
          timestamp: '17 Aug 2026, 3:00 PM',
          updates: [{ text: 'We have started packing this item', timestamp: '17 Aug 2026, 3:00 PM' }],
        },
        { label: 'Shipped', timestamp: null },
        { label: 'Delivered', timestamp: null, expectedDate: '21 Aug 2026' },
      ],
      currentIndex: 1,
    },
  },
  {
    id: 'TSC95302',
    shipmentId: 'SHP95300',
    section: 'inProgress',
    date: '17 Aug 2026',
    image: imgChairOnyxOrthopedic,
    status: { dot: 'blue', label: 'Confirmed · Packing' },
    product: 'Onyx Orthopedic Office Chair (Black)',
    qty: 1,
    actions: [{ label: 'Track Order', variant: 'secondary' }],
    amount: 21999,
    address: DEMO_ADDRESS,
    payment: { method: 'UPI', status: 'Paid' },
    priceBreakup: { itemPrice: 21999, shipping: 0, discount: 0, tax: 0, total: 21999 },
    timeline: {
      steps: [
        {
          label: 'Order Confirmed',
          timestamp: '17 Aug 2026, 10:00 AM',
          updates: [{ text: 'Order has been confirmed', timestamp: '17 Aug 2026, 10:00 AM' }],
        },
        {
          label: 'Packing',
          timestamp: '17 Aug 2026, 3:00 PM',
          updates: [{ text: 'We have started packing this item', timestamp: '17 Aug 2026, 3:00 PM' }],
        },
        { label: 'Shipped', timestamp: null },
        { label: 'Delivered', timestamp: null, expectedDate: '21 Aug 2026' },
      ],
      currentIndex: 1,
    },
  },
  // A genuine multi-SKU cart — three different products bought together in
  // one checkout (unlike the same-SKU-×3 shipment above). Each line item
  // ships and tracks independently, so OrderDetails renders them as their
  // own expandable rows instead of one product card, and the parent status
  // above is computed from these items via getOrderStatus, not authored here.
  {
    id: 'TSC94500',
    section: 'deliveredDone',
    date: '05 Aug 2026',
    product: 'Smart Ortho Hybrid Pocketed Spring Mattress + 2 more',
    image: imgMattressOrthoHybrid,
    caption: 'All 3 items delivered on 12 Aug 2026',
    actions: [{ label: 'Track Order', variant: 'secondary' }],
    amount: 46488,
    address: DEMO_ADDRESS,
    payment: { method: 'UPI', status: 'Paid' },
    priceBreakup: { itemPrice: 46488, shipping: 0, discount: 0, tax: 0, total: 46488 },
    items: [
      {
        sku: 'TSC94500-1',
        product: 'Smart Ortho Hybrid Pocketed Spring Mattress (Queen / 8 inch / 60x78 in)',
        image: imgMattressOrthoHybrid,
        qty: 1,
        price: 21290,
        status: { dot: 'green', label: 'Delivered' },
        caption: 'Delivered on 08 Aug 2026',
        rating: 0,
        tracker: { steps: ['Confirmed', 'Shipped', 'Delivered'], currentIndex: 2 },
        timeline: {
          steps: [
            { label: 'Confirmed', timestamp: '05 Aug 2026, 10:05 AM' },
            {
              label: 'Shipped',
              timestamp: '06 Aug 2026, 9:15 AM',
              updates: [
                { text: 'We have handed over the item to courier', timestamp: '06 Aug 2026, 9:15 AM' },
                { text: 'Item has reached the courier facility in Gurugram, Haryana', timestamp: '06 Aug 2026, 1:40 PM' },
              ],
            },
            {
              label: 'Delivered',
              timestamp: '08 Aug 2026, 1:20 PM',
              updates: [
                { text: 'Out for delivery', timestamp: '08 Aug 2026, 9:00 AM' },
                { text: 'Delivered — signed for at the doorstep', timestamp: '08 Aug 2026, 1:20 PM' },
              ],
            },
          ],
          currentIndex: 2,
        },
      },
      {
        sku: 'TSC94500-2',
        product: 'Smart Hybrid Pillow (Set of 2 / Memory Foam)',
        image: imgPillowHybrid,
        qty: 1,
        price: 2199,
        status: { dot: 'green', label: 'Delivered' },
        caption: 'Delivered on 08 Aug 2026',
        rating: 0,
        tracker: { steps: ['Confirmed', 'Shipped', 'Delivered'], currentIndex: 2 },
        timeline: {
          steps: [
            { label: 'Confirmed', timestamp: '05 Aug 2026, 10:05 AM' },
            {
              label: 'Shipped',
              timestamp: '06 Aug 2026, 9:15 AM',
              updates: [
                { text: 'Packed with the rest of your order and handed to courier', timestamp: '06 Aug 2026, 9:15 AM' },
              ],
            },
            {
              label: 'Delivered',
              timestamp: '08 Aug 2026, 1:20 PM',
              updates: [{ text: 'Delivered together with your mattress', timestamp: '08 Aug 2026, 1:20 PM' }],
            },
          ],
          currentIndex: 2,
        },
      },
      {
        sku: 'TSC94500-3',
        product: 'Elev8 Smart Adjustable Bed Frame (Queen / Grey)',
        image: imgBedElev8Adjustable,
        qty: 1,
        price: 22999,
        status: { dot: 'green', label: 'Delivered' },
        caption: 'Delivered on 12 Aug 2026',
        rating: 0,
        tracker: { steps: ['Confirmed', 'Shipped', 'Out for Delivery', 'Delivered'], currentIndex: 3 },
        timeline: {
          steps: [
            { label: 'Confirmed', timestamp: '05 Aug 2026, 10:05 AM' },
            {
              label: 'Shipped',
              timestamp: '09 Aug 2026, 11:30 AM',
              updates: [
                { text: 'Item was on backorder — now packed and handed to courier', timestamp: '09 Aug 2026, 11:30 AM' },
                { text: 'Item has reached the courier facility in Gurugram, Haryana', timestamp: '09 Aug 2026, 4:50 PM' },
              ],
            },
            { label: 'Out for Delivery', timestamp: '12 Aug 2026, 9:00 AM' },
            {
              label: 'Delivered',
              timestamp: '12 Aug 2026, 2:15 PM',
              updates: [{ text: 'Delivered — signed for at the doorstep', timestamp: '12 Aug 2026, 2:15 PM' }],
            },
          ],
          currentIndex: 3,
        },
      },
    ],
    timeline: {
      steps: [
        {
          label: 'Order Confirmed',
          timestamp: '05 Aug 2026, 10:05 AM',
          updates: [{ text: 'Order has been confirmed', timestamp: '05 Aug 2026, 10:05 AM' }],
        },
        {
          label: 'Processing',
          timestamp: '05 Aug 2026, 3:00 PM',
          updates: [{ text: 'We are preparing your items for shipment', timestamp: '05 Aug 2026, 3:00 PM' }],
        },
        {
          label: 'Shipped',
          timestamp: '06 Aug 2026, 9:15 AM',
          description: 'First shipment left the warehouse',
          updates: [
            { text: 'Mattress and pillow shipment left the warehouse', timestamp: '06 Aug 2026, 9:15 AM' },
            { text: 'Bed frame is backordered — will ship separately', timestamp: '06 Aug 2026, 9:20 AM' },
          ],
        },
        {
          label: 'Delivered',
          timestamp: '08 Aug 2026, 1:20 PM',
          description: '2 of 3 items delivered — Bed Frame still in transit',
          updates: [
            { text: 'Mattress and pillow delivered — signed for at the doorstep', timestamp: '08 Aug 2026, 1:20 PM' },
            { text: 'Bed frame shipped separately — ETA 12 Aug 2026', timestamp: '09 Aug 2026, 11:30 AM' },
          ],
        },
        {
          label: 'All Items Delivered',
          timestamp: '12 Aug 2026, 2:15 PM',
          updates: [{ text: 'Bed frame delivered — signed for at the doorstep', timestamp: '12 Aug 2026, 2:15 PM' }],
        },
      ],
      currentIndex: 4,
    },
  },

];
