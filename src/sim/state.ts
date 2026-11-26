import type { RungId } from '../data/progression';
import Decimal from 'break_infinity.js';
import { NEW_GAME_DAY_TIME } from '../data/dayCycle';
import { ACRES, BOT_ORDER, FOREMAN, JOB_ORDER, START, type BotId, type JobId, type ProblemKind, type Slot, type SpeciesId } from '../data/economy';

/** Bump when the save shape changes, and add a migration in save.ts. */
export const SAVE_VERSION = 11;

export type { WeatherId } from '../data/weather';
import type { WeatherId } from '../data/weather';
import { UPGRADE_ORDER, type UpgradeId } from '../data/upgrades';
import type { FlywayId } from '../data/flyways';
import type { PerkId } from '../data/legacy';
import type { NodeKind } from '../data/workflows';
import type { FeatureId } from '../data/features';

/** A flock of ducks moving through the hunt pipeline. */
export interface FlockState {
  id: number;
  /** A golden flock: bots leave it alone; shoot it yourself for a bonus. */
  golden?: boolean;
  species: SpeciesId;
  size: number;
  /** Seconds spent in its current queue (for patience timeouts). */
  age: number;
}

/** One hunting ground's flocks and spread (the marsh and the goose field). */
export interface GroundState {
  decoys: number;
  decoyDrift: number;
  flockCountdown: number;
  incoming: FlockState[];
  committed: FlockState[];
  downed: SpeciesId[];
}

export interface BotState {
  owned: number;
  level: number;
}

/** A bot that hit a snag (an "exception" in orchestrator terms). */
export interface Problem {
  id: number;
  bot: BotId;
  job: JobId;
  kind: ProblemKind;
  /** Sim time (elapsed seconds) it happened. */
  at: number;
  /** Foreman retries made so far. */
  attempts: number;
  /** When the foreman's next retry lands (elapsed seconds), or -1. */
  nextAt: number;
  status: 'open' | 'retrying' | 'escalated' | 'fixed';
  fixedBy?: 'you' | 'foreman';
  closedAt?: number;
}

export interface WorkflowNode {
  id: number;
  kind: NodeKind;
}

export interface WorkflowLink {
  from: number;
  to: number;
}

export interface JobMetrics {
  /** Actions completed per second, oldest first (last 60 s). */
  done: number[];
  /** Problems per second, oldest first (last 60 s). */
  fail: number[];
  totalDone: number;
  totalFail: number;
}

/**
 * The complete game state. Plain data plus break_infinity Decimals for
 * currencies; save.ts converts Decimals to strings for storage.
 */
