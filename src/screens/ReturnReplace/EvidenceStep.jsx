import { useState } from 'react';
import PhotoUploadTile from '../../components/PhotoUploadTile.jsx';
import './EvidenceStep.css';

export default function EvidenceStep({ order, reason, photo, onPhotoChange, onContinue }) {
  const [note, setNote] = useState('');

  return (
    <div className="evidence-step">
      <p className="evidence-step__prompt">
        A quick photo of <strong>{order.product}</strong> helps us confirm the issue faster.
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
