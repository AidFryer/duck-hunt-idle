import { dayFx } from './days';
import { masteryMultiplier } from './mastery';
import { rhythmMultiplier } from './rhythm';
import { GUESTS } from '../data/guests';
import { DOG_FX } from '../data/training';
import { carvingFx } from './carvings';
import { stageFor } from '../data/calendar';
import { PATCH_COIN_BONUS } from '../data/achievements';
import Decimal from 'break_infinity.js';
import {
  ACRES, STANDS, BAY, BOT_MILESTONES, BOTS, DECOYS, FIELD, GROUND_LODGE, HUNT, TIMBER, LEDGER, MILESTONE_MULTIPLIER, RELIABILITY_CAP, RELIABILITY_PER_LEVEL, SPECIES,
  type BotId, type GroundId, type SpeciesId,
} from '../data/economy';
import type { EventSink } from './events';
import type { GameState } from './state';
import { UPGRADE_EFFECTS } from '../data/upgrades';
import { WEATHER } from '../data/weather';
import { legacyFx, starMultiplier } from './prestige';
import { workflowEval } from './workflow';
import { rungFx } from './progression';
import { cropFlockRate, cropFlockSize, farPlotFlockRate, farPlotFlockSize } from './crops';
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

/** Price of flooding the next timber stand. */
export function standPrice(stands: number): Price {
  const k = Decimal.pow(STANDS.costGrowth, stands - STANDS.start);
  return { coins: new Decimal(STANDS.costCoins).mul(k).floor(), feathers: new Decimal(STANDS.costFeathers).mul(k).floor() };
}

export function buyStand(state: GameState, events?: EventSink): boolean {
  if (!groundOpen(state, 'timber')) return false;
  const price = standPrice(state.stands);
  if (!canAfford(state, price)) return false;
  pay(state, price);
  state.stands += 1;
  events?.push({ type: 'standFlooded', stands: state.stands });
  return true;
}

// ---------------------------------------------------------------- marsh

/** Is a ground the goose field? (keeps the call sites short) */
const isField = (g: GroundId) => g === 'field';
/** Each ground's flock and spread numbers. */
export const GROUND_PARAMS = { marsh: HUNT, field: FIELD, timber: TIMBER, bay: BAY } as const;

export function spreadSize(state: GameState, g: GroundId = 'marsh'): number {
  if (g === 'marsh') return HUNT.baseSpreadSize + DECOYS.marsh.perBag * state.decoyBags.marsh + UPGRADE_EFFECTS.decoyQualitySpread * (state.upgrades.decoyQuality ?? 0) + rungFx(state).spread;
  return GROUND_PARAMS[g].baseSpreadSize + DECOYS[g].perBag * (state.decoyBags[g] ?? 0) + rungFx(state, g).spread;
}

/** Price of the next bag of decoys for a spread. */
export function decoyBagPrice(state: GameState, g: GroundId = 'marsh'): Price {
  const d = DECOYS[g];
  // Cornfield Deals (Legacy) halves goose decoys.
  const k = Math.pow(d.costGrowth, state.decoyBags[g] ?? 0) * (g === 'field' ? legacyFx(state).fieldDecoys : 1);
  return { coins: new Decimal(d.costCoins * k).ceil(), feathers: new Decimal(d.costFeathers * k).ceil() };
}

/** Is a ground open for hunting? */
export function groundOpen(state: GameState, g: GroundId): boolean {
  if (g === 'marsh') return true;
  if (g === 'field') return state.unlocks.field !== undefined || state.lodge >= GROUND_LODGE.field;
  return state.lodge >= GROUND_LODGE[g];
}

/** Buy a bag of decoys: the spread grows right away. */
export function buyDecoyBag(state: GameState, g: GroundId = 'marsh', events?: EventSink): boolean {
  if (g === 'marsh' ? state.unlocks.upgrades === undefined && state.lodge < 2 : !groundOpen(state, g)) return false;
  const price = decoyBagPrice(state, g);
  if (!canAfford(state, price)) return false;
  pay(state, price);
  state.decoyBags[g] = (state.decoyBags[g] ?? 0) + 1;
  events?.push({ type: 'decoysBought', ground: g, decoys: spreadSize(state, g) });
  return true;
}

