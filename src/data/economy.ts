/**
 * Balance data for the hunt pipeline, currencies, bots and acres.
 * Every tunable number in the economy lives here — sim code reads these.
 */

// ---------------------------------------------------------------- hunt flow

export const HUNT = {
  /** Decoys in a full spread at the start (more come from upgrades later). */
  baseSpreadSize: 6,
  /** Real seconds before one decoy drifts loose (wind makes it faster). */
  decoyDriftSeconds: 75,
  /** Wind multiplier on decoy drift: rate × (1 + wind × this). */
  decoyDriftWind: 0.8,

  /** Flocks per second at peak activity, with a full spread and 1 acre. */
  baseFlockRate: 1 / 5,
  /** Exponent on the spread fill ratio (below 1 = forgiving when half set). */
  spreadExponent: 0.7,
  /** Flocks keep arriving at this fraction of the rate with no decoys out. */
  emptySpreadFloor: 0.08,

  /** Flock size range (birds) before acres. */
  flockSizeMin: 3,
  flockSizeMax: 6,

  /** How many flocks can circle (waiting for a call) at once. */
  maxIncoming: 4,
  /** Seconds a circling flock waits for a call before it flies on. */
  incomingPatience: 22,
  /** How many called-in flocks can work the spread at once. */
  maxCommitted: 3,
  /** Seconds a called flock hangs over the decoys before flaring off. */
  committedPatience: 18,

  /** Fraction of a flock taken by one shot (rounded up, at least 1). */
  shotFraction: 0.34,
  /** Birds can float this long before they count as lost (Phase 3). */
  maxDowned: 40,
} as const;

// ---------------------------------------------------------------- species

// Species live in species.ts; re-exported here for convenience.
export { SPECIES, type SpeciesId } from './species';

// ---------------------------------------------------------------- jobs

/** Every job on the Job Board, in pipeline order. */
export type JobId = 'scout' | 'decoys' | 'call' | 'shoot' | 'retrieve' | 'log' | 'foreman' | 'tinker';
/** Jobs the player can also do by hand. */
export type HuntStage = 'decoys' | 'call' | 'shoot' | 'retrieve' | 'log';
/** Where unassigned bots rest. */
export type Slot = JobId | 'bench';

export interface JobDef {
  id: JobId;
  name: string;
  /** One-line description on the job card. */
  blurb: string;
}

export const JOBS: Record<JobId, JobDef> = {
  scout: { id: 'scout', name: 'Scouting', blurb: 'Spot flocks early so more of them find the spread.' },
  decoys: { id: 'decoys', name: 'Set Decoys', blurb: 'Keep the decoy spread full.' },
  call: { id: 'call', name: 'Calling', blurb: 'Call circling flocks down to the decoys.' },
  shoot: { id: 'shoot', name: 'The Blind', blurb: 'Take the shot while a flock is in range.' },
  retrieve: { id: 'retrieve', name: 'Retrieving', blurb: 'Bring harvested birds back from the water.' },
  log: { id: 'log', name: 'The Ledger', blurb: 'Log the bag so the lodge gets paid.' },
  foreman: { id: 'foreman', name: 'Foreman Desk', blurb: 'Retry stuck bots automatically.' },
  tinker: { id: 'tinker', name: 'Workshop', blurb: 'Tune bots up and make them more reliable.' },
};

export const JOB_ORDER: readonly JobId[] = ['scout', 'decoys', 'call', 'shoot', 'retrieve', 'log', 'foreman', 'tinker'];
/** Jobs that move birds along the hunt pipeline (shown as a flow on the board). */
export const PIPELINE_JOBS: readonly JobId[] = ['scout', 'decoys', 'call', 'shoot', 'retrieve', 'log'];

/** Speed of a bot working a job that isn't its specialty. */
export const CROSS_JOB_EFFICIENCY = 0.5;

// ---------------------------------------------------------------- bots

export type BotId = 'scout' | 'setter' | 'caller' | 'blind' | 'retriever' | 'ledger' | 'foreman' | 'tinker';

