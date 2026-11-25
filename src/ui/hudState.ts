import type { DayPhaseId } from '../data/dayCycle';
import { clockAt, duckActivityAt, formatClock } from '../sim/clock';
import type { GameState } from '../sim/state';

/** A read-only, render-friendly view of the sim for the HUD. */
export interface HudSnapshot {
  day: number;
  clock: string;
  phaseId: DayPhaseId;
  phaseLabel: string;
  hour: number;
  activity: number;
  wind: number;
  coins: number;
  feathers: number;
  bag: number;
}

export function snapshot(state: GameState): HudSnapshot {
  const c = clockAt(state.clock.dayTime);
  return {
    day: state.clock.day,
    clock: formatClock(c.hour),
    phaseId: c.phase.id,
    phaseLabel: c.phase.label,
    hour: c.hour,
    activity: duckActivityAt(c.hour),
    wind: state.environment.wind,
    // Economy arrives in Phase 2.
    coins: 0,
    feathers: 0,
    bag: 0,
  };
}

export function activityLabel(a: number): string {
  if (a > 0.8) return 'Ducks are flying!';
  if (a > 0.55) return 'Lots of activity';
  if (a > 0.3) return 'Steady';
  if (a > 0.12) return 'Quiet';
  return 'Resting';
}

export function windLabel(w: number): string {
  if (w > 0.65) return 'Gusty';
  if (w > 0.45) return 'Breezy';
  if (w > 0.25) return 'Light breeze';
  return 'Calm';
}
