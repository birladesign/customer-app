import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { splitProductSpec } from '../data/orders.js';
import { getItemIntents } from '../data/intents.js';
import { SPRING_STANDARD, DURATION_REDUCED } from '../motion.js';
import Tracker from './Tracker.jsx';
import StarRating from './StarRating.jsx';
import { ChevronDownIcon, ChevronRightIcon, FileTextIcon, ShieldIcon, ExternalLinkIcon } from './icons.jsx';
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

// Each row is its own accordion — only one open at a time (openSku), so
// expanding one item cleanly retracts the last, the same single-open-panel
// behavior as a native list disclosure. Tapping the already-open row closes
// it. The parent (OrderDetails) owns openSku/onToggle so it stays in sync
// with which item's tracking sheet is showing.
//
// Return/Warranty eligibility is computed per item (getItemIntents), not
// inherited from the order — a delivered mattress is returnable the moment
// it arrives, regardless of a still-in-transit bed frame in the same order.
export default function LineItems({ items, openSku, onToggle, onTrack, onReturn, onRate, onMoreDetails }) {
  const reduceMotion = useReducedMotion();

  return (
    <div className="line-items">
      {items.map((item) => {
        const isOpen = openSku === item.sku;
        const { name, spec } = splitProductSpec(item.product);
        const intents = getItemIntents(item);
        return (
          <div className="line-items__row" key={item.sku}>
            <button
              className="line-items__summary"
              onClick={() => onToggle(item.sku)}
              aria-expanded={isOpen}
            >
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
                <ChevronDownIcon
                  className={`line-items__chevron${isOpen ? ' line-items__chevron--open' : ''}`}
                />
              </div>
            </button>

            <AnimatePresence initial={false}>
              {isOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={reduceMotion ? DURATION_REDUCED : SPRING_STANDARD}
                  style={{ overflow: 'hidden' }}
                >
                  <div className="line-items__detail">
                    {item.caption && <p className="line-items__caption">{item.caption}</p>}
                    <Tracker steps={item.tracker.steps} currentIndex={item.tracker.currentIndex} />
                    <button className="line-items__track" onClick={() => onTrack(item)}>
                      <FileTextIcon width="14" height="14" />
                      Track This Item
                    </button>

                    {typeof item.rating === 'number' && (
                      <StarRating
                        className="line-items__rate"
                        value={item.rating}
                        onRate={(value) => onRate(item, value)}
                        itemName={item.product}
                      />
                    )}

                    <div className="line-items__item-actions">
                      <button
                        className="line-items__action-link"
                        disabled={!intents.warranty.enabled}
                      >
                        <ShieldIcon width="13" height="13" />
                        Warranty
                        {intents.warranty.enabled && <ExternalLinkIcon width="12" height="12" />}
                      </button>
                      <button
                        className="line-items__return"
                        disabled={!intents.returnReplace.enabled}
                        onClick={intents.returnReplace.enabled ? () => onReturn(item) : undefined}
                      >
                        Return / Replace
                      </button>
                    </div>
                    {/* A native `title` tooltip never appears on touch, so a
                        disabled action's reason needs to be real, visible
                        text — not just an attribute only a mouse can hover. */}
                    {!intents.returnReplace.enabled && (
                      <p className="line-items__action-reason">{intents.returnReplace.reason}</p>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
}
