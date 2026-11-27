/**
 * The season calendar: every couple of in-game days the migration moves on.
 * Each stage favors different birds and weather. Derived from the day count,
 * so it needs no save state.
 */
import type { SpeciesId } from './species';
import type { WeatherId } from './weather';

export type StageId = 'opening' | 'peak' | 'late' | 'freeze';

export interface StageDef {
  id: StageId;
  name: string;
  /** One line for the HUD card. */
  blurb: string;
  flockRate: number;
  flockSize: number;
  /** Extra chance for rare and legendary birds. */
  rare: number;
  /** Coins per bird. */
  coins: number;
  species: Partial<Record<SpeciesId, number>>;
  weather: Partial<Record<WeatherId, number>>;
  /** Marsh grass tint (0xRRGGBB) and how strongly to apply it. */
  tint: number;
  tintAmount: number;
}

/** In-game days per stage (one day is ten real minutes). */
export const DAYS_PER_STAGE = 2;

export const CALENDAR: readonly StageDef[] = [
  {
    id: 'opening', name: 'Opening Week', blurb: 'Teal and wood ducks are on the move. Mild mornings.',
    flockRate: 0.92, flockSize: 0.95, rare: 1, coins: 1,
    species: { teal: 2, woodDuck: 2, cinnamonTeal: 1.6, shoveler: 1.4, pintail: 1.2 },
    weather: { clear: 1.6, coldFront: 0.4 },
    tint: 0x8fae5a, tintAmount: 0.18,
  },
  {
    id: 'peak', name: 'Peak Flight', blurb: 'The big push south. Bigger flocks, more often.',
    flockRate: 1.2, flockSize: 1.15, rare: 1, coins: 0.95,
    species: { mallard: 1.2, gadwall: 1.3, wigeon: 1.3, pintail: 1.3, snowGoose: 1.5, rossGoose: 1.4, whiteFront: 1.3, sandhillCrane: 1.3 },
    weather: { wind: 1.3 },
    tint: 0xc9a04e, tintAmount: 0.22,
  },
  {
    id: 'late', name: 'Late Season', blurb: 'Divers and big water birds. Rare ducks show up more.',
    flockRate: 1, flockSize: 1, rare: 1.3, coins: 1,
    species: { canvasback: 1.8, redhead: 1.6, scaup: 1.6, bufflehead: 1.5, ringNeck: 1.4, hoodedMerganser: 1.5, blackDuck: 1.5, canadaGoose: 1.3 },
    weather: { coldFront: 1.6, fog: 1.2 },
    tint: 0xa0703f, tintAmount: 0.26,
  },
  {
    id: 'freeze', name: 'Hard Freeze', blurb: 'Fewer flocks, but sea ducks and rarities. Hard-won birds pay more.',
    flockRate: 0.85, flockSize: 0.95, rare: 1.6, coins: 1.1,
    species: { kingEider: 2, harlequin: 2, longtail: 2, blackDuck: 1.6, brant: 1.5, emperorGoose: 1.5, cacklingGoose: 1.3, bufflehead: 1.3 },
    weather: { coldFront: 2.2, clear: 0.7, drizzle: 0.6 },
    tint: 0xc8d4dc, tintAmount: 0.3,
  },
];

export function stageIndex(day: number): number {
  return Math.floor(Math.max(0, day - 1) / DAYS_PER_STAGE) % CALENDAR.length;
}

export function stageFor(day: number): StageDef {
  return CALENDAR[stageIndex(day)]!;
}

/** Day of the current stage (1-based) and how many it has. */
export function stageDay(day: number): { day: number; of: number } {
  return { day: (Math.max(0, day - 1) % DAYS_PER_STAGE) + 1, of: DAYS_PER_STAGE };
}
