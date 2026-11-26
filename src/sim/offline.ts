import type Decimal from 'break_infinity.js';
import type { SpeciesId } from '../data/species';
import { OFFLINE } from '../data/upgrades';
import type { SimEvent } from './events';
import type { GameState } from './state';
import { step } from './tick';
import { offlineCapSeconds } from './upgrades';

export interface OfflineSummary {
  /** Real seconds the player was away. */
  away: number;
  /** Seconds actually simulated (after the cap). */
  simulated: number;
  capped: boolean;
  capHours: number;
  birds: number;
  coins: Decimal;
  feathers: Decimal;
  flocksLost: number;
  problems: number;
  autoFixed: number;
  /** Problems still waiting for the player at the end. */
  needYou: number;
  newSpecies: SpeciesId[];
  achievements: string[];
  days: number;
}

/**
 * Fast-forward the sim for time spent away, in chunks so the UI can stay
 * responsive (`yield` after each chunk with progress 0–1). Pure: only touches
 * the state passed in.
 */
export function* runOffline(state: GameState, awaySeconds: number, chunkSteps = 3000): Generator<number, OfflineSummary> {
  const cap = offlineCapSeconds(state);
  const simulated = Math.max(0, Math.min(awaySeconds, cap));
  const dt = OFFLINE.stepSeconds;
  const total = Math.floor(simulated / dt);
  const coins0 = state.currencies.coins;
  const feathers0 = state.currencies.feathers;
  const birds0 = state.stats.lifetimeBirds;
  const day0 = state.clock.day;
  const sum = {
    flocksLost: 0, problems: 0, autoFixed: 0,
    newSpecies: [] as SpeciesId[], achievements: [] as string[],
  };
  const events: SimEvent[] = [];
  for (let i = 0; i < total; i++) {
    step(state, dt, events);
    if (events.length > 0) {
      for (const e of events) {
        if (e.type === 'flockLeft' || e.type === 'flockFlared' || e.type === 'flockPassed') sum.flocksLost++;
        else if (e.type === 'problem') sum.problems++;
        else if (e.type === 'problemFixed' && e.by === 'foreman') sum.autoFixed++;
        else if (e.type === 'newSpecies') sum.newSpecies.push(e.species);
        else if (e.type === 'achievement') sum.achievements.push(e.id);
      }
      events.length = 0;
    }
    if ((i + 1) % chunkSteps === 0) yield (i + 1) / total;
  }
  state.stats.longestAway = Math.max(state.stats.longestAway, awaySeconds);
  return {
    away: awaySeconds,
    simulated,
    capped: awaySeconds > cap,
    capHours: cap / 3600,
    birds: state.stats.lifetimeBirds - birds0,
    coins: state.currencies.coins.sub(coins0),
    feathers: state.currencies.feathers.sub(feathers0),
    flocksLost: sum.flocksLost,
    problems: sum.problems,
    autoFixed: sum.autoFixed,
    needYou: state.problems.open.length,
    newSpecies: sum.newSpecies,
    achievements: sum.achievements,
    days: state.clock.day - day0,
  };
}

/** Run the whole thing at once (tests, small gaps). */
export function runOfflineSync(state: GameState, awaySeconds: number): OfflineSummary {
  const it = runOffline(state, awaySeconds, Number.MAX_SAFE_INTEGER);
  let r = it.next();
  while (!r.done) r = it.next();
  return r.value;
}
