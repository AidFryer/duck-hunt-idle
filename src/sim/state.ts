import type { SpecialDayId } from '../data/days';
import type { TrainingId } from '../data/training';
import type { BreedId } from '../data/crew';
import type { CarvingId } from '../data/carvings';
import type { CropId } from '../data/crops';
import type { RungId } from '../data/progression';
import Decimal from 'break_infinity.js';
import { NEW_GAME_DAY_TIME } from '../data/dayCycle';
import { ACRES, STANDS, BOT_ORDER, FOREMAN, JOB_ORDER, START, type BotId, type JobId, type ProblemKind, type Slot, type SpeciesId } from '../data/economy';

/** Bump when the save shape changes, and add a migration in save.ts. */
export const SAVE_VERSION = 29;

/** One flyway's mastery challenges (see data/mastery.ts). */
export interface FlywayMastery {
  /** Best single-day bag here. */
  bag: number;
  /** Kinds of bird brought in here. */
  kinds: Partial<Record<SpeciesId, true>>;
  guests: number;
  /** A Flyway Star earned here. */
  star: boolean;
  mastered: boolean;
}
/**
 * Saves older than this are from before the everyone-starts-over update.
 * They load only when restored by hand; a normal start begins fresh.
 */
export const FRESH_START_VERSION = 19;

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
export interface GuestRequest {
  id: number;
  who: string;
  kind: 'birds' | 'species' | 'weather' | 'geese' | 'golden';
  species?: SpeciesId;
  weather?: string;
  target: number;
  progress: number;
  coins: number;
  feathers: number;
  /** In-game day after which an unfilled booking leaves. */
  expires: number;
  claimed: boolean;
}

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
  fixedBy?: 'you' | 'foreman' | 'self';
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
    /** Today's named day (Cold Front Push, Bluebird Day…), if any. */
    special: SpecialDayId | null;
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
    /** Ray's own logging progress (0–1). */
    keeperProgress: number;
    /** Crew Rhythm, 0–1: how smoothly the hunt is flowing (pays extra coins). */
    rhythm: number;
    /** Sim time of the last manual action. */
    lastManualAt: number;
  };
  /** The goose field (opens with the Sporting Club). Flock ids share hunt.nextFlockId. */
  field: GroundState;
  /** Flooded Timber and Coastal Bay. */
  timber: GroundState;
  bay: GroundState;
  /** Sim seconds until the next golden flock. */
  goldenTimer: number;
  /** The player's name and picture. */
  profile: { name: string; avatar: string; dogName: string; breed: BreedId };
  /**
   * This lodge on the online leaderboard: its player id, the secret that
   * proves it's us, and the name it holds there. Null until it joins.
   */
  online: { id: string; secret: string; name: string } | null;
  /** Flyway mastery progress, per flyway (kept for good). */
  mastery: Partial<Record<FlywayId, FlywayMastery>>;
  /** Sim time a drifting decoy was last fished out (see sim/drifter.ts). */
  drifterAt: number;
  /** Guest hunting parties: the booking board and the guestbook. */
  guests: { board: GuestRequest[]; served: number; nextId: number };
  /** Crew Training skills learned (kept across seasons). */
  training: Partial<Record<TrainingId, true>>;
  /** Your retriever's training (kept across seasons). */
  dog: { level: number; swim: number };
  /** Carved decoys on the lodge shelf (permanent). */
  carvings: Partial<Record<CarvingId, true>>;
  /** The Big Volley: unlocked for good once the marsh gets busy. */
  volley: {
    unlocked: boolean;
    /** 0–1. */
    charge: number;
    fired: number;
    /** Smoothed pace per second, used for the payout and the quiet tally. */
    birdsRate: number;
    coinsRate: number;
    feathersRate: number;
  };
  /** Bags of decoys bought for each spread. */
  decoyBags: { marsh: number; field: number; timber: number; bay: number };
  /** Food plots on the far bank (how many are usable depends on the lodge). */
  plots: { crop: CropId | null; growth: number; level: number }[];
  /** Levels of the timber, goose field and bay plots (0 = not planted). */
  farPlots: { timber: number; field: number; bay: number };
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
  /** Flooded Timber stands flooded this season. */
  stands: number;
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
    /** Perk ranks owned (1 for a one-time perk). */
    perks: Partial<Record<PerkId, number>>;
    /** Flyways hunted (each opens its Legacy branch). */
    flyways: Partial<Record<FlywayId, true>>;
    /** Season number the free refund was last used in (-1 = never). */
    respecSeason: number;
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
    /** Birds brought in from the flooded timber and from the bay. */
    timberBirds: number;
    bayBirds: number;
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
    /** Birds brought in during each part of the season calendar. */
    birdsByStage: Partial<Record<string, number>>;
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
    environment: { weather: 'clear', weatherUntil: 200, nextWeather: 'fog', wind: 0.35, seed, special: null },
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
      rhythm: 0,
      lastManualAt: -999,
    },
    field: { decoys: 0, decoyDrift: 0, flockCountdown: 3, incoming: [], committed: [], downed: [] },
    timber: { decoys: 0, decoyDrift: 0, flockCountdown: 3, incoming: [], committed: [], downed: [] },
    bay: { decoys: 0, decoyDrift: 0, flockCountdown: 3, incoming: [], committed: [], downed: [] },
    goldenTimer: 200,
    profile: { name: '', avatar: 'hunter', dogName: '', breed: 'yellowLab' },
    online: null,
    drifterAt: 0,
    mastery: {},
    carvings: {},
    guests: { board: [], served: 0, nextId: 1 },
    training: {},
    dog: { level: 1, swim: 0 },
    volley: { unlocked: false, charge: 0, fired: 0, birdsRate: 0, coinsRate: 0, feathersRate: 0 },
    plots: [0, 1, 2, 3].map(() => ({ crop: null, growth: 0, level: 0 })),
    farPlots: { timber: 0, field: 0, bay: 0 },
    decoyBags: { marsh: 0, field: 0, timber: 0, bay: 0 },
    bots: createBotStates(),
    assign: createAssignments(),
    jobs: createJobs(),
    problems: { nextId: 1, open: [], closed: [], total: 0, fixedByYou: 0, fixedByForeman: 0, escalated: 0 },
    foreman: { retries: FOREMAN.retriesDefault, backoff: FOREMAN.backoffDefault },
    tinkerWork: 0,
    metrics: { sec: 0, jobs: createJobMetrics() },
    acres: ACRES.start,
    stands: STANDS.start,
    upgrades: Object.fromEntries(UPGRADE_ORDER.map((u) => [u, 0])) as Record<UpgradeId, number>,
    lodge: 1,
    plans: {},
    rungs: {},
    guide: {},
    achievements: {},
    flyway: 'mississippi',
    season: { number: 1, coins: new Decimal(0) },
    legacy: { stars: 0, earned: 0, perks: {}, flyways: { mississippi: true }, respecSeason: -1 },
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
      timberBirds: 0,
      bayBirds: 0,
      goldenShot: 0,
      manualByJob: {},
      botMoves: 0,
      birdsByWeather: {},
      nightBirds: 0,
      longestAway: 0,
      birdsByStage: {},
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
