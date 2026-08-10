// Demo data for the Home dashboard. Reuses product imagery already imported
// for My Orders — no new binary assets for a prototype promo carousel.
import imgMattressLuxeRoyale from '../assets/mattress-luxe-royale.jpg';
import imgChairElitePremium from '../assets/chair-elite-premium.jpg';

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