export interface BotDef {
  id: BotId;
  name: string;
  /** Home job: full speed here. */
  job: JobId;
  /** Other jobs this bot can be moved to (at CROSS_JOB_EFFICIENCY). */
  crossJobs: readonly JobId[];
  blurb: string;
  /** Actions per second for one bot at level 1, before milestones. */
  baseSpeed: number;
  /** 0–1: chance an action goes smoothly. 1 − reliability = problem chance. */
  reliability: number;
  costCoins: number;
  costFeathers: number;
  /** Price growth per bot owned: cost = base × growth^owned. */
  costGrowth: number;
  /** Tune-up (level) cost: base × growth^(level − 1). */
  levelCostCoins: number;
  levelCostGrowth: number;
  /** Speed added per level above 1 (0.25 = +25%). */
  levelSpeedBonus: number;
  /** Lifetime coins earned before this bot shows up in the workshop. */
  revealAtCoins: number;
}

const HUNT_JOBS: readonly JobId[] = ['scout', 'decoys', 'call', 'shoot', 'log'];
const others = (home: JobId) => HUNT_JOBS.filter((j) => j !== home);

export const BOTS: Record<BotId, BotDef> = {
  setter: {
    id: 'setter', name: 'Decoy Setter', job: 'decoys', crossJobs: others('decoys'),
    blurb: 'Wades out with a decoy under each arm and keeps the spread full.',
    baseSpeed: 0.1, reliability: 0.95,
    costCoins: 90, costFeathers: 12, costGrowth: 1.15,
    levelCostCoins: 360, levelCostGrowth: 2.6, levelSpeedBonus: 0.25,
    revealAtCoins: 15,
  },
  caller: {
    id: 'caller', name: 'Caller Bot', job: 'call', crossJobs: others('call'),
    blurb: 'A carved mallard with a brass reed in its beak. Calls circling flocks in.',
    baseSpeed: 0.2, reliability: 0.96,
    costCoins: 75, costFeathers: 12, costGrowth: 1.15,
    levelCostCoins: 450, levelCostGrowth: 2.6, levelSpeedBonus: 0.25,
    revealAtCoins: 0,
  },
  blind: {
    id: 'blind', name: 'Blind Bot', job: 'shoot', crossJobs: others('shoot'),
    blurb: 'Waits in the blind under a grass hat. Takes the shot with a soft pop.',
    baseSpeed: 0.2, reliability: 0.95,
    costCoins: 120, costFeathers: 18, costGrowth: 1.15,
    levelCostCoins: 660, levelCostGrowth: 2.6, levelSpeedBonus: 0.25,
    revealAtCoins: 10,
  },
  retriever: {
    id: 'retriever', name: 'Robo-Retriever', job: 'retrieve', crossJobs: [],
    blurb: 'A clockwork pup that paddles out beside your Lab and brings birds back.',
    baseSpeed: 0.3, reliability: 0.95,
    costCoins: 180, costFeathers: 24, costGrowth: 1.15,
    levelCostCoins: 900, levelCostGrowth: 2.6, levelSpeedBonus: 0.25,
    revealAtCoins: 20,
  },
  ledger: {
    id: 'ledger', name: 'Ledger Bot', job: 'log', crossJobs: others('log'),
    blurb: 'Sits on the lodge porch with spectacles and a tiny notebook, logging every bird.',
    baseSpeed: 0.4, reliability: 0.97,
    costCoins: 360, costFeathers: 30, costGrowth: 1.15,
    levelCostCoins: 1500, levelCostGrowth: 2.6, levelSpeedBonus: 0.25,
    revealAtCoins: 80,
  },
  scout: {
    id: 'scout', name: 'Scout Bot', job: 'scout', crossJobs: others('scout'),
    blurb: 'Perches on the blind roof with a tiny spyglass and spots flocks early.',
    baseSpeed: 0.25, reliability: 0.96,
    costCoins: 600, costFeathers: 60, costGrowth: 1.15,
    levelCostCoins: 2400, levelCostGrowth: 2.6, levelSpeedBonus: 0.25,
    revealAtCoins: 150,
  },
  foreman: {
    id: 'foreman', name: 'Foreman Bot', job: 'foreman', crossJobs: [],
    blurb: 'Hard hat and clipboard. Retries stuck bots so you don\'t have to.',
    baseSpeed: 1, reliability: 1,
    costCoins: 2700, costFeathers: 180, costGrowth: 1.25,
    levelCostCoins: 7500, levelCostGrowth: 2.8, levelSpeedBonus: 0.2,
    revealAtCoins: 400,
  },
  tinker: {
    id: 'tinker', name: 'Tinker Bot', job: 'tinker', crossJobs: [],
    blurb: 'Goggles and a wrench. Makes the whole crew sturdier and tunes them up over time.',
    baseSpeed: 0.2, reliability: 1,
    costCoins: 36000, costFeathers: 1800, costGrowth: 1.2,
    levelCostCoins: 90000, levelCostGrowth: 3, levelSpeedBonus: 0.25,
    revealAtCoins: 6000,
  },
};

