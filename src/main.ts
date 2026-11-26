import '@fontsource/zilla-slab/latin-500.css';
import '@fontsource/zilla-slab/latin-700.css';
import '@fontsource/nunito/latin-600.css';
import '@fontsource/nunito/latin-800.css';
import './styles/main.css';

import { h, render } from 'preact';
import { backupBrokenSave, AUTOSAVE_MS, clearSave, loadGame, saveGame } from './app/persistence';
import { loadPrefs, savePrefs, type Prefs } from './app/prefs';
import { GAME_TITLE } from './config';
import { BOTS, JOBS, PROBLEMS } from './data/economy';
import { LAB_NAME } from './data/goals';
import { applyCssTokens } from './data/palette';
import { Renderer } from './render/Renderer';
import type { Point } from './render/types';
import { jumpToPhase } from './sim/actions';
import { buyAcre, buyBot, levelUpBot } from './sim/economy';
import { moveBots } from './sim/jobs';
import { fixAll, fixBot, fixProblem, setForemanSettings } from './sim/problems';
import type { SimEvent } from './sim/events';
import { doAction } from './sim/hunt';
import { SimRunner } from './sim/runner';
import { exportSave, importSave } from './sim/save';
import { runOffline } from './sim/offline';
import { buyUpgrade } from './sim/upgrades';
import { addNode, connect, cut, removeNode } from './sim/workflow';
import { buyPerk, closeSeason } from './sim/prestige';
import { FLYWAYS } from './data/flyways';
import { PERKS } from './data/legacy';
import { OFFLINE, UPGRADES } from './data/upgrades';
import { SPECIES } from './data/species';
import { WEATHER } from './data/weather';
import { ACHIEVEMENTS } from './data/achievements';
import { offlineView, pushMoment, seasonView } from './ui/moments';
import { createInitialState, type GameState } from './sim/state';
import { App } from './ui/App';
import type { GameControls } from './ui/controls';
import { feedback } from './ui/feedback';
import { snapshot } from './ui/hudState';
import { Store } from './ui/store';
import { setupPwa } from './app/pwa';
import { setupViewport } from './app/viewport';
import { audio, type Sfx } from './audio/AudioEngine';
import { clockAt, duckActivityAt } from './sim/clock';
import { computeSkyState } from './render/skyState';
import { formatNumber } from './util/format';

document.title = GAME_TITLE;
applyCssTokens();
setupViewport();
setupPwa();
// iOS ignores user-scalable=no; block pinch and double-tap zoom directly.
for (const ev of ['gesturestart', 'gesturechange', 'dblclick']) {
  document.addEventListener(ev, (e) => e.preventDefault(), { passive: false });
}

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
  // A long gap (tab hidden for a while, laptop asleep) becomes offline progress.
  if (!catchingUp && runner.pendingMs() > OFFLINE.minSummarySeconds * 1000) {
    const away = runner.pendingMs() / 1000;
    runner.resync();
    void catchUp(away);
    return;
  }
  runner.update();
  if (!renderer?.active) for (const e of runner.drain()) onEvent(e, null);
}, 100);

// --- Offline progress -----------------------------------------------------------
let catchingUp = false;

/** Fast-forward `away` seconds in chunks, then show the summary card. */
async function catchUp(away: number): Promise<void> {
  catchingUp = true;
  runner.paused = true;
  offlineView.set({ phase: 'catching', progress: 0, away });
  const it = runOffline(state, away, 2500);
  let r = it.next();
  while (!r.done) {
    offlineView.set({ phase: 'catching', progress: r.value, away });
    await new Promise((res) => setTimeout(res, 0));
    r = it.next();
  }
  runner.drain(); // visuals resync from state; per-event feedback isn't needed for time away
  runner.paused = false;
  runner.resync();
  catchingUp = false;
  hud.set(snapshot(state));
  offlineView.set({ phase: 'summary', summary: r.value });
  for (const id of r.value.newSpecies) pushMoment({ kind: 'species', id });
  save();
}
setInterval(() => hud.set(snapshot(state)), 200);

// --- Autosave ---------------------------------------------------------------
const save = () => saveGame(state);
setInterval(save, AUTOSAVE_MS);
document.addEventListener('visibilitychange', () => {
  if (document.hidden) save();
});
window.addEventListener('pagehide', save);

