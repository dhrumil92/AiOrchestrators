import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // Relative asset paths so the built app also works from a sub-folder or file host.
  base: './',
  build: { chunkSizeWarningLimit: 800 },
  server: {
    port: 5173,
    strictPort: true,
    fs: { allow: ['..'] },                        // shared/api.ts lives outside client/
    proxy: { '/api': 'http://localhost:4000' },
  },
  test: { environment: 'node' },
});
