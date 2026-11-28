import { legacyFx } from './prestige';
import Decimal from 'break_infinity.js';
import { CROP_DRAW_GROWTH, CROP_GROW_SECONDS, CROPS, FAR_PLOTS, PLOT_LEVELS, plotCount, type CropId, type FarPlotGround } from '../data/crops';
import { groundOpen } from './economy';
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
  // The plot keeps its level; a brand-new plot starts at level 1.
  state.plots[plot] = { crop, growth: 0, level: Math.max(1, state.plots[plot]?.level ?? 0) };
  events?.push({ type: 'cropPlanted', plot, crop });
  return true;
}

export function stepCrops(state: GameState, dt: number): void {
  for (const p of state.plots) if (p.crop && p.growth < 1) p.growth = Math.min(1, p.growth + dt / CROP_GROW_SECONDS);
}

/** Crops in plots that still exist (a crop from another flyway goes fallow). */
function growing(state: GameState): { crop: CropId; growth: number; level: number }[] {
  const n = plotCount(state.lodge);
  const out: { crop: CropId; growth: number; level: number }[] = [];
  state.plots.forEach((p, i) => {
    if (i < n && p.crop && CROPS[p.crop].flyways.includes(state.flyway)) out.push({ crop: p.crop, growth: p.growth, level: p.level });
  });
  return out;
}

export function cropFlockRate(state: GameState): number {
  let m = 1;
  const k = legacyFx(state).crops;
  for (const p of growing(state)) m *= (1 + (CROPS[p.crop].flockRate - 1) * p.growth * k) * plotLevelMult(p.level);
  return m;
}

export function cropFlockSize(state: GameState): number {
  let n = 0;
  for (const p of growing(state)) n += CROPS[p.crop].flockSize * p.growth + Math.floor(p.level / PLOT_LEVELS.birdsEvery);
  return n;
}

/** × flocks from a plot's level (level 1 = ×1). */
export function plotLevelMult(level: number): number {
  return Math.pow(PLOT_LEVELS.flockRateGrowth, Math.max(0, level - 1));
}

/** How much one plot lifts marsh flocks right now (1.3 = +30%). */
export function plotFlockRate(state: GameState, plot: number): number {
  const p = state.plots[plot];
  if (!p?.crop || plot >= plotCount(state.lodge) || !CROPS[p.crop].flyways.includes(state.flyway)) return 1;
  return (1 + (CROPS[p.crop].flockRate - 1) * p.growth * legacyFx(state).crops) * plotLevelMult(p.level);
}

// ---------------------------------------------------------------- plot levels

/** Price of the next level for a marsh plot. */
export function plotLevelPrice(plot: number, level: number): Price {
  const k = (plot + 1) * (plot + 1) * Math.pow(PLOT_LEVELS.costGrowth, Math.max(0, level - 1));
  return { coins: new Decimal(PLOT_LEVELS.costCoins * k).floor(), feathers: new Decimal(PLOT_LEVELS.costFeathers * k).floor() };
}

export function canLevelPlot(state: GameState, plot: number): boolean {
  const p = state.plots[plot];
  if (!p?.crop || plot >= plotCount(state.lodge)) return false;
  const price = plotLevelPrice(plot, p.level);
  return state.currencies.coins.gte(price.coins) && state.currencies.feathers.gte(price.feathers);
}

export function levelPlot(state: GameState, plot: number): boolean {
  if (!canLevelPlot(state, plot)) return false;
  const p = state.plots[plot]!;
  const price = plotLevelPrice(plot, p.level);
  state.currencies.coins = state.currencies.coins.sub(price.coins);
  state.currencies.feathers = state.currencies.feathers.sub(price.feathers);
  p.level += 1;
  return true;
}

// ---------------------------------------------------------------- the other grounds' plots

/** Price of the next level of a far ground's plot (level 0 → 1 plants it). */
export function farPlotPrice(g: FarPlotGround, level: number): Price {
  const d = FAR_PLOTS[g];
  const k = Math.pow(d.costGrowth, level);
  return { coins: new Decimal(d.coins * k).floor(), feathers: new Decimal(d.feathers * k).floor() };
}

export function canLevelFarPlot(state: GameState, g: FarPlotGround): boolean {
  if (!groundOpen(state, g)) return false;
  const price = farPlotPrice(g, state.farPlots[g]);
  return state.currencies.coins.gte(price.coins) && state.currencies.feathers.gte(price.feathers);
}

export function levelFarPlot(state: GameState, g: FarPlotGround): boolean {
  if (!canLevelFarPlot(state, g)) return false;
  const price = farPlotPrice(g, state.farPlots[g]);
  state.currencies.coins = state.currencies.coins.sub(price.coins);
  state.currencies.feathers = state.currencies.feathers.sub(price.feathers);
  state.farPlots[g] += 1;
  return true;
}

/** × that ground's flocks from its plot. */
export function farPlotFlockRate(state: GameState, g: FarPlotGround): number {
  return Math.pow(FAR_PLOTS[g].flockRateGrowth, state.farPlots[g]);
}

/** + birds per flock on that ground from its plot. */
export function farPlotFlockSize(state: GameState, g: FarPlotGround): number {
  return Math.floor(state.farPlots[g] / PLOT_LEVELS.birdsEvery);
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
