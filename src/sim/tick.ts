import { DAY_LENGTH_SECONDS } from '../config';
import type { GameState } from './state';
import { windAt } from './environment';

/**
 * Advance the simulation by exactly one fixed step of `dt` seconds.
 * Mutates `state` in place (cheap at 10 Hz, and keeps GC quiet).
 */
export function step(state: GameState, dt: number): void {
  state.tick += 1;
  state.elapsed += dt;

  const clock = state.clock;
  clock.dayTime += dt;
  while (clock.dayTime >= DAY_LENGTH_SECONDS) {
    clock.dayTime -= DAY_LENGTH_SECONDS;
    clock.day += 1;
  }

  state.environment.wind = windAt(state.elapsed, state.environment.seed);
}

/** Advance by many seconds at once (offline progress / time-lapse). */
export function advance(state: GameState, seconds: number, dt: number): number {
  const ticks = Math.floor(seconds / dt);
  for (let i = 0; i < ticks; i++) step(state, dt);
  return ticks;
}
