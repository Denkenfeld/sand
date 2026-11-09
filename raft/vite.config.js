import { defineConfig } from 'vite';

// Relative base so the build also works from file:// and sub-folders.
export default defineConfig({
  base: './',
  server: { host: '0.0.0.0', port: 5173 },
  build: { target: 'es2022', chunkSizeWarningLimit: 1500 },
});
