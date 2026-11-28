/** Marsh & lodge upgrades: levelled purchases with permanent effects. */
import type { SpeciesId } from './species';

export type UpgradeId =
  | 'timber' | 'rice' | 'millet' | 'blinds' | 'decoyQuality' | 'lodgeRooms' | 'coffee' | 'cot'
  | 'nestBoxes' | 'weathervane' | 'celeryBeds' | 'boatHouse' | 'lanterns' | 'deepPool' | 'guestDock' | 'smokehouse' | 'carvingShed'
  | 'cornStubble' | 'winterWheat' | 'roostPond' | 'trophyRoom' | 'mapRoom'
  | 'musselBeds' | 'kelpLine' | 'breakwater'
  | 'duckweed' | 'cypressBlind' | 'jonBoat';

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
  /** Belongs to another hunting ground (timber or bay). */
  ground?: 'timber' | 'bay';
  /** A room of the lodge (built from the Lodge sheet, not the Land sheet). */
  room?: boolean;
}

export const UPGRADES: Record<UpgradeId, UpgradeDef> = {
  timber: {
    id: 'timber', name: 'Pin Oak Stand', ground: 'timber', blurb: 'Let more pin oaks stand in the water. Mallards and black ducks pile into the acorns.',
    effect: '+10% timber flocks, brings black ducks', maxLevel: 8,
    costCoins: 6000, costFeathers: 450, costGrowth: 2.4, revealAtCoins: 150, lodge: 3,
  },
  rice: {
    id: 'rice', name: 'Rice Food Plot', blurb: 'Plant rice along the far bank.',
    effect: '+1 bird per flock, brings pintail', maxLevel: 5,
    costCoins: 9000, costFeathers: 600, costGrowth: 2.4, revealAtCoins: 250, lodge: 3,
  },
  millet: {
    id: 'millet', name: 'Millet Food Plot', blurb: 'Japanese millet on the mudflats.',
    effect: '+8% flocks, brings gadwall & shovelers', maxLevel: 5,
    costCoins: 1500, costFeathers: 105, costGrowth: 2.4, revealAtCoins: 200, lodge: 2,
  },
  blinds: {
    id: 'blinds', name: 'Better Blinds', blurb: 'Fresh brush and a sturdier frame.',
    effect: '+6% of each flock taken per shot', maxLevel: 10,
    costCoins: 12_000, costFeathers: 900, costGrowth: 2.6, revealAtCoins: 400, lodge: 3,
  },
  decoyQuality: {
    id: 'decoyQuality', name: 'Decoy Quality', blurb: 'Hand-painted decoys with real feather detail.',
    effect: '+2 decoys in the spread, flocks wait longer', maxLevel: 6,
    costCoins: 450, costFeathers: 40, costGrowth: 3, revealAtCoins: 120, lodge: 1,
  },
  lodgeRooms: {
    id: 'lodgeRooms', name: 'Guest Rooms', room: true, blurb: 'Fix up the guest rooms upstairs. Paying hunters sleep better than you think.',
    effect: '+12% coins from every logged bird', maxLevel: 25,
    costCoins: 15_000, costFeathers: 600, costGrowth: 2.2, revealAtCoins: 500, lodge: 3,
  },
  coffee: {
    id: 'coffee', name: 'Kitchen', room: true, blurb: 'A real kitchen with a big coffee pot. The whole crew perks up.',
    effect: '+4% speed for every bot', maxLevel: 10,
    costCoins: 750, costFeathers: 60, costGrowth: 2.8, revealAtCoins: 100, lodge: 2,
  },
  cot: {
    id: 'cot', name: 'Bunkhouse', room: true, blurb: 'Bunks for a caretaker who keeps the crew working while you sleep.',
    effect: '+1 hour of offline progress', maxLevel: 4,
    costCoins: 90_000, costFeathers: 4500, costGrowth: 3, revealAtCoins: 1000, lodge: 4,
  },
  duckweed: {
    id: 'duckweed', name: 'Duckweed Flats', ground: 'timber', blurb: 'Let the duckweed spread in the still water between the trunks.',
    effect: '+12% timber flocks', maxLevel: 6,
    costCoins: 2000, costFeathers: 3000, costGrowth: 2.2, revealAtCoins: 0, lodge: 3,
  },
  cypressBlind: {
    id: 'cypressBlind', name: 'Cypress Blind', ground: 'timber', blurb: 'A blind built right into a hollow cypress, close enough to touch the birds.',
    effect: '+4% of each timber flock per shot', maxLevel: 5,
    costCoins: 4000, costFeathers: 6000, costGrowth: 2.3, revealAtCoins: 0, lodge: 3,
  },
  jonBoat: {
    id: 'jonBoat', name: 'Old Jon Boat', ground: 'timber', blurb: 'A flat-bottomed boat that slips between the trees. The guides love it.',
    effect: 'Timber Guides +20% faster', maxLevel: 5,
    costCoins: 8000, costFeathers: 12000, costGrowth: 2.4, revealAtCoins: 0, lodge: 3,
  },
  nestBoxes: {
    id: 'nestBoxes', name: 'Nest Boxes', ground: 'timber', blurb: 'Cedar boxes on posts along the bank, each with a little round door.',
    effect: '+5% timber flocks, more wood ducks', maxLevel: 3,
    costCoins: 1500, costFeathers: 125, costGrowth: 2.5, revealAtCoins: 0, lodge: 3,
  },
  weathervane: {
    id: 'weathervane', name: 'Weathervane', blurb: 'A copper mallard on the roof. Now you know which way to set the spread.',
    effect: 'Decoys drift loose 15% slower', maxLevel: 3,
    costCoins: 150, costFeathers: 15, costGrowth: 2.6, revealAtCoins: 0, lodge: 1,
  },
  celeryBeds: {
    id: 'celeryBeds', name: 'Wild Celery Beds', blurb: 'Plant wild celery in the quiet water. Divers and wigeon go wild for it.',
    effect: '+6% flocks, brings wigeon & ring-necks', maxLevel: 6,
    costCoins: 22_500, costFeathers: 1500, costGrowth: 2.4, revealAtCoins: 0, lodge: 3,
  },
  boatHouse: {
    id: 'boatHouse', name: 'Boathouse', room: true, blurb: 'A snug shed at the water with a ramp for the dogs.',
    effect: '+15% retrieving speed', maxLevel: 4,
    costCoins: 30_000, costFeathers: 2000, costGrowth: 2.5, revealAtCoins: 0, lodge: 3,
  },
  lanterns: {
    id: 'lanterns', name: 'Lantern Walk', room: true, blurb: 'Warm lanterns along the boardwalk, so the crew can work into the evening.',
    effect: 'More flocks at night', maxLevel: 3,
    costCoins: 37_500, costFeathers: 2500, costGrowth: 2.6, revealAtCoins: 0, lodge: 3,
  },
  deepPool: {
    id: 'deepPool', name: 'Deep Pool', blurb: 'Dig out a deep, open pool. Diving ducks need room to dive.',
    effect: '+8% flocks, brings redheads & canvasbacks', maxLevel: 3,
    costCoins: 900_000, costFeathers: 45_000, costGrowth: 2.5, revealAtCoins: 0, lodge: 4,
  },
  guestDock: {
    id: 'guestDock', name: 'Guest Dock', room: true, blurb: 'A long dock with rocking chairs. Guests tell their friends.',
    effect: 'Reputation grows 15% faster', maxLevel: 10,
    costCoins: 750_000, costFeathers: 37_500, costGrowth: 2.3, revealAtCoins: 0, lodge: 4,
  },
  smokehouse: {
    id: 'smokehouse', name: 'Smokehouse', room: true, blurb: 'A little smokehouse out back. Every bird is worth more feathers.',
    effect: '+15% feathers per bird', maxLevel: 10,
    costCoins: 600_000, costFeathers: 22_500, costGrowth: 2.3, revealAtCoins: 0, lodge: 4,
  },
  carvingShed: {
    id: 'carvingShed', name: 'Carving Shed', room: true, blurb: 'A proper shed with good light, sharp knives and a pot of glue.',
    effect: 'Every bot 6% cheaper', maxLevel: 5,
    costCoins: 20_000_000, costFeathers: 800_000, costGrowth: 2.4, revealAtCoins: 0, lodge: 5,
  },
  cornStubble: {
    id: 'cornStubble', name: 'Corn Stubble', blurb: 'Leave a strip of picked corn standing. Geese can smell a free lunch.',
    effect: '+10% goose flocks, brings cackling geese', maxLevel: 5, field: true,
    costCoins: 450_000, costFeathers: 22_500, costGrowth: 2.3, revealAtCoins: 0, lodge: 4,
  },
  winterWheat: {
    id: 'winterWheat', name: 'Winter Wheat', blurb: 'A green carpet of sprouting wheat. The white geese come down out of the sky for it.',
    effect: '+1 goose per flock, brings snow geese', maxLevel: 5, field: true,
    costCoins: 1_200_000, costFeathers: 60_000, costGrowth: 2.3, revealAtCoins: 0, lodge: 4,
  },
  roostPond: {
    id: 'roostPond', name: 'Roost Pond', blurb: 'A shallow pond at the field edge for geese and cranes to loaf on at midday.',
    effect: '+8% goose flocks, brings brant & cranes', maxLevel: 3, field: true,
    costCoins: 16_000_000, costFeathers: 600_000, costGrowth: 2.4, revealAtCoins: 0, lodge: 5,
  },
  trophyRoom: {
    id: 'trophyRoom', name: 'Trophy Room', room: true, blurb: 'Glass cases, a long table and every jacket patch framed on the wall.',
    effect: 'Each patch adds 25% more', maxLevel: 8,
    costCoins: 15_000, costFeathers: 1_000, costGrowth: 2.5, revealAtCoins: 0, lodge: 3,
  },
  mapRoom: {
    id: 'mapRoom', name: 'Map Room', room: true, blurb: 'Charts of every flyway pinned up with little brass tacks.',
    effect: 'Golden flocks 10% more often', maxLevel: 5,
    costCoins: 300_000, costFeathers: 15_000, costGrowth: 2.6, revealAtCoins: 0, lodge: 4,
  },
  musselBeds: {
    id: 'musselBeds', name: 'Mussel Beds', ground: 'bay', blurb: 'Seed mussel beds off the point. Scoters and eiders dive for them all winter.',
    effect: '+10% bay flocks, brings white-winged & black scoters and eiders', maxLevel: 6,
    costCoins: 4_000_000, costFeathers: 200_000, costGrowth: 2.5, revealAtCoins: 0, lodge: 5,
  },
  kelpLine: {
    id: 'kelpLine', name: 'Kelp Line', ground: 'bay', blurb: 'A long line of kelp beds where the bay meets the open sea.',
    effect: '+8% bay flocks, brings long-tails & harlequins', maxLevel: 5,
    costCoins: 10_000_000, costFeathers: 450_000, costGrowth: 2.6, revealAtCoins: 0, lodge: 5,
  },
  breakwater: {
    id: 'breakwater', name: 'Breakwater', ground: 'bay', blurb: 'A stone breakwater calms the water so big rafts settle in.',
    effect: '+2 birds per bay flock, brings rare eiders', maxLevel: 5,
    costCoins: 25_000_000, costFeathers: 1_000_000, costGrowth: 2.6, revealAtCoins: 0, lodge: 5,
  },
};

