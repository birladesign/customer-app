import { CheckIcon } from '../../components/icons.jsx';
import './ExecutionStep.css';

// Terminal screen for a needsApproval lever, once the customer has confirmed
// submission — there's no automated tracker to show, since a human reviews
// this next, not the system.
export default function ApprovalPendingStep({ onDone }) {
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

      <button className="execution-step__done" onClick={onDone}>
        Back to Order Details
      </button>
    </div>
  );
}
