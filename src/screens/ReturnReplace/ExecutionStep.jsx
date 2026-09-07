import { getExecutionSteps } from '../../data/remediation.js';
import Timeline from '../../components/Timeline.jsx';
import { CheckIcon } from '../../components/icons.jsx';
import './ExecutionStep.css';

// PRD §8: every flow terminates in exactly one of self-resolved / action
// booked (with tracker) / handover. This is the "booked" terminal — the
// customer sees the legs their remediation will actually travel (§7.12's
// pickup → QC → swap → refund), and the case reference that identifies it.
//
// This screen previously existed, was removed, and the flow started ending by
// silently mutating the order and navigating back — which is a fourth
// terminal state the spec doesn't allow, and left a booked action with no
// confirmation and no reference the customer could quote.

const LEVER_CONFIRMATION = {
  // Nothing has shipped yet — a support agent still has to confirm which
  // part is actually missing before an order for it exists (see
  // getExecutionSteps in data/remediation.js). "On its way" would claim
  // progress that hasn't happened.
  sendPart: 'Missing-part request received',
  replace: 'Replacement Requested',
  return: 'Return booked',
};

function formatRupees(amount) {
  return `₹${amount.toLocaleString('en-IN')}`;
}

// priceDelta and newVariantLabel are optional and only ever set when the
// replacement actually landed on a different variant (see
// MattressVariantStep) — every other caller simply doesn't pass them, and
// this stays silent as before. Without newVariantLabel, "Replacement
// Requested" never said what the replacement actually was, just the name
// of the thing that didn't work out.
export default function ExecutionStep({
  order,
  leverId,
  priceDelta = 0,
  newVariantLabel = null,
  caseId = null,
  onDone,
}) {
  const execution = getExecutionSteps(leverId);
  const refundNote = 'Our agent will connect with you soon.';

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

      {newVariantLabel && (
        <div className="execution-step__price-delta">
          <span>New</span>
          <span className="execution-step__price-delta-amount">{newVariantLabel}</span>
        </div>
      )}

      {priceDelta !== 0 && (
        <div className="execution-step__price-delta">
          <span>{priceDelta > 0 ? 'Additional Payment' : 'Refund'}</span>
          <span className="execution-step__price-delta-amount">{formatRupees(Math.abs(priceDelta))}</span>
        </div>
      )}

      <div className="execution-step__card">
        <p className="execution-step__card-heading">Execution Tracker</p>
        <Timeline steps={execution.steps} currentIndex={execution.currentIndex} />
      </div>

      {/* The reference the customer quotes if they call in — the same id the
          case carries in My Cases, so the two views agree (§9.10). */}
      {caseId && (
        <div className="execution-step__card">
          <div className="execution-step__detail-row">
            <span>Reference ID</span>
            <span className="execution-step__detail-strong">{caseId}</span>
          </div>
          <div className="execution-step__detail-row">
            <span>Order ID</span>
            <span>{order.id}</span>
          </div>
        </div>
      )}

      <button className="execution-step__done" onClick={onDone}>
        Back to Order Details
      </button>
    </div>
  );
}
