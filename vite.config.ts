import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  // Relative assets keep one build compatible with GitHub Pages subpaths,
  // Cloudflare Pages root/preview URLs, and local static previews.
  base: './',
  plugins: [react()],
  build: {
    // Three.js is intentionally isolated for browser caching; warn if that known
    // vendor chunk grows beyond its current ~734 kB minified size.
    chunkSizeWarningLimit: 750,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return;
          if (id.includes('/@react-three/')) return 'react-three';
          if (id.includes('/three/')) return 'three';
          if (id.includes('/react/') || id.includes('/react-dom/') || id.includes('/scheduler/')) return 'react';
          return 'vendor';
        },
      },
    },
  },
});
