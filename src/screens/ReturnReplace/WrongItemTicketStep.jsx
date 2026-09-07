import { splitProductSpec } from '../../data/orders.js';
import { CheckIcon } from '../../components/icons.jsx';
import './ExecutionStep.css';

// Terminal screen for the wrong-item-received ticket (M2, §7.6) — a human
// verifies the mismatch from the customer's photo before the correct item
// ships, so like ApprovalPendingStep there's no automated tracker to show
// yet: nothing has actually moved.
export default function WrongItemTicketStep({ order, ticketId, onDone }) {
  const { name, spec } = splitProductSpec(order.product);

  return (
    <div className="execution-step">
      <div className="execution-step__confirm">
        <span className="execution-step__confirm-icon">
          <CheckIcon width="18" height="18" strokeWidth="3" />
        </span>
        <div>
          <p className="execution-step__confirm-title">Verification ticket raised</p>
          <p className="execution-step__confirm-body">
            We'll confirm the mismatch from your photo, then ship the {name}
            {spec ? ` (${spec})` : ''} you originally ordered — no extra cost.
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
        </div>
      </div>

      <div className="execution-step__card">
        <div className="execution-step__detail-row">
          <span>Ticket ID</span>
          <span className="execution-step__detail-strong">{ticketId}</span>
        </div>
        <div className="execution-step__detail-row">
          <span>Order ID</span>
          <span>{order.id}</span>
        </div>
      </div>

      <button className="execution-step__done" onClick={onDone}>
        Back to Order Details
      </button>
    </div>
  );
}
