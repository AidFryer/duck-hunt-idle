import Decimal from 'break_infinity.js';
import type { DayPhaseId } from '../data/dayCycle';
import {
  BOT_ORDER, BOTS, FOREMAN, HUNT, JOB_ORDER, JOBS, LEDGER, PROBLEMS, TINKER,
  type BotId, type HuntStage, type JobId, type ProblemKind,
} from '../data/economy';
import { currentGoal } from '../data/goals';
import { FEATURE_ORDER, FEATURES, type FeatureId } from '../data/features';
import { ACHIEVEMENTS } from '../data/achievements';
import { SPECIES, SPECIES_ORDER, type SpeciesId } from '../data/species';
import { UPGRADE_ORDER, UPGRADES, type UpgradeId } from '../data/upgrades';
import { WEATHER, type WeatherId } from '../data/weather';
import { offlineCapSeconds, upgradePrice } from '../sim/upgrades';
import { FLYWAYS, FLYWAY_ORDER, type FlywayId } from '../data/flyways';
import { PERK_ORDER, PERKS, PRESTIGE, type PerkId } from '../data/legacy';
import { SPECIALS, WORKFLOW, type NodeKind } from '../data/workflows';
import { canBuyPerk, coinsForNextStar, nextFlyway, starsFor } from '../sim/prestige';
import { ALL_CARDS, cardUnlocked, linkKey, workflowEval, workflowUnlocked } from '../sim/workflow';
import { clockAt, duckActivityAt, formatClock } from '../sim/clock';
import {
  acrePrice, botPrice, botReliability, botUnitSpeed, canAfford, levelPrice, maxAffordableBots,
  milestoneMultiplier, nextMilestone, reputationMultiplier, spreadSize, maxIncoming, botPriceMult, type Price,
} from '../sim/economy';
import { canDo } from '../sim/hunt';
import { assigned, contribution, jobRate, stuck } from '../sim/jobs';
import { successRate, throughput } from '../sim/metrics';
import { foremanCapacity, retryChance, retryDelay } from '../sim/problems';
import type { GameState, Problem } from '../sim/state';

export interface BotSnapshot {
  id: BotId;
  owned: number;
  level: number;
  /** Actions/sec for all of this type that are working right now. */
  rate: number;
  unitSpeed: number;
  reliability: number;
  multiplier: number;
  nextMilestone: number | null;
  price: Price;
  affordable: boolean;
  maxAffordable: number;
  levelPrice: Price;
  levelAffordable: boolean;
  revealed: boolean;
  stuck: number;
  bench: number;
}

export interface JobToken {
  bot: BotId;
  count: number;
  stuck: number;
}

export interface JobSnapshot {
  id: JobId;
  name: string;
  blurb: string;
  /** Capacity: actions/sec the assigned crew could do. */
  rate: number;
  /** Actual completed actions/sec over the last minute. */
  throughput: number;
  queue: string;
  /** True when work is piling up faster than this job clears it. */
  backedUp: boolean;
  success: number;
  spark: number[];
  fails: number[];
  tokens: JobToken[];
  /** Done by hand / Gus when no bots are here. */
  manual: string | null;
}

export interface ProblemRow {
  id: number;
  bot: BotId;
  title: string;
  status: Problem['status'];
  statusText: string;
  ago: number;
  needsYou: boolean;
}

