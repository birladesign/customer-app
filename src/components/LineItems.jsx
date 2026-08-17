import { splitProductSpec } from '../data/orders.js';
import { ChevronRightIcon } from './icons.jsx';
import './LineItems.css';

const STATUS_COLOR = {
  red: 'var(--color-action-red)',
  blue: 'var(--color-info-blue)',
  green: 'var(--color-success)',
  muted: 'var(--color-text-muted)',
};

function formatRupees(amount) {
  return `₹${amount.toLocaleString('en-IN')}`;
}

// Secondary items in a multi-item order get one job: identify themselves and
// hand off to their own full Order Details page (tracking, warranty, rating,
// billing, Return/Replace — all live there, scoped to that item) in a single
// tap. No inline accordion — that would just duplicate what "More Details"
// already opens, at the cost of an extra tap to get there.
export default function LineItems({ items, onMoreDetails }) {
  return (
    <div className="line-items">
      {items.map((item) => {
        const { name, spec } = splitProductSpec(item.product);
        return (
          <button className="line-items__row" key={item.sku} onClick={() => onMoreDetails(item)}>
            <img className="line-items__image" src={item.image} alt={item.product} />
            <div className="line-items__text">
              <p className="line-items__product">{name}</p>
              {(item.qty || spec) && (
                <p className="line-items__variant">
                  {item.qty && <span>Qty: {item.qty}</span>}
                  {item.qty && spec && <span className="line-items__variant-dot" aria-hidden="true" />}
                  {spec && <span>{spec}</span>}
                </p>
              )}
              <span className="line-items__status" style={{ color: STATUS_COLOR[item.status.dot] }}>
                {item.status.label}
              </span>
            </div>
            <div className="line-items__end">
              <span className="line-items__price">{formatRupees(item.price)}</span>
              <ChevronRightIcon className="line-items__chevron" aria-hidden="true" />
            </div>
          </button>
        );
      })}
    </div>
  );
}
