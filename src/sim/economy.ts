import Decimal from 'break_infinity.js';
import {
  ACRES, BOT_MILESTONES, BOTS, HUNT, LEDGER, MILESTONE_MULTIPLIER, RELIABILITY_CAP, RELIABILITY_PER_LEVEL, SPECIES,
  type BotId, type SpeciesId,
} from '../data/economy';
import type { EventSink } from './events';
import type { GameState } from './state';
import { UPGRADE_EFFECTS } from '../data/upgrades';
import { WEATHER } from '../data/weather';
import { starMultiplier } from './prestige';
import { workflowEval } from './workflow';

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

/** Chance an action goes smoothly for one bot of this type at a level. */
export function botReliability(id: BotId, level: number): number {
  const d = BOTS[id];
  if (d.reliability >= 1) return 1;
  return Math.min(RELIABILITY_CAP, d.reliability + RELIABILITY_PER_LEVEL * (level - 1));
}

/** Price of buying `count` more bots, given how many are owned. */
export function botPrice(id: BotId, owned: number, count = 1, mult = 1): Price {
  const d = BOTS[id];
  return {
    // Rounded up so balances stay whole numbers.
    coins: Decimal.sumGeometricSeries(count, d.costCoins * mult, d.costGrowth, owned).ceil(),
    feathers: Decimal.sumGeometricSeries(count, d.costFeathers * mult, d.costGrowth, owned).ceil(),
  };
}

/** Price multiplier for a bot type from Legacy perks. */
export function botPriceMult(state: GameState, id: BotId): number {
  return id === 'foreman' && state.legacy.perks.unionRates ? 0.5 : 1;
}

/** How many bots the player can afford right now (limited by both currencies). */
export function maxAffordableBots(state: GameState, id: BotId): number {
  const d = BOTS[id];
  const owned = state.bots[id].owned;
  const m = botPriceMult(state, id);
  const byCoins = Decimal.affordGeometricSeries(state.currencies.coins, d.costCoins * m, d.costGrowth, owned).toNumber();
  const byFeathers = Decimal.affordGeometricSeries(state.currencies.feathers, d.costFeathers * m, d.costGrowth, owned).toNumber();
  let n = Math.max(0, Math.floor(Math.min(byCoins, byFeathers)));
  // Prices are rounded up, so trim if the rounding tipped the last one over.
  while (n > 0 && !canAfford(state, botPrice(id, owned, n, m))) n--;
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
  const price = botPrice(id, b.owned, count, botPriceMult(state, id));
  if (!canAfford(state, price)) return 0;
  pay(state, price);
  const before = b.owned;
  b.owned += count;
  const home = BOTS[id].job;
  state.assign[id][home] = (state.assign[id][home] ?? 0) + count;
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
  events?.push({ type: 'botLevel', bot: id, level: b.level, by: 'you' });
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

export function spreadSize(state: GameState): number {
  return HUNT.baseSpreadSize + UPGRADE_EFFECTS.decoyQualitySpread * (state.upgrades.decoyQuality ?? 0);
}

/** Seconds a circling flock waits for a call. */
export function incomingPatience(state: GameState): number {
  return HUNT.incomingPatience + UPGRADE_EFFECTS.decoyQualityPatience * (state.upgrades.decoyQuality ?? 0) + (state.legacy.perks.keenEyes ? 5 : 0);
}

/** How many flocks can circle at once. */
export function maxIncoming(state: GameState): number {
  return HUNT.maxIncoming + (state.legacy.perks.keenEyes ? 1 : 0);
}

/** Fraction of a flock taken by one shot. */
export function shotFraction(state: GameState): number {
  return HUNT.shotFraction + UPGRADE_EFFECTS.blindsShotFraction * (state.upgrades.blinds ?? 0);
}

/** Extra birds per flock from food plots and weather. */
export function extraFlockSize(state: GameState): number {
  const cold = state.environment.weather === 'coldFront' ? workflowEval(state).coldFlockSize : 0;
  return UPGRADE_EFFECTS.riceFlockSize * (state.upgrades.rice ?? 0) + WEATHER[state.environment.weather].flockSize + cold;
}

/** Flocks per second right now, before the activity curve. */
export function flockDraw(state: GameState): number {
  const fill = state.hunt.decoys / spreadSize(state);
  const spread = HUNT.emptySpreadFloor + (1 - HUNT.emptySpreadFloor) * Math.pow(fill, HUNT.spreadExponent);
  const acreBonus = 1 + ACRES.flockRatePerAcre * (state.acres - ACRES.start);
  const marsh =
    (1 + UPGRADE_EFFECTS.timberFlockRate * (state.upgrades.timber ?? 0)) *
    (1 + UPGRADE_EFFECTS.milletFlockRate * (state.upgrades.millet ?? 0));
  const wf = workflowEval(state);
  const fog = state.environment.weather === 'fog' ? wf.fogFlockRate : 1;
  return HUNT.baseFlockRate * spread * acreBonus * marsh * WEATHER[state.environment.weather].flockRate * wf.flockRate * fog;
}

/** Lodge reputation: more birds logged, better-paying guests. */
export function reputationMultiplier(state: GameState): number {
  return 1 + LEDGER.reputationK * Math.sqrt(state.stats.lifetimeLogged);
}

/** Coins (when logged) and feathers (when retrieved) for one bird. */
export function birdValue(state: GameState, species: SpeciesId): { coins: number; feathers: number } {
  const s = SPECIES[species];
  const rooms = 1 + UPGRADE_EFFECTS.lodgeRoomsCoins * (state.upgrades.lodgeRooms ?? 0);
  const stars = starMultiplier(state);
  return {
    coins: Math.round(s.coins * reputationMultiplier(state) * rooms * stars * 100) / 100,
    feathers: Math.round(s.feathers * stars * 100) / 100,
  };
}
