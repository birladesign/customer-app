// Size catalog for products that come in more than one size — keyed by the
// product's base name (post splitProductSpec), the only stable identifier
// an order's product string and a line item's product string both share.
// Products with no entry here simply don't get a size picker on Edit Order.
export const VARIANTS = {
  'Smart Ortho Hybrid Pocketed Spring Mattress': [
    { label: 'Single', price: 15990 },
    { label: 'Queen', price: 21290 },
    { label: 'King', price: 25990 },
  ],
  'Smart Ortho Pro Mattress': [
    { label: 'Single', price: 12990 },
    { label: 'Queen', price: 17990 },
    { label: 'King', price: 21990 },
  ],
  'Smart Ortho Royale Mattress': [
    { label: 'Queen', price: 40990 },
    { label: 'King', price: 47990 },
  ],
  'Smart Luxe Royale Mattress': [
    { label: 'Queen', price: 53335 },
    { label: 'King', price: 61335 },
  ],
  'Smart Ortho Mattress': [
    { label: 'Single', price: 9490 },
    { label: 'Queen', price: 14990 },
    { label: 'King', price: 18990 },
  ],
};

export function getVariants(productName) {
  return VARIANTS[productName] ?? null;
}
