/**
 * Balance data for the hunt pipeline, currencies, bots and acres.
 * Every tunable number in the economy lives here — sim code reads these.
 */

// ---------------------------------------------------------------- hunt flow

export const HUNT = {
  /** Decoys in a full spread at the start (more come from upgrades later). */
  baseSpreadSize: 6,
  /** Real seconds before one decoy drifts loose (wind makes it faster). */
  decoyDriftSeconds: 150,
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

/** The goose field: bigger, warier flocks that pay more and come less often. */
export const FIELD = {
  baseSpreadSize: 10,
  /** Full-body decoys blow over far less often than marsh decoys drift. */
  decoyDriftSeconds: 240,
  decoyDriftWind: 1.2,
  baseFlockRate: 1 / 10,
  spreadExponent: 0.8,
  emptySpreadFloor: 0.05,
  flockSizeMin: 6,
  flockSizeMax: 14,
  maxIncoming: 3,
  incomingPatience: 26,
  maxCommitted: 2,
  committedPatience: 14,
  shotFraction: 0.2,
  maxDowned: 40,
} as const;

/** Flooded Timber: small, fast flocks dropping through the oaks. */
export const TIMBER = {
  baseSpreadSize: 8,
  decoyDriftSeconds: 999,
  decoyDriftWind: 0,
  baseFlockRate: 1 / 10,
  spreadExponent: 0.7,
  emptySpreadFloor: 0.08,
  flockSizeMin: 3,
  flockSizeMax: 7,
  maxIncoming: 4,
  incomingPatience: 18,
  maxCommitted: 3,
  committedPatience: 14,
  shotFraction: 0.4,
  maxDowned: 40,
} as const;

/** Coastal Bay: big rafts of sea ducks on open water, slow to commit. */
export const BAY = {
  baseSpreadSize: 16,
  decoyDriftSeconds: 999,
  decoyDriftWind: 0,
  baseFlockRate: 1 / 15,
  spreadExponent: 0.8,
  emptySpreadFloor: 0.05,
  flockSizeMin: 8,
  flockSizeMax: 18,
  maxIncoming: 3,
  incomingPatience: 28,
  maxCommitted: 2,
  committedPatience: 16,
  shotFraction: 0.22,
  maxDowned: 60,
} as const;

/**
 * Golden flocks: now and then a shimmering flock arrives that the bots leave
 * alone. Call it in and shoot it yourself for a big bonus.
 */
export const GOLDEN = {
  /** Lodge level before they start showing up. */
  fromLodge: 2,
  /** Sim seconds between golden flocks (random in this range, at good activity). */
  minGap: 150,
  maxGap: 330,
  /** Golden flocks don't wait around. */
  incomingPatience: 16,
  committedPatience: 10,
  sizeMult: 1.5,
  /** Bonus is this many seconds of current income (at least minBonus coins). */
  bonusSeconds: 90,
  minBonus: 150,
  feathers: 20,
  /** Share of golden flocks that go to the goose field once it's open. */
  fieldShare: 0.35,
} as const;

/**
 * Decoy spreads: always out, grown by buying bags of decoys. Every decoy
 * beyond the starting spread draws more flocks.
 */
export const DECOYS = {
  /** Flock draw ∝ (spread ÷ starting spread) ^ this. */
  drawExponent: 0.5,
  marsh: { perBag: 2, costCoins: 60, costFeathers: 4, costGrowth: 1.6 },
  field: { perBag: 4, costCoins: 30_000, costFeathers: 1_800, costGrowth: 1.6 },
  timber: { perBag: 2, costCoins: 4_000, costFeathers: 400, costGrowth: 1.6 },
  bay: { perBag: 6, costCoins: 1_500_000, costFeathers: 80_000, costGrowth: 1.6 },
} as const;

/** Bots that no longer have work now that decoys stay out (kept for old saves). */
export const RETIRED_BOTS: readonly BotId[] = ['setter', 'staker'];

/** Where you can hunt. */
export type GroundId = 'marsh' | 'field' | 'timber' | 'bay';
/** Every ground in the order they open. */
export const GROUND_ORDER: readonly GroundId[] = ['marsh', 'timber', 'field', 'bay'];
/** Grounds where one crew bot works every step of the hunt. */
export type OutpostId = 'timber' | 'bay';
export const OUTPOSTS: readonly OutpostId[] = ['timber', 'bay'];
/** Lodge level that opens each ground. */
export const GROUND_LODGE: Record<GroundId, number> = { marsh: 1, timber: 3, field: 4, bay: 5 };
export const GROUND_NAMES: Record<GroundId, string> = { marsh: 'The Marsh', timber: 'Flooded Timber', field: 'Goose Field', bay: 'Coastal Bay' };

/** The four hunt steps, by ground: which job does each. */
export type Step = 'decoys' | 'call' | 'shoot' | 'retrieve';
export const GROUND_JOBS: Record<GroundId, Record<Step, HuntStage | FieldJob | OutpostJob>> = {
  marsh: { decoys: 'decoys', call: 'call', shoot: 'shoot', retrieve: 'retrieve' },
  field: { decoys: 'fDecoys', call: 'flag', shoot: 'fShoot', retrieve: 'fRetrieve' },
  timber: { decoys: 'tCall', call: 'tCall', shoot: 'tShoot', retrieve: 'tRetrieve' },
  bay: { decoys: 'bCall', call: 'bCall', shoot: 'bShoot', retrieve: 'bRetrieve' },
};

// ---------------------------------------------------------------- species

// Species live in species.ts; re-exported here for convenience.
export { SPECIES, type SpeciesId } from './species';

// ---------------------------------------------------------------- jobs

/** Every job on the Job Board, in pipeline order. */
export type JobId =
  | 'scout' | 'decoys' | 'call' | 'shoot' | 'retrieve' | 'log' | 'fDecoys' | 'flag' | 'fShoot' | 'fRetrieve' | 'foreman' | 'tinker'
  | OutpostJob | 'tHunt' | 'bHunt';
/** Hand actions at the timber and the bay (their crews use tHunt / bHunt). */
export type OutpostJob = 'tCall' | 'tShoot' | 'tRetrieve' | 'bCall' | 'bShoot' | 'bRetrieve';
/** Jobs in the goose field. */
export type FieldJob = 'fDecoys' | 'flag' | 'fShoot' | 'fRetrieve';
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
  fDecoys: { id: 'fDecoys', name: 'Field Spread', blurb: 'Stake out full-body goose decoys in the stubble.' },
  flag: { id: 'flag', name: 'Flagging', blurb: 'Wave a flag and call to turn passing geese.' },
  fShoot: { id: 'fShoot', name: 'Layout Blinds', blurb: 'Sit up from the layout blinds when geese commit.' },
  fRetrieve: { id: 'fRetrieve', name: 'Field Pickup', blurb: 'Pick up geese from the stubble.' },
  foreman: { id: 'foreman', name: 'Foreman Desk', blurb: 'Retry stuck bots automatically.' },
  tinker: { id: 'tinker', name: 'Workshop', blurb: 'Tune bots up and make them more reliable.' },
  tCall: { id: 'tCall', name: 'Timber Calling', blurb: 'Call ducks down through the oaks.' },
  tShoot: { id: 'tShoot', name: 'Timber Shooting', blurb: 'Shoot as they drop through the branches.' },
  tRetrieve: { id: 'tRetrieve', name: 'Timber Fetch', blurb: 'Fetch birds from between the trunks.' },
  tHunt: { id: 'tHunt', name: 'Timber Guides', blurb: 'Guides call, shoot and fetch in the timber.' },
  bCall: { id: 'bCall', name: 'Bay Calling', blurb: 'Turn rafts of sea ducks toward the rig.' },
  bShoot: { id: 'bShoot', name: 'Boat Blind', blurb: 'Shoot from the boat blind.' },
  bRetrieve: { id: 'bRetrieve', name: 'Bay Pickup', blurb: 'Motor out and pick up birds.' },
  bHunt: { id: 'bHunt', name: 'Boatmen', blurb: 'Boatmen run the whole bay hunt.' },
};

