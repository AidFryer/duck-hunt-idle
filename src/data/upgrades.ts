/** Marsh & lodge upgrades: levelled purchases with permanent effects. */
import type { SpeciesId } from './species';

export type UpgradeId =
  | 'timber' | 'rice' | 'millet' | 'blinds' | 'decoyQuality' | 'lodgeRooms' | 'coffee' | 'cot'
  | 'nestBoxes' | 'weathervane' | 'celeryBeds' | 'boatHouse' | 'lanterns' | 'deepPool' | 'guestDock' | 'smokehouse' | 'carvingShed'
  | 'cornStubble' | 'winterWheat' | 'roostPond';

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
  /** Lodge level that makes it available. */
  lodge: number;
  /** Shown with the goose field's upgrades. */
  field?: boolean;
}

export const UPGRADES: Record<UpgradeId, UpgradeDef> = {
  timber: {
    id: 'timber', name: 'Flooded Timber', blurb: 'Flood a stand of oaks. Wood ducks love the cover.',
    effect: '+10% flocks, brings black ducks', maxLevel: 8,
    costCoins: 1200, costFeathers: 90, costGrowth: 2.4, revealAtCoins: 150, lodge: 3,
  },
  rice: {
    id: 'rice', name: 'Rice Food Plot', blurb: 'Plant rice along the far bank.',
    effect: '+1 bird per flock, brings pintail', maxLevel: 5,
    costCoins: 1800, costFeathers: 120, costGrowth: 2.4, revealAtCoins: 250, lodge: 3,
  },
  millet: {
    id: 'millet', name: 'Millet Food Plot', blurb: 'Japanese millet on the mudflats.',
    effect: '+8% flocks, brings gadwall & shovelers', maxLevel: 5,
    costCoins: 1500, costFeathers: 105, costGrowth: 2.4, revealAtCoins: 200, lodge: 2,
  },
  blinds: {
    id: 'blinds', name: 'Better Blinds', blurb: 'Fresh brush and a sturdier frame.',
    effect: '+6% of each flock taken per shot', maxLevel: 10,
    costCoins: 2400, costFeathers: 180, costGrowth: 2.6, revealAtCoins: 400, lodge: 3,
  },
  decoyQuality: {
    id: 'decoyQuality', name: 'Decoy Quality', blurb: 'Hand-painted decoys with real feather detail.',
    effect: '+2 decoys in the spread, flocks wait longer', maxLevel: 6,
    costCoins: 450, costFeathers: 40, costGrowth: 3, revealAtCoins: 120, lodge: 1,
  },
  lodgeRooms: {
    id: 'lodgeRooms', name: 'Lodge Rooms', blurb: 'Fix up the guest rooms upstairs.',
    effect: '+12% coins from every logged bird', maxLevel: 25,
    costCoins: 3000, costFeathers: 120, costGrowth: 2.2, revealAtCoins: 500, lodge: 3,
  },
  coffee: {
    id: 'coffee', name: 'The Coffee Pot', blurb: 'A better pot for the blind. Everybody perks up.',
    effect: '+4% speed for every bot', maxLevel: 10,
    costCoins: 750, costFeathers: 60, costGrowth: 2.8, revealAtCoins: 100, lodge: 2,
  },
  cot: {
    id: 'cot', name: "Caretaker's Cot", blurb: 'Somebody to keep an eye on things overnight.',
    effect: '+1 hour of offline progress', maxLevel: 4,
    costCoins: 6000, costFeathers: 300, costGrowth: 3, revealAtCoins: 1000, lodge: 4,
  },
  nestBoxes: {
    id: 'nestBoxes', name: 'Nest Boxes', blurb: 'Cedar boxes on posts along the bank, each with a little round door.',
    effect: '+5% flocks, brings wood ducks', maxLevel: 3,
    costCoins: 300, costFeathers: 25, costGrowth: 2.5, revealAtCoins: 0, lodge: 1,
  },
  weathervane: {
    id: 'weathervane', name: 'Weathervane', blurb: 'A copper mallard on the roof. Now you know which way to set the spread.',
    effect: 'Decoys drift loose 15% slower', maxLevel: 3,
    costCoins: 150, costFeathers: 15, costGrowth: 2.6, revealAtCoins: 0, lodge: 1,
  },
  celeryBeds: {
    id: 'celeryBeds', name: 'Wild Celery Beds', blurb: 'Plant wild celery in the quiet water. Divers and wigeon go wild for it.',
    effect: '+6% flocks, brings wigeon & ring-necks', maxLevel: 6,
    costCoins: 4_500, costFeathers: 300, costGrowth: 2.4, revealAtCoins: 0, lodge: 3,
  },
  boatHouse: {
    id: 'boatHouse', name: 'Boat House', blurb: 'A snug shed at the water with a ramp for the dogs.',
    effect: '+15% retrieving speed', maxLevel: 4,
    costCoins: 6_000, costFeathers: 400, costGrowth: 2.5, revealAtCoins: 0, lodge: 3,
  },
  lanterns: {
    id: 'lanterns', name: 'Lantern Posts', blurb: 'Warm lanterns along the boardwalk, so the crew can work into the evening.',
    effect: 'More flocks at night', maxLevel: 3,
    costCoins: 7_500, costFeathers: 500, costGrowth: 2.6, revealAtCoins: 0, lodge: 3,
  },
  deepPool: {
    id: 'deepPool', name: 'Deep Pool', blurb: 'Dig out a deep, open pool. Diving ducks need room to dive.',
    effect: '+8% flocks, brings redheads & canvasbacks', maxLevel: 3,
    costCoins: 60_000, costFeathers: 3_000, costGrowth: 2.5, revealAtCoins: 0, lodge: 4,
  },
  guestDock: {
    id: 'guestDock', name: 'Guest Dock', blurb: 'A long dock with rocking chairs. Guests tell their friends.',
    effect: 'Reputation grows 15% faster', maxLevel: 10,
    costCoins: 50_000, costFeathers: 2_500, costGrowth: 2.3, revealAtCoins: 0, lodge: 4,
  },
  smokehouse: {
    id: 'smokehouse', name: 'Smokehouse', blurb: 'A little smokehouse out back. Every bird is worth more feathers.',
    effect: '+15% feathers per bird', maxLevel: 10,
    costCoins: 40_000, costFeathers: 1_500, costGrowth: 2.3, revealAtCoins: 0, lodge: 4,
  },
  carvingShed: {
    id: 'carvingShed', name: 'Carving Shed', blurb: 'A proper shed with good light, sharp knives and a pot of glue.',
    effect: 'Every bot 6% cheaper', maxLevel: 5,
    costCoins: 500_000, costFeathers: 20_000, costGrowth: 2.4, revealAtCoins: 0, lodge: 5,
  },
  cornStubble: {
    id: 'cornStubble', name: 'Corn Stubble', blurb: 'Leave a strip of picked corn standing. Geese can smell a free lunch.',
    effect: '+10% goose flocks, brings cackling geese', maxLevel: 5, field: true,
    costCoins: 30_000, costFeathers: 1_500, costGrowth: 2.3, revealAtCoins: 0, lodge: 4,
  },
  winterWheat: {
    id: 'winterWheat', name: 'Winter Wheat', blurb: 'A green carpet of sprouting wheat. The white geese come down out of the sky for it.',
    effect: '+1 goose per flock, brings snow geese', maxLevel: 5, field: true,
    costCoins: 80_000, costFeathers: 4_000, costGrowth: 2.3, revealAtCoins: 0, lodge: 4,
  },
  roostPond: {
    id: 'roostPond', name: 'Roost Pond', blurb: 'A shallow pond at the field edge for geese and cranes to loaf on at midday.',
    effect: '+8% goose flocks, brings brant & cranes', maxLevel: 3, field: true,
    costCoins: 400_000, costFeathers: 15_000, costGrowth: 2.4, revealAtCoins: 0, lodge: 5,
  },
};

