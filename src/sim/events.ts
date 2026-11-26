import type { CropId } from '../data/crops';
import type { RungId } from '../data/progression';
import type { BotId, JobId, ProblemKind, Slot, SpeciesId } from '../data/economy';
import type { UpgradeId } from '../data/upgrades';
import type { WeatherId } from '../data/weather';
import type { FlywayId } from '../data/flyways';
import type { PerkId } from '../data/legacy';
import type { FeatureId } from '../data/features';

export type ActionSource = 'manual' | BotId;

/**
 * Things that happened during a tick. The sim pushes them; the renderer and
 * HUD drain them to play animations and feedback. Never saved.
 */
export type SimEvent =
  | { type: 'decoySet'; decoys: number; source: ActionSource; ground?: 'field' }
  | { type: 'decoyDrift'; decoys: number; ground?: 'field' }
  | { type: 'flockArrived'; flockId: number; size: number; species: SpeciesId; ground?: 'field'; golden?: boolean }
  | { type: 'goldenShot'; coins: number; feathers: number; ground?: 'field' }
  | { type: 'flockPassed'; size: number; ground?: 'field' }
  | { type: 'flockLeft'; flockId: number; ground?: 'field' }
  | { type: 'flockCalled'; flockId: number; source: ActionSource; ground?: 'field' }
  | { type: 'flockFlared'; flockId: number; ground?: 'field' }
  | { type: 'shot'; flockId: number; downed: number; source: ActionSource; ground?: 'field' }
  | { type: 'retrieved'; species: SpeciesId; feathers: number; count: number; source: ActionSource; ground?: 'field' }
  | { type: 'logged'; coins: number; count: number; source: ActionSource | 'keeper' }
  | { type: 'scouted'; source: ActionSource }
  | { type: 'problem'; problemId: number; bot: BotId; job: JobId; kind: ProblemKind }
  | { type: 'problemRetry'; problemId: number; bot: BotId; attempt: number; ok: boolean }
  | { type: 'problemFixed'; problemId: number; bot: BotId; by: 'you' | 'foreman' }
  | { type: 'problemEscalated'; problemId: number; bot: BotId }
  | { type: 'botMoved'; bot: BotId; from: Slot; to: Slot }
  | { type: 'botBought'; bot: BotId; count: number; owned: number }
  | { type: 'botMilestone'; bot: BotId; owned: number; multiplier: number }
  | { type: 'botLevel'; bot: BotId; level: number; by: 'you' | 'tinker' }
  | { type: 'acreRestored'; acres: number }
  | { type: 'upgradeBought'; upgrade: UpgradeId; level: number }
  | { type: 'weatherChanged'; from: WeatherId; to: WeatherId }
  | { type: 'newSpecies'; species: SpeciesId; coins: number; feathers: number }
  | { type: 'achievement'; id: string }
  | { type: 'workflowChanged' }
  | { type: 'featureUnlocked'; feature: FeatureId }
  | { type: 'streak'; level: number; bonus: number }
  | { type: 'lodgeBuilt'; level: number }
  | { type: 'decoysBought'; ground: 'marsh' | 'field'; decoys: number }
  | { type: 'cropPlanted'; plot: number; crop: CropId }
  | { type: 'planEarned'; bot: BotId }
  | { type: 'rungBuilt'; rung: RungId }
  | { type: 'dailyBonus'; coins: number; feathers: number }
  | { type: 'perkBought'; perk: PerkId }
  | { type: 'seasonClosed'; stars: number; season: number; flyway: FlywayId }
  | { type: 'flockReturned'; flockId: number }
  | { type: 'dayEnded'; day: number; bag: number; best: boolean };

export type EventSink = SimEvent[];
