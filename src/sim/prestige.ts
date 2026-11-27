import Decimal from 'break_infinity.js';
import { BOT_ORDER, BOTS, type GroundId, type JobId } from '../data/economy';
import { FLYWAYS, type FlywayId } from '../data/flyways';
import { PERK_ORDER, PERKS, PRESTIGE, type BranchId, type PerkId } from '../data/legacy';
import { UPGRADE_ORDER, type UpgradeId } from '../data/upgrades';
import type { EventSink } from './events';
import { createAssignments, createInitialState, createJobMetrics, createJobs, type GameState } from './state';

/** Flyway Stars a season's coins are worth. */
export function starsFor(seasonCoins: Decimal): number {
  if (seasonCoins.lte(0)) return 0;
  return Math.floor(Math.sqrt(seasonCoins.div(PRESTIGE.divisor).toNumber()));
}

/** Coins needed this season for the next star. */
export function coinsForNextStar(seasonCoins: Decimal): Decimal {
  const n = starsFor(seasonCoins) + 1;
  return new Decimal(PRESTIGE.divisor).mul(n * n);
}

/** Permanent production multiplier from every star ever earned. */
export function starMultiplier(state: GameState): number {
  return 1 + PRESTIGE.bonusPerStar * state.legacy.earned;
}

export const hasPerk = (state: GameState, id: PerkId): boolean => (state.legacy.perks[id] ?? 0) > 0;

/** How many ranks of a perk are owned (0 = none). */
export const perkRank = (state: GameState, id: PerkId): number => state.legacy.perks[id] ?? 0;

/** Highest rank a perk can reach (1 for a one-time perk). */
export const perkMaxRank = (id: PerkId): number => PERKS[id].maxRank ?? 1;

/** Stars for the next rank, given how many are owned. */
export function perkCost(id: PerkId, owned: number): number {
  const p = PERKS[id];
  return p.cost + (p.costStep ?? 0) * owned;
}

/** Is this perk's branch open? (A flyway's branch opens once you've hunted it.) */
export function branchOpen(state: GameState, branch: BranchId): boolean {
  return branch === 'lodge' || !!state.legacy.flyways[branch] || state.flyway === branch;
}

export function canBuyPerk(state: GameState, id: PerkId): boolean {
  const p = PERKS[id];
  const rank = perkRank(state, id);
  return rank < perkMaxRank(id) && branchOpen(state, p.branch) && state.legacy.stars >= perkCost(id, rank) && p.requires.every((r) => hasPerk(state, r));
}

export function buyPerk(state: GameState, id: PerkId, events?: EventSink): boolean {
  if (!canBuyPerk(state, id)) return false;
  const rank = perkRank(state, id);
  state.legacy.stars -= perkCost(id, rank);
  state.legacy.perks[id] = rank + 1;
  events?.push({ type: 'perkBought', perk: id });
  return true;
}

/** Stars spent on every perk owned (what a refund gives back). */
export function starsInPerks(state: GameState): number {
  let n = 0;
  for (const id of PERK_ORDER) for (let r = 0; r < perkRank(state, id); r++) n += perkCost(id, r);
  return n;
}

/** One free refund of every perk, once per season. */
export function canRespec(state: GameState): boolean {
  return state.legacy.respecSeason !== state.season.number && starsInPerks(state) > 0;
}

export function respecPerks(state: GameState): number {
  if (!canRespec(state)) return 0;
  const back = starsInPerks(state);
  state.legacy.stars += back;
  state.legacy.perks = {};
  state.legacy.respecSeason = state.season.number;
  return back;
}

/** Everything the Legacy perks add up to, in the shape the sim reads. */
export interface LegacyFx {
  coins: number;
  feathers: number;
  /** × every hunt job's speed. */
  speed: number;
  job: Partial<Record<JobId, number>>;
  groundCoins: Partial<Record<GroundId, number>>;
  groundFeathers: Partial<Record<GroundId, number>>;
  groundFlocks: Partial<Record<GroundId, number>>;
  incoming: Partial<Record<GroundId, number>>;
  fog: number;
  rare: number;
  legendary: number;
  crops: number;
  fieldDecoys: number;
}

let fxFor: object | null = null;
let fxKey = '';
let fxCache: LegacyFx | null = null;

