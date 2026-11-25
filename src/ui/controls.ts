import type { DayPhaseId } from '../data/dayCycle';

/** Commands the HUD can issue. main.ts wires these to the sim and scene. */
export interface GameControls {
  setTimeScale(scale: number): void;
  getTimeScale(): number;
  jumpToPhase(id: DayPhaseId): void;
  sendLandingFlock(): void;
  sendFlyover(): void;
}
