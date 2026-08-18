import { useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { ORDERS, splitProductSpec, getOrderStatus, getShipmentInfo, getExpectedDelivery } from '../data/orders.js';
import { getOrderIntents, getEditEligibility, getShipmentEditEligibility, getItemIntents, isPostDispatch } from '../data/intents.js';
import { getOpenCaseForOrder } from '../data/support.js';
import { CURRENT_USER } from '../data/profile.js';
import { useNavigation } from '../navigation/NavigationContext.jsx';
import { SPRING_STANDARD, DURATION_REDUCED } from '../motion.js';
import Timeline from '../components/Timeline.jsx';
import DetailedTracking from '../components/DetailedTracking.jsx';
import PrimaryItem from '../components/PrimaryItem.jsx';
import StarRating from '../components/StarRating.jsx';
import ConfirmSheet from '../components/ConfirmSheet.jsx';
import BottomSheet from '../components/BottomSheet.jsx';
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  CopyIcon,
  CheckIcon,
  ClockIcon,
  FileTextIcon,
  DownloadIcon,
  ShieldIcon,
  ExternalLinkIcon,
  HeadsetIcon,
  MailIcon,
  PhoneIcon,
  UserIcon,
  EditIcon,
  TruckIcon,
  HelpCircleIcon,
  CalendarIcon,
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

// The one reason PRD §8.2/CX-02 calls out for its own retention offer (real
// EDD + Expedite/Hold) before cancellation is even discussed — every other
// reason goes straight to the plain Hold-or-cancel sheet below.
const DELAY_REASON = 'Delivery taking too long';

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
  const [cancelStep, setCancelStep] = useState(null); // null | 'reason' | 'alternative' | 'delayed'
  const [cancelReason, setCancelReason] = useState(null);
  const [confirmingCancel, setConfirmingCancel] = useState(false);
  // The honest "not guaranteed" RTO-intercept warning (PRD CX-04) — its own
  // sheet rather than reusing confirmingCancel, since confirming it doesn't
  // cancel outright, it hands off into the RTO-Replacement tracker instead.
  const [showRtoIntercept, setShowRtoIntercept] = useState(false);
  // A failed-delivery order still sitting with the courier (not yet RTO'd
  // back to warehouse) can ask for one more attempt instead of just waiting
  // to be returned — its own sheet since confirming it reverses the RTO
  // narrative rather than cancelling or editing anything.
  const [rescheduleDeliveryOpen, setRescheduleDeliveryOpen] = useState(false);
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
  // Separate from `copied` (the Order ID's own) so copying one doesn't
  // flash the checkmark on the other.
  const [awbCopied, setAwbCopied] = useState(false);
  // Item ratings live in local state rather than mutating the shared item
  // object in place — order.items is a plain module-level array, so a
  // direct mutation wouldn't trigger a re-render the way this does.
  const [itemRatings, setItemRatings] = useState({});
  // Single-item orders carry their rating on the order itself, not per-item —
  // same local-state-over-mutation reasoning as itemRatings above. Starts
  // unset and falls back to order.rating until the customer actually rates.
  const [orderRatingOverride, setOrderRatingOverride] = useState(null);
  // The invoice-not-ready reason used to sit permanently under the button —
  // now it only surfaces as a brief inline notice on an actual tap, same
  // flash-then-revert timing as the copy checkmarks elsewhere on this page.
  const [invoiceNotice, setInvoiceNotice] = useState(false);
  const reduceMotion = useReducedMotion();
  const order = ORDERS.find((o) => o.id === params.orderId);
  // Scopes the whole page to one line item within a multi-item order —
  // reached via a line item's "More Details" arrow. Null for both a
  // genuine single-item order and an unscoped multi-item order view.
  const scopedItem = params.sku ? order?.items?.find((i) => i.sku === params.sku) ?? null : null;

  if (!order) {
    return (
      <div className="order-details">
        <header className="order-details__topbar">
          <div className="order-details__topbar-left">
            <button className="order-details__icon-btn" onClick={goBack} aria-label="Back">
              <ChevronLeftIcon />
            </button>
            <h1>Order Details</h1>
          </div>
        </header>
        <p className="order-details__not-found">Order not found.</p>
      </div>
    );
  }

  const { name: productName, spec } = splitProductSpec(scopedItem ? scopedItem.product : order.product);
  const status = scopedItem ? scopedItem.status : getOrderStatus(order);
  const pill = STATUS_PILL[status.dot] ?? STATUS_PILL.muted;
  // A closed order has nothing left to edit — unlike the "locked once it
  // ships" case, which still explains itself, this one doesn't even offer
  // the option disabled-with-reason.
  const isClosedOrder = order.section === 'closed';
  const intents = getOrderIntents(order);
  const returnIntent = intents.find((i) => i.key === 'returnReplace');
  const warrantyIntent = intents.find((i) => i.key === 'warranty');
  const cancelIntent = intents.find((i) => i.key === 'cancel');
  // Drives the delay-reason retention sheet below: whether the courier
  // already has it (Hold no longer makes sense) and the real ETA to show
  // instead of a generic "we'll speed this up".
  const postDispatch = isPostDispatch(order);
  const expectedDelivery = getExpectedDelivery(order);
  const itemIntents = scopedItem ? getItemIntents(scopedItem) : null;
  const effectiveWarrantyIntent = scopedItem ? itemIntents.warranty : warrantyIntent;
  const effectiveReturnIntent = scopedItem ? itemIntents.returnReplace : returnIntent;
  // The invoice only exists once the order has actually shipped out — same
  // "available after delivery" window as Warranty, just also true for a
  // multi-item order once every line item (not just the order's headline
  // item) has arrived.
  const isFullyDelivered = scopedItem
    ? scopedItem.status.label === 'Delivered'
    : order.items
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
    setCancelStep(cancelReason === DELAY_REASON ? 'delayed' : 'alternative');
  }

  // PRD CX-02's retention offer for "taking too long" — expediting is
  // always on the table; the mutation is just a caption update since there's
  // no backend here to actually move dispatch up.
  function handleExpediteRequest() {
    Object.assign(order, {
      caption: 'Expedited delivery requested — we will prioritize dispatch and confirm the updated ETA shortly.',
    });
    closeCancelFlow();
    goBack();
  }

  // Once it's shipped, cancelling isn't an instant OMS/POS cancel anymore
  // (CX-03) — it's an honest RTO-intercept attempt into the RTO-Replacement
  // sub-flow (CX-04, §8.11), since the courier already has it.
  function continueToCancelAnyway() {
    setCancelStep(null);
    if (postDispatch) {
      setShowRtoIntercept(true);
    } else {
      setConfirmingCancel(true);
    }
  }

  function handleConfirmRtoIntercept() {
    setShowRtoIntercept(false);
    setCancelReason(null);
    navigate('rtoReplace', { orderId: order.id });
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

  // Offered while the parcel is still marked "Delivery Delayed" (i.e. still
  // with the courier, not yet back at the warehouse) — one more attempt
  // instead of letting it complete the RTO round trip. Same in-place mutate
  // + navigate-away pattern as handleCancelOrder/handlePutOnHold above.
  function handleRescheduleDelivery() {
    Object.assign(order, {
      status: { dot: 'blue', label: 'Redelivery Scheduled' },
      caption: 'Redelivery attempt scheduled — we will try again shortly.',
      actions: [{ label: 'Track Order', variant: 'secondary' }],
    });
    order.timeline?.steps.push({
      label: 'Redelivery Scheduled',
      timestamp: null,
      description: 'Customer requested another delivery attempt',
    });
    if (order.timeline) order.timeline.currentIndex = order.timeline.steps.length - 1;
    setRescheduleDeliveryOpen(false);
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

  // shipmentKey is the order id for the order's own aggregate timeline, or
  // a line item's `sku` for that item's own shipment — getShipmentInfo
  // resolves either the same way (see data/orders.js).
  function openTracking(title, timeline, shipmentKey) {
    setTrackingTarget({
      title,
      steps: timeline.steps,
      currentIndex: timeline.currentIndex,
      shipment: getShipmentInfo(shipmentKey),
    });
    setTrackingOpen(true);
  }

  async function handleCopyAwb(awb) {
    try {
      await navigator.clipboard.writeText(awb);
    } catch {
      // Clipboard API unavailable — the checkmark still confirms the tap.
    }
    setAwbCopied(true);
    setTimeout(() => setAwbCopied(false), 1200);
  }

  // Not disabled at the DOM level — a real <button disabled> can't be tapped
  // at all, which is exactly what stops it from ever explaining itself. This
  // stays tappable so an early attempt gets a reason instead of just nothing.
  function handleInvoiceClick() {
    if (isFullyDelivered) return;
    setInvoiceNotice(true);
    setTimeout(() => setInvoiceNotice(false), 2000);
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
  // A shipment's units are separate top-level orders (not one order's line
  // items), so "other items" here means sibling orders sharing this order's
  // shipmentId — same idea as otherItems above, just sourced from ORDERS
  // instead of order.items, and each opens its own full Order Details by
  // orderId rather than by sku within this same order.
  const shipmentSiblings = order.shipmentId
    ? ORDERS.filter((o) => o.shipmentId === order.shipmentId && o.id !== order.id)
    : [];
  // Edit is order-level now, not per-item — for a multi-SKU order it targets
  // the primary item, the same "what this order is mainly about" item the
  // page already leads with. A shipment (order.items and order.shipmentId
  // are mutually exclusive) is edited as one unit instead — every sibling
  // ships and arrives together, so eligibility is one decision for the
  // whole parcel, not just the unit currently open.
  const editIntent = order.shipmentId
    ? getShipmentEditEligibility([order, ...shipmentSiblings])
    : getEditEligibility(scopedItem ?? (order.items ? primaryItem : order));

  const itemPrice = scopedItem ? scopedItem.price : order.priceBreakup?.itemPrice ?? order.amount;
  const discount = scopedItem ? 0 : order.priceBreakup?.discount ?? 0;
  const technician = scopedItem?.technician ?? order.technician;
  const effectiveTimeline = scopedItem ? scopedItem.timeline : order.timeline;
  // Surfaces an already-open case for this order (or, when viewing one line
  // item of a multi-item order, that item specifically) so raising a ticket
  // and coming back here doesn't look like nothing happened.
  const openCase = getOpenCaseForOrder(order.id, scopedItem ? scopedItem.sku : order.items ? undefined : null);

  return (
    <div className="order-details">
      <header className="order-details__topbar">
        <div className="order-details__topbar-left">
          <button className="order-details__icon-btn" onClick={goBack} aria-label="Back">
            <ChevronLeftIcon />
          </button>
          <h1>Order Details</h1>
        </div>
        <button
          className="order-details__help-btn"
          onClick={() => switchTab('support', { openChat: true, orderId: order.id })}
        >
          <HelpCircleIcon width="14" height="14" />
          Needs Help
        </button>
      </header>

      <main className="order-details__content">
        {order.items && !scopedItem ? (
          <>
            <PrimaryItem
              item={primaryItem}
              onTrack={(item) => openTracking(item.product, item.timeline, item.sku)}
              onRate={handleRateItem}
            />
            {otherItems.length > 0 && (
              <div className="order-details__other-items">
                <p className="order-details__other-items-heading">
                  Other Items in This Order ({otherItems.length})
                </p>
                <div className="order-details__item-thumbs">
                  {otherItems.map((item) => (
                    <button
                      key={item.sku}
                      className="order-details__item-thumb"
                      onClick={() => navigate('orderDetails', { orderId: order.id, sku: item.sku })}
                      aria-label={item.product}
                    >
                      <img src={item.image} alt={item.product} />
                      <ChevronRightIcon className="order-details__item-thumb-chevron" aria-hidden="true" />
                    </button>
                  ))}
                </div>
              </div>
            )}
          </>
        ) : null}

        {/* One card for everything about this order — product, id/status,
            tracking, technician, warranty, rating, billing, and how to get
            help — instead of a separate box per fact. Each direct child
            gets an automatic hairline divider from the next (see the
            `> * + *` rule in CSS), so which sections exist can vary freely
            without any manual divider bookkeeping here. */}
        <div className="order-details__summary-card">
          {(!order.items || scopedItem) && (
            <div className="order-details__product-row">
              <img
                className="order-details__image"
                src={scopedItem ? scopedItem.image : order.image}
                alt={scopedItem ? scopedItem.product : order.product}
              />
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
              {/* The one-line plain-language summary ("Arriving today by 6
                  PM", "Delivered on 15 May 2026"...) every order already
                  carries for its My Orders card — surfaced here too instead
                  of making someone piece it together from the timeline
                  steps below. Kept inside this column (not a sibling of the
                  row) so it reads as part of the same status line, not a
                  new divided section. */}
              {(scopedItem ? scopedItem.caption : order.caption) && (
                <p className="order-details__caption">{scopedItem ? scopedItem.caption : order.caption}</p>
              )}
            </div>
            <span className="order-details__status-pill" style={{ background: pill.bg, color: pill.color }}>
              {status.label}
            </span>
          </div>

          {effectiveTimeline && (
            <div className="order-details__timeline-block">
              <Timeline steps={effectiveTimeline.steps} currentIndex={effectiveTimeline.currentIndex} />
              <button
                className="order-details__tracking-link"
                onClick={() =>
                  openTracking('Tracking Updates', effectiveTimeline, scopedItem ? scopedItem.sku : order.id)
                }
              >
                <span className="order-details__tracking-link-icon">
                  <FileTextIcon width="14" height="14" />
                </span>
                <span className="order-details__tracking-link-label">Tracking Updates</span>
                <ChevronRightIcon className="order-details__tracking-link-chevron" aria-hidden="true" />
              </button>
            </div>
          )}

          {technician && (
            <div className="order-details__technician-row">
              <span className="order-details__technician-icon">
                <UserIcon width="18" height="18" />
              </span>
              <div className="order-details__technician-text">
                <p className="order-details__technician-label">Your Technician</p>
                <p className="order-details__technician-name">{technician.name}</p>
              </div>
              <a className="order-details__technician-call" href={`tel:${technician.phone}`}>
                <PhoneIcon width="14" height="14" />
                Call
              </a>
              <button
                className="order-details__technician-reschedule"
                onClick={() => navigate('installationSchedule', { orderId: order.id, reschedule: true })}
              >
                Reschedule
              </button>
            </div>
          )}

          {/* Only while it's still marked "Delivery Delayed" (with the
              courier, not yet back at the warehouse) — once it's actually
              received at the warehouse or refunded, another attempt isn't
              on the table anymore. */}
          {!scopedItem && status.label === 'Delivery Delayed' && (
            <div className="order-details__technician-row">
              <span className="order-details__technician-icon">
                <CalendarIcon width="18" height="18" />
              </span>
              <div className="order-details__technician-text">
                <p className="order-details__technician-label">Missed the delivery?</p>
                <p className="order-details__technician-name">Ask for one more attempt</p>
              </div>
              <button
                className="order-details__technician-reschedule"
                onClick={() => setRescheduleDeliveryOpen(true)}
              >
                Reschedule Delivery
              </button>
            </div>
          )}

          {/* Multi-item orders get these scoped per line item inside
              PrimaryItem instead — a single order-level Warranty/Rate
              doesn't make sense once each SKU has its own delivery state
              and eligibility. */}
          {(!order.items || scopedItem) &&
            (effectiveWarrantyIntent?.enabled ? (
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
                  <span className="order-details__warranty-reason">{effectiveWarrantyIntent?.reason}</span>
                </span>
              </div>
            ))}

          {(!order.items || scopedItem) &&
            typeof (scopedItem ? itemRatings[scopedItem.sku] ?? scopedItem.rating : orderRating) === 'number' && (
              <div className="order-details__rating">
                <img className="order-details__rating-image" src={scopedItem ? scopedItem.image : order.image} alt="" />
                <StarRating
                  className="order-details__rating-control"
                  value={scopedItem ? itemRatings[scopedItem.sku] ?? scopedItem.rating : orderRating}
                  onRate={scopedItem ? (value) => handleRateItem(scopedItem, value) : setOrderRatingOverride}
                  idleLabel={`Rate ${productName}`}
                  itemName={productName}
                />
              </div>
            )}

          {/* Bill Summary and the help toggle used to be their own separate
              cards below this one — folded in here instead, so "everything
              about this order" (status, billing, and how to get help with
              it) reads as one card with dividers, not three stacked boxes
              repeating the same border/shadow. */}
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
                      <span>
                        {scopedItem || !order.items
                          ? `${productName}${spec ? ` (${spec})` : ''}`
                          : `${order.items.length} Items`}
                      </span>
                      <span className="order-details__payment-item-total">
                        {discount > 0 && <s className="order-details__payment-mrp">{formatRupees(itemPrice)}</s>}
                        {formatRupees(itemPrice - discount)}
                      </span>
                    </div>
                    <div className="order-details__payment-row">
                      <span>Delivery &amp; Handling</span>
                      <span className="order-details__payment-positive">
                        {scopedItem
                          ? 'FREE'
                          : order.priceBreakup?.shipping
                          ? formatRupees(order.priceBreakup.shipping)
                          : 'FREE'}
                      </span>
                    </div>
                    <div className="order-details__payment-divider" />
                    <div className="order-details__payment-row order-details__payment-row--total">
                      <span>Total Bill</span>
                      <span>{formatRupees(scopedItem ? itemPrice : order.priceBreakup?.total ?? order.amount)}</span>
                    </div>
                    <div className="order-details__payment-divider" />
                    <div className="order-details__payment-row">
                      <span>Payment Method</span>
                      <span>{order.payment.method} · {order.payment.status}</span>
                    </div>
                    <button
                      className={`order-details__get-invoice${!isFullyDelivered ? ' order-details__get-invoice--disabled' : ''}`}
                      aria-disabled={!isFullyDelivered}
                      onClick={handleInvoiceClick}
                    >
                      <DownloadIcon width="14" height="14" />
                      Download Invoice
                    </button>
                    {invoiceNotice && (
                      <p className="order-details__get-invoice-reason" role="alert">
                        Available once the order is delivered
                      </p>
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
                        <p className="order-details__shipping-name">
                          {CURRENT_USER.firstName} {CURRENT_USER.lastName}
                        </p>
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
        </div>

        {openCase && (
          <button
            className="order-details__ticket-banner"
            onClick={() => switchTab('support', { resumeCaseId: openCase.id })}
          >
            <span className="order-details__ticket-banner-icon">
              <HeadsetIcon width="16" height="16" />
            </span>
            <span className="order-details__ticket-banner-text">
              <span className="order-details__ticket-banner-title">Support Ticket {openCase.id}</span>
              <span className="order-details__ticket-banner-sub">{openCase.slaLabel}</span>
            </span>
            <ChevronRightIcon className="order-details__ticket-banner-chevron" aria-hidden="true" />
          </button>
        )}

        {shipmentSiblings.length > 0 && (
          <div className="order-details__other-items">
            <p className="order-details__other-items-heading">
              Other Items in This Shipment ({shipmentSiblings.length})
            </p>
            {/* Every sibling here ships and arrives together (see
                getShipmentStatus in orders.js) — the same status/date this
                page already shows once above, so repeating a name/status/
                price per row would just restate it. The image alone is
                enough to recognize which item each row is — except when a
                unit has genuinely diverged from the rest (e.g. one flagged
                damaged after an otherwise-shared delivery), which still
                needs its own visible flag here so it isn't mistaken for
                just another delivered item. */}
            <div className="order-details__item-thumbs">
              {shipmentSiblings.map((sibling) => {
                const diverges = sibling.status.label !== order.status.label;
                return (
                  <button
                    key={sibling.id}
                    className="order-details__item-thumb"
                    onClick={() => navigate('orderDetails', { orderId: sibling.id })}
                    aria-label={diverges ? `${sibling.product} — ${sibling.status.label}` : sibling.product}
                  >
                    <img src={sibling.image} alt={sibling.product} />
                    {diverges && (
                      <span
                        className="order-details__item-thumb-flag"
                        style={{ background: (STATUS_PILL[sibling.status.dot] ?? STATUS_PILL.muted).color }}
                        aria-hidden="true"
                      />
                    )}
                    <ChevronRightIcon className="order-details__item-thumb-chevron" aria-hidden="true" />
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <button className="order-details__help-toggle" onClick={() => setHelpSectionOpen(true)}>
          <span>Do you need help with the existing order?</span>
          <ChevronRightIcon className="order-details__help-chevron" />
        </button>
      </main>

      <BottomSheet open={helpSectionOpen} onClose={() => setHelpSectionOpen(false)}>
        <h2 className="confirm-sheet__title">Need help with this order?</h2>
        <div className="order-details__help-actions">
          {!isClosedOrder && (
            <>
              <button
                className="order-details__help-action"
                disabled={!editIntent.enabled}
                onClick={
                  editIntent.enabled
                    ? () => {
                        setHelpSectionOpen(false);
                        navigate(
                          order.shipmentId ? 'editShipmentOrder' : 'editOrder',
                          order.shipmentId
                            ? { shipmentId: order.shipmentId }
                            : scopedItem
                            ? { orderId: order.id, sku: scopedItem.sku }
                            : order.items
                            ? { orderId: order.id, sku: primaryItem.sku }
                            : { orderId: order.id }
                        );
                      }
                    : undefined
                }
              >
                <EditIcon width="15" height="15" />
                <span>Edit Order</span>
              </button>
              {!editIntent.enabled && <p className="order-details__help-action-reason">{editIntent.reason}</p>}
            </>
          )}

          {(!order.items || scopedItem) && (
            <>
              <button
                className="order-details__help-action"
                disabled={!effectiveReturnIntent?.enabled}
                onClick={
                  effectiveReturnIntent?.enabled
                    ? () => {
                        setHelpSectionOpen(false);
                        navigate(
                          'returnReplace',
                          scopedItem ? { orderId: order.id, sku: scopedItem.sku } : { orderId: order.id }
                        );
                      }
                    : undefined
                }
              >
                <ExternalLinkIcon width="14" height="14" />
                <span>Return or Replace</span>
              </button>
              {!effectiveReturnIntent?.enabled && (
                <p className="order-details__help-action-reason">{effectiveReturnIntent?.reason}</p>
              )}
            </>
          )}

          <button
            className="order-details__help-action"
            onClick={() => {
              setHelpSectionOpen(false);
              switchTab('support', { openChat: true, orderId: order.id });
            }}
          >
            <HeadsetIcon width="15" height="15" />
            <span>Contact Support</span>
          </button>
        </div>

        {!scopedItem && (
          <>
            <button
              className="order-details__help-sheet-cancel"
              disabled={!cancelIntent?.enabled}
              onClick={
                cancelIntent?.enabled
                  ? () => {
                      setHelpSectionOpen(false);
                      openCancelFlow();
                    }
                  : undefined
              }
            >
              Want to cancel order?
            </button>
            {!cancelIntent?.enabled && (
              <p className="order-details__help-action-reason order-details__help-action-reason--center">
                {cancelIntent?.reason}
              </p>
            )}
          </>
        )}
      </BottomSheet>

      <ConfirmSheet
        open={confirmingCancel}
        title="Cancel this order?"
        body={`This will cancel ${productName}. This can't be undone.`}
        confirmLabel="Cancel Order"
        onConfirm={handleCancelOrder}
        onClose={() => setConfirmingCancel(false)}
      />

      <ConfirmSheet
        open={rescheduleDeliveryOpen}
        title="Reschedule delivery?"
        body={`We'll ask the courier for one more attempt on ${productName} instead of returning it to the warehouse.`}
        confirmLabel="Reschedule Delivery"
        onConfirm={handleRescheduleDelivery}
        onClose={() => setRescheduleDeliveryOpen(false)}
      />

      <BottomSheet open={cancelStep === 'reason'} onClose={closeCancelFlow}>
        <h2 className="confirm-sheet__title">Why are you cancelling?</h2>
        <p className="order-details__cancel-prompt">This helps us route it correctly.</p>
        <div className="order-details__cancel-reasons" role="radiogroup">
          {CANCEL_REASONS.map((reason) => (
            <button
              key={reason}
              className={`order-details__cancel-reason${cancelReason === reason ? ' order-details__cancel-reason--selected' : ''}`}
              onClick={() => selectCancelReason(reason)}
              role="radio"
              aria-checked={cancelReason === reason}
            >
              <span className="order-details__cancel-reason-radio" aria-hidden="true" />
              <span>{reason}</span>
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

      <BottomSheet open={cancelStep === 'delayed'} onClose={closeCancelFlow}>
        <h2 className="confirm-sheet__title">Your order is on its way</h2>
        <p className="confirm-sheet__body">
          {expectedDelivery
            ? `Expected delivery: ${expectedDelivery}. We can speed this up instead of cancelling.`
            : 'We can speed this up instead of cancelling.'}
        </p>
        <div className="confirm-sheet__footer confirm-sheet__footer--stacked">
          <button className="confirm-sheet__confirm" onClick={handleExpediteRequest}>
            Expedite Delivery
          </button>
          {!postDispatch && (
            <button className="confirm-sheet__confirm" onClick={handlePutOnHold}>
              Put on Hold Instead
            </button>
          )}
          <button className="confirm-sheet__cancel" onClick={continueToCancelAnyway}>
            Continue to Cancel Anyway
          </button>
        </div>
      </BottomSheet>

      <ConfirmSheet
        open={showRtoIntercept}
        title="We'll try to stop it before it arrives"
        body="Your order has already shipped, so cancellation isn't guaranteed. If it can't be intercepted in time, we'll process a return-to-origin and refund you once it's back with us."
        confirmLabel="Attempt Cancellation"
        cancelLabel="Keep My Order"
        danger
        onConfirm={handleConfirmRtoIntercept}
        onClose={() => setShowRtoIntercept(false)}
      />

      {trackingTarget && (
        <BottomSheet open={trackingOpen} onClose={() => setTrackingOpen(false)}>
          <h2 className="order-details__tracking-sheet-title">{trackingTarget.title}</h2>
          {/* Only exists once a courier has actually picked this up — same
              "no AWB before dispatch" reasoning as the real thing. */}
          {trackingTarget.shipment && (
            <div className="order-details__tracking-sheet-shipment">
              <span className="order-details__tracking-sheet-shipment-icon">
                <TruckIcon width="16" height="16" />
              </span>
              <div className="order-details__tracking-sheet-shipment-text">
                <span className="order-details__tracking-sheet-shipment-courier">
                  Shipped via {trackingTarget.shipment.courier}
                </span>
                <button
                  className="order-details__tracking-sheet-shipment-awb"
                  onClick={() => handleCopyAwb(trackingTarget.shipment.awb)}
                >
                  {awbCopied ? <CheckIcon width="12" height="12" strokeWidth="3" /> : <CopyIcon width="12" height="12" />}
                  <span>AWB {trackingTarget.shipment.awb}</span>
                </button>
              </div>
            </div>
          )}
          <div className="order-details__tracking-sheet-body">
            <DetailedTracking steps={trackingTarget.steps} currentIndex={trackingTarget.currentIndex} />
          </div>
        </BottomSheet>
      )}
    </div>
  );
}
