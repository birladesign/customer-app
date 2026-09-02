import { useState } from 'react';
import { CheckIcon, PackageIcon, EditIcon } from '../../components/icons.jsx';
import './MattressVerdictStep.css';

function formatRupees(amount) {
  return `₹${amount.toLocaleString('en-IN')}`;
}

// M5's retention ladder (PRD §7.11) — posture-correction education, then a
// topper offer, then a replacement offer, only reaching Return once both
// have been declined. Runs as its own little sub-stage machine since it's
// three screens deep before the customer even gets to Replace/Return.
function RetentionLadder({ onAcceptTopper, onChooseLever }) {
  const [stage, setStage] = useState('education');

  if (stage === 'education') {
    return (
      <div className="mattress-verdict">
        <div className="mattress-verdict__card">
          <p className="mattress-verdict__title">A few things that help with a new mattress</p>
          <p className="mattress-verdict__body">
            It's common to feel a new mattress differently for the first few weeks — sleeping posture, prior
            mattress firmness, and even room temperature all play a part. Most discomfort settles within 2-3 weeks
            as your body adjusts.
          </p>
        </div>
        <button className="mattress-verdict__primary" onClick={() => setStage('topper')}>
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
            A topper can often resolve firmness discomfort without needing a full replacement — choose firm or
            soft, sent at no cost.
          </p>
          <div className="mattress-verdict__chip-row">
            <span className="mattress-verdict__chip">Firm Topper</span>
            <span className="mattress-verdict__chip">Soft Topper</span>
          </div>
        </div>
        <button className="mattress-verdict__primary" onClick={onAcceptTopper}>
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
    return <RetentionLadder onAcceptTopper={onAcceptTopper} onChooseLever={onChooseLever} />;
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