/** A read-only, render-friendly view of the sim for the HUD. */
export interface HudSnapshot {
  day: number;
  clock: string;
  phaseId: DayPhaseId;
  phaseLabel: string;
  hour: number;
  activity: number;
  wind: number;
  coins: Decimal;
  feathers: Decimal;
  bag: number;
  bestBag: number;
  lifetimeBirds: number;
  lostToday: number;
  decoys: number;
  spread: number;
  incoming: number;
  committed: number;
  downed: number;
  ledger: number;
  reputation: number;
  keeperRate: number;
  can: Record<HuntStage, boolean>;
  /** Automation per stage (actions/sec), for the hunt buttons. */
  auto: Record<HuntStage, number>;
  bots: Record<BotId, BotSnapshot>;
  jobs: Record<JobId, JobSnapshot>;
  problems: ProblemRow[];
  openProblems: number;
  needsYou: number;
  problemStats: { total: number; byYou: number; byForeman: number; escalated: number };
  foreman: { retries: number; backoff: number; chance: number; delays: number[]; capacity: number; hired: boolean };
  weather: { id: WeatherId; name: string; blurb: string; next: WeatherId; nextName: string; changeAt: string };
  guide: { id: SpeciesId; count: number; found: boolean }[];
  speciesFound: number;
  achievements: { id: string; unlocked: boolean }[];
  patches: number;
  upgrades: { id: UpgradeId; level: number; max: number; price: Price; affordable: boolean; revealed: boolean }[];
  offlineHours: number;
  unlocks: Record<FeatureId, boolean>;
  featureProgress: Record<FeatureId, [number, number]>;
  workflow: {
    unlocked: boolean;
    unlockCoins: number;
    nodes: { id: number; kind: NodeKind; active: boolean }[];
    links: { from: number; to: number; state: 'good' | 'tangled' }[];
    palette: { kind: NodeKind; unlocked: boolean; placed: boolean; hint: string }[];
    bonus: number;
    complete: boolean;
    goodLinks: number;
    effects: string[];
  };
  season: {
    number: number;
    coins: Decimal;
    starsNow: number;
    nextStarAt: Decimal;
    progress: number;
    flyway: FlywayId;
    nextFlyway: FlywayId;
  };
  legacy: {
    stars: number;
    earned: number;
    bonus: number;
    perks: { id: PerkId; owned: boolean; canBuy: boolean; prereqsMet: boolean }[];
  };
  flyways: { id: FlywayId; status: 'current' | 'visited' | 'next' | 'locked' | 'soon' }[];
  acres: number;
  acrePrice: Price;
  acreAffordable: boolean;
  lifetimeCoins: Decimal;
  goalId: string;
  goalTitle: string;
  goalGus: string;
  goalIndex: number;
}

function queueFor(state: GameState, job: JobId): { text: string; backedUp: boolean } {
  const h = state.hunt;
  switch (job) {
    case 'scout':
      return { text: `${h.incoming.length}/${maxIncoming(state)} circling`, backedUp: false };
    case 'decoys':
      return { text: `${h.decoys}/${spreadSize(state)} set`, backedUp: h.decoys < spreadSize(state) / 2 };
    case 'call':
      return { text: `${h.incoming.length} waiting`, backedUp: h.incoming.length >= maxIncoming(state) };
    case 'shoot':
      return { text: `${h.committed.length} in range`, backedUp: h.committed.length >= HUNT.maxCommitted };
    case 'retrieve':
      return { text: `${h.downed.length} on water`, backedUp: h.downed.length >= 6 };
    case 'log':
      return { text: `${h.ledger.length} unlogged`, backedUp: h.ledger.length >= 10 };
    case 'foreman': {
      const open = state.problems.open.length;
      return { text: `${open} open`, backedUp: open > foremanCapacity(state) };
    }
    case 'tinker': {
      let low = Infinity;
      for (const id of BOT_ORDER) if (id !== 'tinker' && state.bots[id].owned > 0) low = Math.min(low, state.bots[id].level);
      const need = Number.isFinite(low) ? TINKER.workPerLevel * low : 0;
      return { text: need ? `${Math.floor((state.tinkerWork / need) * 100)}% to a tune-up` : 'Nothing to tune', backedUp: false };
    }
  }
}

function statusText(state: GameState, p: Problem): string {
  switch (p.status) {
    case 'open':
      return state.bots.foreman.owned > 0 ? 'Waiting for the foreman' : 'Needs you';
    case 'retrying':
      return `Foreman retrying (${p.attempts + 1}/${state.foreman.retries})`;
    case 'escalated':
      return `Foreman gave up after ${p.attempts} tries. Needs you`;
    case 'fixed':
      return p.fixedBy === 'foreman' ? (p.attempts > 1 ? `Fixed by the foreman on try ${p.attempts}` : 'Fixed by the foreman') : 'Fixed by you';
  }
}

