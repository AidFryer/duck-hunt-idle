import '@fontsource/zilla-slab/500.css';
import '@fontsource/zilla-slab/700.css';
import '@fontsource/nunito/600.css';
import '@fontsource/nunito/800.css';
import './styles/main.css';

import { h, render } from 'preact';
import { GAME_TITLE } from './config';
import { applyCssTokens } from './data/palette';
import { Renderer } from './render/Renderer';
import { jumpToPhase } from './sim/actions';
import { SimRunner } from './sim/runner';
import { createInitialState } from './sim/state';
import { App } from './ui/App';
import type { GameControls } from './ui/controls';
import { snapshot } from './ui/hudState';
import { Store } from './ui/store';

document.title = GAME_TITLE;
applyCssTokens();

// --- Simulation (pure TS, fixed 10 Hz) --------------------------------------
const state = createInitialState(Math.floor(Math.random() * 1e9));
const runner = new SimRunner(state, () => performance.now());
// The sim also ticks from a timer so it keeps running while rendering is
// paused (hidden tab). Browsers throttle this to ~1 Hz in the background;
// the runner's accumulator catches up on whatever time actually passed.
setInterval(() => runner.update(), 100);

// --- HUD ---------------------------------------------------------------------
const hud = new Store(snapshot(state));
setInterval(() => hud.set(snapshot(state)), 250);

let renderer: Renderer | null = null;
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const controls: GameControls = {
  setTimeScale: (s) => (runner.timeScale = s),
  getTimeScale: () => runner.timeScale,
  jumpToPhase: (id) => {
    jumpToPhase(state, id);
    hud.set(snapshot(state));
  },
  sendLandingFlock: () => renderer?.scene.ducks.spawnLander(),
  sendFlyover: () => renderer?.scene.ducks.spawnFlyover(),
};

async function startScene(host: HTMLElement): Promise<void> {
  renderer = new Renderer(host, runner);
  renderer.options.motion = prefersReducedMotion ? 0.35 : 1;
  await renderer.init();
  document.body.classList.add('is-ready');
}

const root = document.getElementById('app')!;
root.innerHTML = '';
render(
  h(App, {
    hud,
    controls,
    onSceneHost: (el: HTMLElement) => {
      startScene(el).catch((err: unknown) => {
        console.error('Failed to start the marsh scene', err);
        el.classList.add('scene-host--failed');
      });
    },
  }),
  root,
);

// Handy for poking at the sim from the browser console during development.
if (import.meta.env.DEV) {
  (window as unknown as Record<string, unknown>).__marsh = { state, runner, controls, get renderer() { return renderer; } };
}
