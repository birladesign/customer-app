import { useState } from 'react';
import { CheckIcon, PackageIcon, EditIcon } from '../../components/icons.jsx';
import { DISCOMFORT_DIAGNOSES } from '../../data/mattressRules.js';
import './MattressVerdictStep.css';

function formatRupees(amount) {
  return `₹${amount.toLocaleString('en-IN')}`;
}

// M5's retention ladder (PRD §7.11) — education, then a topper offer, then a
// replacement offer, only reaching Return once both have been declined. Runs
// as its own little sub-stage machine since it's several screens deep before
// the customer even gets to Replace/Return.
//
// It now asks what is actually wrong before it offers anything. "Uncomfortable"
// is several different problems and they don't share a fix: the answer decides
// whether a topper is the right first move at all, which one, or whether this
// belongs in the ladder in the first place (see DISCOMFORT_DIAGNOSES).
function RetentionLadder({ onAcceptTopper, onChooseLever, onSubmitWarrantyClaim }) {
  const [stage, setStage] = useState('diagnosis');
  const [diagnosis, setDiagnosis] = useState(null);
  const [selectedTopper, setSelectedTopper] = useState(null);

  function handleDiagnose(d) {
    setDiagnosis(d);
    // A topper is only ever pre-selected to the one that actually helps;
    // the customer can still switch it on the next screen.
    setSelectedTopper(d.fix === 'topper' ? d.topper : null);
    setStage(d.fix === 'inspect' ? 'inspect' : 'education');
  }

  if (stage === 'diagnosis') {
    return (
      <div className="mattress-verdict">
        <div className="mattress-verdict__card">
          <p className="mattress-verdict__title">What’s bothering you most?</p>
          <p className="mattress-verdict__body">
            Comfort problems have quite different causes, and the right fix depends on which one this is.
          </p>
        </div>
        <div className="mattress-verdict__diagnosis-list">
          {DISCOMFORT_DIAGNOSES.map((d) => (
            <button key={d.key} className="mattress-verdict__diagnosis" onClick={() => handleDiagnose(d)}>
              {d.label}
            </button>
          ))}
        </div>
      </div>
    );
  }

  // Not a comfort complaint at all — hand straight to the warranty
  // inspection rather than offering a free topper against a possible fault.
  if (stage === 'inspect') {
    return (
      <div className="mattress-verdict">
        <div className="mattress-verdict__card">
          <p className="mattress-verdict__title">That should be looked at, not padded over</p>
          <p className="mattress-verdict__body">{diagnosis.education}</p>
        </div>
        <button className="mattress-verdict__primary" onClick={onSubmitWarrantyClaim}>
          Book an Inspection
        </button>
      </div>
    );
  }

  if (stage === 'education') {
    const hasTopper = diagnosis.fix === 'topper';
    return (
      <div className="mattress-verdict">
        <div className="mattress-verdict__card">
          <p className="mattress-verdict__title">{diagnosis.label}</p>
          <p className="mattress-verdict__body">{diagnosis.education}</p>
        </div>
        <button className="mattress-verdict__primary" onClick={() => setStage(hasTopper ? 'topper' : 'replacement')}>
          Continue
        </button>
      </div>
    );
  }

  if (stage === 'topper') {
    return (
      <div className="mattress-verdict">
        <div className="mattress-verdict__card">
          <p className="mattress-verdict__title">Try a mattress topper first?</p>
          <p className="mattress-verdict__body">
            A {diagnosis.topper} topper is the usual fix for this, sent at no cost. You can switch it if you'd
            rather have the other.
          </p>
          <div className="mattress-verdict__chip-row">
            <button
              className={`mattress-verdict__chip${selectedTopper === 'firm' ? ' mattress-verdict__chip--selected' : ''}`}
              onClick={() => setSelectedTopper('firm')}
            >
              Firm Topper
            </button>
            <button
              className={`mattress-verdict__chip${selectedTopper === 'soft' ? ' mattress-verdict__chip--selected' : ''}`}
              onClick={() => setSelectedTopper('soft')}
            >
              Soft Topper
            </button>
          </div>
        </div>
        <button
          className="mattress-verdict__primary"
          disabled={!selectedTopper}
          onClick={() => onAcceptTopper(selectedTopper)}
        >
          Send Me a Topper
        </button>
        <button className="mattress-verdict__secondary" onClick={() => setStage('replacement')}>
          No thanks, continue
        </button>
      </div>
    );
  }

  // stage === 'replacement'
  return (
    <div className="mattress-verdict">
      <div className="mattress-verdict__card">
        <p className="mattress-verdict__title">Try a different variant instead?</p>
        <p className="mattress-verdict__body">
          A different size or height sometimes resolves comfort issues a topper can't — we can arrange that at no
          charge before considering a return.
        </p>
      </div>
      <button className="mattress-verdict__primary" onClick={() => onChooseLever('replace')}>
        Request Replacement
      </button>
      <button className="mattress-verdict__secondary" onClick={() => onChooseLever('return')}>
        No thanks, I'd rather return it
      </button>
    </div>
  );
}

