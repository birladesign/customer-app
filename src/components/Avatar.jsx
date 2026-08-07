import { useId } from 'react';
import { useObjectUrlPreview } from '../hooks/useObjectUrlPreview.js';
import { EditIcon } from './icons.jsx';
import './Avatar.css';

// A real file input + object-URL preview, same idiom as PhotoUploadTile.jsx
// (both share useObjectUrlPreview), just circular rather than tiled.
export default function Avatar({ initial, size = 56, editable = false, onChange }) {
  const inputId = useId();
  const { previewUrl, handleFile } = useObjectUrlPreview(onChange);

  return (
    <div className="avatar" style={{ width: size, height: size }}>
      {previewUrl ? (
        <img className="avatar__image" src={previewUrl} alt="" />
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
