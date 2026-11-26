import { ACHIEVEMENTS } from '../data/achievements';
import type { EventSink } from './events';
import type { GameState } from './state';

/** Unlock any newly earned achievements. Returns how many were unlocked. */
export function checkAchievements(state: GameState, events: EventSink): number {
  let n = 0;
  for (const a of ACHIEVEMENTS) {
    if (state.achievements[a.id] !== undefined) continue;
    if (a.done(state)) {
      state.achievements[a.id] = state.elapsed;
      events.push({ type: 'achievement', id: a.id });
      n++;
    }
  }
  return n;
}
