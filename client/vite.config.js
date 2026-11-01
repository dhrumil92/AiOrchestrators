import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // Relative asset paths so the built app also works from a sub-folder or file host.
  base: './',
  build: { chunkSizeWarningLimit: 800 },
});
