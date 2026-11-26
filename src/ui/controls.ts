import type { DayPhaseId } from '../data/dayCycle';
import type { BotId, HuntStage, Slot } from '../data/economy';
import type { Notation } from '../util/format';
import type { UpgradeId } from '../data/upgrades';

/** Commands the HUD can issue. main.ts wires these to the sim and scene. */
export interface GameControls {
  act(stage: HuntStage): boolean;
  buyBot(id: BotId, count: number): number;
  levelUp(id: BotId): boolean;
  buyAcre(): boolean;
  buyUpgrade(id: UpgradeId): boolean;
  moveBot(bot: BotId, from: Slot, to: Slot): boolean;
  fixProblem(id: number): boolean;
  fixBot(bot: BotId): boolean;
  fixAll(): number;
  setForeman(retries: number, backoff: number): void;
  exportSave(): string;
  importSave(code: string): { ok: true } | { ok: false; error: string };
  resetSave(): void;
  setNotation(n: Notation): void;
  setReducedMotion(on: boolean): void;
  // Preview helpers
  setTimeScale(scale: number): void;
  getTimeScale(): number;
  jumpToPhase(id: DayPhaseId): void;
}
