import { RHYTHM } from '../data/economy';
import { GROUND_PARAMS } from './economy';
import type { GameState } from './state';

/** Bots that work the hunt itself (not the lodge). */
function crewOwned(state: GameState): number {
  let n = 0;
  for (const [id, b] of Object.entries(state.bots)) if (id !== 'tinker' && id !== 'foreman' && id !== 'ledger') n += b.owned;
  return n;
}

/** What's holding the rhythm back right now, if anything. */
export type RhythmSnag = 'idle' | 'piling' | 'stuck' | 'waiting' | null;

export function rhythmSnag(state: GameState): RhythmSnag {
  const h = state.hunt;
  const hand = state.elapsed - h.lastManualAt <= RHYTHM.handWindow;
  if (crewOwned(state) === 0 && !hand) return 'idle';
  if (state.problems.open.length > 0) return 'stuck';
  if (h.downed.length > GROUND_PARAMS.marsh.maxDowned * 0.4) return 'piling';
  if (h.incoming.length >= 3 && h.committed.length === 0) return 'waiting';
  return null;
}

/** Where the meter is heading (0–1). */
export function rhythmTarget(state: GameState): number {
  const h = state.hunt;
  const hand = state.elapsed - h.lastManualAt <= RHYTHM.handWindow;
  if (crewOwned(state) === 0 && !hand) return 0;
  const pile = Math.min(1, h.downed.length / GROUND_PARAMS.marsh.maxDowned);
  const stuck = Math.min(5, state.problems.open.length);
  const waiting = h.incoming.length >= 3 && h.committed.length === 0 ? 0.15 : 0;
  return Math.max(0, Math.min(1, 1 - Math.max(0, pile - 0.25) * 1.2 - stuck * 0.12 - waiting));
}

/** Ease the meter toward where the hunt says it should be. */
export function stepRhythm(state: GameState, dt: number): void {
  const h = state.hunt;
  const target = rhythmTarget(state);
  if (h.rhythm < target) h.rhythm = Math.min(target, h.rhythm + dt / RHYTHM.riseSeconds);
  else h.rhythm = Math.max(target, h.rhythm - dt / RHYTHM.fallSeconds);
}

/** One of your own taps. */
export function rhythmTap(state: GameState): void {
  state.hunt.rhythm = Math.min(1, state.hunt.rhythm + RHYTHM.tapGain);
}

/** A flock got away without being worked. */
export function rhythmMiss(state: GameState): void {
  state.hunt.rhythm = Math.max(0, state.hunt.rhythm - RHYTHM.missPenalty);
}

/** × coins on every bird. */
export function rhythmMultiplier(state: GameState): number {
  return 1 + RHYTHM.maxBonus * (state.hunt.rhythm ?? 0);
}