/** Seconds a circling flock waits for a call. */
export function incomingPatience(state: GameState, g: GroundId = 'marsh'): number {
  const steady = dayFx(state).patience;
  if (g !== 'marsh') return GROUND_PARAMS[g].incomingPatience * rungFx(state, g).patience * steady;
  const base = HUNT.incomingPatience + UPGRADE_EFFECTS.decoyQualityPatience * (state.upgrades.decoyQuality ?? 0) + (state.legacy.perks.keenEyes ? 5 : 0);
  return base * rungFx(state).patience * steady;
}

/** Seconds a called flock works the decoys before flaring off. */
export function committedPatience(state: GameState, g: GroundId = 'marsh'): number {
  return GROUND_PARAMS[g].committedPatience * rungFx(state, g).committedPatience;
}

/** Flocks that can work the decoys at once. */
export function maxCommitted(state: GameState, g: GroundId = 'marsh'): number {
  const marsh = g !== 'marsh' ? 0 : Math.min(ACRES.maxExtraCommitted, Math.floor((state.acres - ACRES.start) / ACRES.acresPerCommitted));
  return GROUND_PARAMS[g].maxCommitted + rungFx(state, g).committed + marsh;
}

/** How many flocks can circle at once. */
export function maxIncoming(state: GameState, g: GroundId = 'marsh'): number {
  const marsh = g !== 'marsh' ? 0 : Math.min(ACRES.maxExtraCircling, Math.floor((state.acres - ACRES.start) / ACRES.acresPerCircling));
  const stands = g === 'timber' ? Math.min(4, Math.floor((state.stands - STANDS.start) / 2)) : 0;
  return GROUND_PARAMS[g].maxIncoming + (state.legacy.perks.keenEyes ? 1 : 0) + (legacyFx(state).incoming[g] ?? 0) + marsh + stands;
}

/** Fraction of a flock taken by one shot. */
export function shotFraction(state: GameState, g: GroundId = 'marsh'): number {
  if (g === 'timber') return Math.min(1, GROUND_PARAMS[g].shotFraction + rungFx(state, g).shot + UPGRADE_EFFECTS.cypressBlindShot * (state.upgrades.cypressBlind ?? 0));
  if (g !== 'marsh') return Math.min(1, GROUND_PARAMS[g].shotFraction + rungFx(state, g).shot);
  return Math.min(1, HUNT.shotFraction + UPGRADE_EFFECTS.blindsShotFraction * (state.upgrades.blinds ?? 0) + rungFx(state).shot);
}

/** Extra birds per flock from food plots and weather. */
export function extraFlockSize(state: GameState, g: GroundId = 'marsh'): number {
  const stage = stageFor(state.clock.day).flockSize - 1;
  const weather = WEATHER[state.environment.weather].flockSize + dayFx(state).flockSize;
  if (isField(g)) return UPGRADE_EFFECTS.winterWheatFlockSize * (state.upgrades.winterWheat ?? 0) + farPlotFlockSize(state, 'field') + weather + stage;
  if (g === 'bay') return UPGRADE_EFFECTS.breakwaterFlockSize * (state.upgrades.breakwater ?? 0) + farPlotFlockSize(state, 'bay') + weather + stage;
  if (g === 'timber') return STANDS.flockSizePerStand * (state.stands - STANDS.start) + farPlotFlockSize(state, 'timber') + weather + stage;
  const cold = state.environment.weather === 'coldFront' ? workflowEval(state).coldFlockSize : 0;
  const flyway = FLYWAYS[state.flyway].flockSizeBonus ?? 0;
  return cropFlockSize(state) + weather + cold + flyway + stage;
}

/** Flocks per second right now, before the activity curve. */
/** Flocks per second drawn to a ground (Legacy branches can lift a ground). */
export function flockDraw(state: GameState, g: GroundId = 'marsh'): number {
  return baseFlockDraw(state, g) * (legacyFx(state).groundFlocks[g] ?? 1);
}

