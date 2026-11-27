import type { WeatherId } from './weather';
import type { IconName } from '../ui/tabs';

/**
 * Named days: now and then a day has a character of its own that changes
 * the hunt until the next morning. Not events, just variety.
 */
export type SpecialDayId = 'coldPush' | 'bluebird' | 'grayDay' | 'strays';

export interface SpecialDayDef {
  id: SpecialDayId;
  name: string;
  /** Ray's line when it starts. */
  ray: string;
  /** What it does, in plain words. */
  effect: string;
  /** Weather it brings in. */
  weather: WeatherId;
  icon: IconName;
  flockRate: number;
  flockSize: number;
  coins: number;
  feathers: number;
  patience: number;
  rare: number;
}

const base = { flockRate: 1, flockSize: 0, coins: 1, feathers: 1, patience: 1, rare: 1 };

export const SPECIAL_DAYS: Record<SpecialDayId, SpecialDayDef> = {
  coldPush: {
    ...base, id: 'coldPush', name: 'Cold Front Push', weather: 'coldFront', icon: 'wind',
    ray: "There's a front coming down from the north. Birds are pouring south ahead of it. Today's a big one.",
    effect: '60% more flocks, and 2 more birds in each.',
    flockRate: 1.6, flockSize: 2,
  },
  bluebird: {
    ...base, id: 'bluebird', name: 'Bluebird Day', weather: 'clear', icon: 'sun',
    ray: 'Clear and calm. The birds are wary on a day like this, but every one we bring in counts.',
    effect: 'Fewer flocks (−20%), but every bird pays 40% more coins.',
    flockRate: 0.8, coins: 1.4,
  },
  grayDay: {
    ...base, id: 'grayDay', name: 'Gray Drizzle', weather: 'drizzle', icon: 'drop',
    ray: 'Low clouds and a soft rain. Flocks hang around longer when it looks like this.',
    effect: 'Flocks wait 40% longer before leaving, and birds give 30% more feathers.',
    patience: 1.4, feathers: 1.3,
  },
  strays: {
    ...base, id: 'strays', name: 'Strays on the Wind', weather: 'wind', icon: 'book',
    ray: 'Odd birds on the wind today. Keep the Field Guide handy.',
    effect: 'Rare and legendary birds are twice as likely.',
    rare: 2,
  },
};

export const SPECIAL_DAY_ORDER: readonly SpecialDayId[] = ['coldPush', 'bluebird', 'grayDay', 'strays'];
/** Chance a new day is a named one (never two in a row). */
export const SPECIAL_DAY_CHANCE = 0.25;
