import '@fontsource/zilla-slab/latin-500.css';
import '@fontsource/zilla-slab/latin-700.css';
import '@fontsource/nunito/latin-600.css';
import '@fontsource/nunito/latin-800.css';
import './styles/main.css';

import { h, render } from 'preact';
import { askToKeepStorage, backupBrokenSave, backupNow, AUTOSAVE_MS, listBackups, loadGame, saveGame } from './app/persistence';
import { loadPrefs, savePrefs, type Prefs } from './app/prefs';
import { GAME_TITLE } from './config';
import { BOTS, JOBS, PROBLEMS } from './data/economy';
import { dogNameOf } from './data/goals';
import { applyCssTokens } from './data/palette';
import { Renderer } from './render/Renderer';
import type { Point } from './render/types';
import { jumpToPhase } from './sim/actions';
import { buyAcre, buyBot, buyDecoyBag, levelUpBot } from './sim/economy';
import { moveBots } from './sim/jobs';
import { fixAll, fixBot, fixProblem, setForemanSettings } from './sim/problems';
import type { SimEvent } from './sim/events';
import { canDo, doAction, fieldOpen, type ActionJob } from './sim/hunt';
import { GROUND_JOBS, type GroundId } from './data/economy';
import { buildLodge, buyRung, canBuildLodge, nextLodge } from './sim/progression';
import { buzz, setHaptics } from './app/haptics';
import { installState } from './app/pwa';
import { NAME_MAX } from './data/avatars';
import { BREEDS, DOG_NAME_MAX } from './data/crew';
import { setDogCoat } from './render/assets/painters';
import { clearDogPortraits } from './ui/portraits';
import { buyCarving } from './sim/carvings';
import { busyMarsh, fireVolley } from './sim/volley';
import { CARVINGS } from './data/carvings';
import { plantCrop } from './sim/crops';
import { claimDailyBonus, localDayKey } from './sim/daily';
import type { TapTarget } from './render/MarshScene';
import type { HuntStage } from './data/economy';
import { SimRunner } from './sim/runner';
import { deserialize, exportSave, importSave } from './sim/save';
import { runOffline } from './sim/offline';
import { buyUpgrade } from './sim/upgrades';
import { addNode, connect, cut, removeNode } from './sim/workflow';
import { buyPerk, closeSeason } from './sim/prestige';
import { FLYWAYS } from './data/flyways';
import { PERKS } from './data/legacy';
import { OFFLINE, UPGRADES } from './data/upgrades';
import { SPECIES } from './data/species';
import { WEATHER } from './data/weather';
import { offlineView, pushMoment, seasonView } from './ui/moments';
import { createInitialState, type GameState } from './sim/state';
import { App } from './ui/App';
import type { GameControls } from './ui/controls';
import { feedback } from './ui/feedback';
import { snapshot } from './ui/hudState';
import { Store } from './ui/store';
import { justUpdated, setupPwa } from './app/pwa';
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

/** Paint the retriever in the player's chosen breed. */
function applyBreed(): void {
  setDogCoat(BREEDS[state.profile.breed] ?? BREEDS.yellowLab);
  clearDogPortraits();
}

const loaded = loadGame();
let state: GameState = loaded.kind === 'loaded' ? loaded.state : freshState();
if (loaded.kind === 'error') backupBrokenSave(loaded.raw);
askToKeepStorage();
applyBreed();

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
  for (const id of r.value.newSpecies) if (id !== 'mallard') pushMoment({ kind: 'species', id, coins: 0, feathers: 0 });
  save();
}
setInterval(() => {
  hud.set(snapshot(state));
  // Words next to the hint ring until the player has the hang of it.
  if (renderer?.scene) renderer.scene.hintLabels = true;
  // Leaving the field open after a reset or import is not possible: fall back.
  if (prefs.get().ground === 'field' && !fieldOpen(state) && renderer?.ground === 'field') controls.setGround('marsh');
}, 200);

// --- Autosave ---------------------------------------------------------------
const save = () => saveGame(state);
setInterval(save, AUTOSAVE_MS);
document.addEventListener('visibilitychange', () => {
  if (document.hidden) save();
});
window.addEventListener('pagehide', save);

// --- Feedback for sim events -------------------------------------------------
// Logging happens often (Gus + Ledger Bots), so coin pop-ups are batched.
// Coins and feathers from pickups gather for a moment and pop up together.
let pendingCoins = 0;
let pendingFeathers = 0;
let pendingAt: Point | null = null;
setInterval(() => {
  const n = prefs.get().notation;
  if (pendingAt && (pendingCoins > 0 || pendingFeathers > 0)) {
    feedback.pickup(pendingCoins > 0 ? formatNumber(pendingCoins, n) : null, pendingFeathers > 0 ? formatNumber(pendingFeathers, n) : null, pendingAt.x, pendingAt.y);
  }
  pendingCoins = 0;
  pendingFeathers = 0;
  pendingAt = null;
}, 700);
let seenProblem = false;
let lastEscalationToast = -1e9;
/** Lots going on: a running tally replaces the per-bird popups. */
const busy = () => busyMarsh(state);

