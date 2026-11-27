import { DOG_FX, DOG_LEVELS, DOG_MAX, TRAINING, TRAINING_ORDER, type TrainingFx, type TrainingId } from '../data/training';
import type { JobId } from '../data/economy';
import type { EventSink } from './events';
import type { GameState } from './state';
import { counter } from './progression';

export interface TrainingTotals {
  speed: number;
  job: Partial<Record<JobId, number>>;
  fog: number;
  rare: number;
  dawn: number;
  cold: number;
  noIce: boolean;
  problems: Partial<Record<JobId, number>>;
}

let key = '';
let cache: TrainingTotals | null = null;

/** Everything the crew has learned, combined. Workflow Mastery makes speed skills count 50% more. */
export function trainingFx(state: GameState): TrainingTotals {
  const mastery = !!state.legacy.perks.workflowMastery;
  const k = `${mastery ? 'm' : ''}${TRAINING_ORDER.filter((id) => state.training[id]).join(',')}`;
  if (cache && k === key) return cache;
  const t: TrainingTotals = { speed: 1, job: {}, fog: 1, rare: 1, dawn: 0, cold: 0, noIce: false, problems: {} };
  const boost = (x: number) => (mastery ? 1 + (x - 1) * 1.5 : x);
  for (const id of TRAINING_ORDER) {
    if (!state.training[id]) continue;
    const fx: TrainingFx = TRAINING[id].fx;
    if (fx.speed) t.speed *= boost(fx.speed);
    for (const [j, m] of Object.entries(fx.job ?? {})) t.job[j as JobId] = (t.job[j as JobId] ?? 1) * boost(m);
    if (fx.fog) t.fog *= fx.fog;
    if (fx.rare) t.rare *= fx.rare;
    if (fx.dawn) t.dawn += fx.dawn;
    if (fx.cold) t.cold += fx.cold;
    if (fx.noIce) t.noIce = true;
    for (const [j, m] of Object.entries(fx.problems ?? {})) t.problems[j as JobId] = (t.problems[j as JobId] ?? 1) * m;
  }
  key = k;
  cache = t;
  return t;
}

export type TrainingStatus = 'learned' | 'ready' | 'needsLodge' | 'needsPrev';

export function trainingStatus(state: GameState, id: TrainingId): TrainingStatus {
  const d = TRAINING[id];
  if (state.training[id]) return 'learned';
  if (state.lodge < d.lodge) return 'needsLodge';
  if (d.requires && !state.training[d.requires]) return 'needsPrev';
  return 'ready';
}

export function canAffordTraining(state: GameState, id: TrainingId): boolean {
  const d = TRAINING[id];
  return trainingStatus(state, id) === 'ready' && state.currencies.coins.gte(d.coins) && state.currencies.feathers.gte(d.feathers);
}

export function buyTraining(state: GameState, id: TrainingId, events?: EventSink): boolean {
  if (!canAffordTraining(state, id)) return false;
  const d = TRAINING[id];
  state.currencies.coins = state.currencies.coins.sub(d.coins);
  state.currencies.feathers = state.currencies.feathers.sub(d.feathers);
  state.training[id] = true;
  events?.push({ type: 'trainingLearned', training: id });
  return true;
}

// ---------------------------------------------------------------- your retriever

export function dogLevel(state: GameState): number {
  return state.dog.level;
}

export const dogHas = (state: GameState, level: number): boolean => state.dog.level >= level;

/** What the next dog level needs, or null at the top. */
export function dogNext(state: GameState): { level: number; fetches: number; feathers: number; haveFetches: number; ready: boolean; affordable: boolean } | null {
  const lv = state.dog.level;
  if (lv >= DOG_MAX) return null;
  const need = DOG_LEVELS[lv + 1]!;
  const have = counter(state, 'handFetches');
  const ready = have >= need.fetches;
  return { level: lv + 1, fetches: need.fetches, feathers: need.feathers, haveFetches: have, ready, affordable: ready && state.currencies.feathers.gte(need.feathers) };
}

export function trainDog(state: GameState, events?: EventSink): boolean {
  const n = dogNext(state);
  if (!n || !n.affordable) return false;
  state.currencies.feathers = state.currencies.feathers.sub(n.feathers);
  state.dog.level = n.level;
  events?.push({ type: 'dogLevel', level: n.level });
  return true;
}

/** Birds the dog brings in this step on her own (Swims on Her Own). */
export function dogSwim(state: GameState, dt: number): number {
  if (!dogHas(state, DOG_FX.swimLevel)) return 0;
  state.dog.swim += dt * DOG_FX.swimRate;
  const n = Math.floor(state.dog.swim);
  state.dog.swim -= n;
  return n;
}
