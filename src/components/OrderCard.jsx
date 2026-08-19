import { useState } from 'react';
import { splitProductSpec, getOrderStatus, getExpectedDelivery, getDeliveredDate, resumeOrder } from '../data/orders.js';
import { getOpenCaseForOrder } from '../data/support.js';
import { useNavigation } from '../navigation/NavigationContext.jsx';
import { CopyIcon, CheckIcon, ChevronRightIcon, WalletIcon, CheckCircleIcon, CalendarIcon } from './icons.jsx';
import StarRating from './StarRating.jsx';
import CardMoreMenu from './CardMoreMenu.jsx';
import './OrderCard.css';

const DOT_COLOR = {
  red: 'var(--color-action-red)',
  blue: 'var(--color-info-blue)',
  green: 'var(--color-success)',
  muted: 'var(--color-text-muted)',
};

function ActionButton({ label, variant, onClick }) {
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
    >
      {label}
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
  const { banner, badge, product, caption, savings, refundNote, actions } = order;
  const status = getOrderStatus(order);
  const { navigate, switchTab } = useNavigation();
  const { name: productName, spec } = splitProductSpec(product);
  const expectedDelivery = getExpectedDelivery(order);
  // Every other status already has its own hand-authored caption ("Exchange
  // Completed on...", refund notes, etc.) — a plain "Delivered" is the one
  // gap where nothing says which day it actually arrived.
  const deliveredDate = !caption && status.label === 'Delivered' ? getDeliveredDate(order) : null;
  const visibleActions = actions.filter((a) => !a.label.startsWith('Track'));
  // No backend in this prototype — mutate the shared order object in place
  // (same pattern as elsewhere) so Order Details reflects the same rating
  // if the customer taps through after rating from the list.
  const [rating, setRating] = useState(order.rating);
  // Resuming mutates status/section/caption/actions directly on the shared
  // order object (same no-backend pattern as rating above) — none of those
  // are local state, so this just needs to force one more render to pick up
  // the fresh values.
  const [, forceUpdate] = useState(0);

  function handleEditAddress() {
    navigate('editOrder', order.items ? { orderId: order.id, sku: order.items[0].sku } : { orderId: order.id });
  }

  function handleRescheduleDelivery() {
    navigate('deliverySchedule', { orderId: order.id, reschedule: true });
  }

  function handleMoreHelp() {
    switchTab('support', { openChat: true, orderId: order.id });
  }

  // Only actions with a real destination get a handler here — everything
  // else on this card stays present-but-inert until it has one too, same
  // discipline as the rest of this prototype.
  function getActionHandler(label) {
    if (label === 'Schedule Installation' || label === 'Reschedule Installation' || label === 'Reschedule') {
      return () => navigate('installationSchedule', { orderId: order.id, reschedule: label.startsWith('Reschedule') });
    }
    if (label === 'View Slot') {
      return () => navigate('installationSchedule', { orderId: order.id });
    }
    if (label === 'Report an Issue') {
      return () => switchTab('support', { openChat: true, orderId: order.id });
    }
    if (label === 'Manage Return') {
      return () => {
        const openCase = getOpenCaseForOrder(order.id);
        if (openCase) navigate('requestDetail', { caseId: openCase.id });
        else switchTab('support', { openChat: true, orderId: order.id });
      };
    }
    if (label === 'Resume Order') {
      return () => {
        resumeOrder(order);
        forceUpdate((v) => v + 1);
      };
    }
    return undefined;
  }

  function openDetails() {
    navigate('orderDetails', { orderId: order.id });
  }

  function handleRate(value) {
    order.rating = value;
    setRating(value);
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
      <div className="order-card__body">
        <div className="order-card__header">
          <CopyOrderId id={order.id} />
          <span className="order-card__header-right">
            <span className="order-card__date">{order.date}</span>
            <CardMoreMenu
              onEditAddress={handleEditAddress}
              onReschedule={handleRescheduleDelivery}
              onNeedHelp={handleMoreHelp}
            />
          </span>
        </div>

        <div className="order-card__status-row">
          <span className="order-card__status-group">
            <span className="order-card__status-label" style={{ color: DOT_COLOR[status.dot] }}>
              {status.label}
            </span>
            {badge && <span className="order-card__pill-badge">{badge}</span>}
          </span>
          {expectedDelivery && !caption?.includes(expectedDelivery) && (
            <p className="order-card__edd">
              <CalendarIcon width="12" height="12" />
              Est. Delivery: {expectedDelivery}
            </p>
          )}
        </div>

        <div className="order-card__main">
          <img className="order-card__image" src={order.image} alt={product} />
          <div className="order-card__details">
            <p className="order-card__product">{productName}</p>
            {(order.qty || spec) && (
              <p className="order-card__variant">
                {order.qty && <span>Qty: {order.qty}</span>}
                {order.qty && spec && <span className="order-card__variant-dot" aria-hidden="true" />}
                {spec && <span>{spec}</span>}
              </p>
            )}
            {caption && <p className="order-card__caption">{caption}</p>}
            {deliveredDate && <p className="order-card__caption">Delivered on {deliveredDate}</p>}
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

        {visibleActions.length > 0 && (
          <div className="order-card__actions">
            {visibleActions.map((a) => (
              <ActionButton key={a.label} {...a} onClick={getActionHandler(a.label)} />
            ))}
          </div>
        )}

        {typeof rating === 'number' && (
          <StarRating
            className="order-card__rating"
            value={rating}
            onRate={handleRate}
            idleLabel="Rate this product"
            itemName={productName}
          />
        )}
      </div>
    </article>
  );
}
