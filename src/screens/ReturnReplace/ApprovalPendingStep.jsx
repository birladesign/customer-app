import { splitProductSpec } from '../../data/orders.js';
import { CURRENT_USER } from '../../data/profile.js';
import { CheckIcon, MapPinIcon } from '../../components/icons.jsx';
import './ExecutionStep.css';

function formatRupees(amount) {
  return `₹${amount.toLocaleString('en-IN')}`;
}

// Terminal screen for a needsApproval lever, once the customer has confirmed
// submission — there's no automated tracker to show, since a human reviews
// this next, not the system. Doubles as the request's receipt: what was
// asked for, for how much, and where it's going, all in one place instead
// of forcing a trip back into Order Details to piece it together.
export default function ApprovalPendingStep({ order, refundAmount, reason, onDone }) {
  const { name, spec } = splitProductSpec(order.product);

  return (
    <div className="execution-step">
      <div className="execution-step__confirm">
        <span className="execution-step__confirm-icon">
          <CheckIcon width="18" height="18" strokeWidth="3" />
        </span>
        <div>
          <p className="execution-step__confirm-title">Return request accepted</p>
          <p className="execution-step__confirm-body">Our agent will connect with you soon.</p>
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
        <p className="execution-step__card-heading">Request Details</p>
        <div className="execution-step__detail-row">
          <span>Order ID</span>
          <span>{order.id}</span>
        </div>
        <div className="execution-step__detail-row">
          <span>Request Type</span>
          <span>Return for Refund</span>
        </div>
        {reason && (
          <div className="execution-step__detail-row">
            <span>Reason</span>
            <span>{reason}</span>
          </div>
        )}
        <div className="execution-step__detail-divider" />
        <div className="execution-step__detail-row">
          <span>Refund Amount</span>
          <span className="execution-step__detail-strong">{formatRupees(refundAmount)}</span>
        </div>
        <div className="execution-step__detail-row">
          <span>Refund Method</span>
          <span>Original Payment Mode</span>
        </div>
        <div className="execution-step__detail-divider" />
        <div className="execution-step__pickup">
          <span className="execution-step__pickup-icon">
            <MapPinIcon width="14" height="14" />
          </span>
          <div>
            <p className="execution-step__pickup-name">
              {CURRENT_USER.firstName} {CURRENT_USER.lastName}
            </p>
            <p className="execution-step__pickup-address">{order.address}</p>
          </div>
        </div>
      </div>

      <button className="execution-step__done" onClick={onDone}>
        Back to Order Details
      </button>
    </div>
  );
}
