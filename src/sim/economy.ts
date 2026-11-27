import { GUESTS } from '../data/guests';
import { DOG_FX } from '../data/training';
import { carvingFx } from './carvings';
import { stageFor } from '../data/calendar';
import { PATCH_COIN_BONUS } from '../data/achievements';
import Decimal from 'break_infinity.js';
import {
  ACRES, BOT_MILESTONES, BOTS, DECOYS, FIELD, HUNT, LEDGER, MILESTONE_MULTIPLIER, RELIABILITY_CAP, RELIABILITY_PER_LEVEL, SPECIES,
  type BotId, type GroundId, type SpeciesId,
} from '../data/economy';
import type { EventSink } from './events';
import type { GameState } from './state';
import { UPGRADE_EFFECTS } from '../data/upgrades';
import { WEATHER } from '../data/weather';
import { starMultiplier } from './prestige';
import { workflowEval } from './workflow';
import { rungFx } from './progression';
import { cropFlockRate, cropFlockSize } from './crops';
import { FLYWAYS } from '../data/flyways';

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
  const shed = 1 - UPGRADE_EFFECTS.carvingShedDiscount * (state.upgrades.carvingShed ?? 0);
  return (id === 'foreman' && state.legacy.perks.unionRates ? 0.5 : 1) * shed;
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
  if (count <= 0 || !state.plans[id]) return 0;
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
  if (state.unlocks.upgrades === undefined && state.lodge < 2) return false;
  const price = acrePrice(state.acres);
  if (!canAfford(state, price)) return false;
  pay(state, price);
  state.acres += 1;
  events?.push({ type: 'acreRestored', acres: state.acres });
  return true;
}

// ---------------------------------------------------------------- marsh

/** Is a ground the goose field? (keeps the call sites short) */
const isField = (g: GroundId) => g === 'field';

export function spreadSize(state: GameState, g: GroundId = 'marsh'): number {
  if (isField(g)) return FIELD.baseSpreadSize + DECOYS.field.perBag * state.decoyBags.field + rungFx(state, 'field').spread;
  return HUNT.baseSpreadSize + DECOYS.marsh.perBag * state.decoyBags.marsh + UPGRADE_EFFECTS.decoyQualitySpread * (state.upgrades.decoyQuality ?? 0) + rungFx(state).spread;
}

/** Price of the next bag of decoys for a spread. */
export function decoyBagPrice(state: GameState, g: GroundId = 'marsh'): Price {
  const d = DECOYS[g];
  const k = Math.pow(d.costGrowth, state.decoyBags[g]);
  return { coins: new Decimal(d.costCoins * k).ceil(), feathers: new Decimal(d.costFeathers * k).ceil() };
}

/** Buy a bag of decoys: the spread grows right away. */
export function buyDecoyBag(state: GameState, g: GroundId = 'marsh', events?: EventSink): boolean {
  if (g === 'field' ? state.lodge < 4 : state.unlocks.upgrades === undefined && state.lodge < 2) return false;
  const price = decoyBagPrice(state, g);
  if (!canAfford(state, price)) return false;
  pay(state, price);
  state.decoyBags[g] += 1;
  events?.push({ type: 'decoysBought', ground: g, decoys: spreadSize(state, g) });
  return true;
}

/** Seconds a circling flock waits for a call. */
export function incomingPatience(state: GameState, g: GroundId = 'marsh'): number {
  if (isField(g)) return FIELD.incomingPatience * rungFx(state, 'field').patience;
  const base = HUNT.incomingPatience + UPGRADE_EFFECTS.decoyQualityPatience * (state.upgrades.decoyQuality ?? 0) + (state.legacy.perks.keenEyes ? 5 : 0);
  return base * rungFx(state).patience;
}

/** Seconds a called flock works the decoys before flaring off. */
export function committedPatience(state: GameState, g: GroundId = 'marsh'): number {
  return (isField(g) ? FIELD.committedPatience : HUNT.committedPatience) * rungFx(state, g).committedPatience;
}

/** Flocks that can work the decoys at once. */
export function maxCommitted(state: GameState, g: GroundId = 'marsh'): number {
  const marsh = isField(g) ? 0 : Math.min(ACRES.maxExtraCommitted, Math.floor((state.acres - ACRES.start) / ACRES.acresPerCommitted));
  return (isField(g) ? FIELD.maxCommitted : HUNT.maxCommitted) + rungFx(state, g).committed + marsh;
}

/** How many flocks can circle at once. */
export function maxIncoming(state: GameState, g: GroundId = 'marsh'): number {
  const marsh = isField(g) ? 0 : Math.min(ACRES.maxExtraCircling, Math.floor((state.acres - ACRES.start) / ACRES.acresPerCircling));
  return (isField(g) ? FIELD.maxIncoming : HUNT.maxIncoming) + (state.legacy.perks.keenEyes ? 1 : 0) + marsh;
}

