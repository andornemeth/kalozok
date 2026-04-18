import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'node:path';

export default defineConfig({
  base: '/kalozok/',
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  plugins: [
    react(),
    VitePWA({
      // Önfelszámoló service worker: a korábban installált PWA-k is
      // törlik a cache-üket és deregisztrálják az SW-t. Ezzel minden
      // felhasználó mindig a friss buildet kapja.
      selfDestroying: true,
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg'],
      manifest: {
        name: 'Kalózok – Pegya, a Karib-tenger ura!',
        short_name: 'Pegya',
        description: 'Pegya, a zentai kalóz kalandjai a Karib-tengeren – vajdasági ízekkel, magyar szívvel.',
        theme_color: '#0f172a',
        background_color: '#0f172a',
        display: 'standalone',
        orientation: 'any',
        start_url: '/kalozok/',
        scope: '/kalozok/',
        icons: [
          {
            src: 'icons/icon-192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: 'icons/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
          },
          {
            src: 'icons/icon-512-maskable.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
    }),
  ],
  server: {
    port: 5173,
  },
  build: {
    target: 'es2020',
    sourcemap: true,
  },
});
