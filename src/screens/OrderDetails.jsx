import { useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { ORDERS, splitProductSpec, getOrderStatus } from '../data/orders.js';
import { getOrderIntents, getEditEligibility } from '../data/intents.js';
import { CURRENT_USER } from '../data/profile.js';
import { useNavigation } from '../navigation/NavigationContext.jsx';
import { SPRING_STANDARD, DURATION_REDUCED } from '../motion.js';
import Timeline from '../components/Timeline.jsx';
import DetailedTracking from '../components/DetailedTracking.jsx';
import LineItems from '../components/LineItems.jsx';
import PrimaryItem from '../components/PrimaryItem.jsx';
import StarRating from '../components/StarRating.jsx';
import ConfirmSheet from '../components/ConfirmSheet.jsx';
import BottomSheet from '../components/BottomSheet.jsx';
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  CopyIcon,
  CheckIcon,
  CloseIcon,
  ClockIcon,
  FileTextIcon,
  ShieldIcon,
  ExternalLinkIcon,
  HeadsetIcon,
  MailIcon,
  PhoneIcon,
  UserIcon,
  EditIcon,
} from '../components/icons.jsx';
import './OrderDetails.css';

const STATUS_PILL = {
  red: { bg: 'var(--color-action-red-tint)', color: 'var(--color-action-red)' },
  blue: { bg: 'var(--color-info-blue-tint)', color: 'var(--color-info-blue)' },
  green: { bg: 'var(--color-success-tint)', color: 'var(--color-success)' },
  muted: { bg: 'var(--color-disabled-bg)', color: 'var(--color-disabled-text)' },
};

