import Decimal from 'break_infinity.js';
import { BOT_ORDER, BOTS } from '../data/economy';
import { FLYWAYS, type FlywayId } from '../data/flyways';
import { PERKS, PRESTIGE, type PerkId } from '../data/legacy';
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

export const hasPerk = (state: GameState, id: PerkId): boolean => !!state.legacy.perks[id];

export function canBuyPerk(state: GameState, id: PerkId): boolean {
  const p = PERKS[id];
  return !hasPerk(state, id) && state.legacy.stars >= p.cost && p.requires.every((r) => hasPerk(state, r));
}

export function buyPerk(state: GameState, id: PerkId, events?: EventSink): boolean {
  if (!canBuyPerk(state, id)) return false;
  state.legacy.stars -= PERKS[id].cost;
  state.legacy.perks[id] = true;
  events?.push({ type: 'perkBought', perk: id });
  return true;
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
  state.bots = fresh.bots;
  state.assign = createAssignments();
  state.jobs = createJobs();
  state.problems = fresh.problems;
  state.tinkerWork = 0;
  state.metrics = { sec: Math.floor(state.elapsed), jobs: createJobMetrics() };
  state.acres = fresh.acres;
  state.upgrades = Object.fromEntries(UPGRADE_ORDER.map((u) => [u, 0])) as Record<UpgradeId, number>;
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

  events?.push({ type: 'seasonClosed', stars, season: state.season.number - 1, flyway: state.flyway });
  return stars;
}
