import type { JobId } from '../data/economy';
import { METRIC_WINDOW, type GameState } from './state';

/** Roll the per-second buckets forward to the current sim second. */
export function advanceMetrics(state: GameState): void {
  const m = state.metrics;
  const sec = Math.floor(state.elapsed);
  const gap = Math.min(sec - m.sec, METRIC_WINDOW);
  if (gap <= 0) return;
  for (const j of Object.values(m.jobs)) {
    for (let i = 0; i < gap; i++) {
      j.done.shift();
      j.done.push(0);
      j.fail.shift();
      j.fail.push(0);
    }
  }
  m.sec = sec;
}

export function recordJob(state: GameState, job: JobId, ok: boolean): void {
  const j = state.metrics.jobs[job];
  if (ok) {
    j.done[j.done.length - 1]! += 1;
    j.totalDone += 1;
  } else {
    j.fail[j.fail.length - 1]! += 1;
    j.totalFail += 1;
  }
}

/** Average completed actions per second over the window. */
export function throughput(state: GameState, job: JobId): number {
  const d = state.metrics.jobs[job].done;
  let sum = 0;
  for (const v of d) sum += v;
  return sum / d.length;
}

/** Lifetime success rate for a job (1 when nothing has happened yet). */
export function successRate(state: GameState, job: JobId): number {
  const j = state.metrics.jobs[job];
  const n = j.totalDone + j.totalFail;
  return n === 0 ? 1 : j.totalDone / n;
}
