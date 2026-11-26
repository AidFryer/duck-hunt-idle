import { ACHIEVEMENTS } from '../data/achievements';
import type { EventSink } from './events';
import type { GameState } from './state';
import { FEATURE_ORDER, featureReady } from '../data/features';

/** Open any feature stages the player has reached (in order, one at a time). */
export function checkUnlocks(state: GameState, events?: EventSink): void {
  for (const id of FEATURE_ORDER) {
    if (state.unlocks[id] !== undefined) continue;
    if (!featureReady(state, id) && state.stats.seasonsClosed === 0) return;
    state.unlocks[id] = state.elapsed;
    events?.push({ type: 'featureUnlocked', feature: id });
    return; // one stage per check, so each gets its moment
  }
}

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
