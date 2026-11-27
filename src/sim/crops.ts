import { legacyFx } from './prestige';
import Decimal from 'break_infinity.js';
import { CROP_DRAW_GROWTH, CROP_GROW_SECONDS, CROPS, plotCount, type CropId } from '../data/crops';
import type { SpeciesId } from '../data/species';
import type { Price } from './economy';
import type { EventSink } from './events';
import type { GameState } from './state';

export function cropPrice(crop: CropId, plot: number): Price {
  const d = CROPS[crop];
  return { coins: new Decimal(d.coins * (plot + 1)), feathers: new Decimal(d.feathers * (plot + 1)) };
}

export function canPlant(state: GameState, plot: number, crop: CropId): boolean {
  if (plot < 0 || plot >= plotCount(state.lodge)) return false;
  if (!CROPS[crop].flyways.includes(state.flyway)) return false;
  if (state.plots[plot]?.crop === crop) return false;
  const p = cropPrice(crop, plot);
  return state.currencies.coins.gte(p.coins) && state.currencies.feathers.gte(p.feathers);
}

/** Plant (or replant) a plot. The new crop starts growing from scratch. */
export function plantCrop(state: GameState, plot: number, crop: CropId, events?: EventSink): boolean {
  if (!canPlant(state, plot, crop)) return false;
  const p = cropPrice(crop, plot);
  state.currencies.coins = state.currencies.coins.sub(p.coins);
  state.currencies.feathers = state.currencies.feathers.sub(p.feathers);
  state.plots[plot] = { crop, growth: 0 };
  events?.push({ type: 'cropPlanted', plot, crop });
  return true;
}

export function stepCrops(state: GameState, dt: number): void {
  for (const p of state.plots) if (p.crop && p.growth < 1) p.growth = Math.min(1, p.growth + dt / CROP_GROW_SECONDS);
}

/** Crops in plots that still exist (a crop from another flyway goes fallow). */
function growing(state: GameState): { crop: CropId; growth: number }[] {
  const n = plotCount(state.lodge);
  const out: { crop: CropId; growth: number }[] = [];
  state.plots.forEach((p, i) => {
    if (i < n && p.crop && CROPS[p.crop].flyways.includes(state.flyway)) out.push({ crop: p.crop, growth: p.growth });
  });
  return out;
}

export function cropFlockRate(state: GameState): number {
  let m = 1;
  const k = legacyFx(state).crops;
  for (const p of growing(state)) m *= 1 + (CROPS[p.crop].flockRate - 1) * p.growth * k;
  return m;
}

export function cropFlockSize(state: GameState): number {
  let n = 0;
  for (const p of growing(state)) n += CROPS[p.crop].flockSize * p.growth;
  return n;
}

export function cropSpeciesMult(state: GameState, id: SpeciesId): number {
  let m = 1;
  for (const p of growing(state)) {
    const k = CROPS[p.crop].species[id];
    if (k) m *= 1 + (k - 1) * p.growth * legacyFx(state).crops;
  }
  return m;
}

/** Is one of these crops grown in enough to draw its birds? */
export function cropGrown(state: GameState, crops: readonly CropId[]): boolean {
  return growing(state).some((p) => crops.includes(p.crop) && p.growth >= CROP_DRAW_GROWTH);
}
