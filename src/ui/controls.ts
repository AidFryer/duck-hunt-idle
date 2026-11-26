import type { DayPhaseId } from '../data/dayCycle';
import type { BotId, HuntStage, Slot } from '../data/economy';
import type { Notation } from '../util/format';
import type { UpgradeId } from '../data/upgrades';
import type { NodeKind } from '../data/workflows';
import type { PerkId } from '../data/legacy';
import type { FlywayId } from '../data/flyways';
import type { RungId } from '../data/progression';

/** Commands the HUD can issue. main.ts wires these to the sim and scene. */
export interface GameControls {
  act(stage: HuntStage): boolean;
  buyBot(id: BotId, count: number): number;
  levelUp(id: BotId): boolean;
  buyAcre(): boolean;
  buyUpgrade(id: UpgradeId): boolean;
  buildLodge(): boolean;
  buyRung(id: RungId): boolean;
  addCard(kind: NodeKind): boolean;
  removeCard(id: number): boolean;
  connectCards(from: number, to: number): boolean;
  cutRope(from: number): boolean;
  buyPerk(id: PerkId): boolean;
  closeSeason(flyway: FlywayId): number;
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