// Patches earned together become one card.
let patchQueue: string[] = [];
function queuePatch(id: string): void {
  patchQueue.push(id);
  if (patchQueue.length > 1) return;
  setTimeout(() => {
    const ids = patchQueue;
    patchQueue = [];
    pushMoment(ids.length === 1 ? { kind: 'patch', id: ids[0]! } : { kind: 'patches', ids });
  }, 400);
}

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
  lodgeBuilt: 'season',
  planEarned: 'chime',
  rungBuilt: 'levelUp',
  goldenShot: 'chime',
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
      if (busy()) break;
      pendingFeathers += e.feathers;
      if (at) pendingAt = at;
      break;
    case 'newSpecies':
      if (e.species !== 'mallard') pushMoment({ kind: 'species', id: e.species, coins: e.coins, feathers: e.feathers });
      break;
    case 'achievement':
      queuePatch(e.id);
      break;
    case 'volleyUnlocked':
      buzz('big');
      pushMoment({ kind: 'volley' });
      break;
    case 'volley': {
      buzz('big');
      shake(0.9);
      audio.play('season');
      const p = at ?? lastTapAt;
      if (p) feedback.pickup(formatNumber(e.coins, n), formatNumber(e.feathers, n), p.x, p.y - 40);
      feedback.toast(`Big Volley! ${formatNumber(e.birds, n)} birds in one go.`, 'celebrate', 3200);
      break;
    }
    case 'stageChanged':
      pushMoment({ kind: 'stage', id: e.stage });
      break;
    case 'carvingBought':
      feedback.toast(`${CARVINGS[e.carving].name} is on the shelf. ${CARVINGS[e.carving].effect}.`, 'good', 3600);
      break;
    case 'weatherChanged':
      feedback.toast(`${WEATHER[e.to].name}: ${WEATHER[e.to].blurb}`, e.to === 'clear' ? 'info' : 'good', 4000);
      break;
    case 'featureUnlocked':
      pushMoment({ kind: 'feature', id: e.feature });
      break;
    case 'lodgeBuilt':
      buzz('big');
      pushMoment({ kind: 'lodge', level: e.level });
      shake(0.5);
      break;
    case 'planEarned':
      pushMoment({ kind: 'plan', bot: e.bot });
      break;
    case 'rungBuilt':
      pushMoment({ kind: 'rung', id: e.rung });
      shake(0.35);
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
      if (busy()) break;
      pendingCoins += e.coins;
      if (at) pendingAt = at;
      break;
    case 'problem':
      if (at && !busy()) feedback.float(PROBLEMS[e.kind].title, at.x, at.y, 'alert');
      if (!seenProblem && state.problems.total <= 1) {
        seenProblem = true;
        feedback.toast(`A ${BOTS[e.bot].name} hit a snag: ${PROBLEMS[e.kind].title.toLowerCase()}. Tap the "!" over it to fix it.`, 'info', 6000);
      }
      break;
    case 'problemFixed':
      if (at && (e.by !== 'foreman' || !busy())) feedback.float(e.by === 'foreman' ? 'Foreman fixed it' : 'Fixed!', at.x, at.y, 'info');
      break;
    case 'problemEscalated':
      if (busy() || performance.now() - lastEscalationToast < 180_000) break;
      lastEscalationToast = performance.now();
      feedback.toast(`The foreman couldn't free a ${BOTS[e.bot].name}. It needs you. Tap its "!" or open the Problem Log.`, 'info', 5000);
      break;
    case 'flockLeft':
      if (at && !busy()) feedback.float('Flew on', at.x, at.y, 'info');
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
      if (e.bag > 0) feedback.toast(e.best ? `Day ${e.day} is done: ${e.bag} birds, your best day yet!` : `Day ${e.day} is done: ${e.bag} birds brought in.`, e.best ? 'celebrate' : 'info', 4200);
      break;
    case 'flockFlared':
      if (at && !busy()) feedback.float('Flared off', at.x, at.y, 'info');
      break;
    case 'shot':
      if (e.source === 'manual') buzz('tap');
      break;
    case 'goldenShot':
      buzz('big');
      if (lastTapAt) feedback.float(`+${formatNumber(e.coins, n)} golden bonus!`, lastTapAt.x, lastTapAt.y - 50, 'coins');
      feedback.toast(`Golden flock! +${formatNumber(e.coins, n)} coins and ${e.feathers} feathers.`, 'celebrate', 3500);
      shake(0.4);
      break;
    case 'flockArrived':
      if (e.golden) {
        const away = (e.ground === 'field') !== (prefs.get().ground === 'field' && renderer?.ground === 'field');
        const where = e.ground === 'field' ? 'over the goose field' : 'over the marsh';
        feedback.toast(`A golden flock is circling ${where}! Call it in and shoot it yourself before it leaves.${away ? ' (Switch over to see it.)' : ''}`, 'good', 5000);
      }
      break;
    case 'streak':
      if (lastTapAt) {
        if (e.bonus > 0) feedback.float(`+${formatNumber(e.bonus, n)} rhythm`, lastTapAt.x, lastTapAt.y - 34, 'coins', 0.15);
        else if (e.level === 5 || e.level === 10) feedback.float(`Rhythm ×${e.level}!`, lastTapAt.x, lastTapAt.y - 34, 'info');
      }
      break;
    case 'dailyBonus':
      pushMoment({ kind: 'daily', coins: e.coins, feathers: e.feathers });
      break;
    default:
      break;
  }
}

