import { useEffect, useRef, useState } from 'react';
import { CheckIcon, CloseIcon } from './icons.jsx';
import './PhotoUploadTile.css';

// A real file input + object-URL preview — no mocked/fake upload UI.
export default function PhotoUploadTile({ onChange }) {
  const inputRef = useRef(null);
  const [previewUrl, setPreviewUrl] = useState(null);

  // Revoke the object URL when it's replaced or the component unmounts, so we
  // don't leak memory across repeated selections.
  useEffect(() => () => { if (previewUrl) URL.revokeObjectURL(previewUrl); }, [previewUrl]);

  function handleFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    onChange?.(file);
  }

  function clearPhoto() {
    setPreviewUrl(null);
    if (inputRef.current) inputRef.current.value = '';
    onChange?.(null);
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
