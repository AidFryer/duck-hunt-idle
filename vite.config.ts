import { defineConfig } from 'vitest/config';
import preact from '@preact/preset-vite';
import type { Plugin } from 'vite';
import { GAME_TITLE } from './src/config.ts';

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
  plugins: [preact(), gameTitle()],
  build: {
    target: 'es2022',
    chunkSizeWarningLimit: 1200,
  },
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node',
  },
});
