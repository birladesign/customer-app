import { splitProductSpec } from '../data/orders.js';
import { getItemIntents, getEditEligibility } from '../data/intents.js';
import Tracker from './Tracker.jsx';
import { FileTextIcon, ShieldIcon, ExternalLinkIcon, StarIcon, EditIcon } from './icons.jsx';
import './PrimaryItem.css';

const STATUS_COLOR = {
  red: 'var(--color-action-red)',
  blue: 'var(--color-info-blue)',
  green: 'var(--color-success)',
  muted: 'var(--color-text-muted)',
};

function formatRupees(amount) {
  return `₹${amount.toLocaleString('en-IN')}`;
}

// The order's headline item — always shown in full, not behind a tap, so a
// multi-item order still reads at a glance the way a single-item order does:
// here's what this is mainly about. The remaining items sit in their own,
// visually quieter list below (LineItems), each needing a tap to open.
export default function PrimaryItem({ item, onTrack, onReturn, onRate, onEdit }) {
  const { name, spec } = splitProductSpec(item.product);
  const intents = getItemIntents(item);
  const editIntent = getEditEligibility(item);

  return (
    <div className="primary-item">
      <div className="primary-item__header">
        <img className="primary-item__image" src={item.image} alt={item.product} />
        <div className="primary-item__text">
          <p className="primary-item__product">{name}</p>
          {(item.qty || spec) && (
            <p className="primary-item__variant">
              {item.qty && <span>Qty: {item.qty}</span>}
              {item.qty && spec && <span className="primary-item__variant-dot" aria-hidden="true" />}
              {spec && <span>{spec}</span>}
            </p>
          )}
          <span className="primary-item__status" style={{ color: STATUS_COLOR[item.status.dot] }}>
            {item.status.label}
          </span>
        </div>
        <span className="primary-item__price">{formatRupees(item.price)}</span>
      </div>

      <div className="primary-item__divider" />

      <div className="primary-item__detail">
        {item.caption && <p className="primary-item__caption">{item.caption}</p>}
        <Tracker steps={item.tracker.steps} currentIndex={item.tracker.currentIndex} />
        <button className="primary-item__track" onClick={() => onTrack(item)}>
          <FileTextIcon width="14" height="14" />
          Track This Item
        </button>

        {typeof item.rating === 'number' && (
          <div className="primary-item__rate">
            <span className="primary-item__rate-label">Rate this item</span>
            <span className="primary-item__stars">
              {Array.from({ length: 5 }, (_, i) => (
                <button
                  key={i}
                  className="primary-item__star-btn"
                  onClick={() => onRate(item, i + 1)}
                  aria-label={`Rate ${item.product} ${i + 1} out of 5 stars`}
                >
                  <StarIcon filled={i < item.rating} />
                </button>
              ))}
            </span>
          </div>
        )}

        <div className="primary-item__actions">
          <button
            className="primary-item__action-link"
            disabled={!editIntent.enabled}
            title={editIntent.enabled ? undefined : editIntent.reason}
            onClick={editIntent.enabled ? () => onEdit(item) : undefined}
          >
            <EditIcon width="13" height="13" />
            Edit
          </button>
          <button
            className="primary-item__action-link"
            disabled={!intents.warranty.enabled}
            title={intents.warranty.enabled ? undefined : intents.warranty.reason}
          >
            <ShieldIcon width="13" height="13" />
            Warranty
            {intents.warranty.enabled && <ExternalLinkIcon width="12" height="12" />}
          </button>
          <button
            className="primary-item__return"
            disabled={!intents.returnReplace.enabled}
            onClick={intents.returnReplace.enabled ? () => onReturn(item) : undefined}
          >
            Return / Replace
          </button>
        </div>
        {!intents.returnReplace.enabled && (
          <p className="primary-item__action-reason">{intents.returnReplace.reason}</p>
        )}
      </div>
    </div>
  );
}
