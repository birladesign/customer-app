import { useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import Tracker from './Tracker.jsx';
import { useNavigation } from '../navigation/NavigationContext.jsx';
import { SPRING_STANDARD, DURATION_REDUCED } from '../motion.js';
import { CopyIcon, CheckIcon, ChevronDownIcon, ChevronRightIcon, ZapIcon, AlertTriangleIcon, WalletIcon, CheckCircleIcon, StarIcon } from './icons.jsx';
import './OrderCard.css';

const DOT_COLOR = {
  red: 'var(--color-action-red)',
  blue: 'var(--color-info-blue)',
  green: 'var(--color-success)',
  muted: 'var(--color-text-muted)',
};

const BANNER_ICON = {
  zap: ZapIcon,
  alert: AlertTriangleIcon,
};

function ActionButton({ label, variant, isTrackTrigger, isOpen, onClick }) {
  if (variant === 'disabled') {
    return (
      <button className="order-card__action order-card__action--disabled" disabled>
        {label}
      </button>
    );
  }
  const className =
    variant === 'primary'
      ? 'order-card__action order-card__action--primary'
      : variant === 'secondary-danger'
      ? 'order-card__action order-card__action--danger'
      : 'order-card__action order-card__action--secondary';
  return (
    <button
      className={className}
      onClick={(e) => {
        e.stopPropagation();
        onClick?.(e);
      }}
      aria-expanded={isTrackTrigger ? isOpen : undefined}
    >
      {label}
      {isTrackTrigger && (
        <ChevronDownIcon
          className={`order-card__track-chevron${isOpen ? ' order-card__track-chevron--open' : ''}`}
        />
      )}
    </button>
  );
}

function CopyOrderId({ id }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy(e) {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(id);
    } catch {
      // Clipboard API unavailable (e.g. insecure context) — still show the
      // press feedback below; there's nothing else useful to fall back to.
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  }

  return (
    <button className="order-card__id" onClick={handleCopy} aria-label={`Copy order number ${id}`}>
      {copied ? (
        <CheckIcon className="order-card__id-icon order-card__id-icon--copied" />
      ) : (
        <CopyIcon className="order-card__id-icon" />
      )}
      <span>{id}</span>
    </button>
  );
}

export default function OrderCard({ order }) {
  const { banner, badge, status, product, caption, savings, refundNote, disabledReason, actions, rating, tracker } = order;
  const reduceMotion = useReducedMotion();
  const { navigate } = useNavigation();
  const [trackerOpen, setTrackerOpen] = useState(false);
  const BannerIcon = banner ? BANNER_ICON[banner.icon] : null;

  function openDetails() {
    navigate('orderDetails', { orderId: order.id });
  }

  return (
    <article
      className={`order-card${banner ? ' order-card--flagged' : ''}`}
      data-order-id={order.id}
      role="button"
      tabIndex={0}
      onClick={openDetails}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          openDetails();
        }
      }}
    >
      {banner && (
        <div className="order-card__banner">
          {BannerIcon && <BannerIcon className="order-card__banner-icon" />}
          {banner.text.toUpperCase()}
        </div>
      )}

      <div className="order-card__body">
        <div className="order-card__header">
          <CopyOrderId id={order.id} />
          <span className="order-card__date">{order.date}</span>
        </div>

        <div className="order-card__main">
          <img className="order-card__image" src={order.image} alt={product} />
          <div className="order-card__details">
            <div className="order-card__status-row">
              <span className="order-card__status-label" style={{ color: DOT_COLOR[status.dot] }}>
                {status.label}
              </span>
              {badge && <span className="order-card__pill-badge">{badge}</span>}
            </div>
            <p className="order-card__product">{product}</p>
            {caption && <p className="order-card__caption">{caption}</p>}
            {savings && (
              <p className="order-card__savings">
                <WalletIcon /> {savings}
              </p>
            )}
            {refundNote && (
              <p className="order-card__refund-note">
                <CheckCircleIcon /> {refundNote}
              </p>
            )}
          </div>
          <ChevronRightIcon className="order-card__chevron" aria-hidden="true" />
        </div>

        {disabledReason && <p className="order-card__disabled-reason">{disabledReason}</p>}

        {actions.length > 0 && (
          <div className="order-card__actions">
            {actions.map((a) => {
              const isTrackTrigger = Boolean(tracker) && a.label.startsWith('Track');
              return (
                <ActionButton
                  key={a.label}
                  {...a}
                  isTrackTrigger={isTrackTrigger}
                  isOpen={trackerOpen}
                  onClick={isTrackTrigger ? () => setTrackerOpen((v) => !v) : undefined}
                />
              );
            })}
          </div>
        )}

        <AnimatePresence initial={false}>
          {trackerOpen && tracker && (
            <motion.div
              className="order-card__tracker-wrap"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={reduceMotion ? DURATION_REDUCED : SPRING_STANDARD}
              style={{ overflow: 'hidden' }}
            >
              <Tracker steps={tracker.steps} currentIndex={tracker.currentIndex} />
            </motion.div>
          )}
        </AnimatePresence>

        {typeof rating === 'number' && (
          <div className="order-card__rating">
            <span>Rate this product</span>
            <span className="order-card__stars">
              {Array.from({ length: 5 }, (_, i) => (
                <StarIcon key={i} filled={i < rating} />
              ))}
            </span>
          </div>
        )}
      </div>
    </article>
  );
}