// --- Controls (the only way the UI changes the sim) --------------------------
function replaceState(next: GameState): void {
  state = next;
  applyBreed();
  runner = new SimRunner(state, () => performance.now());
  runner.timeScale = 1;
  if (renderer) renderer.setRunner(runner);
  hud.set(snapshot(state));
  save();
}

let lastNudge = 0;
let lastTapAt: Point | null = null;
let lastTapNote = 0;

/** A short note at the tap point, at most once every couple of seconds. */
function tapNote(text: string, at: Point): void {
  if (performance.now() - lastTapNote < 1800) return;
  lastTapNote = performance.now();
  feedback.float(text, at.x, at.y - 10, 'info');
}

/** The player tapped the marsh: work out what they meant and do it. */
function onSceneTap(t: TapTarget): void {
  lastTapAt = t.at;
  let step = t.job;
  if (!step) return;
  const g = t.ground ?? 'marsh';
  const jobs = GROUND_JOBS[g];
  const view = renderer?.view;
  const splash = (big: boolean) => {
    if (g === 'marsh') view?.fx.ripple(t.at.x, t.at.y, big ? 0.7 : 0.5, big ? 1.4 : 1.2);
    else view?.fx.featherPuff(t.at.x, t.at.y, (view?.layout.scale ?? 1) * 0.35, 2);
  };
  // A tap on open water (or stubble) fetches a bird if there is one;
  // otherwise it's just a splash. Decoys stay out on their own now.
  if (step === 'decoys') {
    if (canDo(state, jobs.retrieve)) step = 'retrieve';
    else return splash(false);
  }
  if (step === 'call' && !canDo(state, jobs.call, t.flockId)) return tapNote(g === 'field' ? 'Shoot the geese over the spread first' : 'Shoot the low flock first', t.at);
  if (step === 'retrieve' && t.floater) view?.ducks.prefer(t.floater);
  doAction(state, jobs[step] as ActionJob, 'manual', runner.sink, t.flockId);
  hud.set(snapshot(state));
}

/** Keyboard: D decoys, C call, S shoot, R retrieve. */
const KEYS: Record<string, Exclude<HuntStage, 'log'>> = { c: 'call', s: 'shoot', r: 'retrieve' };
window.addEventListener('keydown', (e) => {
  if (e.repeat || e.ctrlKey || e.metaKey || e.altKey) return;
  const el = e.target as HTMLElement | null;
  if (el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable)) return;
  const job = KEYS[e.key.toLowerCase()];
  if (!job) return;
  lastTapAt = null;
  controls.act(job, prefs.get().ground);
});

/** First Light: a small gift on the first visit of each calendar day. */
function checkDailyBonus(): void {
  if (catchingUp) return;
  claimDailyBonus(state, localDayKey(), runner.sink);
}
setInterval(checkDailyBonus, 60_000);

/**
 * Nudges: a toast (and the app-icon badge, where supported) when the next
 * lodge level can be built, and a one-time "add to home screen" tip on iPhone.
 */
