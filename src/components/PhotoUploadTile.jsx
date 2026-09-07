import { useRef, useState } from 'react';
import { CheckIcon, CloseIcon } from './icons.jsx';
import './PhotoUploadTile.css';

// Real file input + object-URL previews — no mocked/fake upload UI. Holds
// however many photos the customer adds (up to `max`), each independently
// removable, rather than the single-photo tile this used to be — one damaged
// mattress often needs more than one angle to confirm.
export default function PhotoUploadTile({ onChange, max = 5 }) {
  const inputRef = useRef(null);
  const [photos, setPhotos] = useState([]);

  function handleFiles(e) {
    const files = Array.from(e.target.files ?? []);
    if (inputRef.current) inputRef.current.value = '';
    if (!files.length) return;
    const next = [...photos, ...files.map((file) => ({ file, url: URL.createObjectURL(file) }))].slice(0, max);
    setPhotos(next);
    onChange?.(next.map((p) => p.file));
  }

  function removePhoto(index) {
    URL.revokeObjectURL(photos[index].url);
    const next = photos.filter((_, i) => i !== index);
    setPhotos(next);
    onChange?.(next.map((p) => p.file));
  }

  const canAddMore = photos.length < max;

  return (
    <div className="photo-upload-tile__grid">
      {photos.map((p, i) => (
        <div className="photo-upload-tile" key={p.url}>
          <div className="photo-upload-tile__preview">
            <img src={p.url} alt="Uploaded evidence" />
            <span className="photo-upload-tile__badge">
              <CheckIcon width="12" height="12" strokeWidth="3" />
            </span>
            <button
              type="button"
              className="photo-upload-tile__remove"
              onClick={() => removePhoto(i)}
              aria-label="Remove photo"
            >
              <CloseIcon width="12" height="12" />
            </button>
          </div>
        </div>
      ))}
      {canAddMore && (
        <div className="photo-upload-tile">
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            multiple
            className="photo-upload-tile__input"
            onChange={handleFiles}
            id="photo-upload-input"
          />
          <label htmlFor="photo-upload-input" className="photo-upload-tile__label">
            <span className="photo-upload-tile__plus">+</span>
            <span>Add Photo</span>
          </label>
        </div>
      )}
    </div>
  );
}
