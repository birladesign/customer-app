import { splitProductSpec } from '../../data/orders.js';
import PhotoUploadTile from '../../components/PhotoUploadTile.jsx';
import './ReasonStep.css';
import './EvidenceStep.css';

function formatRupees(amount) {
  return `₹${amount.toLocaleString('en-IN')}`;
}

// M2 (§7.7) — TSC picked or shipped the wrong item, so there's nothing for
// the customer to choose: the replacement is the exact item they originally
// ordered, not a new pick (that's MattressVariantStep's job, and it's only
// reachable when the customer themselves ordered the wrong thing). What this
// screen collects instead is proof of the mismatch — a photo and the actual
// size/model that showed up — so ops can verify before dispatching, which is
// why this ends in a ticket rather than the instant self-serve tracker a
// customer-fault replacement gets.
export default function WrongItemEvidenceStep({
  order,
  price,
  savings,
  photo,
  onPhotoChange,
  receivedDetail,
  onReceivedDetailChange,
  onContinue,
}) {
  const { name, spec } = splitProductSpec(order.product);
  const canContinue = Boolean(photo?.length) && receivedDetail.trim().length > 0;

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

      <p className="evidence-step__prompt">
        Since this was our mistake, we'll ship the <strong>{name}</strong>
        {spec ? ` (${spec})` : ''} you originally ordered — there's nothing to pick. We just need proof of what
        actually arrived.
      </p>

      <p className="evidence-step__prompt">A photo of what you received.</p>
      <PhotoUploadTile onChange={onPhotoChange} />

      <label className="evidence-step__note-label" htmlFor="received-detail">
        What size or model did you actually receive?
      </label>
      <textarea
        id="received-detail"
        className="evidence-step__note"
        rows={3}
        placeholder="e.g. King / 8 inch instead of Queen / 6 inch"
        value={receivedDetail}
        onChange={(e) => onReceivedDetailChange(e.target.value)}
      />

      <div className="evidence-step__footer">
        <button className="evidence-step__continue" disabled={!canContinue} onClick={onContinue}>
          Raise Ticket
        </button>
        {!photo?.length ? (
          <p className="evidence-step__hint">A photo is required to proceed.</p>
        ) : (
          !receivedDetail.trim() && <p className="evidence-step__hint">Tell us what you received to continue.</p>
        )}
      </div>
    </div>
  );
}
