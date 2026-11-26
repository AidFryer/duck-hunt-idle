import { BOT_ORDER } from '../src/data/economy';
import { MAX_LODGE } from '../src/data/progression';
import type { GameState } from '../src/sim/state';

/** A state with the whole lodge built and every bot plan earned (for mechanics tests). */
export function opened<T extends GameState>(s: T): T {
  s.lodge = MAX_LODGE;
  for (const b of BOT_ORDER) s.plans[b] = true;
  return s;
}
