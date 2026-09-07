import { useState } from 'react';
import { ORDERS, splitProductSpec, recomputeOrderTotals } from '../../data/orders.js';
import { getVariants } from '../../data/variants.js';
import {
  RTO_ORIGINS,
  getRtoExecutionSteps,
  getRtoPostCancelUpdate,
  getRtoReplacementUpdate,
} from '../../data/rto.js';
import { createCase, CASE_PREFIX } from '../../data/support.js';
import { useNavigation } from '../../navigation/NavigationContext.jsx';
import Timeline from '../../components/Timeline.jsx';
import { ChevronLeftIcon, CheckIcon } from '../../components/icons.jsx';
import MattressVariantStep from '../ReturnReplace/MattressVariantStep.jsx';
import '../ReturnReplace/ExecutionStep.css';
import './RtoReplaceFlow.css';

function formatRupees(amount) {
  return `₹${amount.toLocaleString('en-IN')}`;
}

function withSpec(name, spec) {
  return spec ? `${name} (${spec})` : name;
}

// PRD §8.11 (RT-01/RT-02) — one sub-flow, three callers: post-dispatch cancel
// (§8.3 CX-04), post-dispatch order-edit (§8.2 OM-07), and
// damaged-delivery-rejection (§8.4). `params.origin` picks the copy and
// whether a replacement choice is even offered — a cancel or a refused
// delivery both mean "I don't want this", so only `edit` offers Replace.
export default function RtoReplaceFlow({ params }) {
  const { goBack } = useNavigation();
  const order = ORDERS.find((o) => o.id === params.orderId);
  const origin = RTO_ORIGINS[params.origin] ? params.origin : 'cancel';
  const copy = RTO_ORIGINS[origin];
  const offerReplacement = origin === 'edit';

  // Once RTO is confirmed, `edit` can resolve as a refund or a replacement —
  // everything else only ever refunds, since the customer wasn't asking for
  // a different item in the first place.
  const [resolution, setResolution] = useState(offerReplacement ? null : 'refund');
  const [variantChoice, setVariantChoice] = useState(null);
  const [paymentConfirmed, setPaymentConfirmed] = useState(false);

  if (!order) {
    return (
      <div className="rto-replace">
        <header className="rto-replace__topbar">
          <button className="rto-replace__icon-btn" onClick={goBack} aria-label="Back">
            <ChevronLeftIcon />
          </button>
          <h1>{copy.headerTitle}</h1>
          <span className="rto-replace__icon-btn-spacer" />
        </header>
        <p className="rto-replace__not-found">Order not found.</p>
      </div>
    );
  }

  const { name, spec } = splitProductSpec(order.product);
  const refundAmount = order.priceBreakup?.total ?? order.amount;
  const variants = getVariants(name);
  const execution = getRtoExecutionSteps(resolution === 'replace' ? 'replace' : 'refund');
  // RT-02: the payment-link step only exists when a genuine price difference
  // exists between the old and new variant — a same-price swap needs nothing
  // extra to confirm.
  const needsPaymentLink = resolution === 'replace' && (variantChoice?.delta ?? 0) > 0 && !paymentConfirmed;

  function handleChooseVariant(choice) {
    setVariantChoice(choice);
    setResolution('replace');
  }

  function handleDone() {
    const isReplace = resolution === 'replace';
    order.rtoCount = (order.rtoCount ?? 0) + 1;

    if (isReplace) {
      const newProduct = variantChoice?.spec
        ? withSpec(variantChoice.model ?? name, variantChoice.spec)
        : order.product;
      const newTotal = refundAmount + (variantChoice?.delta ?? 0);
      const update = getRtoReplacementUpdate({
        description: `Return-to-origin — replacement booked (${newProduct})`,
      });
      Object.assign(order, {
        product: newProduct,
        section: 'inProgress',
        status: update.status,
        caption: update.caption,
        actions: update.actions,
        amount: newTotal,
        priceBreakup: order.priceBreakup ? { ...order.priceBreakup, total: newTotal } : order.priceBreakup,
        intentOverrides: { ...order.intentOverrides, cancel: update.overrideReason, returnReplace: update.overrideReason },
      });
      recomputeOrderTotals(order);
      if (order.tracker) order.tracker = { steps: update.trackerSteps, currentIndex: 0 };
      if (order.timeline) {
        order.timeline.steps = [
          ...order.timeline.steps.slice(0, order.timeline.currentIndex + 1),
          { label: update.trackerSteps[0], timestamp: null, description: update.description },
        ];
        order.timeline.currentIndex = order.timeline.steps.length - 1;
      }
      createCase({
        lane: 'returns',
        prefix: CASE_PREFIX.returnReplace,
        order,
        item: null,
        description: `Return-to-origin replacement — ${newProduct}`,
        hasPhoto: false,
        escalate: false,
        messages: [],
        intent: 'orderEdit',
        family: order.items ? 'multi_item' : 'single_item',
        reason: origin,
        ruleTrace: ['RT-01 shared sub-flow', 'RT-02 replacement branch'],
        offered: ['refund', 'replace'],
        chosen: 'replace',
        outcome: 'replaced',
      });
    } else {
      const update = getRtoPostCancelUpdate();
      Object.assign(order, {
        section: 'inProgress',
        status: update.status,
        caption: update.caption,
        actions: update.actions,
        intentOverrides: { ...order.intentOverrides, cancel: update.overrideReason },
      });
      if (order.tracker) order.tracker = { steps: update.trackerSteps, currentIndex: 0 };
      if (order.timeline) {
        // Truncate any not-yet-reached steps (e.g. a still-pending
        // "Delivered") rather than appending after them — the whole point
        // of an RTO-intercept is that delivery never happens, so Timeline's
        // `i < currentIndex` done-marking must not sweep past it.
        order.timeline.steps = [
          ...order.timeline.steps.slice(0, order.timeline.currentIndex + 1),
          { label: update.trackerSteps[0], timestamp: null, description: update.description },
        ];
        order.timeline.currentIndex = order.timeline.steps.length - 1;
      }
      createCase({
        lane: origin === 'damagedRejection' ? 'logistics' : 'general',
        prefix: origin === 'cancel' ? CASE_PREFIX.cancellation : CASE_PREFIX.complaint,
        order,
        item: null,
        description:
          origin === 'damagedRejection'
            ? 'Delivery refused (damaged) — return-to-origin, refund to follow'
            : 'Post-dispatch cancellation — return-to-origin, refund to follow',
        hasPhoto: false,
        escalate: true,
        messages: [],
        intent: origin === 'cancel' ? 'cancel' : 'deliveryIssue',
        reason: origin === 'damagedRejection' ? 'Damaged on arrival — refused' : 'Post-dispatch cancellation',
        ruleTrace: ['RT-01 shared sub-flow'],
        offered: offerReplacement ? ['refund', 'replace'] : ['refund'],
        chosen: 'refund',
        outcome: origin === 'cancel' ? 'not_retained' : 'refunded',
      });
    }

    goBack();
  }

  // The variant picker asks for the new item before RTO is even confirmed —
  // matching how ReturnReplaceFlow's own variant step behaves, and letting
  // the payment-link step (if needed) show a real amount right away instead
  // of a second round trip after the fact.
  if (offerReplacement && resolution === null) {
    return (
      <div className="rto-replace">
        <header className="rto-replace__topbar">
          <button className="rto-replace__icon-btn" onClick={goBack} aria-label="Back">
            <ChevronLeftIcon />
          </button>
          <h1>Choose Replacement</h1>
          <span className="rto-replace__icon-btn-spacer" />
        </header>
        <div className="rto-replace__stage">
          {variants ? (
            <MattressVariantStep order={order} price={refundAmount} onContinue={handleChooseVariant} />
          ) : (
            <div className="execution-step">
              <p className="execution-step__confirm-body">
                This item doesn't have alternate sizes or models to choose from.
              </p>
              <button className="execution-step__done" onClick={() => setResolution('refund')}>
                Continue with a Refund Instead
              </button>
            </div>
          )}
          {variants && (
            <button className="rto-replace__skip-link" onClick={() => setResolution('refund')}>
              I'd rather have a refund instead
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="rto-replace">
      <header className="rto-replace__topbar">
        <button className="rto-replace__icon-btn" onClick={goBack} aria-label="Back">
          <ChevronLeftIcon />
        </button>
        <h1>{copy.headerTitle}</h1>
        <span className="rto-replace__icon-btn-spacer" />
      </header>

      <div className="rto-replace__stage">
        <div className="execution-step">
          <div className="execution-step__confirm">
            <span className="execution-step__confirm-icon">
              <CheckIcon width="18" height="18" strokeWidth="3" />
            </span>
            <div>
              <p className="execution-step__confirm-title">{copy.confirmTitle}</p>
              <p className="execution-step__confirm-body">{copy.confirmBody}</p>
            </div>
          </div>

          <div className="execution-step__card">
            <p className="execution-step__card-heading">Item</p>
            <div className="execution-step__item">
              <img className="execution-step__item-image" src={order.image} alt={order.product} />
              <div className="execution-step__item-text">
                <p className="execution-step__item-name">{name}</p>
                {spec && <p className="execution-step__item-spec">{spec}</p>}
              </div>
              <span className="execution-step__item-price">{formatRupees(refundAmount)}</span>
            </div>
          </div>

          <div className="execution-step__card">
            <p className="execution-step__card-heading">
              {resolution === 'replace' ? 'Execution Tracker' : 'Delivery Delay Tracker'}
            </p>
            <Timeline steps={execution.steps} currentIndex={execution.currentIndex} />
          </div>

          {resolution === 'replace' ? (
            <div className="execution-step__card">
              <p className="execution-step__card-heading">Refund Details</p>
              <div className="execution-step__detail-row">
                <span>New Item</span>
                <span className="execution-step__detail-strong">
                  {withSpec(variantChoice?.model ?? name, variantChoice?.spec ?? spec)}
                </span>
              </div>
              {variantChoice?.delta !== 0 && (
                <div className="execution-step__detail-row">
                  <span>{variantChoice?.delta > 0 ? 'Additional Payment' : 'Refund'}</span>
                  <span className="execution-step__detail-strong">
                    {formatRupees(Math.abs(variantChoice?.delta ?? 0))}
                  </span>
                </div>
              )}
              <div className="execution-step__detail-row">
                <span>Trigger</span>
                <span>On return confirmation</span>
              </div>
            </div>
          ) : (
            <div className="execution-step__card">
              <p className="execution-step__card-heading">Refund Details</p>
              <div className="execution-step__detail-row">
                <span>Refund Amount</span>
                <span className="execution-step__detail-strong">{formatRupees(refundAmount)}</span>
              </div>
              <div className="execution-step__detail-row">
                <span>Refund Method</span>
                <span>Original Payment Mode</span>
              </div>
              <div className="execution-step__detail-row">
                <span>Trigger</span>
                <span>On return confirmation</span>
              </div>
            </div>
          )}

          <button
            className="execution-step__done"
            onClick={needsPaymentLink ? () => {} : handleDone}
            {...(needsPaymentLink ? { 'aria-disabled': true } : {})}
          >
            {needsPaymentLink ? `Pay ${formatRupees(variantChoice.delta)} to Confirm` : 'Back to Order Details'}
          </button>
          {needsPaymentLink && (
            <button className="rto-replace__pay-link" onClick={() => setPaymentConfirmed(true)}>
              Simulate Payment
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