export const UPGRADE_ORDER: readonly UpgradeId[] = [
  'weathervane', 'nestBoxes', 'decoyQuality', 'coffee',
  'timber', 'celeryBeds', 'blinds', 'boatHouse', 'lanterns', 'lodgeRooms',
  'deepPool', 'guestDock', 'smokehouse', 'cot',
  'carvingShed', 'cornStubble', 'winterWheat', 'roostPond',
];

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
  nestBoxesFlockRate: 0.05,
  weathervaneDrift: 0.15,
  celeryFlockRate: 0.06,
  boatHouseRetrieve: 0.15,
  /** Night activity floor per lantern level. */
  lanternsNight: 0.12,
  deepPoolFlockRate: 0.08,
  guestDockReputation: 0.15,
  smokehouseFeathers: 0.15,
  carvingShedDiscount: 0.06,
  cornStubbleFlockRate: 0.1,
  winterWheatFlockSize: 1,
  roostPondFlockRate: 0.08,
} as const;

/** Species weight multipliers per upgrade level: weight × (1 + k × level). */
export const UPGRADE_SPECIES: Partial<Record<UpgradeId, Partial<Record<SpeciesId, number>>>> = {
  timber: { woodDuck: 0.8, mallard: 0.15, blackDuck: 0.2 },
  nestBoxes: { woodDuck: 0.6 },
  celeryBeds: { wigeon: 0.5, ringNeck: 0.5, canvasback: 0.4 },
  deepPool: { redhead: 0.5, canvasback: 0.4, scaup: 0.4, bufflehead: 0.3 },
  cornStubble: { canadaGoose: 0.2, cacklingGoose: 0.5 },
  winterWheat: { snowGoose: 0.5, rossGoose: 0.4, whiteFront: 0.3 },
  roostPond: { brant: 0.5, sandhillCrane: 0.4 },
};

export const OFFLINE = {
  /** Hours of offline progress before upgrades. */
  baseHours: 8,
  /** Gaps shorter than this are just normal catch-up, no summary card. */
  minSummarySeconds: 60,
  /** Sim step used when fast-forwarding offline time. */
  stepSeconds: 0.5,
} as const;