export const JOB_ORDER: readonly JobId[] = ['scout', 'decoys', 'call', 'shoot', 'retrieve', 'log', 'fDecoys', 'flag', 'fShoot', 'fRetrieve', 'tCall', 'tShoot', 'tRetrieve', 'tHunt', 'bCall', 'bShoot', 'bRetrieve', 'bHunt', 'foreman', 'tinker'];
/** Jobs that move geese through the field hunt. */
export const FIELD_JOBS: readonly FieldJob[] = ['fDecoys', 'flag', 'fShoot', 'fRetrieve'];
/** Jobs that move birds along the hunt pipeline (shown as a flow on the board). */
export const PIPELINE_JOBS: readonly JobId[] = ['scout', 'decoys', 'call', 'shoot', 'retrieve', 'log'];

/** Speed of a bot working a job that isn't its specialty. */
export const CROSS_JOB_EFFICIENCY = 0.5;

// ---------------------------------------------------------------- bots

export type BotId = 'scout' | 'setter' | 'caller' | 'blind' | 'retriever' | 'ledger' | 'staker' | 'flagger' | 'layout' | 'fieldDog' | 'guide' | 'boatman' | 'foreman' | 'tinker';

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
const FIELD_HELP: readonly JobId[] = ['fDecoys', 'flag', 'fShoot'];
const fieldOthers = (home: JobId) => FIELD_HELP.filter((j) => j !== home);

