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
  { key: 'rto', label: 'Return to Origin', tabKey: 'rto', tabLabel: 'RTO' },
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

// Multi-item orders don't carry a static status — it's derived from each line
// item's own status, so the parent pill always reflects reality (one item
// still in transit while the rest are delivered) instead of a hand-authored
// order.status drifting from what the items actually say.
export function getOrderStatus(order) {
  if (!order.items) return order.status;
  // A line item needing attention (payment failed, damage reported, on
  // hold...) always outranks the delivered/in-transit count — the parent
  // pill should surface the one thing blocking the order, not dilute it
  // into "3 of 4 delivered" as if everything were just running late.
  const flagged = order.items.find((item) => item.status.dot === 'red');
  if (flagged) return flagged.status;
  const total = order.items.length;
  const delivered = order.items.filter((item) => item.status.label === 'Delivered').length;
  if (delivered === total) return { dot: 'green', label: 'All Items Delivered' };
  if (delivered === 0) return { dot: 'blue', label: `${total} Items · In Transit` };
  return { dot: 'blue', label: `${delivered} of ${total} Items Delivered` };
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
  TSC97821: { courier: 'Delhivery', awb: '1027384950162' },
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
  'TSC94500-1': { courier: 'Delhivery', awb: '1029384756789' },
  'TSC94500-2': { courier: 'Delhivery', awb: '1029384756789' },
  'TSC94500-3': { courier: 'Xpressbees', awb: 'XB93027461850' },
  'TSC97500-1': { courier: 'Bluedart', awb: '77019283746' },
  'TSC97500-2': { courier: 'Bluedart', awb: '77019283746' },
  'TSC97500-3': { courier: 'Delhivery', awb: '1093827465019' },
  'TSC97500-4': { courier: 'Ecom Express', awb: 'EE10293847561' },
  'TSC91850-1': { courier: 'Delhivery', awb: '1038475629104' },
  'TSC91850-2': { courier: 'Delhivery', awb: '1038475629104' },
  'TSC86420-1': { courier: 'Bluedart', awb: '77038291056' },
  'TSC86420-2': { courier: 'Bluedart', awb: '77038291056' },
};

export function getShipmentInfo(key) {
  return SHIPMENTS[key] ?? null;
}