export const UPGRADE_ORDER: readonly UpgradeId[] = [
  'nestBoxes', 'decoyQuality', 'coffee',
  'timber', 'celeryBeds', 'blinds', 'boatHouse', 'lanterns', 'lodgeRooms',
  'deepPool', 'guestDock', 'smokehouse', 'cot',
  'carvingShed', 'cornStubble', 'winterWheat', 'roostPond', 'trophyRoom', 'mapRoom',
  'musselBeds', 'kelpLine', 'breakwater',
  'duckweed', 'cypressBlind', 'jonBoat',
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
  duckweedFlockRate: 0.12,
  cypressBlindShot: 0.04,
  jonBoatGuides: 0.2,
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
  trophyRoomPatch: 0.25,
  musselBedsFlockRate: 0.1,
  kelpLineFlockRate: 0.08,
  breakwaterFlockSize: 2,
  mapRoomGolden: 0.1,
} as const;

/** Species weight multipliers per upgrade level: weight × (1 + k × level). */
export const UPGRADE_SPECIES: Partial<Record<UpgradeId, Partial<Record<SpeciesId, number>>>> = {
  timber: { mallard: 0.15, blackDuck: 0.3 },
  nestBoxes: { woodDuck: 0.6 },
  celeryBeds: { wigeon: 0.5, ringNeck: 0.5, canvasback: 0.4 },
  deepPool: { redhead: 0.5, canvasback: 0.4, scaup: 0.4, bufflehead: 0.3 },
  cornStubble: { canadaGoose: 0.2, cacklingGoose: 0.5 },
  winterWheat: { snowGoose: 0.5, rossGoose: 0.4, whiteFront: 0.3 },
  roostPond: { brant: 0.5, sandhillCrane: 0.4 },
  musselBeds: { whiteWingedScoter: 0.4, blackScoter: 0.4, commonEider: 0.3 },
  kelpLine: { longtail: 0.4, harlequin: 0.4 },
  breakwater: { kingEider: 0.3, spectacledEider: 0.3, stellersEider: 0.3 },
};

export const OFFLINE = {
  /** Hours of offline progress before upgrades. */
  baseHours: 8,
  /** Gaps shorter than this are just normal catch-up, no summary card. */
  minSummarySeconds: 60,
  /** Sim step used when fast-forwarding offline time. */
  stepSeconds: 0.5,
  /**
   * While you're away the crew works at this fraction of its usual pace
   * (Ray naps too). Active sessions are where most progress happens.
   */
  efficiency: 0.25,
} as const;
