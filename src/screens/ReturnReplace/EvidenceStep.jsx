import { useState } from 'react';
import { splitProductSpec } from '../../data/orders.js';
import { RETURN_REASONS } from '../../data/remediation.js';
import PhotoUploadTile from '../../components/PhotoUploadTile.jsx';
import { REASON_ICONS } from './reasonIcons.jsx';
import './ReasonStep.css';
import './EvidenceStep.css';

function formatRupees(amount) {
  return `₹${amount.toLocaleString('en-IN')}`;
}

// Reason + evidence used to be two separate taps (pick a reason, continue,
// then attach a photo) for what is really one decision — why, with proof.
// Merging them into a single screen saves that extra click without losing
// anything: the reason list is right here instead of a "Change" link back
// to a screen that no longer exists.
export default function EvidenceStep({ order, reason, onSelectReason, price, savings, photo, onPhotoChange, onContinue }) {
  const [note, setNote] = useState('');
  const { name, spec } = splitProductSpec(order.product);

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

      <p className="evidence-step__prompt">Choose the reason closest to what happened.</p>
      <div className="reason-step__list" role="radiogroup">
        {RETURN_REASONS.map((r) => {
          const Icon = REASON_ICONS[r];
          const isSelected = reason === r;
          return (
            <button
              key={r}
              className={`reason-step__option${isSelected ? ' reason-step__option--selected' : ''}`}
              onClick={() => onSelectReason(r)}
              role="radio"
              aria-checked={isSelected}
            >
              <span className="reason-step__icon" aria-hidden="true">
                <Icon width="16" height="16" strokeWidth="2" />
              </span>
              <span className="reason-step__option-label">{r}</span>
              <span className="reason-step__radio" aria-hidden="true" />
            </button>
          );
        })}
      </div>

      <p className="evidence-step__prompt">
        A quick photo of <strong>{name}</strong> helps us confirm the issue faster.
      </p>

      <PhotoUploadTile onChange={onPhotoChange} />

      <label className="evidence-step__note-label" htmlFor="evidence-note">
        Anything else we should know? (optional)
      </label>
      <textarea
        id="evidence-note"
        className="evidence-step__note"
        rows={4}
        placeholder={`Describe the ${reason?.toLowerCase() ?? 'issue'} in a few words...`}
        value={note}
        onChange={(e) => setNote(e.target.value)}
      />

      <button className="evidence-step__continue" disabled={!reason || !photo} onClick={onContinue}>
        Continue
      </button>
      {!reason ? (
        <p className="evidence-step__hint">Choose a reason to proceed.</p>
      ) : (
        !photo && <p className="evidence-step__hint">A photo is required to proceed.</p>
      )}
    </div>
  );
}