export function snapshot(state: GameState): HudSnapshot {
  const c = clockAt(state.clock.dayTime);
  const bots = {} as Record<BotId, BotSnapshot>;
  for (const id of BOT_ORDER) {
    const b = state.bots[id];
    const price = botPrice(id, b.owned, 1, botPriceMult(state, id));
    const lp = levelPrice(id, b.level);
    let rate = 0;
    let st = 0;
    for (const j of JOB_ORDER) st += stuck(state, id, j);
    for (const j of JOB_ORDER) rate += contribution(state, id, j);
    bots[id] = {
      id,
      owned: b.owned,
      level: b.level,
      rate,
      unitSpeed: botUnitSpeed(id, b.level),
      reliability: botReliability(id, b.level),
      multiplier: milestoneMultiplier(b.owned),
      nextMilestone: nextMilestone(b.owned),
      price,
      affordable: canAfford(state, price),
      maxAffordable: maxAffordableBots(state, id),
      levelPrice: lp,
      levelAffordable: b.owned > 0 && canAfford(state, lp),
      revealed: b.owned > 0 || state.stats.lifetimeCoins.gte(BOTS[id].revealAtCoins),
      stuck: st,
      bench: assigned(state, id, 'bench'),
    };
  }

  const jobs = {} as Record<JobId, JobSnapshot>;
  for (const j of JOB_ORDER) {
    const q = queueFor(state, j);
    const tokens: JobToken[] = [];
    for (const id of BOT_ORDER) {
      const n = assigned(state, id, j);
      if (n > 0) tokens.push({ bot: id, count: n, stuck: stuck(state, id, j) });
    }
    const m = state.metrics.jobs[j];
    jobs[j] = {
      id: j,
      name: JOBS[j].name,
      blurb: JOBS[j].blurb,
      rate: jobRate(state, j) + (j === 'log' ? LEDGER.keeperRate : 0),
      throughput: throughput(state, j),
      queue: q.text,
      backedUp: q.backedUp,
      success: successRate(state, j),
      spark: [...m.done],
      fails: [...m.fail],
      tokens,
      manual: j === 'log' ? `Gus logs ${LEDGER.keeperRate}/s` : j === 'foreman' || j === 'tinker' || j === 'scout' ? null : 'You, by hand',
    };
  }

  const rows: ProblemRow[] = [];
  const order = { escalated: 0, open: 1, retrying: 2, fixed: 3 } as const;
  for (const p of [...state.problems.open].sort((a, b) => order[a.status] - order[b.status] || b.at - a.at)) {
    rows.push(row(state, p));
  }
  for (let i = state.problems.closed.length - 1; i >= 0; i--) rows.push(row(state, state.problems.closed[i]!));
  const needsYou = state.problems.open.filter((p) => p.status === 'escalated' || (p.status === 'open' && state.bots.foreman.owned === 0)).length;

  const ap = acrePrice(state.acres);
  const goal = currentGoal(state);
  const env = state.environment;
  const changeClock = clockAt(state.clock.dayTime + Math.max(0, env.weatherUntil - state.elapsed));
  return {
    day: state.clock.day,
    clock: formatClock(c.hour),
    phaseId: c.phase.id,
    phaseLabel: c.phase.label,
    hour: c.hour,
    activity: duckActivityAt(c.hour),
    wind: state.environment.wind,
    coins: state.currencies.coins,
    feathers: state.currencies.feathers,
    bag: state.hunt.bag,
    bestBag: state.stats.bestBag,
    lifetimeBirds: state.stats.lifetimeBirds,
    lostToday: state.stats.lostToday,
    decoys: state.hunt.decoys,
    spread: spreadSize(state),
    incoming: state.hunt.incoming.length,
    committed: state.hunt.committed.length,
    downed: state.hunt.downed.length,
    ledger: state.hunt.ledger.length,
    reputation: reputationMultiplier(state),
    keeperRate: LEDGER.keeperRate,
    can: {
      decoys: canDo(state, 'decoys'),
      call: canDo(state, 'call'),
      shoot: canDo(state, 'shoot'),
      retrieve: canDo(state, 'retrieve'),
      log: canDo(state, 'log'),
    },
    auto: {
      decoys: jobRate(state, 'decoys'),
      call: jobRate(state, 'call'),
      shoot: jobRate(state, 'shoot'),
      retrieve: jobRate(state, 'retrieve'),
      log: jobRate(state, 'log'),
    },
    bots,
    jobs,
    problems: rows,
    openProblems: state.problems.open.length,
    needsYou,
    problemStats: {
      total: state.problems.total,
      byYou: state.problems.fixedByYou,
      byForeman: state.problems.fixedByForeman,
      escalated: state.problems.escalated,
    },
    foreman: {
      retries: state.foreman.retries,
      backoff: state.foreman.backoff,
      chance: retryChance(state),
      delays: Array.from({ length: state.foreman.retries }, (_, i) => retryDelay(state, i)),
      capacity: foremanCapacity(state),
      hired: state.bots.foreman.owned > 0,
    },
    weather: {
      id: env.weather,
      name: WEATHER[env.weather].name,
      blurb: WEATHER[env.weather].blurb,
      next: env.nextWeather,
      nextName: WEATHER[env.nextWeather].name,
      changeAt: formatClock(changeClock.hour),
    },
    guide: SPECIES_ORDER.map((id) => ({ id, count: state.guide[id]?.count ?? 0, found: (state.guide[id]?.count ?? 0) > 0 })),
    speciesFound: SPECIES_ORDER.filter((id) => (state.guide[id]?.count ?? 0) > 0).length,
    achievements: ACHIEVEMENTS.map((a) => ({ id: a.id, unlocked: state.achievements[a.id] !== undefined })),
    patches: Object.keys(state.achievements).length,
    upgrades: UPGRADE_ORDER.map((id) => {
      const level = state.upgrades[id] ?? 0;
      const price = upgradePrice(id, level);
      const max = UPGRADES[id].maxLevel;
      return {
        id, level, max, price,
        affordable: level < max && canAfford(state, price),
        revealed: level > 0 || state.stats.lifetimeCoins.gte(UPGRADES[id].revealAtCoins),
      };
    }),
    offlineHours: offlineCapSeconds(state) / 3600,
    unlocks: Object.fromEntries(FEATURE_ORDER.map((f) => [f, state.unlocks[f] !== undefined])) as Record<FeatureId, boolean>,
    featureProgress: Object.fromEntries(FEATURE_ORDER.map((f) => [f, FEATURES[f].progress(state)])) as Record<FeatureId, [number, number]>,
    workflow: workflowSnap(state),
    season: (() => {
      const starsNow = starsFor(state.season.coins);
      const next = coinsForNextStar(state.season.coins);
      const prev = new Decimal(PRESTIGE.divisor).mul(starsNow * starsNow);
      const span = next.sub(prev);
      return {
        number: state.season.number,
        coins: state.season.coins,
        starsNow,
        nextStarAt: next,
        progress: Math.max(0, Math.min(1, state.season.coins.sub(prev).div(span).toNumber())),
        flyway: state.flyway,
        nextFlyway: nextFlyway(state),
      };
    })(),
    legacy: {
      stars: state.legacy.stars,
      earned: state.legacy.earned,
      bonus: PRESTIGE.bonusPerStar * state.legacy.earned,
      perks: PERK_ORDER.map((id) => ({
        id,
        owned: !!state.legacy.perks[id],
        canBuy: canBuyPerk(state, id),
        prereqsMet: PERKS[id].requires.every((q) => !!state.legacy.perks[q]),
      })),
    },
    flyways: FLYWAY_ORDER.map((id) => {
      const i = FLYWAY_ORDER.indexOf(id);
      const cur = FLYWAY_ORDER.indexOf(state.flyway);
      const status = id === state.flyway ? 'current' : !FLYWAYS[id].available ? 'soon' : i < cur ? 'visited' : id === nextFlyway(state) ? 'next' : 'locked';
      return { id, status } as const;
    }),
    acres: state.acres,
    acrePrice: ap,
    acreAffordable: canAfford(state, ap),
    lifetimeCoins: state.stats.lifetimeCoins,
    goalId: goal.goal.id,
    goalTitle: goal.goal.title,
    goalGus: goal.goal.gus,
    goalIndex: goal.index,
  };
}

