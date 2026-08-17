import { useState } from 'react';
import { getRemediationOptions } from '../../data/remediation.js';
import ConfirmSheet from '../../components/ConfirmSheet.jsx';
import './OptionsStep.css';

// Retention-ladder ordered levers from the mocked C3 verdict — cheapest/least
// drastic first, Return for Refund always last (PRD §7.2).
export default function OptionsStep({ order, reason, selectedLever, onSelectLever, onContinue }) {
  const options = getRemediationOptions(order, reason);
  const selectedOption = options.find((o) => o.id === selectedLever);
  // A needsApproval lever isn't ours to grant on the spot — it goes to a
  // human for review, so "Confirm Choice" asks the customer to actually
  // confirm the submission instead of silently treating it as approved.
  const [confirmOpen, setConfirmOpen] = useState(false);

  function handleConfirmChoice() {
    if (selectedOption?.needsApproval) {
      setConfirmOpen(true);
    } else {
      onContinue();
    }
  }

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
            <div className="options-step__card-header">
              <span className="options-step__card-label">{option.label}</span>
              {option.tag && (
                <span className={`options-step__tag options-step__tag--${option.id === 'return' ? 'last' : 'recommended'}`}>
                  {option.tag}
                </span>
              )}
            </div>
            <p className="options-step__card-description">{option.description}</p>
            <div className="options-step__card-footer">
              <span className="options-step__charge">{option.chargeLabel}</span>
              {option.needsApproval && <span className="options-step__approval">Needs approval</span>}
            </div>
          </button>
        ))}
      </div>

      <button className="options-step__continue" disabled={!selectedLever} onClick={handleConfirmChoice}>
        Confirm Choice
      </button>

      <ConfirmSheet
        open={confirmOpen}
        title="Submit this request?"
        body={`We'll send your ${selectedOption?.label.toLowerCase()} request to our team for review — this can't be undone once submitted.`}
        confirmLabel="Submit Request"
        onConfirm={() => {
          setConfirmOpen(false);
          onContinue();
        }}
        onClose={() => setConfirmOpen(false)}
      />
    </div>
  );
}