export function legacyFx(state: GameState): LegacyFx {
  const perks = state.legacy.perks;
  let key = '';
  for (const id of PERK_ORDER) key += perks[id] ?? 0;
  if (fxCache && fxFor === perks && key === fxKey) return fxCache;
  const r = (id: PerkId) => perks[id] ?? 0;
  const on = (id: PerkId) => r(id) > 0;
  const fx: LegacyFx = {
    coins: 1 + 0.1 * r('oldMoney'),
    feathers: 1 + 0.1 * r('fineFeathers'),
    speed: 1 + 0.05 * r('deepBench'),
    job: {},
    groundCoins: {},
    groundFeathers: {},
    groundFlocks: {},
    incoming: {},
    fog: on('fogWalkers') ? 1.25 : 1,
    rare: on('riceCountry') ? 1.25 : 1,
    legendary: on('rareAir') ? 2 : 1,
    crops: on('valleyHarvest') ? 1.5 : 1,
    fieldDecoys: on('cornfieldDeals') ? 0.5 : 1,
  };
  if (on('cypressCalls')) fx.job.call = fx.job.tHunt = 1.25;
  if (on('saltSpray')) fx.job.bHunt = 1.25;
  if (on('woodDuckBoxes')) fx.groundFlocks.timber = 1.3;
  if (on('prairieWind')) fx.groundFlocks.field = 1.3;
  if (on('seaDuckRigs')) fx.groundFlocks.bay = 1.3;
  if (on('bayouBrokers')) fx.groundCoins.marsh = fx.groundCoins.timber = 1.25;
  if (on('honkerKings')) fx.groundCoins.field = 1.5;
  if (on('coastalCharter')) fx.groundCoins.bay = 1.5;
  if (on('eiderDown')) fx.groundFeathers.bay = 1.5;
  if (on('bigSky')) fx.incoming.marsh = fx.incoming.field = 1;
  fxFor = perks;
  fxKey = key;
  fxCache = fx;
  return fx;
}

/** The flyway the next season will move to (or stay in, if no new one is open). */
export function nextFlyway(state: GameState): FlywayId {
  const order: FlywayId[] = ['mississippi', 'central', 'pacific', 'atlantic'];
  const i = order.indexOf(state.flyway);
  const n = order[i + 1];
  return n && FLYWAYS[n].available ? n : state.flyway;
}

/**
 * Close the season: bank Flyway Stars, keep the Field Guide, patches,
 * lifetime stats, legacy and the workflow board; reset the marsh, crew
 * and currencies; apply start-of-season perks.
 */
export function closeSeason(state: GameState, toFlyway: FlywayId, events?: EventSink): number {
  const stars = starsFor(state.season.coins);
  if (stars < 1) return 0;
  const fresh = createInitialState(state.environment.seed + state.season.number, state.meta.createdAt);
  state.legacy.stars += stars;
  state.legacy.earned += stars;
  state.stats.seasonsClosed += 1;
  state.season = { number: state.season.number + 1, coins: new Decimal(0) };
  state.flyway = FLYWAYS[toFlyway].available ? toFlyway : state.flyway;

  state.currencies = fresh.currencies;
  state.hunt = fresh.hunt;
  state.field = fresh.field;
  state.timber = fresh.timber;
  state.bay = fresh.bay;
  state.bots = fresh.bots;
  state.assign = createAssignments();
  state.jobs = createJobs();
  state.problems = fresh.problems;
  state.tinkerWork = 0;
  state.metrics = { sec: Math.floor(state.elapsed), jobs: createJobMetrics() };
  state.acres = fresh.acres;
  state.upgrades = Object.fromEntries(UPGRADE_ORDER.map((u) => [u, 0])) as Record<UpgradeId, number>;
  state.rungs = {};
  state.plots = fresh.plots;
  state.returning = [];
  state.clock = { dayTime: fresh.clock.dayTime, day: 1 };

  // Start-of-season perks
  if (hasPerk(state, 'headStart')) {
    state.currencies.coins = state.currencies.coins.add(500);
    state.currencies.feathers = state.currencies.feathers.add(50);
  }
  if (hasPerk(state, 'nestEgg')) {
    state.currencies.coins = state.currencies.coins.add(10_000);
    state.currencies.feathers = state.currencies.feathers.add(500);
  }
  if (hasPerk(state, 'earlyRiser')) {
    for (const [bot, n] of [['caller', 2], ['blind', 2], ['retriever', 2], ['setter', 1]] as const) {
      state.bots[bot].owned += n;
      state.assign[bot][BOTS[bot].job] = n;
    }
  }
  if (hasPerk(state, 'seasonedCrew')) for (const id of BOT_ORDER) state.bots[id].level = 2;
  if (hasPerk(state, 'homecoming')) {
    for (const bot of ['caller', 'blind', 'retriever', 'ledger'] as const) {
      state.bots[bot].owned += 5;
      state.assign[bot][BOTS[bot].job] = (state.assign[bot][BOTS[bot].job] ?? 0) + 5;
    }
  }
  // Hunting a new flyway opens its Legacy branch.
  state.legacy.flyways[state.flyway] = true;

  events?.push({ type: 'seasonClosed', stars, season: state.season.number - 1, flyway: state.flyway });
  return stars;
}