let toldLodge = 0;
setHaptics(prefs.get().haptics);
setInterval(() => {
  const next = nextLodge(state);
  const ready = !!next && canBuildLodge(state);
  if (ready && next && toldLodge !== next.level) {
    toldLodge = next.level;
    feedback.toast(`The ${next.name} is ready to build! It's on the Marsh tab.`, 'celebrate', 5000);
  }
  try {
    const nav = navigator as Navigator & { setAppBadge?: (n?: number) => Promise<void>; clearAppBadge?: () => Promise<void> };
    if (ready) void nav.setAppBadge?.(1);
    else void nav.clearAppBadge?.();
  } catch {
    /* badges unsupported */
  }
  const p = prefs.get();
  const ios = installState.get().ios && !installState.get().installed;
  if (ios && !p.installTip && state.lodge >= 2) {
    updatePrefs({ ...p, installTip: true });
    feedback.toast('Tip: in Safari, tap Share, then "Add to Home Screen" to play full-screen, like an app.', 'info', 7000);
  }
}, 2000);
const UPGRADE_NAMES = Object.fromEntries(Object.entries(UPGRADES).map(([k, v]) => [k, v.name])) as Record<keyof typeof UPGRADES, string>;
void SPECIES;
void FLYWAYS;

const controls: GameControls = {
  act(stage, g = 'marsh') {
    const job = stage === 'log' ? 'log' : (GROUND_JOBS[g][stage] as ActionJob);
    const ok = doAction(state, job, 'manual', runner.sink);
    if (!ok && stage === 'retrieve' && g === 'marsh' && performance.now() - lastNudge > 10_000) {
      lastNudge = performance.now();
      feedback.toast(`Nothing on the water for ${dogNameOf(state.profile)} yet.`);
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
  setGround(g: GroundId) {
    const next = g === 'field' && fieldOpen(state) ? 'field' : 'marsh';
    updatePrefs({ ...prefs.get(), ground: next });
    renderer?.setGround(next);
    hud.set(snapshot(state));
  },
  buyDecoys(g) {
    const ok = buyDecoyBag(state, g, runner.sink);
    hud.set(snapshot(state));
    return ok;
  },
  plantCrop(plot, crop) {
    const ok = plantCrop(state, plot, crop, runner.sink);
    hud.set(snapshot(state));
    return ok;
  },
  setProfile(name, avatar) {
    state.profile = { ...state.profile, name: name.trim().slice(0, NAME_MAX), avatar };
    hud.set(snapshot(state));
    save();
  },
  setDog(name, breed) {
    const changed = breed !== state.profile.breed;
    state.profile = { ...state.profile, dogName: name.trim().slice(0, DOG_NAME_MAX), breed };
    if (changed) {
      applyBreed();
      // Repaint the scene so the dog wears its new coat.
      renderer?.setRunner(runner);
    }
    hud.set(snapshot(state));
    save();
  },
  buyCarving(id) {
    const ok = buyCarving(state, id, runner.sink);
    hud.set(snapshot(state));
    return ok;
  },
  fireVolley() {
    const ok = fireVolley(state, runner.sink);
    hud.set(snapshot(state));
    return ok;
  },
  buildLodge() {
    const ok = buildLodge(state, runner.sink);
    hud.set(snapshot(state));
    if (ok) save();
    return ok;
  },
  buyRung(id) {
    const ok = buyRung(state, id, runner.sink);
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
      const next = importSave(code);
      backupNow(state, 'import');
      replaceState(next);
      save();
      return { ok: true };
    } catch (e) {
      return { ok: false, error: (e as Error).message };
    }
  },
  resetSave() {
    backupNow(state, 'reset');
    replaceState(freshState());
    save();
    feedback.toast('A fresh start. The marsh is waiting.');
  },
  listBackups: () => listBackups().map(({ at, why, name, lodge, birds }) => ({ at, why, name, lodge, birds })),
  restoreBackup(at) {
    const b = listBackups().find((x) => x.at === at);
    if (!b) return { ok: false, error: 'That backup is gone.' };
    try {
      const next = deserialize(b.raw);
      backupNow(state, 'restore');
      replaceState(next);
      save();
      return { ok: true };
    } catch (e) {
      return { ok: false, error: (e as Error).message };
    }
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
  setHaptics(p.haptics);
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
  renderer.onTap = onSceneTap;
  await renderer.init();
  if (prefs.get().ground === 'field' && fieldOpen(state)) renderer.setGround('field');
  document.body.classList.add('is-ready');
  if (loaded.kind === 'loaded') {
    const away = (Date.now() - state.meta.lastSaved) / 1000;
    if (state.meta.lastSaved > 0 && away > OFFLINE.minSummarySeconds) void catchUp(away);
    else feedback.toast(`Welcome back to the marsh. Day ${state.clock.day}.`);
  }
  // After any offline catch-up has started, so the gift lands on top.
  setTimeout(checkDailyBonus, 1500);
  if (loaded.kind === 'error') feedback.toast("Your old save couldn't be read, so a fresh marsh was started. A backup was kept.", 'info', 6000);
  else if (justUpdated()) setTimeout(() => feedback.toast('The game updated. Your save came along.', 'good', 3500), 2500);
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
