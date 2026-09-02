import { useState } from 'react';
import { splitProductSpec } from '../../data/orders.js';
import PhotoUploadTile from '../../components/PhotoUploadTile.jsx';
import { REASON_ICONS } from './reasonIcons.jsx';
import './EvidenceStep.css';

function formatRupees(amount) {
  return `₹${amount.toLocaleString('en-IN')}`;
}

export default function EvidenceStep({ order, reason, price, savings, photo, onPhotoChange, onChangeReason, onContinue }) {
  const [note, setNote] = useState('');
  const { name, spec } = splitProductSpec(order.product);
  const ReasonIcon = REASON_ICONS[reason];

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
        {ReasonIcon && (
          <span className="evidence-step__recap-icon" aria-hidden="true">
            <ReasonIcon width="14" height="14" strokeWidth="2" />
          </span>
        )}
        <span className="evidence-step__recap-text">
          <span className="evidence-step__recap-label">Why do you want to return?</span>
          <span className="evidence-step__recap-value">{reason}</span>
        </span>
        <button className="evidence-step__recap-change" onClick={onChangeReason}>
          Change
        </button>
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

      <button className="evidence-step__continue" disabled={!photo} onClick={onContinue}>
        Continue
      </button>
      {!photo && <p className="evidence-step__hint">A photo is required to proceed.</p>}
    </div>
  );
}
