import type { BotId, SpeciesId } from '../data/economy';

export type ActionSource = 'manual' | BotId;

/**
 * Things that happened during a tick. The sim pushes them; the renderer and
 * HUD drain them to play animations and feedback. Never saved.
 */
export type SimEvent =
  | { type: 'decoySet'; decoys: number; source: ActionSource }
  | { type: 'decoyDrift'; decoys: number }
  | { type: 'flockArrived'; flockId: number; size: number; species: SpeciesId }
  | { type: 'flockPassed'; size: number }
  | { type: 'flockLeft'; flockId: number }
  | { type: 'flockCalled'; flockId: number; source: ActionSource }
  | { type: 'flockFlared'; flockId: number }
  | { type: 'shot'; flockId: number; downed: number; source: ActionSource }
  | { type: 'retrieved'; species: SpeciesId; coins: number; feathers: number; source: ActionSource }
  | { type: 'botBought'; bot: BotId; count: number; owned: number }
  | { type: 'botMilestone'; bot: BotId; owned: number; multiplier: number }
  | { type: 'botLevel'; bot: BotId; level: number }
  | { type: 'acreRestored'; acres: number }
  | { type: 'dayEnded'; day: number; bag: number; best: boolean };

export type EventSink = SimEvent[];
