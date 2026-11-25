import Decimal from 'break_infinity.js';
import { ACRES, BOT_MILESTONES, BOTS, HUNT, MILESTONE_MULTIPLIER, SPECIES, type BotId, type SpeciesId } from '../data/economy';
import type { EventSink } from './events';
import type { GameState } from './state';

export interface Price {
  coins: Decimal;
  feathers: Decimal;
}

// ---------------------------------------------------------------- bots

/** ×2 for each milestone (10/25/50/100/200) reached. */
export function milestoneMultiplier(owned: number): number {
  let m = 1;
  for (const t of BOT_MILESTONES) if (owned >= t) m *= MILESTONE_MULTIPLIER;
  return m;
}

/** The next milestone above `owned`, or null when all are reached. */
export function nextMilestone(owned: number): number | null {
  for (const t of BOT_MILESTONES) if (owned < t) return t;
  return null;
}

/** Actions per second for ONE bot of this type at a level. */
export function botUnitSpeed(id: BotId, level: number): number {
  const d = BOTS[id];
  return d.baseSpeed * (1 + d.levelSpeedBonus * (level - 1));
}

/** Total actions per second for all owned bots of this type. */
export function botRate(state: GameState, id: BotId): number {
  const b = state.bots[id];
  return b.owned * botUnitSpeed(id, b.level) * milestoneMultiplier(b.owned);
}

/** Price of buying `count` more bots, given how many are owned. */
export function botPrice(id: BotId, owned: number, count = 1): Price {
  const d = BOTS[id];
  return {
    // Rounded up so balances stay whole numbers.
    coins: Decimal.sumGeometricSeries(count, d.costCoins, d.costGrowth, owned).ceil(),
    feathers: Decimal.sumGeometricSeries(count, d.costFeathers, d.costGrowth, owned).ceil(),
  };
}

/** How many bots the player can afford right now (limited by both currencies). */
export function maxAffordableBots(state: GameState, id: BotId): number {
  const d = BOTS[id];
  const owned = state.bots[id].owned;
  const byCoins = Decimal.affordGeometricSeries(state.currencies.coins, d.costCoins, d.costGrowth, owned).toNumber();
  const byFeathers = Decimal.affordGeometricSeries(state.currencies.feathers, d.costFeathers, d.costGrowth, owned).toNumber();
  let n = Math.max(0, Math.floor(Math.min(byCoins, byFeathers)));
  // Prices are rounded up, so trim if the rounding tipped the last one over.
  while (n > 0 && !canAfford(state, botPrice(id, owned, n))) n--;
  return n;
}

export function canAfford(state: GameState, price: Price): boolean {
  return state.currencies.coins.gte(price.coins) && state.currencies.feathers.gte(price.feathers);
}

function pay(state: GameState, price: Price): void {
  state.currencies.coins = state.currencies.coins.sub(price.coins);
  state.currencies.feathers = state.currencies.feathers.sub(price.feathers);
}

/** Buy `count` bots. Returns the number actually bought (0 if unaffordable). */
export function buyBot(state: GameState, id: BotId, count: number, events?: EventSink): number {
  if (count <= 0) return 0;
  const b = state.bots[id];
  const price = botPrice(id, b.owned, count);
  if (!canAfford(state, price)) return 0;
  pay(state, price);
  const before = b.owned;
  b.owned += count;
  events?.push({ type: 'botBought', bot: id, count, owned: b.owned });
  for (const t of BOT_MILESTONES) {
    if (before < t && b.owned >= t) {
      events?.push({ type: 'botMilestone', bot: id, owned: t, multiplier: milestoneMultiplier(b.owned) });
    }
  }
  return count;
}

export function levelPrice(id: BotId, level: number): Price {
  const d = BOTS[id];
  return {
    coins: new Decimal(d.levelCostCoins).mul(Decimal.pow(d.levelCostGrowth, level - 1)).floor(),
    feathers: new Decimal(0),
  };
}

/** Tune-up: raises a bot type's level (speed). Needs at least one owned. */
export function levelUpBot(state: GameState, id: BotId, events?: EventSink): boolean {
  const b = state.bots[id];
  if (b.owned < 1) return false;
  const price = levelPrice(id, b.level);
  if (!canAfford(state, price)) return false;
  pay(state, price);
  b.level += 1;
  events?.push({ type: 'botLevel', bot: id, level: b.level });
  return true;
}

// ---------------------------------------------------------------- acres

export function acrePrice(acres: number): Price {
  return {
    coins: new Decimal(ACRES.costCoins).mul(Decimal.pow(ACRES.costGrowth, acres - ACRES.start)).floor(),
    feathers: new Decimal(0),
  };
}

export function buyAcre(state: GameState, events?: EventSink): boolean {
  const price = acrePrice(state.acres);
  if (!canAfford(state, price)) return false;
  pay(state, price);
  state.acres += 1;
  events?.push({ type: 'acreRestored', acres: state.acres });
  return true;
}

// ---------------------------------------------------------------- marsh

export function spreadSize(_state: GameState): number {
  return HUNT.baseSpreadSize;
}

/** Flocks per second right now, before the activity curve. */
export function flockDraw(state: GameState): number {
  const fill = state.hunt.decoys / spreadSize(state);
  const spread = HUNT.emptySpreadFloor + (1 - HUNT.emptySpreadFloor) * Math.pow(fill, HUNT.spreadExponent);
  const acreBonus = 1 + ACRES.flockRatePerAcre * (state.acres - ACRES.start);
  return HUNT.baseFlockRate * spread * acreBonus;
}

/** Coins and feathers paid for one bird of a species. */
export function birdValue(_state: GameState, species: SpeciesId): { coins: number; feathers: number } {
  const s = SPECIES[species];
  return { coins: s.coins, feathers: s.feathers };
}
