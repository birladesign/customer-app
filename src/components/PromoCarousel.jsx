import { useRef, useState } from 'react';
import './PromoCarousel.css';

// Native scroll-snap, no drag physics — a promo banner is decorative and
// non-blocking, unlike a bottom sheet's real drag-dismiss gesture.
export default function PromoCarousel({ banners }) {
  const trackRef = useRef(null);
  const [active, setActive] = useState(0);

  function handleScroll() {
    const el = trackRef.current;
    if (!el) return;
    setActive(Math.round(el.scrollLeft / el.clientWidth));
  }

  return (
    <div className="promo-carousel">
      <div className="promo-carousel__track" ref={trackRef} onScroll={handleScroll}>
        {banners.map((banner) => (
          <div className="promo-carousel__slide" key={banner.id}>
            <img className="promo-carousel__image" src={banner.image} alt="" />
            <div className="promo-carousel__text">
              <p className="promo-carousel__headline">{banner.headline}</p>
              <span className="promo-carousel__cta">{banner.ctaLabel}</span>
            </div>
          </div>
        ))}
      </div>
      {banners.length > 1 && (
        <div className="promo-carousel__dots">
          {banners.map((banner, i) => (
            <span
              key={banner.id}
              className={`promo-carousel__dot${i === active ? ' promo-carousel__dot--active' : ''}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
