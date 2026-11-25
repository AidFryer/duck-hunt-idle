import '@fontsource/zilla-slab/latin-500.css';
import '@fontsource/zilla-slab/latin-700.css';
import '@fontsource/nunito/latin-600.css';
import '@fontsource/nunito/latin-800.css';
import './styles/main.css';

import { h, render } from 'preact';
import { backupBrokenSave, AUTOSAVE_MS, clearSave, loadGame, saveGame } from './app/persistence';
import { loadPrefs, savePrefs, type Prefs } from './app/prefs';
import { GAME_TITLE } from './config';
import { BOTS } from './data/economy';
import { LAB_NAME } from './data/goals';
import { applyCssTokens } from './data/palette';
import { Renderer } from './render/Renderer';
import type { Point } from './render/types';
import { jumpToPhase } from './sim/actions';
import { buyAcre, buyBot, levelUpBot } from './sim/economy';
import type { SimEvent } from './sim/events';
import { doAction } from './sim/hunt';
import { SimRunner } from './sim/runner';
import { exportSave, importSave } from './sim/save';
import { createInitialState, type GameState } from './sim/state';
import { App } from './ui/App';
import type { GameControls } from './ui/controls';
import { feedback } from './ui/feedback';
import { snapshot } from './ui/hudState';
import { Store } from './ui/store';
import { formatNumber } from './util/format';

document.title = GAME_TITLE;
applyCssTokens();

// --- Preferences & save -----------------------------------------------------
const prefs = new Store<Prefs>(loadPrefs());
feedback.reducedMotion = prefs.get().reducedMotion;

function freshState(): GameState {
  return createInitialState(Math.floor(Math.random() * 1e9), Date.now());
}

const loaded = loadGame();
let state: GameState = loaded.kind === 'loaded' ? loaded.state : freshState();
if (loaded.kind === 'error') backupBrokenSave(loaded.raw);

// --- Simulation (pure TS, fixed 10 Hz) --------------------------------------
let runner = new SimRunner(state, () => performance.now());
const hud = new Store(snapshot(state));
let renderer: Renderer | null = null;

// The sim also ticks from a timer so it keeps running while rendering is
// paused (hidden tab). When nothing is drawing, events go straight to the HUD.
setInterval(() => {
  runner.update();
  if (!renderer?.active) for (const e of runner.drain()) onEvent(e, null);
}, 100);
setInterval(() => hud.set(snapshot(state)), 200);

// --- Autosave ---------------------------------------------------------------
const save = () => saveGame(state);
setInterval(save, AUTOSAVE_MS);
document.addEventListener('visibilitychange', () => {
  if (document.hidden) save();
});
window.addEventListener('pagehide', save);

// --- Feedback for sim events -------------------------------------------------
function onEvent(e: SimEvent, at: Point | null): void {
  const n = prefs.get().notation;
  switch (e.type) {
    case 'retrieved':
      if (at) {
        feedback.float(`+${formatNumber(e.coins, n)}`, at.x, at.y, 'coins');
        feedback.float(`+${formatNumber(e.feathers, n)} feather${e.feathers === 1 ? '' : 's'}`, at.x + 18, at.y + 12, 'feathers', 0.15);
      }
      break;
    case 'botBought':
      if (at) feedback.float(e.count > 1 ? `+${e.count} ${BOTS[e.bot].name}s` : `New ${BOTS[e.bot].name}!`, at.x, at.y - 20, 'info');
      break;
    case 'botLevel':
      feedback.toast(`${BOTS[e.bot].name}s tuned up to level ${e.level}. They work faster now.`, 'good');
      break;
    case 'botMilestone':
      feedback.toast(`${e.owned} ${BOTS[e.bot].name}s! They work together now: output ×${e.multiplier}.`, 'celebrate', 4200);
      break;
    case 'acreRestored':
      feedback.toast(`Acre ${e.acres} restored. More ducks will find the marsh.`, 'good');
      break;
    case 'dayEnded':
      if (e.bag > 0) feedback.toast(e.best ? `Day ${e.day} is done: ${e.bag} birds, your best day yet!` : `Day ${e.day} is done: ${e.bag} birds in the bag.`, e.best ? 'celebrate' : 'info', 4200);
      break;
    case 'flockFlared':
      if (at) feedback.float('Flared off', at.x, at.y, 'info');
      break;
    default:
      break;
  }
}

// --- Controls (the only way the UI changes the sim) --------------------------
function replaceState(next: GameState): void {
  state = next;
  runner = new SimRunner(state, () => performance.now());
  runner.timeScale = 1;
  if (renderer) renderer.setRunner(runner);
  hud.set(snapshot(state));
  save();
}

let lastNudge = 0;
const controls: GameControls = {
  act(stage) {
    const ok = doAction(state, stage, 'manual', runner.sink);
    if (!ok && stage === 'retrieve' && performance.now() - lastNudge > 10_000) {
      lastNudge = performance.now();
      feedback.toast(`Nothing on the water for ${LAB_NAME} yet.`);
    }
    hud.set(snapshot(state));
    return ok;
  },
  buyBot(id, count) {
    const n = buyBot(state, id, count, runner.sink);
    hud.set(snapshot(state));
    return n;
  },
  levelUp(id) {
    const ok = levelUpBot(state, id, runner.sink);
    hud.set(snapshot(state));
    return ok;
  },
  buyAcre() {
    const ok = buyAcre(state, runner.sink);
    hud.set(snapshot(state));
    return ok;
  },
  exportSave: () => exportSave(state),
  importSave(code) {
    try {
      replaceState(importSave(code));
      return { ok: true };
    } catch (e) {
      return { ok: false, error: (e as Error).message };
    }
  },
  resetSave() {
    clearSave();
    replaceState(freshState());
    feedback.toast('A fresh start. The marsh is waiting.');
  },
  setNotation: () => hud.set(snapshot(state)),
  setReducedMotion(on) {
    feedback.reducedMotion = on;
    if (renderer) renderer.options.motion = on ? 0.35 : 1;
  },
  setTimeScale: (s) => (runner.timeScale = s),
  getTimeScale: () => runner.timeScale,
  jumpToPhase: (id) => {
    jumpToPhase(state, id);
    hud.set(snapshot(state));
  },
};

function updatePrefs(p: Prefs): void {
  prefs.set(p);
  savePrefs(p);
}

async function startScene(host: HTMLElement): Promise<void> {
  renderer = new Renderer(host, runner);
  renderer.options.motion = prefs.get().reducedMotion ? 0.35 : 1;
  renderer.onEvent = onEvent;
  await renderer.init();
  document.body.classList.add('is-ready');
  if (loaded.kind === 'loaded') feedback.toast(`Welcome back to the marsh. Day ${state.clock.day}.`);
  if (loaded.kind === 'error') feedback.toast("Your old save couldn't be read, so a fresh marsh was started. A backup was kept.", 'info', 6000);
}

const root = document.getElementById('app')!;
root.innerHTML = '';
render(
  h(App, {
    hud,
    prefs,
    controls,
    onPrefs: updatePrefs,
    onSceneHost: (el: HTMLElement) => {
      startScene(el).catch((err: unknown) => {
        console.error('Failed to start the marsh scene', err);
        el.classList.add('scene-host--failed');
      });
    },
  }),
  root,
);

if (import.meta.env.DEV) {
  (window as unknown as Record<string, unknown>).__marsh = {
    get state() { return state; },
    get runner() { return runner; },
    controls,
    get renderer() { return renderer; },
  };
}
