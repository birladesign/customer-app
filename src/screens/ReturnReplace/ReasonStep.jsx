import { RETURN_REASONS } from '../../data/remediation.js';
import './ReasonStep.css';

export default function ReasonStep({ selected, onSelect, onContinue }) {
  return (
    <div className="reason-step">
      <p className="reason-step__prompt">Choose the reason closest to what happened. This helps us route it correctly.</p>
      <div className="reason-step__chips">
        {RETURN_REASONS.map((reason) => (
          <button
            key={reason}
            className={`reason-step__chip${selected === reason ? ' reason-step__chip--selected' : ''}`}
            onClick={() => onSelect(reason)}
          >
            {reason}
          </button>
        ))}
      </div>
      <button className="reason-step__continue" disabled={!selected} onClick={onContinue}>
        Continue
      </button>
    </div>
  );
}
