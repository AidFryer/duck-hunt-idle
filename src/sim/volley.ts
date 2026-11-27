import { VOLLEY } from '../data/economy';
import { stageFor } from '../data/calendar';
import type { EventSink } from './events';
import type { GameState } from './state';

/** Lifetime totals at the start of the current step (for the pace). */
let before = { birds: 0, coins: 0, feathers: 0, valid: false };

/** Call at the start of a hunt step. */
export function markPace(state: GameState): void {
  before = { birds: state.stats.lifetimeBirds, coins: state.stats.lifetimeCoins.toNumber(), feathers: state.stats.lifetimeFeathers.toNumber(), valid: true };
}

/** Call at the end of a hunt step: smooth the pace, unlock and charge the volley. */
export function stepVolley(state: GameState, dt: number, events: EventSink): void {
  const v = state.volley;
  if (before.valid && dt > 0) {
    const k = Math.min(1, dt / VOLLEY.paceSeconds);
    const birds = Math.max(0, state.stats.lifetimeBirds - before.birds) / dt;
    const coins = Math.max(0, state.stats.lifetimeCoins.toNumber() - before.coins) / dt;
    const feathers = Math.max(0, state.stats.lifetimeFeathers.toNumber() - before.feathers) / dt;
    v.birdsRate += (birds - v.birdsRate) * k;
    v.coinsRate += (coins - v.coinsRate) * k;
    v.feathersRate += (feathers - v.feathersRate) * k;
    const stage = stageFor(state.clock.day).id;
    const got = state.stats.lifetimeBirds - before.birds;
    if (got > 0) state.stats.birdsByStage[stage] = (state.stats.birdsByStage[stage] ?? 0) + got;
  }
  before.valid = false;
  if (!v.unlocked && v.birdsRate >= VOLLEY.unlockRate) {
    v.unlocked = true;
    v.charge = 1;
    events.push({ type: 'volleyUnlocked' });
  }
  if (v.unlocked && v.charge < 1) v.charge = Math.min(1, v.charge + dt / VOLLEY.chargeSeconds);
}

/** Is the marsh busy enough that single-bird popups get in the way? */
export function busyMarsh(state: GameState): boolean {
  return state.volley.unlocked && state.volley.birdsRate >= VOLLEY.unlockRate * 0.75;
}

/** What a volley would pay right now. */
export function volleyPayout(state: GameState): { birds: number; coins: number; feathers: number } {
  const v = state.volley;
  const s = VOLLEY.payoutSeconds;
  return { birds: Math.round(v.birdsRate * s), coins: Math.round(v.coinsRate * s), feathers: Math.round(v.feathersRate * s) };
}

/** Fire the whole crew at once: a minute of birds in one go. */
export function fireVolley(state: GameState, events: EventSink): boolean {
  const v = state.volley;
  if (!v.unlocked || v.charge < 1) return false;
  const p = volleyPayout(state);
  v.charge = 0;
  v.fired += 1;
  state.currencies.coins = state.currencies.coins.add(p.coins);
  state.currencies.feathers = state.currencies.feathers.add(p.feathers);
  state.stats.lifetimeCoins = state.stats.lifetimeCoins.add(p.coins);
  state.stats.lifetimeFeathers = state.stats.lifetimeFeathers.add(p.feathers);
  state.season.coins = state.season.coins.add(p.coins);
  state.stats.lifetimeBirds += p.birds;
  state.hunt.bag += p.birds;
  events.push({ type: 'volley', ...p });
  return true;
}