export interface GameState {
  version: number;
  /** Total simulated seconds since the save was created. */
  elapsed: number;
  /** Ticks simulated. */
  tick: number;
  /** PRNG state (mulberry32) — makes the sim deterministic and replayable. */
  rng: number;
  clock: {
    /** Seconds into the current day, 0 ≤ dayTime < DAY_LENGTH_SECONDS. */
    dayTime: number;
    /** Day counter, starting at 1. */
    day: number;
  };
  environment: {
    weather: WeatherId;
    /** Sim time (elapsed) when the current weather changes. */
    weatherUntil: number;
    /** What's coming next (shown in the forecast). */
    nextWeather: WeatherId;
    /** Wind strength 0–1. */
    wind: number;
    /** Seed for deterministic environmental noise. */
    seed: number;
  };
  currencies: {
    coins: Decimal;
    feathers: Decimal;
  };
  hunt: {
    /** Decoys currently set out in the spread. */
    decoys: number;
    /** 0–1 progress until the next decoy drifts loose. */
    decoyDrift: number;
    /** Countdown (in "flock units") to the next arrival. */
    flockCountdown: number;
    nextFlockId: number;
    /** Flocks circling, waiting to be called in. */
    incoming: FlockState[];
    /** Flocks working the decoys, in range for a shot. */
    committed: FlockState[];
    /** Birds on the water waiting for a retrieve. */
    downed: SpeciesId[];
    /** Birds brought in today (resets each pre-dawn). */
    bag: number;
    /** Retrieved birds waiting to be logged at the lodge (logging pays coins). */
    ledger: SpeciesId[];
    /** Gus's own logging progress (0–1). */
    keeperProgress: number;
    /** Hunter's Rhythm streak level (0 = none). */
    streak: number;
    /** Sim time of the last manual action. */
    lastManualAt: number;
  };
  /** The goose field (opens with the Sporting Club). Flock ids share hunt.nextFlockId. */
  field: GroundState;
  /** Sim seconds until the next golden flock. */
  goldenTimer: number;
  /** The player's name and picture. */
  profile: { name: string; avatar: string };
  bots: Record<BotId, BotState>;
  /** How many of each bot type work each job (or rest on the bench). */
  assign: Record<BotId, Partial<Record<Slot, number>>>;
  /** Fractional work banked toward each job's next action. */
  jobs: Record<JobId, { progress: number }>;
  problems: {
    nextId: number;
    open: Problem[];
    /** Most recent closed problems, newest last. */
    closed: Problem[];
    total: number;
    fixedByYou: number;
    fixedByForeman: number;
    escalated: number;
  };
  foreman: {
    /** Retries before a problem is handed back to the player. */
    retries: number;
    /** Seconds before the first retry; doubles after each miss. */
    backoff: number;
  };
  /** Banked Tinker work toward the next free tune-up. */
  tinkerWork: number;
  metrics: {
    /** Whole sim second the newest bucket belongs to. */
    sec: number;
    jobs: Record<JobId, JobMetrics>;
  };
  /** Restored wetland acres (Wetland Acres currency). */
  acres: number;
  /** Marsh & lodge upgrade levels. */
  upgrades: Record<UpgradeId, number>;
  /** Lodge level (1 Duck Shack … 5 Grand Lodge). Permanent across seasons. */
  lodge: number;
  /** Bot plans earned by hand. Permanent. */
  plans: Partial<Record<BotId, true>>;
  /** Automation ladder rungs built this season. */
  rungs: Partial<Record<RungId, true>>;
  /** Field Guide: birds brought in per species. */
  guide: Partial<Record<SpeciesId, { count: number; firstAt: number }>>;
  /** Unlocked achievement ids → sim time unlocked. */
  achievements: Record<string, number>;
  /** Which flyway (map) this season is in. */
  flyway: FlywayId;
  season: {
    /** 1 for the first season. */
    number: number;
    /** Coins earned this season (drives Flyway Stars). */
    coins: Decimal;
  };
  legacy: {
    /** Unspent Flyway Stars. */
    stars: number;
    /** Every star ever earned (each gives a permanent production bonus). */
    earned: number;
    perks: Partial<Record<PerkId, boolean>>;
  };
  workflow: {
    nextId: number;
    nodes: WorkflowNode[];
    links: WorkflowLink[];
  };
  /** Tabs/features unlocked so far → sim time unlocked. Permanent. */
  unlocks: Partial<Record<FeatureId, number>>;
  /** Flocks that left but may circle back (Central Flyway). */
  returning: { flock: FlockState; at: number }[];
  stats: {
    lifetimeCoins: Decimal;
    lifetimeFeathers: Decimal;
    lifetimeBirds: number;
    bestBag: number;
    lifetimeLogged: number;
    flocksCalled: number;
    flocksFlared: number;
    /** Flocks that left, flared or passed by today. */
    lostToday: number;
    shots: number;
    manualActions: number;
    /** Geese and cranes brought in from the field. */
    geese: number;
    /** Golden flocks shot by hand. */
    goldenShot: number;
    /** Hand actions per hunt step (the on-marsh hints stop after a couple each). */
    manualByJob: Partial<Record<string, number>>;
    /** Times the player moved a bot on the Job Board. */
    botMoves: number;
    birdsByWeather: Partial<Record<WeatherId, number>>;
    nightBirds: number;
    /** Longest offline gap (seconds) the player came back from. */
    longestAway: number;
    seasonsClosed: number;
  };
  meta: {
    /** Wall-clock ms when this save was created / last written. */
    createdAt: number;
    lastSaved: number;
    /** Local date (YYYY-MM-DD) the First Light gift was last given. */
    lastDailyBonus: string;
  };
}

