import type { DayPhaseId } from '../data/dayCycle';
import type { BotId, HuntStage } from '../data/economy';
import type { Notation } from '../util/format';

/** Commands the HUD can issue. main.ts wires these to the sim and scene. */
export interface GameControls {
  act(stage: HuntStage): boolean;
  buyBot(id: BotId, count: number): number;
  levelUp(id: BotId): boolean;
  buyAcre(): boolean;
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
