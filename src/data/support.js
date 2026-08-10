// Mocked stand-in for the PRD's Complaints & Support contract (§8.9/§8.10) —
// same philosophy as data/intents.js: a handful of if/else branches and an
// in-memory array, not a rules engine or a real case-management backend.
import { ORDERS, parseOrderDate } from './orders.js';
import { getRequestOrders } from './profile.js';
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
// SupportCaseFlow.jsx.
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

// Original content — the real site's FAQ page is entirely product-spec
// (SmartGRID, chairs, mattresses), not order/account support, so it isn't a
// source for these.
export const FAQ_ITEMS = [
  {
    id: 'track-order',
    question: 'How do I track my order?',
    answer: 'Open My Orders and tap any order to see live tracking status and its estimated delivery date.',
  },
  {
    id: 'return-window',
    question: "What's the return window?",
    answer:
      'Most items can be returned within 7 days of delivery if unused and in original packaging. Mattresses and select items include a 100-night trial — check the product page for details.',
  },
  {
    id: 'refund-timeline',
    question: 'How long does a refund take?',
    answer: 'Once a return is picked up, refunds are typically credited to your original payment method within 5–7 business days.',
  },
  {
    id: 'warranty-claim',
    question: 'How do I file a warranty claim?',
    answer: "Open the order in My Orders and tap Warranty, or raise a case from here under Delivery & Logistics — we'll walk you through it.",
  },
  {
    id: 'reschedule-technician',
    question: 'Can I reschedule my technician visit?',
    answer: "Yes — open the order and tap Reschedule, or raise a case under Installation & Technician and we'll help you pick a new slot.",
  },
  {
    id: 'payment-deducted',
    question: 'My payment failed but money was deducted',
    answer: "This usually reverses automatically within 5–7 business days. If it doesn't, raise a case under Payments & Refunds with your transaction reference.",
  },
  {
    id: 'cancel-order',
    question: 'Can I cancel my order?',
    answer: "You can cancel from My Orders as long as it hasn't shipped yet. Once shipped, use Returns & Replacement instead.",
  },
  {
    id: 'invoice-location',
    question: 'Where can I find my invoice?',
    answer: 'Go to Profile → Invoices — every order has a downloadable invoice with GST details.',
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
// created; legacy Requests.jsx cases have no `lane` field to compare against.
export function findOpenCaseForOrder(orderId, laneKey) {
  if (!orderId) return null;
  return USER_CASES.find((c) => c.orderId === orderId && c.lane === laneKey && c.status === 'open') ?? null;
}

// Called exactly once, from the wizard's submit handler — never from render —
// so the generated id is stable across re-renders.
export function createCase({ lane, order, description, hasPhoto, escalate }) {
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
  };
  USER_CASES.unshift(record);
  return record;
}

// Single place both Support.jsx and Requests.jsx read from, so the union of
// freshly-filed cases and the legacy order-derived ones lives in exactly one
// spot. Legacy entries carry `legacyOrder` so consumers can render them with
// the existing order-card shape unchanged.
export function getAllCases() {
  const fresh = USER_CASES.map((c) => ({ ...c }));
  const legacy = getRequestOrders()
    .sort((a, b) => parseOrderDate(b.date) - parseOrderDate(a.date))
    .map((order) => ({
      id: order.id,
      lane: null,
      laneLabel: null,
      orderId: order.id,
      orderProduct: order.product,
      description: order.caption ?? '',
      hasPhoto: false,
      escalated: false,
      status: order.section === 'closed' ? 'resolved' : 'open',
      slaLabel: order.banner?.text ?? "We'll update you as soon as there's progress.",
      createdAt: null,
      legacyOrder: order,
    }));
  return [...fresh, ...legacy];
}

// Order picker helper for OrderSelectStep — Returns is filtered to
// return-eligible orders, other order-requiring lanes show everything.
export function getOrdersForLane(laneKey) {
  const sorted = [...ORDERS].sort((a, b) => parseOrderDate(b.date) - parseOrderDate(a.date));
  if (laneKey !== 'returns') return sorted;
  return sorted.filter((o) => getOrderIntents(o).find((i) => i.key === 'returnReplace')?.enabled);
}
