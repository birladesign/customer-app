import { getReturnReasons } from '../../data/remediation.js';
import './ReasonStep.css';

export default function ReasonStep({ order, selected, onSelect, onContinue }) {
  const reasons = getReturnReasons(order);
  return (
    <div className="reason-step">
      <p className="reason-step__prompt">Choose the reason closest to what happened. This helps us route it correctly.</p>
      {/* One grouped list with a radio indicator per row, not a separate
          card per option — these are answers to one question, not
          independent choices competing for attention. */}
      <div className="reason-step__list" role="radiogroup">
        {reasons.map((reason) => (
          <button
            key={reason}
            className={`reason-step__option${selected === reason ? ' reason-step__option--selected' : ''}`}
            onClick={() => onSelect(reason)}
            role="radio"
            aria-checked={selected === reason}
          >
            <span className="reason-step__radio" aria-hidden="true" />
            <span className="reason-step__option-label">{reason}</span>
          </button>
        ))}
      </div>
      <button className="reason-step__continue" disabled={!selected} onClick={onContinue}>
        Continue
      </button>
    </div>
  );
}