function row(state: GameState, p: Problem): ProblemRow {
  return {
    id: p.id,
    bot: p.bot,
    title: PROBLEMS[p.kind as ProblemKind].title,
    status: p.status,
    statusText: statusText(state, p),
    ago: Math.max(0, state.elapsed - (p.closedAt ?? p.at)),
    needsYou: p.status === 'escalated' || (p.status === 'open' && state.bots.foreman.owned === 0),
  };
}

export const MAX_COMMITTED = HUNT.maxCommitted;
export const SPECIES_DEFS = SPECIES;
export const FOREMAN_LIMITS = FOREMAN;

export function activityLabel(a: number): string {
  if (a > 0.8) return 'Ducks are flying!';
  if (a > 0.55) return 'Lots of activity';
  if (a > 0.3) return 'Steady';
  if (a > 0.12) return 'Quiet';
  return 'Resting';
}

export function windLabel(w: number): string {
  if (w > 0.65) return 'Gusty';
  if (w > 0.45) return 'Breezy';
  if (w > 0.25) return 'Light breeze';
  return 'Calm';
}

function workflowSnap(state: GameState): HudSnapshot['workflow'] {
  const ev = workflowEval(state);
  const placed = new Set(state.workflow.nodes.map((n) => n.kind));
  const effects: string[] = [];
  if (ev.bonus > 0) effects.push(`+${Math.round(ev.bonus * 100)}% speed for every hunt job`);
  if (ev.fogFlockRate > 1) effects.push(`+${Math.round((ev.fogFlockRate - 1) * 100)}% flocks in fog`);
  if (ev.rareMult > 1) effects.push(`Rare birds ×${ev.rareMult}`);
  if (ev.flockRate < 1) effects.push(`${Math.round((ev.flockRate - 1) * 100)}% flocks`);
  for (const [j, m] of Object.entries(ev.problemMult)) effects.push(`${Math.round((1 - (m ?? 1)) * 100)}% fewer problems at ${j}`);
  if (ev.dawnSpeed > 0) effects.push(`+${Math.round(ev.dawnSpeed * 100)}% speed at sunrise`);
  if (ev.noIce) effects.push('No icy calls; +1 bird per flock in cold fronts');
  return {
    unlocked: workflowUnlocked(state),
    unlockCoins: WORKFLOW.unlockCoins,
    nodes: state.workflow.nodes.map((n) => ({ id: n.id, kind: n.kind, active: !!ev.active[n.id] })),
    links: state.workflow.links.map((l) => ({ from: l.from, to: l.to, state: ev.linkState[linkKey(l)] ?? 'tangled' })),
    palette: ALL_CARDS.map((kind) => {
      const sp = kind in SPECIALS ? SPECIALS[kind as keyof typeof SPECIALS] : null;
      const hint = sp ? (sp.unlockSeasons > 0 ? 'Close a season to unlock' : `Earn ${sp.unlockCoins.toLocaleString()} coins`) : '';
      return { kind, unlocked: cardUnlocked(state, kind), placed: placed.has(kind), hint };
    }),
    bonus: ev.bonus,
    complete: ev.complete,
    goodLinks: ev.goodLinks,
    effects,
  };
}
