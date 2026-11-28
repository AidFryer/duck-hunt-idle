import type { SpecialDayId } from '../data/days';
import type { GroundId } from '../data/economy';
/** Events from grounds other than the marsh carry their ground. */
export type OtherGround = Exclude<GroundId, 'marsh'>;
import type { CarvingId } from '../data/carvings';
import type { TrainingId } from '../data/training';
import type { StageId } from '../data/calendar';
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
  | { type: 'decoySet'; decoys: number; source: ActionSource; ground?: OtherGround }
  | { type: 'decoyDrift'; decoys: number; ground?: OtherGround }
  | { type: 'flockArrived'; flockId: number; size: number; species: SpeciesId; ground?: OtherGround; golden?: boolean }
  | { type: 'volleyUnlocked' }
  | { type: 'trainingLearned'; training: TrainingId }
  | { type: 'dogLevel'; level: number }
  | { type: 'guestBooked'; who: string }
  | { type: 'guestServed'; who: string; coins: number; feathers: number; served: number }
  | { type: 'stageChanged'; stage: StageId }
  | { type: 'volley'; birds: number; coins: number; feathers: number }
  | { type: 'carvingBought'; carving: CarvingId }
  | { type: 'goldenShot'; coins: number; feathers: number; ground?: OtherGround }
  | { type: 'flockPassed'; size: number; ground?: OtherGround }
  | { type: 'flockLeft'; flockId: number; ground?: OtherGround }
  | { type: 'flockCalled'; flockId: number; source: ActionSource; ground?: OtherGround }
  | { type: 'flockFlared'; flockId: number; ground?: OtherGround }
  | { type: 'shot'; flockId: number; downed: number; source: ActionSource; ground?: OtherGround }
  | { type: 'retrieved'; species: SpeciesId; feathers: number; count: number; source: ActionSource; ground?: OtherGround }
  | { type: 'logged'; coins: number; count: number; source: ActionSource | 'keeper' }
  | { type: 'scouted'; source: ActionSource }
  | { type: 'problem'; problemId: number; bot: BotId; job: JobId; kind: ProblemKind }
  | { type: 'problemRetry'; problemId: number; bot: BotId; attempt: number; ok: boolean }
  | { type: 'problemFixed'; problemId: number; bot: BotId; by: 'you' | 'foreman' | 'self' }
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
  | { type: 'lodgeBuilt'; level: number }
  | { type: 'decoysBought'; ground: GroundId; decoys: number }
  | { type: 'cropPlanted'; plot: number; crop: CropId }
  | { type: 'planEarned'; bot: BotId }
  | { type: 'rungBuilt'; rung: RungId }
  | { type: 'dailyBonus'; coins: number; feathers: number }
  | { type: 'drifterClaimed'; coins: number; feathers: number }
  | { type: 'handBonus'; coins: number }
  | { type: 'flywayMastered'; flyway: FlywayId }
  | { type: 'specialDay'; day: SpecialDayId }
  | { type: 'perkBought'; perk: PerkId }
  | { type: 'seasonClosed'; stars: number; season: number; flyway: FlywayId }
  | { type: 'flockReturned'; flockId: number }
  | { type: 'dayEnded'; day: number; bag: number; best: boolean };

export type EventSink = SimEvent[];
