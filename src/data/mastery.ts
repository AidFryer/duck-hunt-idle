import type { FlywayId } from './flyways';

/**
 * Flyway mastery: four challenges per flyway, counted only while you hunt
 * there. Finish all four and the flyway is mastered: a badge, and coins
 * +10% for good.
 */
export interface MasteryGoals {
  /** Birds brought in on a single day. */
  bag: number;
  /** Different kinds of bird brought in on this flyway. */
  kinds: number;
  /** Guest parties served here. */
  guests: number;
}

export const MASTERY: Record<FlywayId, MasteryGoals> = {
  mississippi: { bag: 2_000, kinds: 15, guests: 10 },
  central: { bag: 5_000, kinds: 20, guests: 20 },
  pacific: { bag: 10_000, kinds: 25, guests: 30 },
  atlantic: { bag: 20_000, kinds: 30, guests: 40 },
};

/** Coins bonus for each mastered flyway. */
export const MASTERY_BONUS = 0.1;
