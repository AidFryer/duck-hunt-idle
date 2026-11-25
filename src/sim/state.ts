import { NEW_GAME_DAY_TIME } from '../data/dayCycle';

export const SAVE_VERSION = 1;

export type WeatherId = 'clear' | 'fog' | 'drizzle' | 'coldFront' | 'wind';

/**
 * The complete game state. Plain data only (no classes, no references to
 * rendering) so it serializes to JSON for saves and is trivial to test.
 */
export interface GameState {
  version: number;
  /** Total simulated seconds since the save was created. */
  elapsed: number;
  /** Ticks simulated (for deterministic per-tick randomness). */
  tick: number;
  clock: {
    /** Seconds into the current day, 0 ≤ dayTime < DAY_LENGTH_SECONDS. */
    dayTime: number;
    /** Day counter, starting at 1. */
    day: number;
  };
  environment: {
    weather: WeatherId;
    /** Wind strength 0–1 (derived each tick, stored for render convenience). */
    wind: number;
    /** Seed for deterministic environmental noise. */
    seed: number;
  };
}

export function createInitialState(seed = 1337): GameState {
  return {
    version: SAVE_VERSION,
    elapsed: 0,
    tick: 0,
    clock: { dayTime: NEW_GAME_DAY_TIME, day: 1 },
    environment: { weather: 'clear', wind: 0.35, seed },
  };
}
