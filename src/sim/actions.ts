import { DAY_LENGTH_SECONDS } from '../config';
import { DAY_PHASES, type DayPhaseId } from '../data/dayCycle';
import type { GameState } from './state';
import { wrap } from '../util/math';

/**
 * Player/UI-initiated changes to the sim. The UI never mutates state
 * directly — it calls these.
 */

/** Jump the clock to the start of a day phase (preview/debug helper). */
export function jumpToPhase(state: GameState, id: DayPhaseId): void {
  let acc = 0;
  for (const p of DAY_PHASES) {
    if (p.id === id) {
      state.clock.dayTime = wrap(acc + 1, DAY_LENGTH_SECONDS);
      return;
    }
    acc += p.seconds;
  }
}
