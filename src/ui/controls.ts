import type { BreedId } from '../data/crew';
import type { CarvingId } from '../data/carvings';
import type { DayPhaseId } from '../data/dayCycle';
import type { BotId, GroundId, HuntStage, Slot } from '../data/economy';
import type { Notation } from '../util/format';
import type { UpgradeId } from '../data/upgrades';
import type { TrainingId } from '../data/training';
import type { PerkId } from '../data/legacy';
import type { FlywayId } from '../data/flyways';
import type { RungId } from '../data/progression';
import type { CropId } from '../data/crops';
import type { BoardRow, BoardSort } from '../app/online';

/** Commands the HUD can issue. main.ts wires these to the sim and scene. */
export interface GameControls {
  act(stage: HuntStage, ground?: GroundId): boolean;
  /** Switch the view between the marsh and the goose field. */
  setGround(g: GroundId): void;
  buyBot(id: BotId, count: number): number;
  levelUp(id: BotId): boolean;
  buyAcre(): boolean;
  buyUpgrade(id: UpgradeId): boolean;
  /** Hand over a filled guest booking. */
  claimGuest(id: number): boolean;
  buildLodge(): boolean;
  setProfile(name: string, avatar: string): void;
  /**
   * Take a name, checking the online leaderboard that it's free. Resolves to
   * an error to show (taken, badly formed), or null when the name is set.
   * Offline, the name is kept and joins the board later.
   */
  claimName(name: string): Promise<string | null>;
  /** Is the leaderboard set up, and is this lodge on it? */
  onlineStatus(): { enabled: boolean; joined: boolean; name: string; takenName: string | null };
  /** Fetch the leaderboard (top 50 plus your own row). */
  fetchBoard(sort: BoardSort): Promise<{ ok: true; rows: BoardRow[] } | { ok: false; error: string }>;
  /** Name the retriever and pick its breed. */
  setDog(name: string, breed: BreedId): void;
  /** Buy a carved decoy for the collection. */
  buyCarving(id: CarvingId): boolean;
  /** Fire the Big Volley when it's charged. */
  fireVolley(): boolean;
  /** Fish a drifting decoy out of the water (a small gift). */
  claimDrifter(): boolean;
  plantCrop(plot: number, crop: CropId): boolean;
  buyDecoys(g: GroundId): boolean;
  buyRung(id: RungId): boolean;
  /** Teach the crew a Crew Training skill. */
  buyTraining(id: TrainingId): boolean;
  /** Train your retriever to the next level. */
  trainDog(): boolean;
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
  /** Older copies of the save kept on this device, newest first. */
  listBackups(): { at: number; why: string; name: string; lodge: number; birds: number }[];
  restoreBackup(at: number): { ok: true } | { ok: false; error: string };
  setNotation(n: Notation): void;
  setReducedMotion(on: boolean): void;
  // Preview helpers
  setTimeScale(scale: number): void;
  getTimeScale(): number;
  jumpToPhase(id: DayPhaseId): void;
}
