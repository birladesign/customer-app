import { useState } from 'react';
import { splitProductSpec } from '../../data/orders.js';
import { MATTRESS_REASONS } from '../../data/mattressRules.js';
import PhotoUploadTile from '../../components/PhotoUploadTile.jsx';
import { AlertTriangleIcon, PackageIcon, HelpCircleIcon } from '../../components/icons.jsx';
import './ReasonStep.css';
import './EvidenceStep.css';

// Icon set is limited to what already exists elsewhere in the app — Sagging
// and Smell reuse the closest fit rather than adding new glyphs for two
// rarely-picked reasons.
const MATTRESS_REASON_ICONS = {
  damaged: AlertTriangleIcon,
  wrongSizeModel: PackageIcon,
  discomfort: HelpCircleIcon,
  sagging: AlertTriangleIcon,
  smell: HelpCircleIcon,
};

// §7.6 who-erred, in the customer's own terms — nobody self-describes as
// "customer erred", so the copy describes the situation and the engine maps
// it to the fault attribution the M-table branches on.
const FAULT_OPTIONS = [
  { key: 'tsc', label: 'I received a different size or model than I ordered' },
  { key: 'customer', label: 'I ordered the wrong size or model' },
];

function formatRupees(amount) {
  return `₹${amount.toLocaleString('en-IN')}`;
}

// Mattress-specific counterpart to the generic ReasonStep+EvidenceStep merge
// — same one-screen shape, but with the PRD's own reason set (§7.7).
//
// "Wrong size or model" branches on who-erred (§7.6): M2 if the order was
// picked/shipped wrong by TSC, M3/M4 if the customer ordered the wrong thing.
// That single answer decides the verdict, so it's asked inline here rather
// than as its own screen.
export default function MattressReasonStep({
  order,
  price,
  savings,
  reason,
  onSelectReason,
  needsFault,
  faultAttribution,
  onSelectFault,
  photo,
  onPhotoChange,
  photoRequired,
  onContinue,
}) {
  const [note, setNote] = useState('');
  const { name, spec } = splitProductSpec(order.product);
  const faultAnswered = !needsFault || Boolean(faultAttribution);
  // §7.10 evidence matrix — the verdict says whether images are mandatory for
  // this reason. Blocking on a photo the policy calls optional adds friction
  // the PRD deliberately removed for mattresses.
  const canContinue = Boolean(reason) && faultAnswered && (!photoRequired || Boolean(photo?.length));

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
        {MATTRESS_REASONS.map((r) => {
          const Icon = MATTRESS_REASON_ICONS[r.key];
          const isSelected = reason === r.key;
          return (
            <button
              key={r.key}
              className={`reason-step__option${isSelected ? ' reason-step__option--selected' : ''}`}
              onClick={() => onSelectReason(r.key)}
              role="radio"
              aria-checked={isSelected}
            >
              <span className="reason-step__icon" aria-hidden="true">
                <Icon width="16" height="16" strokeWidth="2" />
              </span>
              <span className="reason-step__option-label">{r.label}</span>
              <span className="reason-step__radio" aria-hidden="true" />
            </button>
          );
        })}
      </div>

      {needsFault && (
        <>
          <p className="evidence-step__prompt">Which of these is closer to what happened?</p>
          <div className="reason-step__list" role="radiogroup">
            {FAULT_OPTIONS.map((f) => {
              const isSelected = faultAttribution === f.key;
              return (
                <button
                  key={f.key}
                  className={`reason-step__option${isSelected ? ' reason-step__option--selected' : ''}`}
                  onClick={() => onSelectFault(f.key)}
                  role="radio"
                  aria-checked={isSelected}
                >
                  <span className="reason-step__icon" aria-hidden="true">
                    <PackageIcon width="16" height="16" strokeWidth="2" />
                  </span>
                  <span className="reason-step__option-label">{f.label}</span>
                  <span className="reason-step__radio" aria-hidden="true" />
                </button>
              );
            })}
          </div>
        </>
      )}

      <p className="evidence-step__prompt">
        {photoRequired ? (
          <>
            A photo of <strong>{name}</strong> is required for this issue.
          </>
        ) : (
          <>
            A quick photo of <strong>{name}</strong> helps us confirm the issue faster — optional.
          </>
        )}
      </p>
      <PhotoUploadTile onChange={onPhotoChange} />

      <label className="evidence-step__note-label" htmlFor="mattress-evidence-note">
        Anything else we should know? (optional)
      </label>
      <textarea
        id="mattress-evidence-note"
        className="evidence-step__note"
        rows={4}
        placeholder="Describe what happened in a few words..."
        value={note}
        onChange={(e) => setNote(e.target.value)}
      />

      <button className="evidence-step__continue" disabled={!canContinue} onClick={onContinue}>
        Continue
      </button>
      {!reason ? (
        <p className="evidence-step__hint">Choose a reason to proceed.</p>
      ) : !faultAnswered ? (
        <p className="evidence-step__hint">Tell us what happened to continue.</p>
      ) : (
        photoRequired && !photo?.length && <p className="evidence-step__hint">A photo is required to proceed.</p>
      )}
    </div>
  );
}