export const BOTS: Record<BotId, BotDef> = {
  setter: {
    id: 'setter', name: 'Decoy Setter', job: 'decoys', crossJobs: others('decoys'),
    blurb: 'Wades out with a decoy under each arm and keeps the spread full.',
    baseSpeed: 0.1, reliability: 0.95,
    costCoins: 90_000, costFeathers: 12_000, costGrowth: 1.17,
    levelCostCoins: 360_000, levelCostGrowth: 2.6, levelSpeedBonus: 0.25,
    revealAtCoins: 15,
  },
  caller: {
    id: 'caller', name: 'Caller Bot', job: 'call', crossJobs: others('call'),
    blurb: 'A carved mallard with a brass reed in its beak. Calls circling flocks in.',
    baseSpeed: 0.2, reliability: 0.96,
    costCoins: 75, costFeathers: 12, costGrowth: 1.17,
    levelCostCoins: 450, levelCostGrowth: 2.6, levelSpeedBonus: 0.25,
    revealAtCoins: 0,
  },
  blind: {
    id: 'blind', name: 'Blind Bot', job: 'shoot', crossJobs: others('shoot'),
    blurb: 'Waits in the blind under a grass hat. Takes the shot with a soft pop.',
    baseSpeed: 0.2, reliability: 0.95,
    costCoins: 120, costFeathers: 18, costGrowth: 1.17,
    levelCostCoins: 660, levelCostGrowth: 2.6, levelSpeedBonus: 0.25,
    revealAtCoins: 10,
  },
  retriever: {
    id: 'retriever', name: 'Robo-Retriever', job: 'retrieve', crossJobs: [],
    blurb: 'A clockwork pup that paddles out beside your Lab and brings birds back.',
    baseSpeed: 0.3, reliability: 0.95,
    costCoins: 180, costFeathers: 24, costGrowth: 1.17,
    levelCostCoins: 900, levelCostGrowth: 2.6, levelSpeedBonus: 0.25,
    revealAtCoins: 20,
  },
  ledger: {
    id: 'ledger', name: 'Ledger Bot', job: 'log', crossJobs: others('log'),
    blurb: 'Sits on the lodge porch with spectacles and a tiny notebook, logging every bird.',
    baseSpeed: 0.4, reliability: 0.97,
    costCoins: 360, costFeathers: 30, costGrowth: 1.17,
    levelCostCoins: 1500, levelCostGrowth: 2.6, levelSpeedBonus: 0.25,
    revealAtCoins: 80,
  },
  scout: {
    id: 'scout', name: 'Scout Bot', job: 'scout', crossJobs: others('scout'),
    blurb: 'Perches on the blind roof with a tiny spyglass and spots flocks early.',
    baseSpeed: 0.25, reliability: 0.96,
    costCoins: 600, costFeathers: 60, costGrowth: 1.17,
    levelCostCoins: 2400, levelCostGrowth: 2.6, levelSpeedBonus: 0.25,
    revealAtCoins: 150,
  },
  staker: {
    id: 'staker', name: 'Decoy Staker', job: 'fDecoys', crossJobs: fieldOthers('fDecoys'),
    blurb: 'Carries a bundle of full-body goose decoys and stakes them out in tidy family groups.',
    baseSpeed: 0.08, reliability: 0.95,
    costCoins: 135_000, costFeathers: 9000, costGrowth: 1.17,
    levelCostCoins: 450_000, levelCostGrowth: 2.6, levelSpeedBonus: 0.25,
    revealAtCoins: 0,
  },
  flagger: {
    id: 'flagger', name: 'Flagger Bot', job: 'flag', crossJobs: fieldOthers('flag'),
    blurb: 'Waves a black flag low over the stubble so passing geese think there\'s a family landing.',
    baseSpeed: 0.15, reliability: 0.96,
    costCoins: 120_000, costFeathers: 9000, costGrowth: 1.17,
    levelCostCoins: 540_000, levelCostGrowth: 2.6, levelSpeedBonus: 0.25,
    revealAtCoins: 0,
  },
  layout: {
    id: 'layout', name: 'Layout Bot', job: 'fShoot', crossJobs: fieldOthers('fShoot'),
    blurb: 'Lies flat in a stubble-covered layout blind and sits up for the shot.',
    baseSpeed: 0.15, reliability: 0.95,
    costCoins: 180_000, costFeathers: 13_500, costGrowth: 1.17,
    levelCostCoins: 720_000, levelCostGrowth: 2.6, levelSpeedBonus: 0.25,
    revealAtCoins: 0,
  },
  fieldDog: {
    id: 'fieldDog', name: 'Field Pup', job: 'fRetrieve', crossJobs: [],
    blurb: 'A clockwork pup with big paws for stubble. Fetches geese nearly as big as itself.',
    baseSpeed: 0.3, reliability: 0.95,
    costCoins: 225_000, costFeathers: 15_000, costGrowth: 1.17,
    levelCostCoins: 900_000, levelCostGrowth: 2.6, levelSpeedBonus: 0.25,
    revealAtCoins: 0,
  },
  guide: {
    id: 'guide', name: 'Timber Guide', job: 'tHunt', crossJobs: [],
    blurb: 'A carved mallard in waders and a camo cap. Calls, shoots and fetches in the flooded timber.',
    baseSpeed: 0.2, reliability: 0.96,
    costCoins: 6_000, costFeathers: 700, costGrowth: 1.17,
    levelCostCoins: 20_000, levelCostGrowth: 2.6, levelSpeedBonus: 0.25,
    revealAtCoins: 0,
  },
  boatman: {
    id: 'boatman', name: 'Bay Boatman', job: 'bHunt', crossJobs: [],
    blurb: 'Steers a little layout boat through the swells and runs the whole bay hunt.',
    baseSpeed: 0.22, reliability: 0.95,
    costCoins: 3_000_000, costFeathers: 150_000, costGrowth: 1.17,
    levelCostCoins: 10_000_000, levelCostGrowth: 2.6, levelSpeedBonus: 0.25,
    revealAtCoins: 0,
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

export const BOT_ORDER: readonly BotId[] = ['setter', 'caller', 'blind', 'retriever', 'ledger', 'scout', 'staker', 'flagger', 'layout', 'fieldDog', 'guide', 'boatman', 'foreman', 'tinker'];
/** Workshop order: roughly when each bot's plans arrive. */
export const WORKSHOP_ORDER: readonly BotId[] = ['caller', 'blind', 'retriever', 'ledger', 'scout', 'foreman', 'guide', 'flagger', 'layout', 'fieldDog', 'boatman', 'tinker'];
/** Bots that work the goose field. */
export const FIELD_BOTS: readonly BotId[] = ['staker', 'flagger', 'layout', 'fieldDog'];

/** Owned counts that double a bot type's output. */
export const BOT_MILESTONES: readonly number[] = [10, 25, 50, 100, 200, 300, 400, 500, 750, 1000];
export const MILESTONE_MULTIPLIER = 1.5;

/** Reliability gained per tune-up level (capped at RELIABILITY_CAP). */
export const RELIABILITY_PER_LEVEL = 0.005;
export const RELIABILITY_CAP = 0.995;

// ---------------------------------------------------------------- lodge & ledger

export const LEDGER = {
  /** Ray logs this many birds per second on his own. */
  keeperRate: 0.5,
  /** Coin bonus from reputation: 1 + k × sqrt(birds logged). */
  reputationK: 0.006,
} as const;

/** Hunter's Rhythm: quick manual taps in a row build a streak that pays a bonus. */
export const STREAK = {
  /** Seconds between manual actions before the streak fades. */
  window: 10,
  max: 10,
  /** Bonus coins per streak level on each bird you retrieve by hand (× its value). */
  bonusPerLevel: 0.06,
} as const;

/** First Light: a once-a-day welcome gift. */
export const DAILY = {
  /** Minimum coins, and how many seconds of current income the gift is worth. */
  minCoins: 100,
  incomeSeconds: 300,
  feathers: 20,
} as const;

export const SCOUT = {
  /** Each scout action brings the next flock this much closer (in flock units). */
  spotPower: 0.12,
} as const;

// ---------------------------------------------------------------- problems (exceptions)

export type ProblemKind = 'mud' | 'lines' | 'reeds' | 'ice' | 'muskrat' | 'hat' | 'spyglass' | 'ink' | 'frost' | 'flag' | 'burrs';

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
  frost: { kind: 'frost', title: 'Frozen to the stubble' },
  flag: { kind: 'flag', title: 'Flag tangled on its pole' },
  burrs: { kind: 'burrs', title: 'Paws full of burrs' },
};

/** Which problems can happen at each job. */
export const JOB_PROBLEMS: Record<JobId, readonly ProblemKind[]> = {
  scout: ['spyglass', 'mud'],
  decoys: ['lines', 'mud'],
  call: ['mud', 'ice'],
  shoot: ['hat', 'mud'],
  retrieve: ['reeds', 'muskrat'],
  log: ['ink'],
  fDecoys: ['frost', 'mud'],
  flag: ['flag', 'mud'],
  fShoot: ['hat', 'frost'],
  fRetrieve: ['burrs', 'mud'],
  tCall: ['mud'], tShoot: ['hat'], tRetrieve: ['reeds'], tHunt: ['mud', 'reeds', 'hat'],
  bCall: ['mud'], bShoot: ['hat'], bRetrieve: ['reeds'], bHunt: ['mud', 'hat', 'reeds'],
  foreman: [],
  tinker: [],
};

/**
 * The Big Volley: once the marsh is busy enough that tapping single flocks
 * stops mattering, a charging button fires the whole crew at once.
 */
export const VOLLEY = {
  /** Birds per second (smoothed) that unlocks the volley and the quiet tally. */
  unlockRate: 40,
  /** Seconds to charge from empty. */
  chargeSeconds: 180,
  /** A volley pays this many seconds of the current pace, all at once. */
  payoutSeconds: 45,
  /** Smoothing for the pace (seconds). */
  paceSeconds: 30,
};

/** Scales every bot's chance of getting stuck, so problems stay an occasional chore. */
export const PROBLEM_RATE = 0.35;

export const FOREMAN = {
  /** Seconds before a stuck bot frees itself (after the Foreman plans are earned). */
  selfFixSeconds: 120,
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
  costCoins: 250,
  costGrowth: 1.8,
  /** Flock arrivals multiply by this for every acre beyond the first (it compounds). */
  flockRateGrowth: 1.12,
  /** One more flock can circle for every this many acres beyond the first. */
  acresPerCircling: 2,
  maxExtraCircling: 6,
  /** One more flock can work the decoys for every this many acres. */
  acresPerCommitted: 4,
  maxExtraCommitted: 3,
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