// Short, tappable — mirrors ReturnReplace's RETURN_REASONS in shape/length.
const CANCEL_REASONS = [
  'Ordered by mistake',
  'Found a better price',
  'Delivery taking too long',
  'No longer needed',
  'Other',
];

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
  // Cancelling is a multi-step conversation, not a single tap: pick a reason,
  // then get offered Hold as a suitable alternative (see handlePutOnHold),
  // and only reach the final irreversible confirm after declining that.
  // cancelStep drives the reason/alternative sheet; confirmingCancel is the
  // separate, final ConfirmSheet reached only after "No, Cancel My Order."
  const [cancelStep, setCancelStep] = useState(null); // null | 'reason' | 'alternative'
  const [cancelReason, setCancelReason] = useState(null);
  const [confirmingCancel, setConfirmingCancel] = useState(false);
  // Edit and Cancel are both rare, one-off actions — neither belongs sitting
  // on the page by default. Both live behind this one closed-by-default
  // "need help" disclosure instead of two separate always-visible controls.
  const [helpSectionOpen, setHelpSectionOpen] = useState(false);
  const [trackingOpen, setTrackingOpen] = useState(false);
  // Which tracking log the sheet is currently showing — the order's own
  // aggregate timeline by default, or a single line item's when opened via
  // that item's "Track This Item" link. Kept separate from trackingOpen so
  // the sheet's exit animation doesn't lose its content mid-close.
  const [trackingTarget, setTrackingTarget] = useState(null);
  // Single-open accordion for line items, mirroring a native list disclosure —
  // expanding one item retracts whichever was open before.
  const [openItemSku, setOpenItemSku] = useState(null);
  // Item ratings live in local state rather than mutating the shared item
  // object in place — order.items is a plain module-level array, so a
  // direct mutation wouldn't trigger a re-render the way this does.
  const [itemRatings, setItemRatings] = useState({});
  // Single-item orders carry their rating on the order itself, not per-item —
  // same local-state-over-mutation reasoning as itemRatings above. Starts
  // unset and falls back to order.rating until the customer actually rates.
  const [orderRatingOverride, setOrderRatingOverride] = useState(null);
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
  const status = getOrderStatus(order);
  const pill = STATUS_PILL[status.dot] ?? STATUS_PILL.muted;
  const intents = getOrderIntents(order);
  const returnIntent = intents.find((i) => i.key === 'returnReplace');
  const warrantyIntent = intents.find((i) => i.key === 'warranty');
  const cancelIntent = intents.find((i) => i.key === 'cancel');
  // The invoice only exists once the order has actually shipped out — same
  // "available after delivery" window as Warranty, just also true for a
  // multi-item order once every line item (not just the order's headline
  // item) has arrived.
  const isFullyDelivered = order.items
    ? order.items.every((item) => item.status.label === 'Delivered')
    : Boolean(warrantyIntent?.enabled);

  function openCancelFlow() {
    setCancelStep('reason');
  }

  function closeCancelFlow() {
    setCancelStep(null);
    setCancelReason(null);
  }

  function selectCancelReason(reason) {
    setCancelReason(reason);
  }

  function continueToAlternative() {
    setCancelStep('alternative');
  }

  // Offered instead of an outright cancel — "Hold or cancel" is the real
  // decision point (per the order-lifecycle notes), and unlike Return/
  // Replace, Hold is always available in exactly the window Cancel is:
  // Return only ever unlocks after delivery, by which point Cancel isn't
  // offered anymore, so it could never actually be reached from this flow.
  // Mirrors the app's own existing "On Hold — Decision Needed" state
  // (see TSC92401) rather than inventing a new one.
  function handlePutOnHold() {
    Object.assign(order, {
      section: 'needsAttention',
      status: { dot: 'red', label: 'On Hold — Decision Needed' },
      caption: `Paused at your request${cancelReason ? ` (${cancelReason})` : ''} — resume or cancel anytime before it ships.`,
      actions: [
        { label: 'Resume Order', variant: 'primary' },
        { label: 'Manage Order', variant: 'secondary-danger' },
      ],
    });
    order.timeline?.steps.push({ label: 'On Hold', timestamp: null, description: 'Awaiting your decision' });
    if (order.timeline) order.timeline.currentIndex = order.timeline.steps.length - 1;
    closeCancelFlow();
    goBack();
  }

  function proceedToFinalCancel() {
    setCancelStep(null);
    setConfirmingCancel(true);
  }

  // No backend in this prototype — mutate the shared order object in place
  // (same pattern as PersonalInformation/AddAddress) so My Orders reflects
  // the cancellation the moment we navigate back to it.
  function handleCancelOrder() {
    Object.assign(order, {
      section: 'closed',
      status: { dot: 'muted', label: 'Cancelled' },
      caption: cancelReason ? `Cancelled — ${cancelReason}` : 'Cancelled as per your request',
      actions: [],
    });
    order.timeline?.steps.push({ label: 'Cancelled', timestamp: null, description: 'Cancelled as per your request' });
    if (order.timeline) order.timeline.currentIndex = order.timeline.steps.length - 1;
    setConfirmingCancel(false);
    setCancelReason(null);
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

  function openTracking(title, timeline) {
    setTrackingTarget({ title, steps: timeline.steps, currentIndex: timeline.currentIndex });
    setTrackingOpen(true);
  }

  function toggleItem(sku) {
    setOpenItemSku((current) => (current === sku ? null : sku));
  }

  function handleRateItem(item, value) {
    setItemRatings((prev) => ({ ...prev, [item.sku]: value }));
  }

  const orderRating = orderRatingOverride ?? order.rating;

  const displayItems = order.items?.map((item) =>
    itemRatings[item.sku] != null ? { ...item, rating: itemRatings[item.sku] } : item
  );
  // The first item carries the order's full attention — everything else is
  // "also in this order," not a second thing equally competing for it.
  const primaryItem = displayItems?.[0];
  const otherItems = displayItems?.slice(1) ?? [];
  // Edit is order-level now, not per-item — for a multi-SKU order it targets
  // the primary item, the same "what this order is mainly about" item the
  // page already leads with.
  const editIntent = getEditEligibility(order.items ? primaryItem : order);

  const itemPrice = order.priceBreakup?.itemPrice ?? order.amount;
  const discount = order.priceBreakup?.discount ?? 0;

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
        {order.items ? (
          <>
            <PrimaryItem
              item={primaryItem}
              onTrack={(item) => openTracking(item.product, item.timeline)}
              onReturn={(item) => navigate('returnReplace', { orderId: order.id, sku: item.sku })}
              onRate={handleRateItem}
            />
            {otherItems.length > 0 && (
              <div className="order-details__other-items">
                <p className="order-details__other-items-heading">
                  Other Items in This Order ({otherItems.length})
                </p>
                <LineItems
                  items={otherItems}
                  openSku={openItemSku}
                  onToggle={toggleItem}
                  onTrack={(item) => openTracking(item.product, item.timeline)}
                  onReturn={(item) => navigate('returnReplace', { orderId: order.id, sku: item.sku })}
                  onRate={handleRateItem}
                />
              </div>
            )}
          </>
        ) : (
          <div className="order-details__product-card">
            <img className="order-details__image" src={order.image} alt={order.product} />
            <div className="order-details__product-text">
              <p className="order-details__product">{productName}</p>
              {spec && <p className="order-details__spec">{spec}</p>}
            </div>
          </div>
        )}

        <div className="order-details__id-row">
          <div>
            <p className="order-details__id-label">Order ID</p>
            <button className="order-details__id" onClick={handleCopy}>
              {copied ? <CheckIcon width="13" height="13" strokeWidth="3" /> : <CopyIcon width="13" height="13" />}
              <span>{order.id}</span>
            </button>
          </div>
          <span className="order-details__status-pill" style={{ background: pill.bg, color: pill.color }}>
            {status.label}
          </span>
        </div>

        {order.timeline && (
          <div className="order-details__card">
            <Timeline steps={order.timeline.steps} currentIndex={order.timeline.currentIndex} />
            <button className="order-details__tracking-link" onClick={() => openTracking('Tracking Updates', order.timeline)}>
              <span className="order-details__tracking-link-icon">
                <FileTextIcon width="14" height="14" />
              </span>
              <span className="order-details__tracking-link-label">Tracking Updates</span>
              <ChevronRightIcon className="order-details__tracking-link-chevron" aria-hidden="true" />
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
            <span>Bill Summary</span>
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
                      <span>{order.items ? `${order.items.length} Items` : `${productName}${spec ? ` (${spec})` : ''}`}</span>
                      <span className="order-details__payment-item-total">
                        {discount > 0 && <s className="order-details__payment-mrp">{formatRupees(itemPrice)}</s>}
                        {formatRupees(itemPrice - discount)}
                      </span>
                    </div>
                    <div className="order-details__payment-row">
                      <span>Delivery &amp; Handling</span>
                      <span className="order-details__payment-positive">
                        {order.priceBreakup?.shipping ? formatRupees(order.priceBreakup.shipping) : 'FREE'}
                      </span>
                    </div>
                    <div className="order-details__payment-divider" />
                    <div className="order-details__payment-row order-details__payment-row--total">
                      <span>Total Bill</span>
                      <span>{formatRupees(order.priceBreakup?.total ?? order.amount)}</span>
                    </div>
                    <div className="order-details__payment-divider" />
                    <div className="order-details__payment-row">
                      <span>Payment Method</span>
                      <span>{order.payment.method} · {order.payment.status}</span>
                    </div>
                    <button className="order-details__get-invoice" disabled={!isFullyDelivered}>
                      <FileTextIcon width="14" height="14" />
                      Get Invoice
                    </button>
                    {!isFullyDelivered && (
                      <p className="order-details__get-invoice-reason">Available once the order is delivered</p>
                    )}
                  </div>

                  {discount > 0 && (
                    <div className="order-details__savings-block">
                      <div className="order-details__savings-header">
                        <span>Savings on this order</span>
                        <span className="order-details__savings-badge">{formatRupees(discount)}</span>
                      </div>
                      <div className="order-details__savings-row">
                        <span>Discount on MRP</span>
                        <span>{formatRupees(discount)}</span>
                      </div>
                    </div>
                  )}

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

                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Multi-item orders get these scoped per line item inside LineItems
            instead — a single order-level Warranty/Rate/Return doesn't make
            sense once each SKU has its own delivery state and eligibility. */}
        {!order.items && (
          <>
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

            {typeof orderRating === 'number' && (
              <div className="order-details__rating">
                <img className="order-details__rating-image" src={order.image} alt="" />
                <StarRating
                  className="order-details__rating-control"
                  value={orderRating}
                  onRate={setOrderRatingOverride}
                  idleLabel={`Rate ${productName}`}
                  itemName={productName}
                />
              </div>
            )}
          </>
        )}

        <div className="order-details__help-wrap">
          <button
            className="order-details__help-toggle"
            onClick={() => setHelpSectionOpen((v) => !v)}
            aria-expanded={helpSectionOpen}
          >
            <span>Do you need help with the existing order?</span>
            <ChevronRightIcon
              className={`order-details__help-chevron${helpSectionOpen ? ' order-details__help-chevron--open' : ''}`}
            />
          </button>
          <AnimatePresence initial={false}>
            {helpSectionOpen && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={reduceMotion ? DURATION_REDUCED : SPRING_STANDARD}
                style={{ overflow: 'hidden' }}
              >
                <div className="order-details__help-actions">
                  <button
                    className="order-details__help-action"
                    disabled={!editIntent.enabled}
                    onClick={
                      editIntent.enabled
                        ? () =>
                            navigate(
                              'editOrder',
                              order.items ? { orderId: order.id, sku: primaryItem.sku } : { orderId: order.id }
                            )
                        : undefined
                    }
                  >
                    <EditIcon width="15" height="15" />
                    <span>Edit Order</span>
                  </button>
                  {!editIntent.enabled && <p className="order-details__help-action-reason">{editIntent.reason}</p>}

                  {!order.items && (
                    <>
                      <button
                        className="order-details__help-action"
                        disabled={!returnIntent?.enabled}
                        onClick={returnIntent?.enabled ? () => navigate('returnReplace', { orderId: order.id }) : undefined}
                      >
                        <ExternalLinkIcon width="14" height="14" />
                        <span>Return or Replace</span>
                      </button>
                      {!returnIntent?.enabled && (
                        <p className="order-details__help-action-reason">{returnIntent?.reason}</p>
                      )}
                    </>
                  )}

                  <button
                    className="order-details__help-action"
                    disabled={!cancelIntent?.enabled}
                    onClick={cancelIntent?.enabled ? openCancelFlow : undefined}
                  >
                    <CloseIcon width="14" height="14" />
                    <span>Cancel Order</span>
                  </button>
                  {!cancelIntent?.enabled && <p className="order-details__help-action-reason">{cancelIntent?.reason}</p>}

                  <button
                    className="order-details__help-action"
                    onClick={() => switchTab('support', { openChat: true, orderId: order.id })}
                  >
                    <HeadsetIcon width="15" height="15" />
                    <span>Contact Support</span>
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      <ConfirmSheet
        open={confirmingCancel}
        title="Cancel this order?"
        body={`This will cancel ${productName}. This can't be undone.`}
        confirmLabel="Cancel Order"
        onConfirm={handleCancelOrder}
        onClose={() => setConfirmingCancel(false)}
      />

      <BottomSheet open={cancelStep === 'reason'} onClose={closeCancelFlow}>
        <h2 className="confirm-sheet__title">Why are you cancelling?</h2>
        <p className="order-details__cancel-prompt">This helps us route it correctly.</p>
        <div className="order-details__cancel-reasons">
          {CANCEL_REASONS.map((reason) => (
            <button
              key={reason}
              className={`order-details__cancel-reason${cancelReason === reason ? ' order-details__cancel-reason--selected' : ''}`}
              onClick={() => selectCancelReason(reason)}
            >
              {reason}
            </button>
          ))}
        </div>
        <button className="order-details__cancel-continue" disabled={!cancelReason} onClick={continueToAlternative}>
          Continue
        </button>
      </BottomSheet>

      <BottomSheet open={cancelStep === 'alternative'} onClose={closeCancelFlow}>
        <h2 className="confirm-sheet__title">Before you cancel</h2>
        <p className="confirm-sheet__body">
          You can put {order.items ? 'this order' : productName} on hold instead — it stays paused and unshipped
          until you decide, and you can resume or cancel it anytime before it ships.
        </p>
        <div className="confirm-sheet__footer confirm-sheet__footer--stacked">
          <button className="confirm-sheet__confirm" onClick={handlePutOnHold}>
            Put on Hold Instead
          </button>
          <button className="confirm-sheet__cancel" onClick={proceedToFinalCancel}>
            No, Cancel My Order
          </button>
        </div>
      </BottomSheet>

      {trackingTarget && (
        <BottomSheet open={trackingOpen} onClose={() => setTrackingOpen(false)}>
          <h2 className="order-details__tracking-sheet-title">{trackingTarget.title}</h2>
          <div className="order-details__tracking-sheet-body">
            <DetailedTracking steps={trackingTarget.steps} currentIndex={trackingTarget.currentIndex} />
          </div>
        </BottomSheet>
      )}
    </div>
  );
}
