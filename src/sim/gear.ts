import { projectFx } from './projects';
import Decimal from 'break_infinity.js';
import { GEAR, GEAR_GROWTH, GEAR_MAX, type GearId } from '../data/gear';
import type { EventSink } from './events';
import type { GameState } from './state';

const pow = (n: number) => Math.pow(GEAR_GROWTH, n);

export const gearLevel = (state: GameState, id: GearId): number => state.gear[id] ?? 0;

export function gearPrice(id: GearId, level: number, mult = 1): { coins: Decimal; feathers: Decimal } {
  const d = GEAR[id];
  return { coins: new Decimal(d.coins * pow(level) * mult).ceil(), feathers: new Decimal(d.feathers * pow(level) * mult).ceil() };
}

export const gearOpen = (state: GameState, id: GearId): boolean => state.lodge >= GEAR[id].lodge;

export function canBuyGear(state: GameState, id: GearId): boolean {
  const lvl = gearLevel(state, id);
  if (!gearOpen(state, id) || lvl >= GEAR_MAX) return false;
  const p = gearPrice(id, lvl, projectFx(state).gearPrice);
  return state.currencies.coins.gte(p.coins) && state.currencies.feathers.gte(p.feathers);
}

export function buyGear(state: GameState, id: GearId, events?: EventSink): boolean {
  if (!canBuyGear(state, id)) return false;
  const p = gearPrice(id, gearLevel(state, id), projectFx(state).gearPrice);
  state.currencies.coins = state.currencies.coins.sub(p.coins);
  state.currencies.feathers = state.currencies.feathers.sub(p.feathers);
  state.gear[id] = gearLevel(state, id) + 1;
  events?.push({ type: 'gearBought', gear: id, level: state.gear[id]! });
  return true;
}

/** × for one gear line (1 + step × level). */
export function gearMult(state: GameState, id: GearId): number {
  return 1 + GEAR[id].step * gearLevel(state, id);
}
