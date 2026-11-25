import { WIND } from '../data/dayCycle';
import { clamp, valueNoise1D } from '../util/math';

/** Deterministic wind strength (0–1) at a moment in simulated time. */
export function windAt(elapsed: number, seed: number): number {
  const drift = valueNoise1D(elapsed / WIND.driftPeriod, seed) * 2 - 1;
  const gust = valueNoise1D(elapsed / WIND.gustPeriod, seed + 101) * 2 - 1;
  return clamp(WIND.base + drift * WIND.drift + gust * WIND.gust, 0, 1);
}
