import { DAY_LENGTH_SECONDS } from '../config';
import { DAY_PHASES, DUCK_ACTIVITY_KEYS, type DayPhaseDef } from '../data/dayCycle';
import { lerp, sampleWrapped, wrap } from '../util/math';

export interface ClockInfo {
  phase: DayPhaseDef;
  /** 0–1 progress through the current phase. */
  phaseProgress: number;
  /** Clock hour 0–24 (fractional). */
  hour: number;
  /** 0–1 progress through the whole day (real time). */
  dayProgress: number;
}

const PHASE_TOTAL = DAY_PHASES.reduce((s, p) => s + p.seconds, 0);
if (Math.abs(PHASE_TOTAL - DAY_LENGTH_SECONDS) > 1e-6) {
  throw new Error(`Day phases sum to ${PHASE_TOTAL}s but DAY_LENGTH_SECONDS is ${DAY_LENGTH_SECONDS}`);
}

/** Map real seconds-into-day to phase + clock hour. */
export function clockAt(dayTime: number): ClockInfo {
  const t = wrap(dayTime, DAY_LENGTH_SECONDS);
  let acc = 0;
  for (const phase of DAY_PHASES) {
    if (t < acc + phase.seconds) {
      const p = (t - acc) / phase.seconds;
      return {
        phase,
        phaseProgress: p,
        hour: wrap(lerp(phase.startHour, phase.endHour, p), 24),
        dayProgress: t / DAY_LENGTH_SECONDS,
      };
    }
    acc += phase.seconds;
  }
  const last = DAY_PHASES[DAY_PHASES.length - 1]!;
  return { phase: last, phaseProgress: 1, hour: wrap(last.endHour, 24), dayProgress: 1 };
}

/** Duck activity (0–1) at a clock hour. */
export function duckActivityAt(hour: number): number {
  return sampleWrapped(DUCK_ACTIVITY_KEYS, hour, 24);
}

/** "6:42 AM" style label. */
export function formatClock(hour: number): string {
  const h = wrap(hour, 24);
  let hh = Math.floor(h);
  let mm = Math.floor((h - hh) * 60);
  mm = Math.floor(mm / 5) * 5; // tick in 5-minute steps — calmer to read
  const suffix = hh < 12 ? 'AM' : 'PM';
  hh = hh % 12;
  if (hh === 0) hh = 12;
  return `${hh}:${mm.toString().padStart(2, '0')} ${suffix}`;
}
