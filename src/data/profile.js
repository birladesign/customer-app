// Demo data for the Profile section. Plain data only — icon fields are string
// keys mapped to components where consumed, same convention as data/home.js.
import { ORDERS, parseOrderDate, getOrderStatus } from './orders.js';

export const CURRENT_USER = {
  firstName: 'Sudarshan',
  lastName: 'Birla',
  phone: '99999999',
  email: 'sudarshanbirla@testemail.com',
  dob: '1996-04-12',
  avatarInitial: 'S',
};

let addressSeq = 0;

export function addAddress(address) {
  addressSeq += 1;
  const record = { id: `addr-new-${addressSeq}`, ...address };
  if (record.isDefault) {
    for (const a of ADDRESSES) a.isDefault = false;
  } else if (ADDRESSES.length === 0) {
    record.isDefault = true;
  }
  ADDRESSES.push(record);
  return record;
}

export const ADDRESSES = [
  {
    id: 'addr-home',
    label: 'Home',
    isDefault: true,
    name: 'Sudarshan Birla',
    lines: ['H.No. 24, Sector 44', 'Gurugram, Haryana', '122003', 'India'],
    phone: '99999999',
  },
  {
    id: 'addr-office',
    label: 'Office',
    isDefault: false,
    name: 'Sudarshan Birla',
    lines: ['Tower B, Cyber Hub', 'DLF Phase 2, Gurugram', 'Haryana 122002', 'India'],
    phone: '99999999',
  },
];

// References real ORDERS ids so the demo copy stays internally consistent
// with the rest of the mocked dataset.
export const NOTIFICATIONS = [
  {
    id: 'n1',
    title: 'Out for Delivery soon',
    body: 'Order #TSC91100 arrives today by 6 PM.',
    timestamp: '2 hours ago',
    read: false,
  },
  {
    id: 'n2',
    title: 'Technician confirmed',
    body: 'Your installation visit for order #TSC88320 is confirmed for 06 Aug, 10 AM–12 PM.',
    timestamp: '5 hours ago',
    read: false,
  },
  {
    id: 'n3',
    title: 'Refund initiated',
    body: 'Refund for order #TSC70021 has been initiated to your source account.',
    timestamp: 'Yesterday',
    read: true,
  },
  {
    id: 'n4',
    title: 'Replacement on the way',
    body: 'Replacement for order #TSC83940 has been dispatched.',
    timestamp: '2 days ago',
    read: true,
  },
];

// Every order gets an invoice row — there's no reason a needsAttention order
// wouldn't have one too.
export function getInvoiceOrders() {
  return [...ORDERS].sort((a, b) => parseOrderDate(b.date) - parseOrderDate(a.date));
}

// Derives "cases" from fields ORDERS already has, rather than inventing a
// separate ticket/case data model. The warranty-override clause matches only
// active-claim language (e.g. "mid-claim") — a generic disabled-reason string
// like "Available after delivery" is not evidence of an open case, just of an
// ineligible action, so a plain truthiness check would false-positive on any
// order whose warranty happens to be gated for an unrelated reason.
export function getRequestOrders() {
  return ORDERS.filter((o) => {
    const status = getOrderStatus(o);
    return (
      /mid-claim/i.test(o.intentOverrides?.warranty ?? '') ||
      o.banner?.icon === 'alert' ||
      (status.dot === 'muted' && /Refund/.test(status.label))
    );
  });
}