function baseFlockDraw(state: GameState, g: GroundId): number {
  const P = GROUND_PARAMS[g];
  // A bigger spread draws more flocks.
  const spread = Math.pow(spreadSize(state, g) / P.baseSpreadSize, DECOYS.drawExponent);
  const u = state.upgrades;
  const common = WEATHER[state.environment.weather].flockRate * rungFx(state, g).draw * stageFor(state.clock.day).flockRate * dayFx(state).flockRate;
  if (isField(g)) {
    const field = (1 + UPGRADE_EFFECTS.cornStubbleFlockRate * (u.cornStubble ?? 0)) * (1 + UPGRADE_EFFECTS.roostPondFlockRate * (u.roostPond ?? 0));
    return P.baseFlockRate * spread * field * common * carvingFx(state).fieldRate * farPlotFlockRate(state, 'field');
  }
  if (g === 'timber') {
    const timber = (1 + UPGRADE_EFFECTS.timberFlockRate * (u.timber ?? 0)) * (1 + UPGRADE_EFFECTS.nestBoxesFlockRate * (u.nestBoxes ?? 0)) * (1 + UPGRADE_EFFECTS.duckweedFlockRate * (u.duckweed ?? 0));
    // Its own line (flooded stands), plus part of the marsh's acres and food plots.
    const stands = Math.pow(STANDS.flockRateGrowth, state.stands - STANDS.start);
    const shared = Math.pow(Math.pow(ACRES.flockRateGrowth, state.acres - ACRES.start) * cropFlockRate(state), STANDS.sharedBoost);
    return P.baseFlockRate * spread * timber * stands * shared * common * carvingFx(state).flockRate * farPlotFlockRate(state, 'timber');
  }
  if (g === 'bay') {
    const bay = (1 + UPGRADE_EFFECTS.musselBedsFlockRate * (u.musselBeds ?? 0)) * (1 + UPGRADE_EFFECTS.kelpLineFlockRate * (u.kelpLine ?? 0));
    return P.baseFlockRate * spread * bay * common * farPlotFlockRate(state, 'bay');
  }
  const acreBonus = Math.pow(ACRES.flockRateGrowth, state.acres - ACRES.start);
  const marsh =
    cropFlockRate(state) *
    (1 + UPGRADE_EFFECTS.celeryFlockRate * (u.celeryBeds ?? 0)) *
    (1 + UPGRADE_EFFECTS.deepPoolFlockRate * (u.deepPool ?? 0));
  const wf = workflowEval(state);
  const fog = state.environment.weather === 'fog' ? wf.fogFlockRate : 1;
  return HUNT.baseFlockRate * spread * acreBonus * marsh * common * wf.flockRate * fog * carvingFx(state).flockRate;
}

/** Lodge reputation: more birds logged, better-paying guests. */
export function reputationMultiplier(state: GameState): number {
  const dock = 1 + UPGRADE_EFFECTS.guestDockReputation * (state.upgrades.guestDock ?? 0);
  // Grows gently (by tenfolds of birds logged) so it never snowballs.
  return 1 + LEDGER.reputationK * dock * Math.log10(1 + state.stats.lifetimeLogged / 500);
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
  // Legacy: Old Money / Fine Feathers, and each flyway branch's ground bonus.
  const lg = legacyFx(state);
  const home = s.ground ?? 'marsh';
  const lgCoins = lg.coins * (lg.groundCoins[home] ?? 1);
  const lgFeathers = lg.feathers * (lg.groundFeathers[home] ?? 1);
  return {
    // Crew Rhythm lifts coins only.
    coins: Math.round(s.coins * coinBoost * stars * rhythmMultiplier(state) * lgCoins * masteryMultiplier(state) * dayFx(state).coins * 100) / 100,
    feathers: Math.round(s.feathers * stars * smoke * carv.feathers * Math.sqrt(coinBoost) * lgFeathers * dayFx(state).feathers * (state.dog.level >= DOG_FX.softMouthLevel ? DOG_FX.softMouthFeathers : 1) * 100) / 100,
  };
}
