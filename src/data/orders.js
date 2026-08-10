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

// Sections still back the tab filter (Action/Active/Done/Closed) and their
// counts — they're a filter dimension, not a display grouping. The list itself
// always renders in date order, never grouped/sorted by these tags.
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

export const PROACTIVE_PROMPT = {
  id: 'proactive-cod',
  title: 'Confirm Your Cash on Delivery Order',
  body: 'Order #TSC90112 is Cash on Delivery. Confirm it to keep your delivery on schedule.',
  actionLabel: 'Confirm COD Order',
};

// One shared demo shipping address — real apps show a per-order address, but
// for this prototype a single consistent one is enough.
const DEMO_ADDRESS = 'H.No. 24, Sector 44, Gurugram, Haryana 122003';

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
        { label: 'Order Confirmed', timestamp: '28 Jul 2026, 10:14 AM' },
        { label: 'Packed', timestamp: '30 Jul 2026, 2:40 PM' },
        { label: 'On Hold', timestamp: '01 Aug 2026, 9:00 AM', description: 'Awaiting your decision' },
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
    status: { dot: 'red', label: 'Evidence Required' },
    product: 'Elev8 Smart Adjustable Bed Frame',
    caption: 'Submit photos of damage to proceed with warranty claim',
    actions: [
      { label: 'Upload Photos', variant: 'primary' },
      { label: 'Get Help', variant: 'secondary' },
    ],
    amount: 22999,
    address: DEMO_ADDRESS,
    payment: { method: 'Credit Card', status: 'Paid' },
    priceBreakup: { itemPrice: 24999, shipping: 0, discount: 2000, tax: 0, total: 22999 },
    timeline: {
      steps: [
        { label: 'Order Confirmed', timestamp: '15 Jul 2026, 11:20 AM' },
        { label: 'Delivered', timestamp: '20 Jul 2026, 4:10 PM' },
        { label: 'Damage Reported', timestamp: '14 Jul 2026, 6:00 PM', description: 'Awaiting evidence photos' },
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
        { label: 'Order Placed', timestamp: '02 Jul 2026, 5:45 PM' },
        { label: 'Payment Failed', timestamp: '02 Jul 2026, 5:46 PM', description: 'Bank declined the charge' },
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
    tracker: { steps: ['Reported', 'Investigation Started', 'Resolution'], currentIndex: 1 },
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
        { label: 'Order Confirmed', timestamp: '18 Jul 2026, 9:30 AM' },
        { label: 'Delivered', timestamp: '24 Jul 2026, 1:15 PM' },
        { label: 'Damage Reported', timestamp: '03 Aug 2026, 8:20 AM' },
        { label: 'Investigation Started', timestamp: '03 Aug 2026, 3:00 PM' },
        { label: 'Resolution', timestamp: null },
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
    badge: 'EXPRESS',
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
        { label: 'Confirmed', timestamp: '06 Aug 2026, 11:00 AM' },
        { label: 'Shipped', timestamp: '07 Aug 2026, 8:30 AM' },
        { label: 'Out for Delivery', timestamp: '08 Aug 2026, 9:00 AM' },
        { label: 'Delivered', timestamp: null },
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
        { label: 'Confirmed', timestamp: '01 Aug 2026, 6:05 PM' },
        { label: 'Packing', timestamp: '02 Aug 2026, 10:00 AM' },
        { label: 'Shipped', timestamp: null },
        { label: 'Delivered', timestamp: null },
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
    // Viewing the booked slot is a passive look, not a decision — same
    // reasoning as the Track buttons, so no dark CTA here either.
    actions: [
      { label: 'View Slot', variant: 'secondary' },
      { label: 'Reschedule', variant: 'secondary' },
    ],
    amount: 44999,
    address: DEMO_ADDRESS,
    payment: { method: 'EMI', status: 'Paid' },
    priceBreakup: { itemPrice: 44999, shipping: 0, discount: 0, tax: 0, total: 44999 },
    timeline: {
      steps: [
        { label: 'Order Confirmed', timestamp: '28 Jul 2026, 1:00 PM' },
        { label: 'Delivered', timestamp: '02 Aug 2026, 3:20 PM' },
        { label: 'Installation Scheduled', timestamp: '03 Aug 2026, 9:00 AM', description: '06 Aug 2026, 10 AM – 12 PM' },
        { label: 'Installation Completed', timestamp: null },
      ],
      currentIndex: 2,
    },
    // Home's featured order preview — the one demo order with a real
    // installation step, so the dated tracker tells a coherent story.
    homeTracker: {
      steps: [
        { label: 'Ordered', date: '28 Jul' },
        { label: 'Delivered', date: '02 Aug' },
        { label: 'Installation', date: '06 Aug' },
        { label: 'Complete' },
      ],
      currentIndex: 2,
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
        { label: 'Order Confirmed', timestamp: '18 Jul 2026, 4:00 PM' },
        { label: 'Delivered', timestamp: '23 Jul 2026, 12:40 PM' },
        { label: 'Return Requested', timestamp: '02 Aug 2026, 10:00 AM' },
        { label: 'Pickup Scheduled', timestamp: '03 Aug 2026, 9:15 AM' },
        { label: 'Refund Initiated', timestamp: null },
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
        { label: 'Order Confirmed', timestamp: '12 Jul 2026, 2:00 PM' },
        { label: 'Delivered', timestamp: '17 Jul 2026, 11:00 AM' },
        { label: 'Replacement Confirmed', timestamp: '30 Jul 2026, 9:00 AM' },
        { label: 'Replacement Dispatched', timestamp: '01 Aug 2026, 8:00 AM' },
        { label: 'Delivered', timestamp: null },
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
        { label: 'Order Confirmed', timestamp: '02 Mar 2026, 10:00 AM' },
        { label: 'Shipped', timestamp: '05 Mar 2026, 2:00 PM' },
        { label: 'Delivered', timestamp: '15 May 2026, 1:48 PM' },
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
        { label: 'Order Confirmed', timestamp: '10 Jan 2026, 9:00 AM' },
        { label: 'Delivered', timestamp: '15 Jan 2026, 3:30 PM' },
        { label: 'Exchange Requested', timestamp: '02 Apr 2026, 10:00 AM' },
        { label: 'Exchange Completed', timestamp: '11 Apr 2026, 4:00 PM' },
      ],
      currentIndex: 3,
    },
  },
  {
    id: 'TSC75890',
    section: 'deliveredDone',
    date: '20 Dec 2025',
    image: imgDeskAeroplus,
    badge: 'EXPRESS',
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
        { label: 'Order Confirmed', timestamp: '20 Dec 2025, 11:30 AM' },
        { label: 'Delivered', timestamp: '22 Dec 2025, 2:00 PM' },
        { label: 'Installation Completed', timestamp: '23 Dec 2025, 5:00 PM' },
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
        { label: 'Order Confirmed', timestamp: '20 Oct 2025, 10:00 AM' },
        { label: 'Delivered', timestamp: '25 Oct 2025, 1:00 PM' },
        { label: 'Return Picked Up', timestamp: '02 Nov 2025, 11:00 AM' },
        { label: 'Refund Completed', timestamp: '05 Nov 2025, 11:30 AM' },
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
        { label: 'Order Confirmed', timestamp: '15 Oct 2025, 8:00 AM' },
        { label: 'Cancelled', timestamp: '16 Oct 2025, 10:00 AM', description: 'Cancelled as per your request' },
      ],
      currentIndex: 1,
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
        { label: 'Order Confirmed', timestamp: '15 Nov 2025, 11:00 AM' },
        { label: 'Shipped', timestamp: '17 Nov 2025, 9:00 AM' },
        { label: 'Delivered', timestamp: '20 Nov 2025, 2:00 PM' },
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
        { label: 'Order Confirmed', timestamp: '15 Nov 2025, 11:00 AM' },
        { label: 'Shipped', timestamp: '17 Nov 2025, 9:00 AM' },
        { label: 'Delivered', timestamp: '20 Nov 2025, 2:00 PM' },
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
        { label: 'Order Confirmed', timestamp: '15 Nov 2025, 11:00 AM' },
        { label: 'Shipped', timestamp: '17 Nov 2025, 9:00 AM' },
        { label: 'Delivered', timestamp: '20 Nov 2025, 2:00 PM' },
      ],
      currentIndex: 2,
    },
  },
];
