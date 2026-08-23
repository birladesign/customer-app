import { useState } from 'react';
import { getRemediationOptions, getDenialNotice } from '../../data/remediation.js';
import ConfirmSheet from '../../components/ConfirmSheet.jsx';
import './OptionsStep.css';

// Retention-ladder ordered levers from the mocked C3 verdict — cheapest/least
// drastic first, Return for Refund always last (PRD §7.2).
export default function OptionsStep({ order, reason, selectedLever, onSelectLever, onContinue, onDone }) {
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

  // No levers left to offer at all (e.g. mattress discomfort past its
  // 100-night trial window) — an inform-only honesty screen instead of a
  // silently empty list (N7-style, PRD §7.8).
  const denialNotice = options.length === 0 ? getDenialNotice(order, reason) : null;
  if (denialNotice) {
    return (
      <div className="options-step">
        <div className="options-step__denial">
          <p className="options-step__denial-title">{denialNotice.title}</p>
          <p className="options-step__denial-body">{denialNotice.body}</p>
        </div>
        <button className="options-step__continue" onClick={onDone}>
          Back to Order Details
        </button>
      </div>
    );
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
            <span className="options-step__card-label">{option.label}</span>
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
