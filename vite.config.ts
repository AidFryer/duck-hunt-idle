import { defineConfig } from 'vitest/config';
import preact from '@preact/preset-vite';
import type { Plugin } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';
import { GAME_TAGLINE, GAME_TITLE } from './src/config.ts';

/** Inject GAME_TITLE into index.html so the name lives in one place. */
function gameTitle(): Plugin {
  return {
    name: 'game-title',
    transformIndexHtml: (html) => html.replaceAll('%GAME_TITLE%', GAME_TITLE),
  };
}

// `base: './'` makes every asset path relative, so the same build works on
// GitHub Pages (served from /duck-hunt-idle/), locally, and inside Capacitor.
export default defineConfig({
  base: './',
  plugins: [
    preact(),
    gameTitle(),
    // Installable, offline-capable app. The service worker precaches the
    // whole game (it's small and has no external assets).
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: false, // registered from main.ts so failures are handled quietly
      includeAssets: ['favicon.svg', 'icons/apple-touch-icon.png'],
      manifest: {
        name: GAME_TITLE,
        short_name: GAME_TITLE,
        description: GAME_TAGLINE,
        theme_color: '#2d2520',
        background_color: '#1f1a17',
        display: 'standalone',
        orientation: 'any',
        start_url: './',
        scope: './',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2,webmanifest}'],
        cleanupOutdatedCaches: true,
        navigateFallback: 'index.html',
      },
    }),
  ],
  build: {
    target: 'es2022',
    chunkSizeWarningLimit: 1200,
  },
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node',
  },
});
