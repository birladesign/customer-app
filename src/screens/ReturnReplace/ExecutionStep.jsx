import { getExecutionSteps } from '../../data/remediation.js';
import Timeline from '../../components/Timeline.jsx';
import { CheckIcon } from '../../components/icons.jsx';
import './ExecutionStep.css';

const LEVER_CONFIRMATION = {
  sendPart: 'Replacement part on its way',
  replace: 'Replacement Requested',
  return: 'Return booked',
};

export default function ExecutionStep({ order, leverId, onDone }) {
  const execution = getExecutionSteps(leverId);
  const refundNote =
    leverId === 'return'
      ? "Once the quality check is passed, we'll refund to your original payment method within 2–5 business days."
      : `We'll keep you updated on ${order.product} right here and in My Orders.`;

  return (
    <div className="execution-step">
      <div className="execution-step__confirm">
        <span className="execution-step__confirm-icon">
          <CheckIcon width="18" height="18" strokeWidth="3" />
        </span>
        <div>
          <p className="execution-step__confirm-title">{LEVER_CONFIRMATION[leverId] ?? 'Request booked'}</p>
          <p className="execution-step__confirm-body">{refundNote}</p>
        </div>
      </div>

      <div className="execution-step__card">
        <p className="execution-step__card-heading">Execution Tracker</p>
        <Timeline steps={execution.steps} currentIndex={execution.currentIndex} />
      </div>

      <button className="execution-step__done" onClick={onDone}>
        Back to Order Details
      </button>
    </div>
  );
}
