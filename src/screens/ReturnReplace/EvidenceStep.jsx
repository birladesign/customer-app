import { useState } from 'react';
import { splitProductSpec } from '../../data/orders.js';
import { getEvidenceRequirement } from '../../data/remediation.js';
import PhotoUploadTile from '../../components/PhotoUploadTile.jsx';
import './EvidenceStep.css';

function formatRupees(amount) {
  return `₹${amount.toLocaleString('en-IN')}`;
}

export default function EvidenceStep({ order, reason, price, savings, photo, onPhotoChange, onChangeReason, onContinue }) {
  const [note, setNote] = useState('');
  const { name, spec } = splitProductSpec(order.product);
  // §7.10: a photo is the basis of some verdicts and irrelevant to others.
  // Only the ones it actually decides block the step.
  const evidence = getEvidenceRequirement(order, reason);
  const blocked = evidence.level === 'required' && !photo;

  return (
    <div className="evidence-step">
      <div className="evidence-step__item-card">
        <img className="evidence-step__item-image" src={order.image} alt={order.product} />
        <div className="evidence-step__item-text">
          <p className="evidence-step__item-name">{name}</p>
          {spec && <p className="evidence-step__item-spec">{spec}</p>}
          <div className="evidence-step__item-price-row">
            <span className="evidence-step__item-price">{formatRupees(price)}</span>
            {savings > 0 && <span className="evidence-step__item-savings">You saved {formatRupees(savings)}</span>}
          </div>
        </div>
      </div>

      <div className="evidence-step__recap">
        <span className="evidence-step__recap-label">Why do you want to return?</span>
        <span className="evidence-step__recap-value">{reason}</span>
        <button className="evidence-step__recap-change" onClick={onChangeReason}>
          Change
        </button>
      </div>

      {evidence.level !== 'none' && (
        <>
          <p className="evidence-step__prompt">{evidence.prompt}</p>
          <PhotoUploadTile onChange={onPhotoChange} />
        </>
      )}

      <label className="evidence-step__note-label" htmlFor="evidence-note">
        {evidence.level === 'none' ? 'Tell us what happened' : 'Anything else we should know? (optional)'}
      </label>
      <textarea
        id="evidence-note"
        className="evidence-step__note"
        rows={4}
        placeholder={`Describe the ${reason?.toLowerCase() ?? 'issue'} in a few words...`}
        value={note}
        onChange={(e) => setNote(e.target.value)}
      />

      <button className="evidence-step__continue" disabled={blocked} onClick={onContinue}>
        Continue
      </button>
      {blocked && <p className="evidence-step__hint">A photo is required for this kind of claim.</p>}
    </div>
  );
}
