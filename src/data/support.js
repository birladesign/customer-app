// Mocked stand-in for the PRD's Complaints & Support contract (§8.9/§8.10) —
// same philosophy as data/intents.js: a handful of if/else branches and an
// in-memory array, not a rules engine or a real case-management backend.
import { ORDERS, parseOrderDate, getOrderStatus } from './orders.js';
import { getOrderIntents } from './intents.js';

// Real contact details, pulled from thesleepcompany.in — not invented.
export const CONTACT = {
  phone: '+919811981911',
  phoneDisplay: '+91 98119 81911',
  email: 'care@thesleepcompany.in',
  whatsapp: '+919152131284',
  whatsappDisplay: '+91 91521 31284',
  hours: '9:30 AM – 9:00 PM, every day',
};

// "Returns" is a routing lane here for taxonomy fidelity with the PRD's five
// lanes, but it deep-links into the existing Return & Replace wizard instead
// of a second complaint sub-flow — see redirectsTo, handled in
// SupportChat.jsx.
export const CASE_LANES = [
  {
    key: 'logistics',
    label: 'Delivery & Logistics',
    description: 'Delayed, missing, or damaged in transit',
    requiresOrder: true,
  },
  {
    key: 'tech',
    label: 'Installation & Technician',
    description: 'Setup issues or a technician visit',
    requiresOrder: true,
  },
  {
    key: 'returns',
    label: 'Returns & Replacement',
    description: "Doesn't fit, wrong item, or changed your mind",
    requiresOrder: true,
    redirectsTo: 'returnReplace',
  },
  {
    key: 'refunds',
    label: 'Payments & Refunds',
    description: 'Failed payment, refund status, or billing',
    requiresOrder: true,
  },
  {
    key: 'general',
    label: 'Something Else',
    description: 'Account, general questions, or anything else',
    requiresOrder: false,
  },
];

// Grouping for the Support hub's FAQ list — browsed as categories (tap in,
// tap back) until there's a search query, which flattens across all of them.
export const FAQ_CATEGORIES = [
  { key: 'orders', label: 'Orders & Delivery' },
  { key: 'returns', label: 'Returns & Warranty' },
  { key: 'payments', label: 'Payments & Billing' },
];

// Original content — the real site's FAQ page is entirely product-spec
// (SmartGRID, chairs, mattresses), not order/account support, so it isn't a
// source for these.
export const FAQ_ITEMS = [
  {
    id: 'track-order',
    category: 'orders',
    question: 'How do I track my order?',
    answer: 'Open My Orders and tap any order to see live tracking status and its estimated delivery date.',
  },
  {
    id: 'reschedule-technician',
    category: 'orders',
    question: 'Can I reschedule my technician visit?',
    answer: "Yes — open the order and tap Reschedule, or raise a case under Installation & Technician and we'll help you pick a new slot.",
  },
  {
    id: 'cancel-order',
    category: 'orders',
    question: 'Can I cancel my order?',
    answer: "You can cancel from My Orders as long as it hasn't shipped yet — we'll also offer to put it on hold instead if you're unsure. Once shipped, use Returns & Replacement.",
  },
  {
    id: 'return-window',
    category: 'returns',
    question: "What's the return window?",
    answer:
      'Most items can be returned within 7 days of delivery if unused and in original packaging. Mattresses and select items include a 100-night trial — check the product page for details.',
  },
  {
    id: 'warranty-claim',
    category: 'returns',
    question: 'How do I file a warranty claim?',
    answer: "Open the order in My Orders and tap Warranty Details, or raise a case from here under Delivery & Logistics — we'll walk you through it.",
  },
  {
    id: 'refund-timeline',
    category: 'payments',
    question: 'How long does a refund take?',
    answer: 'Once a return is picked up, refunds are typically credited to your original payment method within 5–7 business days.',
  },
  {
    id: 'payment-deducted',
    category: 'payments',
    question: 'My payment failed but money was deducted',
    answer: "This usually reverses automatically within 5–7 business days. If it doesn't, raise a case under Payments & Refunds with your transaction reference.",
  },
  {
    id: 'invoice-location',
    category: 'payments',
    question: 'Where can I find my invoice?',
    answer: 'Open the order in My Orders and check its Bill Summary — every order has a downloadable invoice with GST details.',
  },
];

