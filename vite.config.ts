import { defineConfig } from 'vite';

// base './' so the production build works when served from a sub-path
// (GitHub Pages serves the game at /2DrdrGame/).
export default defineConfig({
  base: './',
  build: {
    outDir: 'dist',
    target: 'es2020',
    chunkSizeWarningLimit: 1500
  },
  server: {
    port: 5173,
    strictPort: true
  },
  preview: {
    port: 4173,
    strictPort: true
  }
});
