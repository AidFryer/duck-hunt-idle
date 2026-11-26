import { ACHIEVEMENTS } from '../data/achievements';
import type { EventSink } from './events';
import type { GameState } from './state';
import { FEATURE_ORDER, featureReady } from '../data/features';

/** Open any feature stages the player has reached (in order, one at a time). */
export function checkUnlocks(state: GameState, events?: EventSink): void {
  // The Field Guide opens with the first bird and gets its own card.
  if (state.unlocks.guide === undefined && featureReady(state, 'guide')) {
    state.unlocks.guide = state.elapsed;
    events?.push({ type: 'featureUnlocked', feature: 'guide' });
  }
  // Everything else opens with the lodge (its level-up card explains it).
  for (const id of FEATURE_ORDER) {
    if (id !== 'guide' && state.unlocks[id] === undefined && featureReady(state, id)) state.unlocks[id] = state.elapsed;
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
