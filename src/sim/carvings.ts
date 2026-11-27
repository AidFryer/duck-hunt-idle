import { CARVINGS, CARVING_ORDER, type CarvingFx, type CarvingId } from '../data/carvings';
import type { SpeciesId } from '../data/species';
import type { EventSink } from './events';
import type { GameState } from './state';

export interface CarvingTotals {
  flockRate: number;
  fieldRate: number;
  coins: number;
  feathers: number;
  golden: number;
  species: Partial<Record<SpeciesId, number>>;
}

let cacheKey = '';
let cache: CarvingTotals | null = null;

/** Combined bonus of every carving on the shelf. */
export function carvingFx(state: GameState): CarvingTotals {
  const key = CARVING_ORDER.filter((id) => state.carvings[id]).join(',');
  if (cache && key === cacheKey) return cache;
  const t: CarvingTotals = { flockRate: 1, fieldRate: 1, coins: 1, feathers: 1, golden: 1, species: {} };
  for (const id of CARVING_ORDER) {
    if (!state.carvings[id]) continue;
    const fx: CarvingFx = CARVINGS[id].fx;
    t.flockRate *= fx.flockRate ?? 1;
    t.fieldRate *= fx.fieldRate ?? 1;
    t.coins *= fx.coins ?? 1;
    t.feathers *= fx.feathers ?? 1;
    t.golden *= fx.golden ?? 1;
    for (const [sp, k] of Object.entries(fx.species ?? {})) t.species[sp as SpeciesId] = (t.species[sp as SpeciesId] ?? 1) * k;
  }
  cacheKey = key;
  cache = t;
  return t;
}

export type CarvingStatus = 'owned' | 'ready' | 'needsBird' | 'needsLodge';

export function carvingStatus(state: GameState, id: CarvingId): CarvingStatus {
  const d = CARVINGS[id];
  if (state.carvings[id]) return 'owned';
  if (state.lodge < d.lodge) return 'needsLodge';
  if (d.needs && !(state.guide[d.needs]?.count ?? 0)) return 'needsBird';
  return 'ready';
}

export function canAffordCarving(state: GameState, id: CarvingId): boolean {
  const d = CARVINGS[id];
  return carvingStatus(state, id) === 'ready' && state.currencies.coins.gte(d.coins) && state.currencies.feathers.gte(d.feathers);
}

export function buyCarving(state: GameState, id: CarvingId, events: EventSink): boolean {
  if (!canAffordCarving(state, id)) return false;
  const d = CARVINGS[id];
  state.currencies.coins = state.currencies.coins.sub(d.coins);
  state.currencies.feathers = state.currencies.feathers.sub(d.feathers);
  state.carvings[id] = true;
  events.push({ type: 'carvingBought', carving: id });
  return true;
}
