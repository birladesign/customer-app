import { useEffect, useState } from 'react';

// Real file input + object-URL preview — no mocked/fake upload UI. Revokes
// the previous URL whenever it's replaced or the component unmounts. Shared
// by every real photo-upload surface (Avatar, PhotoUploadTile) so the
// create/cleanup lifecycle only has to be gotten right once.
export function useObjectUrlPreview(onChange) {
  const [previewUrl, setPreviewUrl] = useState(null);

  useEffect(() => () => { if (previewUrl) URL.revokeObjectURL(previewUrl); }, [previewUrl]);

  function handleFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    onChange?.(file);
  }

  function clear() {
    setPreviewUrl(null);
    onChange?.(null);
  }

  return { previewUrl, handleFile, clear };
}
