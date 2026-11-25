import { TICK_RATE, TICK_SECONDS } from '../config';

/** Tick length in whole milliseconds — integer math avoids float drift. */
const TICK_MS = 1000 / TICK_RATE;
import type { GameState } from './state';
import { step } from './tick';

/**
 * Drives the fixed-step simulation from a real clock. The clock is injected
 * (`now` returns milliseconds) so tests can control time precisely.
 *
 * Accumulates real elapsed time, runs whole ticks, and exposes `alpha`
 * (0–1) — how far we are between ticks — so the renderer can interpolate.
 */
export class SimRunner {
  private last: number;
  /** Accumulated, not-yet-simulated time in milliseconds. */
  private acc = 0;
  /** Multiplier on real time (dev time-lapse). */
  timeScale = 1;
  readonly listeners = new Set<(state: GameState) => void>();

  constructor(
    public readonly state: GameState,
    private readonly now: () => number,
  ) {
    this.last = now();
  }

  /** Run any due ticks. Returns how many ticks ran. */
  update(): number {
    const t = this.now();
    const realMs = Math.max(0, t - this.last);
    this.last = t;
    this.acc += realMs * this.timeScale;

    // Catch up on every due tick. Even a long background gap is cheap at
    // 10 Hz; very long gaps (closed tab) are handled by offline progress.
    let ticks = 0;
    // Tiny epsilon so 299.99999ms of float noise still counts as 3 ticks.
    while (this.acc >= TICK_MS - 1e-6) {
      step(this.state, TICK_SECONDS);
      this.acc -= TICK_MS;
      ticks++;
    }
    if (this.acc < 0) this.acc = 0;
    if (ticks > 0) for (const fn of this.listeners) fn(this.state);
    return ticks;
  }

  /** Fraction of the way to the next tick (for render interpolation). */
  get alpha(): number {
    return this.acc / TICK_MS;
  }

  /** Reset the real-time reference (e.g. after loading a save). */
  resync(): void {
    this.last = this.now();
    this.acc = 0;
  }
}