export default function MattressVerdictStep({
  verdict,
  proRataAmount,
  onChooseLever,
  onAcceptTopper,
  onSubmitWarrantyClaim,
  onSmellPersists,
}) {
  const [insistConfirmed, setInsistConfirmed] = useState(false);

  if (verdict.retention === 'ladder') {
    return (
      <RetentionLadder
        onAcceptTopper={onAcceptTopper}
        onChooseLever={onChooseLever}
        onSubmitWarrantyClaim={onSubmitWarrantyClaim}
      />
    );
  }

  if (verdict.adviceOnly) {
    return (
      <div className="mattress-verdict">
        <div className="mattress-verdict__card">
          <p className="mattress-verdict__title">Let's try airing it out first</p>
          <p className="mattress-verdict__body">{verdict.note}</p>
        </div>
        <button className="mattress-verdict__secondary" onClick={onSmellPersists}>
          It still smells after airing it out
        </button>
      </div>
    );
  }

  if (verdict.proRata) {
    const refund = proRataAmount;
    return (
      <div className="mattress-verdict">
        <div className="mattress-verdict__card">
          <p className="mattress-verdict__title">Warranty Claim</p>
          <p className="mattress-verdict__body">{verdict.note}</p>
          <div className="mattress-verdict__refund-row">
            <span>Estimated Refund (pro-rated)</span>
            <span className="mattress-verdict__refund-amount">{formatRupees(refund)}</span>
          </div>
          <p className="mattress-verdict__fineprint">Final amount is confirmed after inspection.</p>
        </div>
        <button className="mattress-verdict__primary" onClick={onSubmitWarrantyClaim}>
          Submit Warranty Claim
        </button>
      </div>
    );
  }

  if (verdict.retention === 'insist' && !insistConfirmed) {
    return (
      <div className="mattress-verdict">
        <div className="mattress-verdict__card mattress-verdict__card--warning">
          <p className="mattress-verdict__title">Are you sure?</p>
          <p className="mattress-verdict__body">{verdict.note}</p>
        </div>
        <button className="mattress-verdict__primary" onClick={() => setInsistConfirmed(true)}>
          Continue Anyway
        </button>
      </div>
    );
  }

  // Straightforward verdict — M1/M2/M3/M4(confirmed)/M7/M9: no charge for
  // the return/replace itself; let the customer pick a lever from whichever
  // is on offer. A genuine price difference only ever shows up later, if
  // Replace lands on a different-priced size/model (see MattressVariantStep).
  return (
    <div className="mattress-verdict">
      {verdict.note && (
        <div className="mattress-verdict__card">
          <p className="mattress-verdict__body">{verdict.note}</p>
        </div>
      )}

      <div className="mattress-verdict__lever-cards">
        {verdict.leverOptions.includes('replace') && (
          <button className="mattress-verdict__lever-card" onClick={() => onChooseLever('replace')}>
            <span className="mattress-verdict__lever-card-icon">
              <EditIcon width="18" height="18" />
            </span>
            <span>Replace</span>
          </button>
        )}
        {verdict.leverOptions.includes('return') && (
          <button className="mattress-verdict__lever-card" onClick={() => onChooseLever('return')}>
            <span className="mattress-verdict__lever-card-icon">
              <PackageIcon width="18" height="18" />
            </span>
            <span>Return</span>
          </button>
        )}
      </div>
    </div>
  );
}
