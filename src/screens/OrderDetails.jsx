import { useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { ORDERS, splitProductSpec } from '../data/orders.js';
import { getOrderIntents } from '../data/intents.js';
import { useNavigation } from '../navigation/NavigationContext.jsx';
import { SPRING_STANDARD, DURATION_REDUCED } from '../motion.js';
import Timeline from '../components/Timeline.jsx';
import IntentList from '../components/IntentList.jsx';
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  CopyIcon,
  CheckIcon,
  FileTextIcon,
  ShieldIcon,
  ExternalLinkIcon,
  StarIcon,
  HelpCircleIcon,
  HeadsetIcon,
} from '../components/icons.jsx';
import './OrderDetails.css';

const STATUS_PILL = {
  red: { bg: 'var(--color-action-red-tint)', color: 'var(--color-action-red)' },
  blue: { bg: 'var(--color-info-blue-tint)', color: 'var(--color-info-blue)' },
  green: { bg: 'var(--color-success-tint)', color: 'var(--color-success)' },
  muted: { bg: 'var(--color-disabled-bg)', color: 'var(--color-disabled-text)' },
};

const FEATURED_INTENT_KEYS = ['returnReplace', 'warranty', 'needHelp'];

function formatRupees(amount) {
  return `₹${amount.toLocaleString('en-IN')}`;
}

export default function OrderDetails({ params }) {
  const { goBack, navigate } = useNavigation();
  const [copied, setCopied] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const reduceMotion = useReducedMotion();
  const order = ORDERS.find((o) => o.id === params.orderId);

  if (!order) {
    return (
      <div className="order-details">
        <header className="order-details__topbar">
          <button className="order-details__icon-btn" onClick={goBack} aria-label="Back">
            <ChevronLeftIcon />
          </button>
          <h1>Order Details</h1>
          <span className="order-details__icon-btn-spacer" />
        </header>
        <p className="order-details__not-found">Order not found.</p>
      </div>
    );
  }

  const { name: productName, spec } = splitProductSpec(order.product);
  const pill = STATUS_PILL[order.status.dot] ?? STATUS_PILL.muted;
  const intents = getOrderIntents(order);
  const returnIntent = intents.find((i) => i.key === 'returnReplace');
  const warrantyIntent = intents.find((i) => i.key === 'warranty');

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(order.id);
    } catch {
      // Clipboard API unavailable — the checkmark still confirms the tap.
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  }

  return (
    <div className="order-details">
      <header className="order-details__topbar">
        <button className="order-details__icon-btn" onClick={goBack} aria-label="Back">
          <ChevronLeftIcon />
        </button>
        <h1>Order Details</h1>
        <span className="order-details__icon-btn-spacer" />
      </header>

      <main className="order-details__content">
        <div className="order-details__product-card">
          <img className="order-details__image" src={order.image} alt={order.product} />
          <div className="order-details__product-text">
            <p className="order-details__product">{productName}</p>
            {spec && <p className="order-details__spec">{spec}</p>}
          </div>
        </div>

        <div className="order-details__id-row">
          <div>
            <p className="order-details__id-label">Order ID</p>
            <button className="order-details__id" onClick={handleCopy}>
              {copied ? <CheckIcon width="13" height="13" strokeWidth="3" /> : <CopyIcon width="13" height="13" />}
              <span>{order.id}</span>
            </button>
          </div>
          <span className="order-details__status-pill" style={{ background: pill.bg, color: pill.color }}>
            {order.status.label}
          </span>
        </div>

        {order.timeline && (
          <div className="order-details__card">
            <Timeline steps={order.timeline.steps} currentIndex={order.timeline.currentIndex} />
            <button className="order-details__tracking-link">
              <FileTextIcon width="14" height="14" />
              Tracking Updates
            </button>
          </div>
        )}

        <div className="order-details__disclosure-wrap">
          <button
            className="order-details__disclosure"
            onClick={() => setDetailsOpen((v) => !v)}
            aria-expanded={detailsOpen}
          >
            <span>Item &amp; Billing Info</span>
            <ChevronRightIcon
              className={`order-details__disclosure-chevron${detailsOpen ? ' order-details__disclosure-chevron--open' : ''}`}
            />
          </button>
          <AnimatePresence initial={false}>
            {detailsOpen && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={reduceMotion ? DURATION_REDUCED : SPRING_STANDARD}
                style={{ overflow: 'hidden' }}
              >
                <div className="order-details__disclosure-body">
                  <div className="order-details__row">
                    <span>Order Amount</span>
                    <strong>{formatRupees(order.amount)}</strong>
                  </div>
                  <div className="order-details__row">
                    <span>Payment</span>
                    <strong>{order.payment.method} · {order.payment.status}</strong>
                  </div>
                  {order.address && (
                    <div className="order-details__row order-details__row--address">
                      <span>Delivery Address</span>
                      <strong>{order.address}</strong>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {warrantyIntent?.enabled ? (
          <button className="order-details__warranty-row">
            <span className="order-details__warranty-icon">
              <ShieldIcon />
            </span>
            <span className="order-details__warranty-label">Warranty Details</span>
            <ExternalLinkIcon className="order-details__warranty-external" />
          </button>
        ) : (
          <div className="order-details__warranty-row order-details__warranty-row--disabled">
            <span className="order-details__warranty-icon">
              <ShieldIcon />
            </span>
            <span className="order-details__warranty-text">
              <span className="order-details__warranty-label">Warranty Details</span>
              <span className="order-details__warranty-reason">{warrantyIntent?.reason}</span>
            </span>
          </div>
        )}

        {typeof order.rating === 'number' && (
          <div className="order-details__rating">
            <img className="order-details__rating-image" src={order.image} alt="" />
            <div>
              <p className="order-details__rating-heading">Rate {productName}</p>
              <span className="order-details__rating-stars">
                {Array.from({ length: 5 }, (_, i) => (
                  <StarIcon key={i} filled={i < order.rating} />
                ))}
              </span>
            </div>
          </div>
        )}

        <div className="order-details__return-cta">
          <p className="order-details__return-prompt">Not sure about the item?</p>
          <button
            className="order-details__return-link"
            disabled={!returnIntent?.enabled}
            onClick={returnIntent?.enabled ? () => navigate('returnReplace', { orderId: order.id }) : undefined}
          >
            Return / Replacement
          </button>
          {!returnIntent?.enabled && <p className="order-details__return-reason">{returnIntent?.reason}</p>}
        </div>

        <IntentList order={order} excludeKeys={FEATURED_INTENT_KEYS} />

        <div className="order-details__help-card">
          <div className="order-details__help-row">
            <span className="order-details__help-icon">
              <HelpCircleIcon />
            </span>
            <div>
              <p className="order-details__help-heading">Need Help with this order?</p>
              <p className="order-details__help-subtext">Our sleep experts are here to help you 24/7</p>
            </div>
          </div>
          <button className="order-details__help-cta">
            <HeadsetIcon width="16" height="16" />
            Chat with Support
          </button>
        </div>
      </main>
    </div>
  );
}