export function createBotStates(): Record<BotId, BotState> {
  const out = {} as Record<BotId, BotState>;
  for (const id of BOT_ORDER) out[id] = { owned: 0, level: 1 };
  return out;
}

export const METRIC_WINDOW = 60;

export function createJobMetrics(): Record<JobId, JobMetrics> {
  const out = {} as Record<JobId, JobMetrics>;
  for (const j of JOB_ORDER) {
    out[j] = { done: new Array(METRIC_WINDOW).fill(0), fail: new Array(METRIC_WINDOW).fill(0), totalDone: 0, totalFail: 0 };
  }
  return out;
}

export function createAssignments(): Record<BotId, Partial<Record<Slot, number>>> {
  const out = {} as Record<BotId, Partial<Record<Slot, number>>>;
  for (const id of BOT_ORDER) out[id] = {};
  return out;
}

export function createJobs(): Record<JobId, { progress: number }> {
  const out = {} as Record<JobId, { progress: number }>;
  for (const j of JOB_ORDER) out[j] = { progress: 0 };
  return out;
}

export function createInitialState(seed = 1337, now = 0): GameState {
  return {
    version: SAVE_VERSION,
    elapsed: 0,
    tick: 0,
    rng: (seed ^ 0x5bd1e995) >>> 0,
    clock: { dayTime: NEW_GAME_DAY_TIME, day: 1 },
    environment: { weather: 'clear', weatherUntil: 200, nextWeather: 'fog', wind: 0.35, seed },
    currencies: { coins: new Decimal(START.coins), feathers: new Decimal(START.feathers) },
    hunt: {
      decoys: START.decoys,
      decoyDrift: 0,
      flockCountdown: 0.6,
      nextFlockId: 1,
      incoming: [],
      committed: [],
      downed: [],
      bag: 0,
      ledger: [],
      keeperProgress: 0,
      streak: 0,
      lastManualAt: -999,
    },
    field: { decoys: 0, decoyDrift: 0, flockCountdown: 3, incoming: [], committed: [], downed: [] },
    goldenTimer: 200,
    profile: { name: '', avatar: 'hunter' },
    bots: createBotStates(),
    assign: createAssignments(),
    jobs: createJobs(),
    problems: { nextId: 1, open: [], closed: [], total: 0, fixedByYou: 0, fixedByForeman: 0, escalated: 0 },
    foreman: { retries: FOREMAN.retriesDefault, backoff: FOREMAN.backoffDefault },
    tinkerWork: 0,
    metrics: { sec: 0, jobs: createJobMetrics() },
    acres: ACRES.start,
    upgrades: Object.fromEntries(UPGRADE_ORDER.map((u) => [u, 0])) as Record<UpgradeId, number>,
    lodge: 1,
    plans: {},
    rungs: {},
    guide: {},
    achievements: {},
    flyway: 'mississippi',
    season: { number: 1, coins: new Decimal(0) },
    legacy: { stars: 0, earned: 0, perks: {} },
    workflow: { nextId: 1, nodes: [], links: [] },
    returning: [],
    unlocks: {},
    stats: {
      lifetimeCoins: new Decimal(0),
      lifetimeFeathers: new Decimal(0),
      lifetimeBirds: 0,
      bestBag: 0,
      lifetimeLogged: 0,
      flocksCalled: 0,
      flocksFlared: 0,
      lostToday: 0,
      shots: 0,
      manualActions: 0,
      geese: 0,
      goldenShot: 0,
      manualByJob: {},
      botMoves: 0,
      birdsByWeather: {},
      nightBirds: 0,
      longestAway: 0,
      seasonsClosed: 0,
    },
    meta: { createdAt: now, lastSaved: now, lastDailyBonus: '' },
  };
}

/** Deterministic random number in [0,1) drawn from the state's PRNG. */
export function rand(state: GameState): number {
  let a = (state.rng + 0x6d2b79f5) >>> 0;
  state.rng = a;
  let t = a;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  a = (t ^ (t >>> 14)) >>> 0;
  return a / 4294967296;
}