/** Fraction of a flock taken by one shot. */
export function shotFraction(state: GameState, g: GroundId = 'marsh'): number {
  if (isField(g)) return Math.min(1, FIELD.shotFraction + rungFx(state, 'field').shot);
  return Math.min(1, HUNT.shotFraction + UPGRADE_EFFECTS.blindsShotFraction * (state.upgrades.blinds ?? 0) + rungFx(state).shot);
}

/** Extra birds per flock from food plots and weather. */
export function extraFlockSize(state: GameState, g: GroundId = 'marsh'): number {
  const stage = stageFor(state.clock.day).flockSize - 1;
  if (isField(g)) return UPGRADE_EFFECTS.winterWheatFlockSize * (state.upgrades.winterWheat ?? 0) + WEATHER[state.environment.weather].flockSize + stage;
  const cold = state.environment.weather === 'coldFront' ? workflowEval(state).coldFlockSize : 0;
  const flyway = FLYWAYS[state.flyway].flockSizeBonus ?? 0;
  return cropFlockSize(state) + WEATHER[state.environment.weather].flockSize + cold + flyway + stage;
}

/** Flocks per second right now, before the activity curve. */
export function flockDraw(state: GameState, g: GroundId = 'marsh'): number {
  const P = isField(g) ? FIELD : HUNT;
  // A bigger spread draws more flocks.
  const spread = Math.pow(spreadSize(state, g) / P.baseSpreadSize, DECOYS.drawExponent);
  const u = state.upgrades;
  if (isField(g)) {
    const field = (1 + UPGRADE_EFFECTS.cornStubbleFlockRate * (u.cornStubble ?? 0)) * (1 + UPGRADE_EFFECTS.roostPondFlockRate * (u.roostPond ?? 0));
    return P.baseFlockRate * spread * field * WEATHER[state.environment.weather].flockRate * rungFx(state, 'field').draw * carvingFx(state).fieldRate * stageFor(state.clock.day).flockRate;
  }
  const acreBonus = Math.pow(ACRES.flockRateGrowth, state.acres - ACRES.start);
  const marsh =
    (1 + UPGRADE_EFFECTS.timberFlockRate * (u.timber ?? 0)) *
    cropFlockRate(state) *
    (1 + UPGRADE_EFFECTS.nestBoxesFlockRate * (u.nestBoxes ?? 0)) *
    (1 + UPGRADE_EFFECTS.celeryFlockRate * (u.celeryBeds ?? 0)) *
    (1 + UPGRADE_EFFECTS.deepPoolFlockRate * (u.deepPool ?? 0)) *
    rungFx(state).draw;
  const wf = workflowEval(state);
  const fog = state.environment.weather === 'fog' ? wf.fogFlockRate : 1;
  return HUNT.baseFlockRate * spread * acreBonus * marsh * WEATHER[state.environment.weather].flockRate * wf.flockRate * fog * carvingFx(state).flockRate * stageFor(state.clock.day).flockRate;
}

/** Lodge reputation: more birds logged, better-paying guests. */
export function reputationMultiplier(state: GameState): number {
  const dock = 1 + UPGRADE_EFFECTS.guestDockReputation * (state.upgrades.guestDock ?? 0);
  return 1 + LEDGER.reputationK * dock * Math.sqrt(state.stats.lifetimeLogged);
}

/** Each patch on the jacket: a little more per bird. */
export function patchMultiplier(state: GameState): number {
  const trophy = 1 + UPGRADE_EFFECTS.trophyRoomPatch * (state.upgrades.trophyRoom ?? 0);
  const guestbook = 1 + GUESTS.bookBonus * Math.floor(state.guests.served / GUESTS.bookEvery);
  return (1 + PATCH_COIN_BONUS * trophy * Object.keys(state.achievements).length) * guestbook;
}

/** Coins (when logged) and feathers (when retrieved) for one bird. */
export function birdValue(state: GameState, species: SpeciesId): { coins: number; feathers: number } {
  const s = SPECIES[species];
  const rooms = 1 + UPGRADE_EFFECTS.lodgeRoomsCoins * (state.upgrades.lodgeRooms ?? 0);
  const stars = starMultiplier(state);
  const smoke = 1 + UPGRADE_EFFECTS.smokehouseFeathers * (state.upgrades.smokehouse ?? 0);
  const carv = carvingFx(state);
  const extra = carv.coins * stageFor(state.clock.day).coins * patchMultiplier(state);
  // Coin boosts (reputation, rooms, ladder, patches…) lift feathers too, by
  // their square root, so feathers keep pace with coins as the lodge grows.
  const coinBoost = reputationMultiplier(state) * rooms * rungFx(state).coins * extra;
  return {
    coins: Math.round(s.coins * coinBoost * stars * 100) / 100,
    feathers: Math.round(s.feathers * stars * smoke * carv.feathers * Math.sqrt(coinBoost) * (state.dog.level >= DOG_FX.softMouthLevel ? DOG_FX.softMouthFeathers : 1) * 100) / 100,
  };
}
