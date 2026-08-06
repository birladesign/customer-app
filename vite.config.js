import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    // Inline every product image as base64 into the JS bundle so a production
    // build has zero separate asset files — needed to ship this app as a
    // single self-contained HTML artifact. Largest source image is ~100KB.
    assetsInlineLimit: 300000,
  },
});
