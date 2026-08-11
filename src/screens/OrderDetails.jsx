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
import ConfirmSheet from '../components/ConfirmSheet.jsx';
import BottomSheet from '../components/BottomSheet.jsx';
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  CopyIcon,
  CheckIcon,
  CloseIcon,
  FileTextIcon,
  ShieldIcon,
  ExternalLinkIcon,
  StarIcon,
  HelpCircleIcon,
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

function formatRupees(amount) {
  return `₹${amount.toLocaleString('en-IN')}`;
}

export default function OrderDetails({ params }) {
  const { goBack, navigate } = useNavigation();
  const [copied, setCopied] = useState(false);
  // Payment/shipping/cancel info is relevant on first glance, not tucked
  // behind a click — starts open, but stays collapsible for anyone who wants
  // to hide it.
  const [detailsOpen, setDetailsOpen] = useState(true);
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
                    {order.items ? (
                      // Each item's own price already lives in its LineItems
                      // row above — no need to repeat the full breakdown here,
                      // just the combined line this block otherwise shows.
                      <div className="order-details__payment-row">
                        <span>{order.items.length} Items</span>
                        <span>{formatRupees(order.priceBreakup?.itemPrice ?? order.amount)}</span>
                      </div>
                    ) : (
                      <div className="order-details__payment-row">
                        <span>{productName}{spec ? ` (${spec})` : ''}</span>
                        <span>{formatRupees(order.priceBreakup?.itemPrice ?? order.amount)}</span>
                      </div>
                    )}
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
          </>
        )}

        <div className="order-details__help-wrap">
          <button
            className="order-details__help-toggle"
            onClick={() => setHelpSectionOpen((v) => !v)}
            aria-expanded={helpSectionOpen}
          >
            <span className="order-details__help-icon">
              <HelpCircleIcon />
            </span>
            <span className="order-details__help-text">
              <span className="order-details__help-heading">Do you need help with the existing order?</span>
              <span className="order-details__help-subtext">Edit or cancel this order</span>
            </span>
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

                  <button
                    className="order-details__help-action order-details__help-action--danger"
                    disabled={!cancelIntent?.enabled}
                    onClick={cancelIntent?.enabled ? () => setConfirmingCancel(true) : undefined}
                  >
                    <CloseIcon width="14" height="14" />
                    <span>Cancel Order</span>
                  </button>
                  {!cancelIntent?.enabled && <p className="order-details__help-action-reason">{cancelIntent?.reason}</p>}
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
        danger
        onConfirm={handleCancelOrder}
        onClose={() => setConfirmingCancel(false)}
      />

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
