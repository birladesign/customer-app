import { useRef } from 'react';
import { useObjectUrlPreview } from '../hooks/useObjectUrlPreview.js';
import { CheckIcon, CloseIcon } from './icons.jsx';
import './PhotoUploadTile.css';

// Real file input + object-URL preview — no mocked/fake upload UI.
export default function PhotoUploadTile({ onChange }) {
  const inputRef = useRef(null);
  const { previewUrl, handleFile, clear } = useObjectUrlPreview(onChange);

  function clearPhoto() {
    clear();
    if (inputRef.current) inputRef.current.value = '';
  }

  return (
    <div className="photo-upload-tile">
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="photo-upload-tile__input"
        onChange={handleFile}
        id="photo-upload-input"
      />
      {previewUrl ? (
        <div className="photo-upload-tile__preview">
          <img src={previewUrl} alt="Uploaded evidence" />
          <span className="photo-upload-tile__badge">
            <CheckIcon width="12" height="12" strokeWidth="3" />
          </span>
          <button type="button" className="photo-upload-tile__remove" onClick={clearPhoto} aria-label="Remove photo">
            <CloseIcon width="12" height="12" />
          </button>
        </div>
      ) : (
        <label htmlFor="photo-upload-input" className="photo-upload-tile__label">
          <span className="photo-upload-tile__plus">+</span>
          <span>Add Photo</span>
        </label>
      )}
    </div>
  );
}
