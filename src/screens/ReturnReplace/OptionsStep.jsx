import { getRemediationOptions } from '../../data/remediation.js';
import './OptionsStep.css';

// Retention-ladder ordered levers from the mocked C3 verdict — cheapest/least
// drastic first, Return for Refund always last (PRD §7.2).
export default function OptionsStep({ order, reason, selectedLever, onSelectLever, onContinue }) {
  const options = getRemediationOptions(order, reason);

  return (
    <div className="options-step">
      <p className="options-step__prompt">Here's what we can do, ordered by what gets you sorted fastest.</p>

      <div className="options-step__list">
        {options.map((option) => (
          <button
            key={option.id}
            className={`options-step__card${selectedLever === option.id ? ' options-step__card--selected' : ''}`}
            onClick={() => onSelectLever(option.id)}
          >
            <span className="options-step__card-label">{option.label}</span>
            <p className="options-step__card-description">{option.description}</p>
            <div className="options-step__card-footer">
              <span className="options-step__charge">{option.chargeLabel}</span>
              {option.needsApproval && <span className="options-step__approval">Needs approval</span>}
            </div>
          </button>
        ))}
      </div>

      <button className="options-step__continue" disabled={!selectedLever} onClick={onContinue}>
        Confirm Choice
      </button>
    </div>
  );
}