// --- Feedback for sim events -------------------------------------------------
// Logging happens often (Gus + Ledger Bots), so coin pop-ups are batched.
let pendingCoins = 0;
let pendingAt: Point | null = null;
setInterval(() => {
  if (pendingCoins > 0 && pendingAt) feedback.float(`+${formatNumber(pendingCoins, prefs.get().notation)}`, pendingAt.x, pendingAt.y, 'coins');
  pendingCoins = 0;
}, 700);
let seenProblem = false;

const EVENT_SOUND: Partial<Record<SimEvent['type'], Sfx>> = {
  decoySet: 'decoy',
  flockCalled: 'call',
  shot: 'pop',
  retrieved: 'splash',
  logged: 'coin',
  problem: 'problem',
  problemFixed: 'fix',
  botBought: 'buy',
  botLevel: 'levelUp',
  botMilestone: 'levelUp',
  upgradeBought: 'levelUp',
  acreRestored: 'levelUp',
  newSpecies: 'chime',
  achievement: 'chime',
  perkBought: 'levelUp',
  seasonClosed: 'season',
};

function shake(strength: number): void {
  const p = prefs.get();
  if (p.screenShake && !p.reducedMotion) renderer?.shake(strength);
}

function onEvent(e: SimEvent, at: Point | null): void {
  const n = prefs.get().notation;
  const sfx = EVENT_SOUND[e.type];
  // Bots doing routine work are quieter: only manual actions and big moments always sound.
  const routine = 'source' in e && e.source !== 'manual' && (e.type === 'decoySet' || e.type === 'retrieved' || e.type === 'flockCalled');
  if (sfx && (!routine || Math.random() < 0.35)) audio.play(sfx);
  if (e.type === 'seasonClosed') shake(1);
  if (e.type === 'botMilestone') shake(0.4);
  if (e.type === 'newSpecies' && (SPECIES[e.species].rarity === 'legendary' || SPECIES[e.species].rarity === 'rare')) shake(0.6);
  switch (e.type) {
    case 'retrieved':
      if (at && e.count === 1) feedback.float(`+${formatNumber(e.feathers, n)} feather${e.feathers === 1 ? '' : 's'}`, at.x, at.y, 'feathers');
      break;
    case 'newSpecies':
      pushMoment({ kind: 'species', id: e.species });
      break;
    case 'achievement': {
      const a = ACHIEVEMENTS.find((x) => x.id === e.id);
      if (a) pushMoment({ kind: 'patch', id: e.id });
      break;
    }
    case 'weatherChanged':
      feedback.toast(`${WEATHER[e.to].name}: ${WEATHER[e.to].blurb}`, e.to === 'clear' ? 'info' : 'good', 4000);
      break;
    case 'featureUnlocked':
      pushMoment({ kind: 'feature', id: e.feature });
      break;
    case 'seasonClosed':
      seasonView.set({ season: e.season, stars: e.stars, flyway: e.flyway });
      break;
    case 'perkBought':
      feedback.toast(`Legacy perk: ${PERKS[e.perk].name}.`, 'celebrate');
      break;
    case 'flockReturned':
      feedback.toast('A flock circled back for another look.', 'info', 2500);
      break;
    case 'upgradeBought':
      feedback.toast(`${UPGRADE_NAMES[e.upgrade]} upgraded to level ${e.level}.`, 'good');
      break;
    case 'logged':
      pendingCoins += e.coins;
      if (at) pendingAt = at;
      break;
    case 'problem':
      if (at) feedback.float(PROBLEMS[e.kind].title, at.x, at.y, 'alert');
      if (!seenProblem && state.problems.total <= 1) {
        seenProblem = true;
        feedback.toast(`A ${BOTS[e.bot].name} hit a snag: ${PROBLEMS[e.kind].title.toLowerCase()}. Tap the "!" over it to fix it.`, 'info', 6000);
      }
      break;
    case 'problemFixed':
      if (at) feedback.float(e.by === 'foreman' ? 'Foreman fixed it' : 'Fixed!', at.x, at.y, 'info');
      break;
    case 'problemEscalated':
      feedback.toast(`The foreman couldn't free a ${BOTS[e.bot].name}. It needs you. Tap its "!" or open the Problem Log.`, 'info', 5000);
      break;
    case 'flockLeft':
      if (at) feedback.float('Flew on', at.x, at.y, 'info');
      break;
    case 'botBought':
      if (at) feedback.float(e.count > 1 ? `+${e.count} ${BOTS[e.bot].name}s` : `New ${BOTS[e.bot].name}!`, at.x, at.y - 20, 'info');
      break;
    case 'botLevel':
      feedback.toast(
        e.by === 'tinker'
          ? `The Tinker tuned your ${BOTS[e.bot].name}s up to level ${e.level}.`
          : `${BOTS[e.bot].name}s tuned up to level ${e.level}. They work faster now.`,
        'good',
      );
      break;
    case 'botMoved':
      feedback.toast(`A ${BOTS[e.bot].name} moved to ${e.to === 'bench' ? 'the bench' : JOBS[e.to].name}.`);
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
const UPGRADE_NAMES = Object.fromEntries(Object.entries(UPGRADES).map(([k, v]) => [k, v.name])) as Record<keyof typeof UPGRADES, string>;
void SPECIES;
void FLYWAYS;

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
  buyUpgrade(id) {
    const ok = buyUpgrade(state, id, runner.sink);
    hud.set(snapshot(state));
    return ok;
  },
  addCard(kind) {
    const ok = addNode(state, kind, runner.sink) !== null;
    hud.set(snapshot(state));
    return ok;
  },
  removeCard(id) {
    const ok = removeNode(state, id, runner.sink);
    hud.set(snapshot(state));
    return ok;
  },
  connectCards(from, to) {
    const ok = connect(state, from, to, runner.sink);
    hud.set(snapshot(state));
    return ok;
  },
  cutRope(from) {
    const ok = cut(state, from, runner.sink);
    hud.set(snapshot(state));
    return ok;
  },
  buyPerk(id) {
    const ok = buyPerk(state, id, runner.sink);
    hud.set(snapshot(state));
    return ok;
  },
  closeSeason(flyway) {
    const stars = closeSeason(state, flyway, runner.sink);
    hud.set(snapshot(state));
    save();
    return stars;
  },
  moveBot(bot, from, to) {
    const ok = moveBots(state, bot, from, to, 1, runner.sink) > 0;
    hud.set(snapshot(state));
    return ok;
  },
  fixProblem(id) {
    const ok = fixProblem(state, id, runner.sink);
    hud.set(snapshot(state));
    return ok;
  },
  fixBot(bot) {
    const ok = fixBot(state, bot, runner.sink);
    hud.set(snapshot(state));
    return ok;
  },
  fixAll() {
    const n = fixAll(state, runner.sink);
    hud.set(snapshot(state));
    return n;
  },
  setForeman(retries, backoff) {
    setForemanSettings(state, retries, backoff);
    hud.set(snapshot(state));
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
  audio.setLevels({ music: p.music, ambience: p.ambience, effects: p.effects, muted: p.muted });
  feedback.reducedMotion = p.reducedMotion;
}

// --- Audio: starts on the first tap (browser rule), follows the marsh ---------
{
  const p = prefs.get();
  audio.setLevels({ music: p.music, ambience: p.ambience, effects: p.effects, muted: p.muted });
  const unlock = () => {
    audio.start();
    window.removeEventListener('pointerdown', unlock);
    window.removeEventListener('keydown', unlock);
  };
  window.addEventListener('pointerdown', unlock);
  window.addEventListener('keydown', unlock);
  document.addEventListener('visibilitychange', () => (document.hidden ? audio.suspend() : audio.resume()));
  // Wooden click for every button press.
  document.addEventListener('click', (e) => {
    const b = (e.target as HTMLElement).closest('button');
    if (b && !b.classList.contains('hunt-btn')) audio.play('click');
  }, true);
  setInterval(() => {
    const hour = clockAt(state.clock.dayTime).hour;
    audio.setEnvironment({
      wind: state.environment.wind,
      darkness: computeSkyState(hour).darkness,
      activity: duckActivityAt(hour),
      rain: state.environment.weather === 'drizzle',
      hour,
    });
  }, 500);
}

async function startScene(host: HTMLElement): Promise<void> {
  renderer = new Renderer(host, runner);
  renderer.options.motion = prefs.get().reducedMotion ? 0.35 : 1;
  renderer.onEvent = onEvent;
  renderer.onFix = (bot) => controls.fixBot(bot);
  await renderer.init();
  document.body.classList.add('is-ready');
  if (loaded.kind === 'loaded') {
    const away = (Date.now() - state.meta.lastSaved) / 1000;
    if (state.meta.lastSaved > 0 && away > OFFLINE.minSummarySeconds) void catchUp(away);
    else feedback.toast(`Welcome back to the marsh. Day ${state.clock.day}.`);
  }
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
