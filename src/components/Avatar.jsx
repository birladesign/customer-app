import { useId } from 'react';
import { useObjectUrlPreview } from '../hooks/useObjectUrlPreview.js';
import { EditIcon } from './icons.jsx';
import './Avatar.css';

// A real file input + object-URL preview, same idiom as PhotoUploadTile.jsx
// (both share useObjectUrlPreview), just circular rather than tiled.
//
// photoUrl is a previously-saved photo (a persisted data URL, since blob
// object URLs get revoked once the component that created them unmounts —
// see useObjectUrlPreview's cleanup — so they can't survive navigating away
// and back). The live picked-file preview takes priority over it whenever
// there is one, i.e. mid-edit in this same session.
export default function Avatar({ initial, photoUrl, size = 56, editable = false, onChange }) {
  const inputId = useId();
  const { previewUrl, handleFile } = useObjectUrlPreview(onChange);
  const src = previewUrl ?? photoUrl;

  return (
    <div className="avatar" style={{ width: size, height: size }}>
      {src ? (
        <img className="avatar__image" src={src} alt="" />
      ) : (
        <span className="avatar__initial" style={{ fontSize: size * 0.42 }}>{initial}</span>
      )}
      {editable && (
        <>
          <input
            id={inputId}
            type="file"
            accept="image/*"
            className="avatar__input"
            onChange={handleFile}
          />
          <label htmlFor={inputId} className="avatar__edit-badge" aria-label="Change photo">
            <EditIcon width="14" height="14" />
          </label>
        </>
      )}
    </div>
  );
}
