import { useState } from 'react';
import { StarIcon } from './icons.jsx';
import './StarRating.css';

// Shared by every "rate this" surface (My Orders card, Order Details, line
// items) so a tap behaves and looks the same everywhere — filled stars are
// always gold, every star is a real button, and every tap is confirmed.
// Each instance owns its own confirmation timer, so a list of these (e.g.
// LineItems) never needs to track "which row just got rated" itself.
export default function StarRating({
  value,
  onRate,
  idleLabel = 'Rate this item',
  confirmedLabel = 'Thanks for rating!',
  itemName = 'this item',
  className = '',
}) {
  // A rating is a "completion" event (Apple's four feedback kinds) — filling
  // a star silently isn't enough on its own to read as confirmed.
  const [justRated, setJustRated] = useState(false);

  function handleRate(rating) {
    onRate(rating);
    setJustRated(true);
    setTimeout(() => setJustRated(false), 1800);
  }

  return (
    <div className={`star-rating${justRated ? ' star-rating--confirmed' : ''} ${className}`.trim()}>
      <span className={`star-rating__label${justRated ? ' star-rating__label--confirmed' : ''}`}>
        {justRated ? confirmedLabel : idleLabel}
      </span>
      <span className="star-rating__stars">
        {Array.from({ length: 5 }, (_, i) => {
          const filled = i < (value ?? 0);
          return (
            <button
              key={i}
              type="button"
              className={`star-rating__star-btn${filled ? ' star-rating__star-btn--filled' : ''}`}
              onClick={(e) => {
                // Ratings often sit inside a fully-clickable card (OrderCard
                // navigates to Order Details on tap) — without this, rating
                // a card would rate it AND navigate away from it.
                e.stopPropagation();
                handleRate(i + 1);
              }}
              aria-label={`Rate ${itemName} ${i + 1} out of 5 stars`}
            >
              <StarIcon filled={filled} />
            </button>
          );
        })}
      </span>
    </div>
  );
}
