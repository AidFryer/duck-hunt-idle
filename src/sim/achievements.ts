import { ACHIEVEMENTS } from '../data/achievements';
import type { EventSink } from './events';
import type { GameState } from './state';
import { EARNED_FEATURES, FEATURE_ORDER, featureReady } from '../data/features';

/** Open any feature stages the player has reached (in order, one at a time). */
export function checkUnlocks(state: GameState, events?: EventSink): void {
  // The Field Guide and Upgrades open on their own, each with a card.
  for (const id of EARNED_FEATURES) {
    if (state.unlocks[id] === undefined && featureReady(state, id)) {
      state.unlocks[id] = state.elapsed;
      events?.push({ type: 'featureUnlocked', feature: id });
      return; // one card per check
    }
  }
  // Everything else opens with the lodge (its level-up card explains it).
  for (const id of FEATURE_ORDER) {
    if (!EARNED_FEATURES.includes(id) && state.unlocks[id] === undefined && featureReady(state, id)) state.unlocks[id] = state.elapsed;
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
