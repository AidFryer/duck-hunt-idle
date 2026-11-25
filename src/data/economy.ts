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
  maxIncoming: 3,
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

export interface SpeciesDef {
  id: SpeciesId;
  name: string;
  /** Coins paid by the lodge per bird. */
  coins: number;
  /** Feathers per bird. */
  feathers: number;
}

export type SpeciesId = 'mallard';

/** Phase 2 has only mallards; the full field guide arrives in Phase 4. */
export const SPECIES: Record<SpeciesId, SpeciesDef> = {
  mallard: { id: 'mallard', name: 'Mallard', coins: 5, feathers: 1 },
};

// ---------------------------------------------------------------- bots

export type BotId = 'caller' | 'blind' | 'retriever';
export type HuntStage = 'decoys' | 'call' | 'shoot' | 'retrieve';

export interface BotDef {
  id: BotId;
  name: string;
  /** Pipeline stage this bot works. */
  stage: HuntStage;
  blurb: string;
  /** Actions per second for one bot at level 1, before milestones. */
  baseSpeed: number;
  /** 0–1: chance an action goes smoothly (exceptions arrive in Phase 3). */
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
  /** Coins earned before this bot shows up in the workshop. */
  revealAtCoins: number;
}

export const BOTS: Record<BotId, BotDef> = {
  caller: {
    id: 'caller',
    name: 'Caller Bot',
    stage: 'call',
    blurb: 'A carved mallard with a brass reed in its beak. Calls circling flocks in.',
    baseSpeed: 0.2,
    reliability: 0.97,
    costCoins: 25,
    costFeathers: 4,
    costGrowth: 1.15,
    levelCostCoins: 150,
    levelCostGrowth: 2.6,
    levelSpeedBonus: 0.25,
    revealAtCoins: 0,
  },
  blind: {
    id: 'blind',
    name: 'Blind Bot',
    stage: 'shoot',
    blurb: 'Waits in the blind under a grass hat. Takes the shot with a soft pop.',
    baseSpeed: 0.2,
    reliability: 0.95,
    costCoins: 40,
    costFeathers: 6,
    costGrowth: 1.15,
    levelCostCoins: 220,
    levelCostGrowth: 2.6,
    levelSpeedBonus: 0.25,
    revealAtCoins: 10,
  },
  retriever: {
    id: 'retriever',
    name: 'Robo-Retriever',
    stage: 'retrieve',
    blurb: 'A clockwork pup that paddles out beside your Lab and brings birds back.',
    baseSpeed: 0.3,
    reliability: 0.96,
    costCoins: 60,
    costFeathers: 8,
    costGrowth: 1.15,
    levelCostCoins: 300,
    levelCostGrowth: 2.6,
    levelSpeedBonus: 0.25,
    revealAtCoins: 20,
  },
};

export const BOT_ORDER: readonly BotId[] = ['caller', 'blind', 'retriever'];

/** Owned counts that double a bot type's output. */
export const BOT_MILESTONES: readonly number[] = [10, 25, 50, 100, 200];
export const MILESTONE_MULTIPLIER = 2;

// ---------------------------------------------------------------- acres

export const ACRES = {
  /** You start with one restored acre. */
  start: 1,
  costCoins: 120,
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
