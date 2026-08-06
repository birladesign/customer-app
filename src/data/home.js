// Demo data for the Home dashboard. Reuses product imagery already imported
// for My Orders — no new binary assets for a prototype promo carousel.
import imgMattressLuxeRoyale from '../assets/mattress-luxe-royale.jpg';
import imgChairElitePremium from '../assets/chair-elite-premium.jpg';

// icon is a lookup key (not a component) — same pattern as OrderCard's
// banner.icon — so this file stays plain data, not JSX.
export const QUICK_ACTIONS = [
  { key: 'track', label: 'Track', icon: 'truck' },
  { key: 'repair', label: 'Repair', icon: 'wrench' },
  { key: 'warranty', label: 'Warranty', icon: 'shield' },
];

export const PROMO_BANNERS = [
  {
    id: 'promo-luxe-royale',
    image: imgMattressLuxeRoyale,
    headline: 'Upgrade to the Luxe Royale Mattress',
    ctaLabel: 'Shop Mattresses',
  },
  {
    id: 'promo-elite-chair',
    image: imgChairElitePremium,
    headline: 'Work in comfort with Elite Premium',
    ctaLabel: 'Shop Chairs',
  },
];
