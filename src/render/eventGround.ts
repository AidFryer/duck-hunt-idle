import { FIELD_BOTS, type BotId, type GroundId } from '../data/economy';
import type { SimEvent } from '../sim/events';

/** Which ground a crew member works. */
export function botGround(bot: BotId): GroundId {
  if (FIELD_BOTS.includes(bot)) return 'field';
  if (bot === 'guide') return 'timber';
  if (bot === 'boatman') return 'bay';
  return 'marsh';
}

/** Events that only ever happen on the home marsh (they carry no ground tag). */
const MARSH_ONLY = new Set<SimEvent['type']>([
  'decoySet', 'decoyDrift', 'flockArrived', 'flockPassed', 'flockCalled', 'flockLeft', 'flockFlared',
  'shot', 'retrieved', 'logged', 'scouted', 'acreRestored', 'cropPlanted', 'carvingBought',
]);

/**
 * The ground an event belongs to, or null for events that aren't tied to
 * one (lodge built, season closed, the volley...), which play wherever
 * you're looking.
 */
export function eventGround(e: SimEvent): GroundId | null {
  if ('ground' in e && e.ground) return e.ground;
  if ('bot' in e && e.bot) return botGround(e.bot);
  if (MARSH_ONLY.has(e.type)) return 'marsh';
  return null;
}