export const BOT_ORDER: readonly BotId[] = ['setter', 'caller', 'blind', 'retriever', 'ledger', 'scout', 'foreman', 'tinker'];

/** Owned counts that double a bot type's output. */
export const BOT_MILESTONES: readonly number[] = [10, 25, 50, 100, 200];
export const MILESTONE_MULTIPLIER = 2;

/** Reliability gained per tune-up level (capped at RELIABILITY_CAP). */
export const RELIABILITY_PER_LEVEL = 0.005;
export const RELIABILITY_CAP = 0.995;

// ---------------------------------------------------------------- lodge & ledger

export const LEDGER = {
  /** Gus logs this many birds per second on his own. */
  keeperRate: 0.5,
  /** Coin bonus from reputation: 1 + k × sqrt(birds logged). */
  reputationK: 0.012,
} as const;

export const SCOUT = {
  /** Each scout action brings the next flock this much closer (in flock units). */
  spotPower: 0.12,
} as const;

// ---------------------------------------------------------------- problems (exceptions)

export type ProblemKind = 'mud' | 'lines' | 'reeds' | 'ice' | 'muskrat' | 'hat' | 'spyglass' | 'ink';

export interface ProblemDef {
  kind: ProblemKind;
  title: string;
}

export const PROBLEMS: Record<ProblemKind, ProblemDef> = {
  mud: { kind: 'mud', title: 'Stuck in the mud' },
  lines: { kind: 'lines', title: 'Tangled decoy lines' },
  reeds: { kind: 'reeds', title: 'Bird lost in the reeds' },
  ice: { kind: 'ice', title: 'Call jammed with ice' },
  muskrat: { kind: 'muskrat', title: 'Chasing a muskrat' },
  hat: { kind: 'hat', title: 'Grass hat blew over its eyes' },
  spyglass: { kind: 'spyglass', title: 'Spyglass fogged up' },
  ink: { kind: 'ink', title: 'Ink blot in the ledger' },
};

/** Which problems can happen at each job. */
export const JOB_PROBLEMS: Record<JobId, readonly ProblemKind[]> = {
  scout: ['spyglass', 'mud'],
  decoys: ['lines', 'mud'],
  call: ['mud', 'ice'],
  shoot: ['hat', 'mud'],
  retrieve: ['reeds', 'muskrat'],
  log: ['ink'],
  foreman: [],
  tinker: [],
};

export const FOREMAN = {
  /** Player-tunable retry settings and their ranges. */
  retriesDefault: 3,
  retriesMin: 1,
  retriesMax: 5,
  backoffDefault: 3,
  backoffMin: 1,
  backoffMax: 10,
  /** Chance one retry works: base + perBackoff × backoff + perLevel × (level − 1). */
  successBase: 0.4,
  successPerBackoff: 0.04,
  successPerLevel: 0.05,
  successCap: 0.95,
  /** How many closed problems the log keeps. */
  logSize: 40,
} as const;

export const TINKER = {
  /** Problem chance is divided by (1 + this × tinker rate). */
  reliabilityPerRate: 0.35,
  /** Work needed for a free tune-up: base × level of the bot being tuned. */
  workPerLevel: 40,
} as const;

// ---------------------------------------------------------------- acres

export const ACRES = {
  /** You start with one restored acre. */
  start: 1,
  costCoins: 360,
  costGrowth: 1.7,
  /** Flock arrival rate bonus per acre beyond the first. */
  flockRatePerAcre: 0.3,
  /** Average extra birds per flock per acre beyond the first. */
  flockSizePerAcre: 0.6,
  /** Coins earned before the acre upgrade is offered. */
  revealAtCoins: 50,
} as const;

// ---------------------------------------------------------------- starting state

export const START = {
  coins: 0,
  feathers: 0,
  decoys: 0,
} as const;
