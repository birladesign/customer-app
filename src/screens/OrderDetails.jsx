import { useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { ORDERS, splitProductSpec } from '../data/orders.js';
import { getOrderIntents } from '../data/intents.js';
import { CURRENT_USER } from '../data/profile.js';
import { useNavigation } from '../navigation/NavigationContext.jsx';
import { SPRING_STANDARD, DURATION_REDUCED } from '../motion.js';
import Timeline from '../components/Timeline.jsx';
import ConfirmSheet from '../components/ConfirmSheet.jsx';
import BottomSheet from '../components/BottomSheet.jsx';
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
  MailIcon,
  PhoneIcon,
  UserIcon,
} from '../components/icons.jsx';
import './OrderDetails.css';

const STATUS_PILL = {
  red: { bg: 'var(--color-action-red-tint)', color: 'var(--color-action-red)' },
  blue: { bg: 'var(--color-info-blue-tint)', color: 'var(--color-info-blue)' },
  green: { bg: 'var(--color-success-tint)', color: 'var(--color-success)' },
  muted: { bg: 'var(--color-disabled-bg)', color: 'var(--color-disabled-text)' },
};

function formatRupees(amount) {
  return `₹${amount.toLocaleString('en-IN')}`;
}

export default function OrderDetails({ params }) {
  const { goBack, navigate, switchTab } = useNavigation();
  const [copied, setCopied] = useState(false);
  // Payment/shipping/cancel info is relevant on first glance, not tucked
  // behind a click — starts open, but stays collapsible for anyone who wants
  // to hide it.
  const [detailsOpen, setDetailsOpen] = useState(true);
  const [confirmingCancel, setConfirmingCancel] = useState(false);
  const [trackingOpen, setTrackingOpen] = useState(false);
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
  const cancelIntent = intents.find((i) => i.key === 'cancel');

  // No backend in this prototype — mutate the shared order object in place
  // (same pattern as PersonalInformation/AddAddress) so My Orders reflects
  // the cancellation the moment we navigate back to it.
  function handleCancelOrder() {
    Object.assign(order, {
      section: 'closed',
      status: { dot: 'muted', label: 'Cancelled' },
      caption: 'Cancelled as per your request',
      actions: [],
    });
    order.timeline?.steps.push({ label: 'Cancelled', timestamp: null, description: 'Cancelled as per your request' });
    if (order.timeline) order.timeline.currentIndex = order.timeline.steps.length - 1;
    setConfirmingCancel(false);
    goBack();
  }

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
            <button className="order-details__tracking-link" onClick={() => setTrackingOpen(true)}>
              <FileTextIcon width="14" height="14" />
              Tracking Updates
            </button>
          </div>
        )}

        {order.technician && (
          <div className="order-details__technician-card">
            <span className="order-details__technician-icon">
              <UserIcon width="18" height="18" />
            </span>
            <div className="order-details__technician-text">
              <p className="order-details__technician-label">Your Technician</p>
              <p className="order-details__technician-name">{order.technician.name}</p>
            </div>
            <a className="order-details__technician-call" href={`tel:${order.technician.phone}`}>
              <PhoneIcon width="14" height="14" />
              Call
            </a>
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
                  <div className="order-details__payment-block">
                    <div className="order-details__payment-row">
                      <span>{productName}{spec ? ` (${spec})` : ''}</span>
                      <span>{formatRupees(order.priceBreakup?.itemPrice ?? order.amount)}</span>
                    </div>
                    {Boolean(order.priceBreakup?.discount) && (
                      <div className="order-details__payment-row">
                        <span>Discount</span>
                        <span className="order-details__payment-positive">-{formatRupees(order.priceBreakup.discount)}</span>
                      </div>
                    )}
                    <div className="order-details__payment-row">
                      <span>Shipping &amp; Handling</span>
                      <span className="order-details__payment-positive">
                        {order.priceBreakup?.shipping ? formatRupees(order.priceBreakup.shipping) : 'FREE'}
                      </span>
                    </div>
                    <div className="order-details__payment-divider" />
                    <div className="order-details__payment-row order-details__payment-row--total">
                      <span>Total Amount</span>
                      <span>{formatRupees(order.priceBreakup?.total ?? order.amount)}</span>
                    </div>
                    <div className="order-details__payment-divider" />
                    <div className="order-details__payment-row">
                      <span>Payment Method</span>
                      <span>{order.payment.method} · {order.payment.status}</span>
                    </div>
                    <button className="order-details__get-invoice">
                      <FileTextIcon width="14" height="14" />
                      Get Invoice
                    </button>
                  </div>

                  {order.refund && (
                    <div className="order-details__refund-block">
                      <p className="order-details__refund-heading">Refund Status</p>
                      <div className="order-details__payment-row">
                        <span>Refund Amount</span>
                        <span>{formatRupees(order.refund.amount)}</span>
                      </div>
                      <div className="order-details__payment-row">
                        <span>Refund Method</span>
                        <span>{order.refund.method}</span>
                      </div>
                      <Timeline steps={order.refund.timeline.steps} currentIndex={order.refund.timeline.currentIndex} />
                    </div>
                  )}

                  {order.address && (
                    <div className="order-details__shipping-block">
                      <div className="order-details__shipping-row">
                        <p className="order-details__shipping-label">Delivery Address</p>
                        <p className="order-details__shipping-value">{order.address}</p>
                      </div>
                      <div className="order-details__shipping-divider" />
                      <div className="order-details__shipping-row">
                        <p className="order-details__shipping-label">Billing Address</p>
                        <p className="order-details__shipping-value">{order.address}</p>
                      </div>
                      <div className="order-details__shipping-divider" />
                      <div className="order-details__shipping-row">
                        <p className="order-details__shipping-label">Contact Details</p>
                        <p className="order-details__contact-line">
                          <MailIcon width="13" height="13" />
                          {CURRENT_USER.email}
                        </p>
                        <p className="order-details__contact-line">
                          <PhoneIcon width="13" height="13" />
                          +91 {CURRENT_USER.phone}
                        </p>
                      </div>
                    </div>
                  )}

                  <button
                    className="order-details__cancel-btn"
                    disabled={!cancelIntent?.enabled}
                    onClick={cancelIntent?.enabled ? () => setConfirmingCancel(true) : undefined}
                  >
                    Cancel Order
                  </button>
                  {!cancelIntent?.enabled && <p className="order-details__cancel-reason">{cancelIntent?.reason}</p>}
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
          <button className="order-details__help-cta" onClick={() => switchTab('support', { openChat: true, orderId: order.id })}>
            <HeadsetIcon width="16" height="16" />
            Get Help
          </button>
        </div>
      </main>

      <ConfirmSheet
        open={confirmingCancel}
        title="Cancel this order?"
        body={`This will cancel ${productName}. This can't be undone.`}
        confirmLabel="Cancel Order"
        danger
        onConfirm={handleCancelOrder}
        onClose={() => setConfirmingCancel(false)}
      />

      {order.timeline && (
        <BottomSheet open={trackingOpen} onClose={() => setTrackingOpen(false)}>
          <h2 className="order-details__tracking-sheet-title">Tracking Updates</h2>
          <div className="order-details__tracking-sheet-body">
            <Timeline steps={order.timeline.steps} currentIndex={order.timeline.currentIndex} />
          </div>
        </BottomSheet>
      )}
    </div>
  );
}
