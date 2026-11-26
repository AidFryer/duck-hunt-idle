/** Marsh & lodge upgrades: levelled purchases with permanent effects. */
import type { SpeciesId } from './species';

export type UpgradeId = 'timber' | 'rice' | 'millet' | 'blinds' | 'decoyQuality' | 'lodgeRooms' | 'coffee' | 'cot';

export interface UpgradeDef {
  id: UpgradeId;
  name: string;
  blurb: string;
  /** What one level does, for the card. */
  effect: string;
  maxLevel: number;
  costCoins: number;
  costFeathers: number;
  costGrowth: number;
  /** Lifetime coins before the upgrade is offered. */
  revealAtCoins: number;
}

export const UPGRADES: Record<UpgradeId, UpgradeDef> = {
  timber: {
    id: 'timber', name: 'Flooded Timber', blurb: 'Flood a stand of oaks. Wood ducks love the cover.',
    effect: '+10% flocks, wood ducks much more likely', maxLevel: 5,
    costCoins: 400, costFeathers: 30, costGrowth: 2.4, revealAtCoins: 150,
  },
  rice: {
    id: 'rice', name: 'Rice Food Plot', blurb: 'Plant rice along the far bank.',
    effect: '+1 bird per flock, pintail & teal more likely', maxLevel: 5,
    costCoins: 600, costFeathers: 40, costGrowth: 2.4, revealAtCoins: 250,
  },
  millet: {
    id: 'millet', name: 'Millet Food Plot', blurb: 'Japanese millet on the mudflats.',
    effect: '+8% flocks, gadwall & wigeon more likely', maxLevel: 5,
    costCoins: 500, costFeathers: 35, costGrowth: 2.4, revealAtCoins: 200,
  },
  blinds: {
    id: 'blinds', name: 'Better Blinds', blurb: 'Fresh brush and a sturdier frame.',
    effect: '+6% of each flock taken per shot', maxLevel: 5,
    costCoins: 800, costFeathers: 60, costGrowth: 2.6, revealAtCoins: 400,
  },
  decoyQuality: {
    id: 'decoyQuality', name: 'Decoy Quality', blurb: 'Hand-painted decoys with real feather detail.',
    effect: '+2 decoys in the spread, flocks wait longer', maxLevel: 3,
    costCoins: 350, costFeathers: 50, costGrowth: 3, revealAtCoins: 120,
  },
  lodgeRooms: {
    id: 'lodgeRooms', name: 'Lodge Rooms', blurb: 'Fix up the guest rooms upstairs.',
    effect: '+12% coins from every logged bird', maxLevel: 10,
    costCoins: 1000, costFeathers: 40, costGrowth: 2.2, revealAtCoins: 500,
  },
  coffee: {
    id: 'coffee', name: 'The Coffee Pot', blurb: 'A better pot for the blind. Everybody perks up.',
    effect: '+4% speed for every bot', maxLevel: 5,
    costCoins: 250, costFeathers: 20, costGrowth: 2.8, revealAtCoins: 100,
  },
  cot: {
    id: 'cot', name: "Caretaker's Cot", blurb: 'Somebody to keep an eye on things overnight.',
    effect: '+1 hour of offline progress', maxLevel: 4,
    costCoins: 2000, costFeathers: 100, costGrowth: 3, revealAtCoins: 1000,
  },
};

export const UPGRADE_ORDER: readonly UpgradeId[] = ['coffee', 'decoyQuality', 'timber', 'millet', 'rice', 'blinds', 'lodgeRooms', 'cot'];

/** Per-level effect sizes (sim reads these). */
export const UPGRADE_EFFECTS = {
  timberFlockRate: 0.1,
  milletFlockRate: 0.08,
  riceFlockSize: 1,
  blindsShotFraction: 0.06,
  decoyQualitySpread: 2,
  decoyQualityPatience: 4,
  lodgeRoomsCoins: 0.12,
  coffeeSpeed: 0.04,
  cotHours: 1,
} as const;

/** Species weight multipliers per upgrade level: weight × (1 + k × level). */
export const UPGRADE_SPECIES: Partial<Record<UpgradeId, Partial<Record<SpeciesId, number>>>> = {
  timber: { woodDuck: 0.8, mallard: 0.15, blackDuck: 0.2 },
  rice: { pintail: 0.6, teal: 0.5 },
  millet: { gadwall: 0.6, wigeon: 0.6 },
};

export const OFFLINE = {
  /** Hours of offline progress before upgrades. */
  baseHours: 8,
  /** Gaps shorter than this are just normal catch-up, no summary card. */
  minSummarySeconds: 60,
  /** Sim step used when fast-forwarding offline time. */
  stepSeconds: 0.5,
} as const;
