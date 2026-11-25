import Decimal from 'break_infinity.js';
import { NEW_GAME_DAY_TIME } from '../data/dayCycle';
import { ACRES, BOT_ORDER, START, type BotId, type SpeciesId } from '../data/economy';

/** Bump when the save shape changes, and add a migration in save.ts. */
export const SAVE_VERSION = 2;

export type WeatherId = 'clear' | 'fog' | 'drizzle' | 'coldFront' | 'wind';

/** A flock of ducks moving through the hunt pipeline. */
export interface FlockState {
  id: number;
  species: SpeciesId;
  size: number;
  /** Seconds spent in its current queue (for patience timeouts). */
  age: number;
}

export interface BotState {
  owned: number;
  level: number;
  /** Fractional work banked toward the next action (0–1). */
  progress: number;
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
  };
  bots: Record<BotId, BotState>;
  /** Restored wetland acres (Wetland Acres currency). */
  acres: number;
  stats: {
    lifetimeCoins: Decimal;
    lifetimeFeathers: Decimal;
    lifetimeBirds: number;
    bestBag: number;
    flocksCalled: number;
    flocksFlared: number;
    shots: number;
    manualActions: number;
  };
  meta: {
    /** Wall-clock ms when this save was created / last written. */
    createdAt: number;
    lastSaved: number;
  };
}

export function createBotStates(): Record<BotId, BotState> {
  const out = {} as Record<BotId, BotState>;
  for (const id of BOT_ORDER) out[id] = { owned: 0, level: 1, progress: 0 };
  return out;
}

export function createInitialState(seed = 1337, now = 0): GameState {
  return {
    version: SAVE_VERSION,
    elapsed: 0,
    tick: 0,
    rng: (seed ^ 0x5bd1e995) >>> 0,
    clock: { dayTime: NEW_GAME_DAY_TIME, day: 1 },
    environment: { weather: 'clear', wind: 0.35, seed },
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
    },
    bots: createBotStates(),
    acres: ACRES.start,
    stats: {
      lifetimeCoins: new Decimal(0),
      lifetimeFeathers: new Decimal(0),
      lifetimeBirds: 0,
      bestBag: 0,
      flocksCalled: 0,
      flocksFlared: 0,
      shots: 0,
      manualActions: 0,
    },
    meta: { createdAt: now, lastSaved: now },
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
