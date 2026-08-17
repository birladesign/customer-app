import { ORDERS, splitProductSpec } from '../../data/orders.js';
import { getRtoExecutionSteps, getRtoPostCancelUpdate } from '../../data/rto.js';
import { useNavigation } from '../../navigation/NavigationContext.jsx';
import Timeline from '../../components/Timeline.jsx';
import { ChevronLeftIcon, CheckIcon } from '../../components/icons.jsx';
import '../ReturnReplace/ExecutionStep.css';
import './RtoReplaceFlow.css';

function formatRupees(amount) {
  return `₹${amount.toLocaleString('en-IN')}`;
}

// The RTO-intercept "not guaranteed" warning is a ConfirmSheet the customer
// has already been through, back in OrderDetails, before ever reaching this
// screen — so there's nothing left to decide here, just the tracker for what
// happens next. Order-level only: OrderDetails only offers Cancel (and so
// this flow) at the whole-order view, never scoped to a single line item.
export default function RtoReplaceFlow({ params }) {
  const { goBack } = useNavigation();
  const order = ORDERS.find((o) => o.id === params.orderId);

  if (!order) {
    return (
      <div className="rto-replace">
        <header className="rto-replace__topbar">
          <button className="rto-replace__icon-btn" onClick={goBack} aria-label="Back">
            <ChevronLeftIcon />
          </button>
          <h1>Cancel Order</h1>
          <span className="rto-replace__icon-btn-spacer" />
        </header>
        <p className="rto-replace__not-found">Order not found.</p>
      </div>
    );
  }

  const { name, spec } = splitProductSpec(order.product);
  const refundAmount = order.priceBreakup?.total ?? order.amount;
  const execution = getRtoExecutionSteps();

  // No backend in this prototype — mutate the shared order in place, same
  // pattern as ReturnReplaceFlow's handleJourneyComplete, so My Orders and
  // Order Details both reflect the RTO the moment we navigate back.
  function handleDone() {
    const update = getRtoPostCancelUpdate();
    Object.assign(order, {
      section: 'rto',
      status: update.status,
      caption: update.caption,
      actions: update.actions,
      intentOverrides: { ...order.intentOverrides, cancel: update.overrideReason },
    });
    if (order.tracker) order.tracker = { steps: update.trackerSteps, currentIndex: 0 };
    if (order.timeline) {
      // Truncate any not-yet-reached steps (e.g. a still-pending "Delivered")
      // rather than appending after them — the whole point of an
      // RTO-intercept is that delivery never happens, so Timeline's
      // `i < currentIndex` done-marking must not sweep past it.
      order.timeline.steps = [
        ...order.timeline.steps.slice(0, order.timeline.currentIndex + 1),
        { label: update.trackerSteps[0], timestamp: null, description: update.description },
      ];
      order.timeline.currentIndex = order.timeline.steps.length - 1;
    }
    goBack();
  }

  return (
    <div className="rto-replace">
      <header className="rto-replace__topbar">
        <button className="rto-replace__icon-btn" onClick={goBack} aria-label="Back">
          <ChevronLeftIcon />
        </button>
        <h1>Cancelling Your Order</h1>
        <span className="rto-replace__icon-btn-spacer" />
      </header>

      <div className="rto-replace__stage">
        <div className="execution-step">
          <div className="execution-step__confirm">
            <span className="execution-step__confirm-icon">
              <CheckIcon width="18" height="18" strokeWidth="3" />
            </span>
            <div>
              <p className="execution-step__confirm-title">Cancellation requested</p>
              <p className="execution-step__confirm-body">
                We're attempting to intercept your order before it's delivered. If it can't be stopped in time,
                it'll come back to us for a return-to-origin (RTO) before your refund is processed.
              </p>
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
            <p className="execution-step__card-heading">RTO-Replacement Tracker</p>
            <Timeline steps={execution.steps} currentIndex={execution.currentIndex} />
          </div>

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
              <span>On RTO confirmation</span>
            </div>
          </div>

          <button className="execution-step__done" onClick={handleDone}>
            Back to Order Details
          </button>
        </div>
      </div>
    </div>
  );
}