export const ORDERS = [
  {
    id: 'TSC92401',
    section: 'needsAttention',
    date: '28 Jul 2026',
    image: imgMattressOrthoPro,
    banner: { icon: 'zap', text: 'Expires in 2 days' },
    status: { dot: 'red', label: 'On Hold — Decision Needed' },
    product: 'Smart Ortho Pro Mattress (Queen)',
    caption: 'Held since 01 Aug 2026 · Expires 05 Aug 2026',
    actions: [
      { label: 'Keep Order', variant: 'primary' },
      { label: 'Manage Order', variant: 'secondary-danger' },
    ],
    amount: 16990,
    address: DEMO_ADDRESS,
    payment: { method: 'UPI', status: 'Paid' },
    priceBreakup: { itemPrice: 17990, shipping: 0, discount: 1000, tax: 0, total: 16990 },
    timeline: {
      steps: [
        {
          label: 'Order Confirmed',
          timestamp: '28 Jul 2026, 10:14 AM',
          updates: [
            { text: 'Order has been confirmed', timestamp: '28 Jul 2026, 10:14 AM' },
            { text: 'We are processing your order', timestamp: '28 Jul 2026, 1:30 PM' },
          ],
        },
        {
          label: 'Packed',
          timestamp: '30 Jul 2026, 2:40 PM',
          updates: [{ text: 'Item has been packed and is ready for dispatch', timestamp: '30 Jul 2026, 2:40 PM' }],
        },
        {
          label: 'On Hold',
          timestamp: '01 Aug 2026, 9:00 AM',
          description: 'Awaiting your decision',
          updates: [{ text: 'Order paused at your request before dispatch', timestamp: '01 Aug 2026, 9:00 AM' }],
        },
        { label: 'Shipped', timestamp: null },
        { label: 'Delivered', timestamp: null },
      ],
      currentIndex: 2,
    },
  },
  {
    id: 'TSC89203',
    section: 'needsAttention',
    date: '15 Jul 2026',
    image: imgBedElev8Adjustable,
    banner: { icon: 'zap', text: 'Action Required' },
    status: { dot: 'red', label: 'Damaged — Reported' },
    product: 'Elev8 Smart Adjustable Bed Frame',
    caption: 'Reported on 14 Jul 2026 · Investigation in progress',
    actions: [
      { label: 'Track Investigation', variant: 'secondary' },
      { label: 'Get Help', variant: 'secondary' },
    ],
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
    id: 'TSC77541',
    section: 'needsAttention',
    date: '02 Jul 2026',
    image: imgChairStyluxErgonomic,
    banner: { icon: 'zap', text: 'Pay Now' },
    status: { dot: 'red', label: 'Payment Failed' },
    product: 'Stylux Ergonomic Office Chair',
    caption: 'Retry payment to resume your order',
    actions: [{ label: 'Retry Payment', variant: 'primary' }],
    amount: 16999,
    address: DEMO_ADDRESS,
    payment: { method: 'Credit Card', status: 'Failed' },
    priceBreakup: { itemPrice: 16999, shipping: 0, discount: 0, tax: 0, total: 16999 },
    timeline: {
      steps: [
        {
          label: 'Order Placed',
          timestamp: '02 Jul 2026, 5:45 PM',
          updates: [{ text: 'Order placed, awaiting payment confirmation', timestamp: '02 Jul 2026, 5:45 PM' }],
        },
        {
          label: 'Payment Failed',
          timestamp: '02 Jul 2026, 5:46 PM',
          description: 'Bank declined the charge',
          updates: [{ text: 'Payment attempt declined by bank', timestamp: '02 Jul 2026, 5:46 PM' }],
        },
      ],
      currentIndex: 1,
    },
    intentOverrides: {
      returnReplace: 'Complete payment before requesting a return or replacement',
      warranty: 'Available after delivery',
    },
  },
  {
    id: 'TSC97821',
    section: 'needsAttention',
    date: '03 Aug 2026',
    image: imgMattressOrthoHybrid,
    banner: { icon: 'alert', text: 'Damage Reported' },
    status: { dot: 'red', label: 'Damaged — Reported' },
    product: 'Smart Ortho Hybrid Pocketed Spring Mattress (Queen)',
    caption: 'Reported on 03 Aug 2026 · Investigation in progress',
    disabledReason: 'Manage Order unavailable — investigation in progress',
    tracker: { steps: ['Reported', 'Investigation Started', 'Issue Resolved'], currentIndex: 1 },
    actions: [
      { label: 'Track Investigation', variant: 'secondary' },
      { label: 'Manage Order', variant: 'disabled' },
    ],
    amount: 21290,
    address: DEMO_ADDRESS,
    payment: { method: 'UPI', status: 'Paid' },
    priceBreakup: { itemPrice: 23290, shipping: 0, discount: 2000, tax: 0, total: 21290 },
    timeline: {
      steps: [
        {
          label: 'Order Confirmed',
          timestamp: '18 Jul 2026, 9:30 AM',
          updates: [
            { text: 'Order has been confirmed', timestamp: '18 Jul 2026, 9:30 AM' },
            { text: 'We are processing your order', timestamp: '18 Jul 2026, 1:00 PM' },
          ],
        },
        {
          label: 'Delivered',
          timestamp: '24 Jul 2026, 1:15 PM',
          updates: [
            { text: 'Item has been shipped from the warehouse', timestamp: '20 Jul 2026, 10:00 AM' },
            { text: 'Out for delivery', timestamp: '24 Jul 2026, 9:00 AM' },
            { text: 'Delivered — signed for at the doorstep', timestamp: '24 Jul 2026, 1:15 PM' },
          ],
        },
        {
          label: 'Damage Reported',
          timestamp: '03 Aug 2026, 8:20 AM',
          updates: [{ text: 'Damage reported by customer with photos', timestamp: '03 Aug 2026, 8:20 AM' }],
        },
        {
          label: 'Investigation Started',
          timestamp: '03 Aug 2026, 3:00 PM',
          updates: [{ text: 'Case assigned to the quality investigation team', timestamp: '03 Aug 2026, 3:00 PM' }],
        },
        { label: 'Issue Resolved', timestamp: null },
      ],
      currentIndex: 3,
    },
    intentOverrides: { returnReplace: 'Available once the investigation concludes' },
  },
  {
    id: 'TSC91100',
    section: 'inProgress',
    date: '08 Aug 2026',
    image: imgPillowHybrid,
    badge: 'Express',
    status: { dot: 'blue', label: 'Out for Delivery' },
    product: 'Smart Hybrid Pillow (Set of 2)',
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
    product: 'Smart Pregnancy Pillow',
    caption: 'Estimated delivery: 06 Aug 2026',
    tracker: { steps: ['Confirmed', 'Packing', 'Shipped', 'Delivered'], currentIndex: 1 },
    actions: [
      { label: 'Track Order', variant: 'secondary' },
      { label: 'Modify', variant: 'secondary' },
    ],
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
    product: 'Luxe Grande Recliner Sofa',
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
    product: 'Elev8 Smart Adjustable Bed Frame',
    caption: 'Delivered — confirm your installation slot',
    installationStatus: 'pending',
    installationSlot: { date: '12 Aug 2026', window: '10 AM – 12 PM' },
    actions: [{ label: 'Schedule Installation', variant: 'primary' }],
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
    product: 'Onyx Orthopedic Office Chair',
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
    product: 'Smart Ortho Royale Mattress (King)',
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
    product: 'Elite Premium Office Chair',
    color: 'Charcoal Grey',
    caption: 'Delivered on 15 May 2026',
    savings: 'You saved ₹12,345 on this item',
    rating: 0,
    actions: [
      { label: 'Report an Issue', variant: 'secondary' },
      { label: 'Warranty', variant: 'secondary' },
    ],
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
    product: 'Smart Luxe Royale Mattress (Queen)',
    color: 'Ivory White',
    caption: 'Completed on 11 Apr 2026',
    savings: 'You saved ₹12,345 on this item',
    actions: [{ label: 'Warranty', variant: 'secondary' }],
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
    product: 'AeroPlus Adjustable Desk',
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
    product: 'Smart Ortho Mattress (Single)',
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
    product: 'Smart Cervical Pillow',
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
    section: 'rto',
    date: '10 Aug 2026',
    image: imgMattressOrthoRoyale,
    banner: { icon: 'alert', text: 'Delivery Failed' },
    status: { dot: 'red', label: 'RTO Initiated — Delivery Failed' },
    product: 'Smart Ortho Royale Mattress (King)',
    caption: 'Courier could not deliver after 3 attempts · Returning to warehouse',
    tracker: { steps: ['Delivery Failed', 'RTO Initiated', 'Received at Warehouse', 'Refund Initiated'], currentIndex: 1 },
    actions: [
      { label: 'Track RTO', variant: 'secondary' },
      { label: 'Get Help', variant: 'secondary' },
    ],
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
          label: 'RTO Initiated',
          timestamp: '10 Aug 2026, 10:00 AM',
          description: 'Courier returning parcel to origin warehouse',
          updates: [{ text: 'Shipment marked RTO after failed delivery attempts', timestamp: '10 Aug 2026, 10:00 AM' }],
        },
        { label: 'Received at Warehouse', timestamp: null },
        { label: 'Refund Initiated', timestamp: null },
      ],
      currentIndex: 3,
    },
  },
  {
    id: 'TSC77320',
    section: 'rto',
    date: '20 Jun 2026',
    image: imgChairElitePremium,
    status: { dot: 'green', label: 'RTO Completed — Refund Processed' },
    product: 'Elite Premium Office Chair',
    color: 'Onyx Black',
    caption: '₹38,499 refunded after return to origin',
    refundNote: '₹38,499 refunded to source account',
    actions: [{ label: 'Reorder', variant: 'secondary' }],
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
          label: 'RTO Initiated',
          timestamp: '08 Jun 2026, 10:00 AM',
          updates: [{ text: 'Shipment marked RTO after failed delivery attempts', timestamp: '08 Jun 2026, 10:00 AM' }],
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
    product: 'Recliner Bed with Italia Frame (King)',
    qty: 1,
    actions: [{ label: 'Warranty', variant: 'secondary' }],
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
    product: 'Recliner Bed with Italia Frame (King)',
    qty: 1,
    actions: [{ label: 'Warranty', variant: 'secondary' }],
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
    product: 'Recliner Bed with Italia Frame (King)',
    qty: 1,
    actions: [{ label: 'Warranty', variant: 'secondary' }],
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
  // A genuine multi-SKU cart — three different products bought together in
  // one checkout (unlike the same-SKU-×3 shipment above). Each line item
  // ships and tracks independently, so OrderDetails renders them as their
  // own expandable rows instead of one product card, and the parent status
  // above is computed from these items via getOrderStatus, not authored here.
  {
    id: 'TSC94500',
    section: 'inProgress',
    date: '05 Aug 2026',
    product: 'Bedroom Refresh Bundle (3 items)',
    image: imgMattressOrthoHybrid,
    caption: '2 of 3 items delivered · 1 arriving separately',
    actions: [{ label: 'Track Order', variant: 'secondary' }],
    amount: 46488,
    address: DEMO_ADDRESS,
    payment: { method: 'UPI', status: 'Paid' },
    priceBreakup: { itemPrice: 46488, shipping: 0, discount: 0, tax: 0, total: 46488 },
    items: [
      {
        sku: 'TSC94500-1',
        product: 'Smart Ortho Hybrid Pocketed Spring Mattress (Queen)',
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
        product: 'Smart Hybrid Pillow (Set of 2)',
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
        product: 'Elev8 Smart Adjustable Bed Frame',
        image: imgBedElev8Adjustable,
        qty: 1,
        price: 22999,
        status: { dot: 'blue', label: 'Shipped' },
        caption: 'Backordered — packed separately, ETA 12 Aug 2026',
        tracker: { steps: ['Confirmed', 'Shipped', 'Out for Delivery', 'Delivered'], currentIndex: 1 },
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
            { label: 'Out for Delivery', timestamp: null },
            { label: 'Delivered', timestamp: null, expectedDate: '12 Aug 2026' },
          ],
          currentIndex: 1,
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
        { label: 'All Items Delivered', timestamp: null, expectedDate: '12 Aug 2026' },
      ],
      currentIndex: 3,
    },
  },
  // A larger cart (5 line items) than the 3-item bundle above, deliberately
  // spread across every in-progress state at once (delivered, out for
  // delivery, shipped, still packing) so LineItems/PrimaryItem get exercised
  // at a size beyond the smallest interesting case.
  {
    id: 'TSC97500',
    section: 'inProgress',
    date: '02 Aug 2026',
    product: 'Home Office & Bedroom Bundle (5 items)',
    image: imgDeskAeroplus,
    caption: '2 of 5 items delivered · 3 in progress',
    actions: [{ label: 'Track Order', variant: 'secondary' }],
    amount: 81186,
    address: DEMO_ADDRESS,
    payment: { method: 'UPI', status: 'Paid' },
    priceBreakup: { itemPrice: 81186, shipping: 0, discount: 0, tax: 0, total: 81186 },
    items: [
      {
        sku: 'TSC97500-1',
        product: 'AeroPlus Adjustable Desk',
        image: imgDeskAeroplus,
        qty: 1,
        price: 20999,
        status: { dot: 'green', label: 'Delivered' },
        caption: 'Delivered on 06 Aug 2026',
        rating: 0,
        tracker: { steps: ['Confirmed', 'Shipped', 'Delivered'], currentIndex: 2 },
        timeline: {
          steps: [
            {
              label: 'Confirmed',
              timestamp: '02 Aug 2026, 10:05 AM',
              updates: [{ text: 'Order has been confirmed', timestamp: '02 Aug 2026, 10:05 AM' }],
            },
            {
              label: 'Shipped',
              timestamp: '03 Aug 2026, 9:00 AM',
              updates: [{ text: 'Item has been handed over to courier', timestamp: '03 Aug 2026, 9:00 AM' }],
            },
            {
              label: 'Delivered',
              timestamp: '06 Aug 2026, 3:00 PM',
              updates: [
                { text: 'Out for delivery', timestamp: '06 Aug 2026, 9:30 AM' },
                { text: 'Delivered — signed for at the doorstep', timestamp: '06 Aug 2026, 3:00 PM' },
              ],
            },
          ],
          currentIndex: 2,
        },
      },
      {
        sku: 'TSC97500-2',
        product: 'Stylux Ergonomic Office Chair',
        image: imgChairStyluxErgonomic,
        qty: 1,
        price: 16999,
        status: { dot: 'green', label: 'Delivered' },
        caption: 'Delivered on 06 Aug 2026',
        rating: 0,
        tracker: { steps: ['Confirmed', 'Shipped', 'Delivered'], currentIndex: 2 },
        timeline: {
          steps: [
            {
              label: 'Confirmed',
              timestamp: '02 Aug 2026, 10:05 AM',
              updates: [{ text: 'Order has been confirmed', timestamp: '02 Aug 2026, 10:05 AM' }],
            },
            {
              label: 'Shipped',
              timestamp: '03 Aug 2026, 9:00 AM',
              updates: [{ text: 'Packed with the rest of your order and handed to courier', timestamp: '03 Aug 2026, 9:00 AM' }],
            },
            {
              label: 'Delivered',
              timestamp: '06 Aug 2026, 3:00 PM',
              updates: [{ text: 'Delivered together with your desk', timestamp: '06 Aug 2026, 3:00 PM' }],
            },
          ],
          currentIndex: 2,
        },
      },
      {
        sku: 'TSC97500-3',
        product: 'Smart Ortho Pro Mattress (Queen)',
        image: imgMattressOrthoPro,
        qty: 1,
        price: 17990,
        status: { dot: 'blue', label: 'Out for Delivery' },
        caption: 'Arriving today',
        tracker: { steps: ['Confirmed', 'Shipped', 'Out for Delivery', 'Delivered'], currentIndex: 2 },
        timeline: {
          steps: [
            {
              label: 'Confirmed',
              timestamp: '02 Aug 2026, 10:05 AM',
              updates: [{ text: 'Order has been confirmed', timestamp: '02 Aug 2026, 10:05 AM' }],
            },
            {
              label: 'Shipped',
              timestamp: '09 Aug 2026, 11:00 AM',
              updates: [
                { text: 'Item has been handed over to courier', timestamp: '09 Aug 2026, 11:00 AM' },
                { text: 'Item has reached the courier facility in Gurugram, Haryana', timestamp: '09 Aug 2026, 4:20 PM' },
              ],
            },
            {
              label: 'Out for Delivery',
              timestamp: '12 Aug 2026, 9:00 AM',
              updates: [{ text: 'Out for delivery, arriving today', timestamp: '12 Aug 2026, 9:00 AM' }],
            },
            { label: 'Delivered', timestamp: null, expectedDate: '12 Aug 2026' },
          ],
          currentIndex: 2,
        },
      },
      {
        sku: 'TSC97500-4',
        product: 'Smart Cervical Pillow',
        image: imgPillowCervical,
        qty: 1,
        price: 2199,
        status: { dot: 'blue', label: 'Shipped' },
        caption: 'ETA 13 Aug 2026',
        tracker: { steps: ['Confirmed', 'Shipped', 'Delivered'], currentIndex: 1 },
        timeline: {
          steps: [
            {
              label: 'Confirmed',
              timestamp: '02 Aug 2026, 10:05 AM',
              updates: [{ text: 'Order has been confirmed', timestamp: '02 Aug 2026, 10:05 AM' }],
            },
            {
              label: 'Shipped',
              timestamp: '10 Aug 2026, 2:00 PM',
              updates: [{ text: 'Item has been handed over to courier', timestamp: '10 Aug 2026, 2:00 PM' }],
            },
            { label: 'Delivered', timestamp: null, expectedDate: '13 Aug 2026' },
          ],
          currentIndex: 1,
        },
      },
      {
        sku: 'TSC97500-5',
        product: 'Elev8 Smart Adjustable Bed Frame',
        image: imgBedElev8Adjustable,
        qty: 1,
        price: 22999,
        status: { dot: 'blue', label: 'Confirmed · Packing' },
        caption: 'Packed separately — ETA 14 Aug 2026',
        tracker: { steps: ['Confirmed', 'Packing', 'Shipped', 'Delivered'], currentIndex: 1 },
        timeline: {
          steps: [
            {
              label: 'Confirmed',
              timestamp: '02 Aug 2026, 10:05 AM',
              updates: [{ text: 'Order has been confirmed', timestamp: '02 Aug 2026, 10:05 AM' }],
            },
            {
              label: 'Packing',
              timestamp: '11 Aug 2026, 10:00 AM',
              updates: [{ text: 'We have started packing this item', timestamp: '11 Aug 2026, 10:00 AM' }],
            },
            { label: 'Shipped', timestamp: null },
            { label: 'Delivered', timestamp: null, expectedDate: '14 Aug 2026' },
          ],
          currentIndex: 1,
        },
      },
    ],
    timeline: {
      steps: [
        {
          label: 'Order Confirmed',
          timestamp: '02 Aug 2026, 10:05 AM',
          updates: [{ text: 'Order has been confirmed', timestamp: '02 Aug 2026, 10:05 AM' }],
        },
        {
          label: 'Processing',
          timestamp: '02 Aug 2026, 3:00 PM',
          updates: [{ text: 'We are preparing your items for shipment', timestamp: '02 Aug 2026, 3:00 PM' }],
        },
        {
          label: 'Shipped',
          timestamp: '03 Aug 2026, 9:00 AM',
          description: 'Desk and chair shipped first',
          updates: [{ text: 'Desk and chair shipment left the warehouse', timestamp: '03 Aug 2026, 9:00 AM' }],
        },
        {
          label: 'Delivered',
          timestamp: '06 Aug 2026, 3:00 PM',
          description: '2 of 5 items delivered — mattress, pillow, and bed frame still in progress',
          updates: [
            { text: 'Desk and chair delivered — signed for at the doorstep', timestamp: '06 Aug 2026, 3:00 PM' },
          ],
        },
        { label: 'All Items Delivered', timestamp: null, expectedDate: '14 Aug 2026' },
      ],
      currentIndex: 3,
    },
  },
  // Multi-item orders so far were all mid-flight (inProgress) — this one
  // needs attention instead: one item delivered cleanly, the other flagged
  // by getOrderStatus's dot:'red' check above, so the parent pill surfaces
  // that flagged item's own "Delivered" (red) rather than a misleadingly
  // calm "1 of 2 delivered" or "All Items Delivered".
  {
    id: 'TSC91850',
    section: 'needsAttention',
    date: '04 Aug 2026',
    image: imgSofaLuxeGrande,
    banner: { icon: 'alert', text: 'Action Required' },
    product: 'Living Room Refresh (2 items)',
    caption: '1 of 2 items delivered fine — the other arrived damaged',
    actions: [
      { label: 'Report Issue', variant: 'primary' },
      { label: 'Get Help', variant: 'secondary' },
    ],
    amount: 55998,
    address: DEMO_ADDRESS,
    payment: { method: 'Credit Card', status: 'Paid' },
    priceBreakup: { itemPrice: 55998, shipping: 0, discount: 0, tax: 0, total: 55998 },
    items: [
      {
        sku: 'TSC91850-1',
        product: 'Luxe Grande Recliner Sofa',
        image: imgSofaLuxeGrande,
        qty: 1,
        price: 44999,
        status: { dot: 'green', label: 'Delivered' },
        caption: 'Delivered on 09 Aug 2026',
        rating: 0,
        tracker: { steps: ['Confirmed', 'Shipped', 'Delivered'], currentIndex: 2 },
        timeline: {
          steps: [
            {
              label: 'Confirmed',
              timestamp: '04 Aug 2026, 11:15 AM',
              updates: [{ text: 'Order has been confirmed', timestamp: '04 Aug 2026, 11:15 AM' }],
            },
            {
              label: 'Shipped',
              timestamp: '06 Aug 2026, 9:00 AM',
              updates: [{ text: 'Item has been handed over to courier', timestamp: '06 Aug 2026, 9:00 AM' }],
            },
            {
              label: 'Delivered',
              timestamp: '09 Aug 2026, 2:30 PM',
              updates: [
                { text: 'Out for delivery', timestamp: '09 Aug 2026, 9:00 AM' },
                { text: 'Delivered — signed for at the doorstep', timestamp: '09 Aug 2026, 2:30 PM' },
              ],
            },
          ],
          currentIndex: 2,
        },
      },
      {
        sku: 'TSC91850-2',
        product: 'Onyx Orthopedic Office Chair',
        image: imgChairOnyxOrthopedic,
        qty: 1,
        price: 10999,
        // Label stays exactly "Delivered" (dot:'red' still flags it) so this
        // item is actually eligible for Return/Replace per getItemIntents —
        // that flow's own EvidenceStep is where photo evidence belongs, not
        // a standalone "Evidence Required" state that would lock it out.
        status: { dot: 'red', label: 'Delivered' },
        caption: 'Arrived damaged — start a return or replacement to resolve it',
        tracker: { steps: ['Confirmed', 'Shipped', 'Delivered'], currentIndex: 2 },
        timeline: {
          steps: [
            {
              label: 'Confirmed',
              timestamp: '04 Aug 2026, 11:15 AM',
              updates: [{ text: 'Order has been confirmed', timestamp: '04 Aug 2026, 11:15 AM' }],
            },
            {
              label: 'Delivered',
              timestamp: '09 Aug 2026, 2:30 PM',
              updates: [
                { text: 'Item has been shipped', timestamp: '06 Aug 2026, 9:00 AM' },
                { text: 'Delivered — signed for at the doorstep', timestamp: '09 Aug 2026, 2:30 PM' },
              ],
            },
            {
              label: 'Damage Reported',
              timestamp: '10 Aug 2026, 6:40 PM',
              description: 'Awaiting evidence photos',
              updates: [
                { text: 'Damage reported by customer', timestamp: '10 Aug 2026, 6:40 PM' },
                { text: 'Warranty claim opened — awaiting evidence photos', timestamp: '10 Aug 2026, 6:45 PM' },
              ],
            },
          ],
          currentIndex: 2,
        },
      },
    ],
    timeline: {
      steps: [
        {
          label: 'Order Confirmed',
          timestamp: '04 Aug 2026, 11:15 AM',
          updates: [{ text: 'Order has been confirmed', timestamp: '04 Aug 2026, 11:15 AM' }],
        },
        {
          label: 'Delivered',
          timestamp: '09 Aug 2026, 2:30 PM',
          description: 'Both items delivered together',
          updates: [{ text: 'Sofa and chair delivered — signed for at the doorstep', timestamp: '09 Aug 2026, 2:30 PM' }],
        },
        {
          label: 'Damage Reported',
          timestamp: '10 Aug 2026, 6:40 PM',
          description: 'Chair damaged in transit — awaiting evidence photos',
          updates: [{ text: 'Damage reported on the office chair', timestamp: '10 Aug 2026, 6:40 PM' }],
        },
      ],
      currentIndex: 2,
    },
  },
  // The smallest interesting multi-item case (2 items, not 3 or 5) and the
  // first one to reach deliveredDone rather than sitting inProgress or
  // needsAttention — both items delivered together, ratings still pending.
  {
    id: 'TSC86420',
    section: 'deliveredDone',
    date: '18 Jun 2026',
    image: imgMattressOrthoRoyale,
    product: 'Bedroom Essentials Duo (2 items)',
    caption: '2 of 2 items delivered',
    actions: [{ label: 'Track Order', variant: 'secondary' }],
    amount: 43189,
    address: DEMO_ADDRESS,
    payment: { method: 'UPI', status: 'Paid' },
    priceBreakup: { itemPrice: 43189, shipping: 0, discount: 0, tax: 0, total: 43189 },
    items: [
      {
        sku: 'TSC86420-1',
        product: 'Smart Ortho Royale Mattress (King)',
        image: imgMattressOrthoRoyale,
        qty: 1,
        price: 40990,
        status: { dot: 'green', label: 'Delivered' },
        caption: 'Delivered on 22 Jun 2026',
        rating: 0,
        tracker: { steps: ['Confirmed', 'Shipped', 'Delivered'], currentIndex: 2 },
        timeline: {
          steps: [
            {
              label: 'Confirmed',
              timestamp: '18 Jun 2026, 10:00 AM',
              updates: [{ text: 'Order has been confirmed', timestamp: '18 Jun 2026, 10:00 AM' }],
            },
            {
              label: 'Shipped',
              timestamp: '19 Jun 2026, 3:00 PM',
              updates: [{ text: 'Item has been handed over to courier', timestamp: '19 Jun 2026, 3:00 PM' }],
            },
            {
              label: 'Delivered',
              timestamp: '22 Jun 2026, 1:00 PM',
              updates: [
                { text: 'Out for delivery', timestamp: '22 Jun 2026, 9:00 AM' },
                { text: 'Delivered — signed for at the doorstep', timestamp: '22 Jun 2026, 1:00 PM' },
              ],
            },
          ],
          currentIndex: 2,
        },
      },
      {
        sku: 'TSC86420-2',
        product: 'Smart Cervical Pillow',
        image: imgPillowCervical,
        qty: 1,
        price: 2199,
        status: { dot: 'green', label: 'Delivered' },
        caption: 'Delivered on 22 Jun 2026',
        rating: 0,
        tracker: { steps: ['Confirmed', 'Shipped', 'Delivered'], currentIndex: 2 },
        timeline: {
          steps: [
            {
              label: 'Confirmed',
              timestamp: '18 Jun 2026, 10:00 AM',
              updates: [{ text: 'Order has been confirmed', timestamp: '18 Jun 2026, 10:00 AM' }],
            },
            {
              label: 'Shipped',
              timestamp: '19 Jun 2026, 3:00 PM',
              updates: [{ text: 'Packed with the rest of your order and handed to courier', timestamp: '19 Jun 2026, 3:00 PM' }],
            },
            {
              label: 'Delivered',
              timestamp: '22 Jun 2026, 1:00 PM',
              updates: [{ text: 'Delivered together with your mattress', timestamp: '22 Jun 2026, 1:00 PM' }],
            },
          ],
          currentIndex: 2,
        },
      },
    ],
    timeline: {
      steps: [
        {
          label: 'Order Confirmed',
          timestamp: '18 Jun 2026, 10:00 AM',
          updates: [{ text: 'Order has been confirmed', timestamp: '18 Jun 2026, 10:00 AM' }],
        },
        {
          label: 'Shipped',
          timestamp: '19 Jun 2026, 3:00 PM',
          updates: [{ text: 'Both items handed over to courier together', timestamp: '19 Jun 2026, 3:00 PM' }],
        },
        {
          label: 'Delivered',
          timestamp: '22 Jun 2026, 1:00 PM',
          updates: [{ text: 'Delivered — signed for at the doorstep', timestamp: '22 Jun 2026, 1:00 PM' }],
        },
      ],
      currentIndex: 2,
    },
  },
];
