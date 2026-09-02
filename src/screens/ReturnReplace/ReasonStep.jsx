import { RETURN_REASONS } from '../../data/remediation.js';
import { REASON_ICONS } from './reasonIcons.jsx';
import './ReasonStep.css';

export default function ReasonStep({ selected, onSelect, onContinue }) {
  return (
    <div className="reason-step">
      <p className="reason-step__prompt">Choose the reason closest to what happened. This helps us route it correctly.</p>
      {/* One grouped list with a radio indicator per row, not a separate
          card per option — these are five answers to one question, not
          five independent choices competing for attention. */}
      <div className="reason-step__list" role="radiogroup">
        {RETURN_REASONS.map((reason) => {
          const Icon = REASON_ICONS[reason];
          const isSelected = selected === reason;
          return (
            <button
              key={reason}
              className={`reason-step__option${isSelected ? ' reason-step__option--selected' : ''}`}
              onClick={() => onSelect(reason)}
              role="radio"
              aria-checked={isSelected}
            >
              <span className="reason-step__icon" aria-hidden="true">
                <Icon width="16" height="16" strokeWidth="2" />
              </span>
              <span className="reason-step__option-label">{reason}</span>
              <span className="reason-step__radio" aria-hidden="true" />
            </button>
          );
        })}
      </div>
      <button className="reason-step__continue" disabled={!selected} onClick={onContinue}>
        Continue
      </button>
    </div>
  );
}