// No backend — new cases live only in this in-memory array for the session,
// same pattern as CURRENT_USER/NOTIFICATIONS being mutated directly elsewhere.
export const USER_CASES = [];

// Seeded once so a fresh demo run doesn't always start at CMP-YYYY-00001.
let caseSeq = 90000 + Math.floor(Math.random() * 9000);

export function generateCaseId(prefix = 'CMP') {
  const year = new Date().getFullYear();
  caseSeq += 1;
  return `${prefix}-${year}-${String(caseSeq).padStart(5, '0')}`;
}

// Mocked FCR/Non-FCR classification (PRD CM-02): a General case that isn't
// escalated resolves same-interaction; everything else — including any
// escalated case regardless of lane — becomes a tracked, open case.
export function classifyCase(laneKey, escalate) {
  if (escalate) {
    return { classification: 'nonFCR', status: 'open', slaLabel: 'A specialist will call you within 30 minutes' };
  }
  if (laneKey === 'general') {
    return { classification: 'FCR', status: 'resolved', slaLabel: 'Resolved now — check your email for a summary' };
  }
  return { classification: 'nonFCR', status: 'open', slaLabel: "We'll update you within 24–48 hours" };
}

// Mocked dedup (PRD HO-03) — only checked against cases this flow itself
// created.
export function findOpenCaseForOrder(orderId, laneKey) {
  if (!orderId) return null;
  return USER_CASES.find((c) => c.orderId === orderId && c.lane === laneKey && c.status === 'open') ?? null;
}

// Called exactly once, from the chat's submit handler — never from render —
// so the generated id is stable across re-renders. `messages` carries the
// transcript so far, so a ticket opened later from "Active Conversations"
// can replay exactly what was said.
export function createCase({ lane, order, description, hasPhoto, escalate, messages }) {
  const laneMeta = CASE_LANES.find((l) => l.key === lane);
  const { classification, status, slaLabel } = classifyCase(lane, escalate);
  const record = {
    id: generateCaseId('CMP'),
    lane,
    laneLabel: laneMeta?.label ?? 'Something Else',
    orderId: order?.id ?? null,
    orderProduct: order?.product ?? null,
    description,
    hasPhoto: Boolean(hasPhoto),
    escalated: Boolean(escalate),
    status,
    classification,
    slaLabel,
    createdAt: new Date().toISOString(),
    messages: messages ?? [],
  };
  USER_CASES.unshift(record);
  return record;
}

// The chat is the only writer — re-saves the full transcript onto its case
// record every time the conversation grows, so resuming it later (from
// "Active Conversations") replays exactly what was said, including anything
// sent after the case was filed.
export function updateCaseMessages(caseId, messages) {
  const record = USER_CASES.find((c) => c.id === caseId);
  if (record) record.messages = messages;
}

// Support hub's "Active Conversations" widget — open tickets with a chat
// thread behind them, most recent first.
export function getActiveConversations() {
  return [...USER_CASES].filter((c) => c.status === 'open').sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

// Order picker helper for the chat's order step — Returns is filtered to
// return-eligible orders, other order-requiring lanes show everything.
export function getOrdersForLane(laneKey) {
  const sorted = [...ORDERS].sort((a, b) => parseOrderDate(b.date) - parseOrderDate(a.date));
  if (laneKey !== 'returns') return sorted;
  return sorted.filter((o) => getOrderIntents(o).find((i) => i.key === 'returnReplace')?.enabled);
}

// Support hub's "Get Help on Orders" widget — a handful of recent orders as
// one-tap support entry points, independent of whether a case exists yet.
export function getOrdersForHelp(limit = 3) {
  return [...ORDERS].sort((a, b) => parseOrderDate(b.date) - parseOrderDate(a.date)).slice(0, limit);
}

// Whether an order's refund has fully landed or is still moving — drives the
// "Refund Initiated" vs "Refund Completed" banner on its help card.
export function getRefundBannerLabel(order) {
  if (!order.refund) return null;
  const { timeline } = order.refund;
  const isDone = timeline && timeline.currentIndex >= timeline.steps.length - 1;
  return isDone ? 'Refund Completed' : 'Refund Initiated';
}

export { getOrderStatus };
