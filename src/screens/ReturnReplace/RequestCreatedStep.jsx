import { splitProductSpec } from '../../data/orders.js';
import { CheckIcon } from '../../components/icons.jsx';
import './ExecutionStep.css';

function formatRupees(amount) {
  return `₹${amount.toLocaleString('en-IN')}`;
}

// The flow's own entrance step — a return/replacement request is logged as
// a ticket the moment the customer starts one, before any reason is even
// picked, so an agent is already in the loop if the self-serve steps that
// follow don't resolve things on their own. Mirrors ApprovalPendingStep's
// own confirmation shape (icon + title + "agent will connect" line, Item
// card, Request Details card) since it's the same kind of moment — just at
// the start of the flow instead of the end. Tapping Continue moves into the
// reason screen; nothing else about the flow changes.
export default function RequestCreatedStep({ order, price, ticketId, onContinue }) {
  const { name, spec } = splitProductSpec(order.product);

  return (
    <div className="execution-step">
      <div className="execution-step__confirm">
        <span className="execution-step__confirm-icon">
          <CheckIcon width="18" height="18" strokeWidth="3" />
        </span>
        <div>
          <p className="execution-step__confirm-title">Return/Replacement request created</p>
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
          <span className="execution-step__item-price">{formatRupees(price)}</span>
        </div>
      </div>

      <div className="execution-step__card">
        <p className="execution-step__card-heading">Request Details</p>
        <div className="execution-step__detail-row">
          <span>Ticket ID</span>
          <span className="execution-step__detail-strong">{ticketId}</span>
        </div>
        <div className="execution-step__detail-row">
          <span>Order ID</span>
          <span>{order.id}</span>
        </div>
      </div>

      <button className="execution-step__done" onClick={onContinue}>
        Continue
      </button>
    </div>
  );
}
