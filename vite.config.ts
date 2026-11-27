import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// In the desktop browser (npm run dev) the app talks to Discogs through these
// dev-server proxies. That avoids browser CORS limits and lets us send the
// User-Agent header Discogs requires (browsers refuse to set it themselves).
// On the phone, requests go through CapacitorHttp instead and these are unused.
const UA = 'Crate/1.0 (personal vinyl collection viewer; dev server)';

export default defineConfig({
  plugins: [react()],
  base: './',
  server: {
    proxy: {
      '/discogs-api': {
        target: 'https://api.discogs.com',
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/discogs-api/, ''),
        headers: { 'User-Agent': UA },
      },
      '/discogs-img': {
        target: 'https://i.discogs.com',
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/discogs-img/, ''),
        headers: { 'User-Agent': UA },
      },
    },
  },
  build: {
    target: 'es2022',
    chunkSizeWarningLimit: 1500,
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
} as import('vite').UserConfig);
