// Editable-variant catalog for Edit Order — keyed by the product's base name
// (post splitProductSpec), the only stable identifier an order's product
// string and a line item's product string both share. Products with no
// entry here simply don't get a variant picker on Edit Order.
//
// Modeled on thesleepcompany.in's own PDP/filter structure, which varies by
// category rather than being one universal "size" concept:
//   - Mattresses: Size (Single/Queen/King/Diwan) AND Height (5/6/8/10/11/12
//     in) are independent choices — the site's own filter sidebar lists them
//     as two separate facets. Dimensions follow from Size alone.
//   - Chairs: Color (their PDP color swatches) — price doesn't change.
//   - Sofas: Seating Capacity AND Color — capacity changes price, color
//     doesn't (matches the existing Valencia/Seattle/Luxe Grande fixtures'
//     own "Color / Seating" spec order).
//
// `type` tells Edit Order which chip row(s) to render and how to price and
// reconstruct the spec string — see specForVariant/priceForVariant below.

// A mattress's footprint is a function of its Size alone — never a separate
// customer choice — so this is data, not another chip row.
const MATTRESS_DIMENSIONS = {
  Single: '36x75 in',
  Queen: '60x78 in',
  King: '72x78 in',
};

function mattressEntry({ sizes, heights }) {
  return { type: 'mattress', sizes, heights };
}

const STANDARD_HEIGHTS = [
  { label: '6 in', delta: -1500 },
  { label: '8 in', delta: 0 },
  { label: '10 in', delta: 2500 },
];

const CHAIR_COLORS = [{ label: 'Black' }, { label: 'Blue' }, { label: 'Grey' }];

const SOFA_COLORS = [{ label: 'Royal Blue' }, { label: 'Beige' }, { label: 'Charcoal Grey' }];

export const VARIANTS = {
  'Smart Ortho Hybrid Pocketed Spring Mattress': mattressEntry({
    sizes: [
      { label: 'Single', price: 15990 },
      { label: 'Queen', price: 21290 },
      { label: 'King', price: 25990 },
    ],
    heights: STANDARD_HEIGHTS,
  }),
  'Smart Ortho Pro Mattress': mattressEntry({
    sizes: [
      { label: 'Single', price: 12990 },
      { label: 'Queen', price: 17990 },
      { label: 'King', price: 21990 },
    ],
    heights: STANDARD_HEIGHTS,
  }),
  'Smart Ortho Royale Mattress': mattressEntry({
    sizes: [
      { label: 'Queen', price: 40990 },
      { label: 'King', price: 47990 },
    ],
    heights: STANDARD_HEIGHTS,
  }),
  'Smart Luxe Royale Mattress': mattressEntry({
    sizes: [
      { label: 'Queen', price: 53335 },
      { label: 'King', price: 61335 },
    ],
    heights: STANDARD_HEIGHTS,
  }),
  'Smart Ortho Mattress': mattressEntry({
    sizes: [
      { label: 'Single', price: 9490 },
      { label: 'Queen', price: 14990 },
      { label: 'King', price: 18990 },
    ],
    heights: STANDARD_HEIGHTS,
  }),

  'Onyx Orthopedic Office Chair': { type: 'chair', colors: CHAIR_COLORS },
  'Elite Premium Office Chair': { type: 'chair', colors: CHAIR_COLORS },
  'Stylux Ergonomic Office Chair': { type: 'chair', colors: CHAIR_COLORS },

  'Luxe Grande Recliner Sofa': {
    type: 'sofa',
    seating: [
      { label: '2 Seater', price: 79999 },
      { label: '3 Seater', price: 89999 },
      { label: '3+2 Seater', price: 119999 },
    ],
    colors: SOFA_COLORS,
  },
};

export function getVariants(productName) {
  return VARIANTS[productName] ?? null;
}

// A variant selection's own natural first-load state, derived from the
// product's current spec string — "Queen / 8 inch / 60x78 in" for a
// mattress, "Black" for a chair, "Royal Blue / 3 Seater" for a sofa. Custom
// mattress sizes carry their own free-text dimensions instead of a catalog
// Size, so those come back as `size: 'Custom'` with `customDimensions` set.
export function selectionFromSpec(variants, spec) {
  const parts = spec ? spec.split(' / ') : [];
  if (!variants) return {};
  if (variants.type === 'mattress') {
    const knownSize = variants.sizes.some((s) => s.label === parts[0]);
    return {
      size: knownSize ? parts[0] : 'Custom',
      customDimensions: knownSize ? '' : parts[0] ?? '',
      height: parts[1]?.replace(' inch', ' in') ?? variants.heights[0]?.label,
    };
  }
  if (variants.type === 'chair') {
    return { color: parts[0] ?? variants.colors[0]?.label };
  }
  if (variants.type === 'sofa') {
    return { color: parts[0] ?? variants.colors[0]?.label, seating: parts[1] ?? variants.seating[0]?.label };
  }
  return {};
}

// The inverse of selectionFromSpec — turns a selection back into the spec
// string convention every product/order/line-item already uses elsewhere in
// this app, so saving a variant change round-trips cleanly through
// splitProductSpec.
export function specForSelection(variants, selection) {
  if (variants.type === 'mattress') {
    const size = selection.size === 'Custom' ? selection.customDimensions || 'Custom' : selection.size;
    const dimensions = selection.size === 'Custom' ? 'Dimensions on request' : MATTRESS_DIMENSIONS[selection.size];
    return `${size} / ${selection.height} / ${dimensions}`;
  }
  if (variants.type === 'chair') {
    return selection.color;
  }
  if (variants.type === 'sofa') {
    return `${selection.color} / ${selection.seating}`;
  }
  return '';
}

// Custom mattress sizes and chair colors don't change price on their own —
// only a catalog Size (mattress) or Seating Capacity (sofa) does, each with
// a Height delta layered on top for mattresses.
export function priceForSelection(variants, selection, fallbackPrice) {
  if (variants.type === 'mattress') {
    if (selection.size === 'Custom') return fallbackPrice;
    const base = variants.sizes.find((s) => s.label === selection.size)?.price;
    const heightDelta = variants.heights.find((h) => h.label === selection.height)?.delta ?? 0;
    return base != null ? base + heightDelta : fallbackPrice;
  }
  if (variants.type === 'sofa') {
    return variants.seating.find((s) => s.label === selection.seating)?.price ?? fallbackPrice;
  }
  return fallbackPrice;
}
