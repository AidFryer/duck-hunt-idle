/**
 * Food plots: plant a crop on the far bank and it grows into a draw for
 * certain ducks. What you can grow depends on the flyway.
 */
import type { FlywayId } from './flyways';
import type { SpeciesId } from './species';

export type CropId = 'millet' | 'rice' | 'smartweed' | 'soybeans' | 'corn' | 'milo' | 'barley' | 'eelgrass';

export interface CropDef {
  id: CropId;
  name: string;
  blurb: string;
  /** What it does, for the card. */
  effect: string;
  flyways: readonly FlywayId[];
  /** Planting cost (the second plot costs ×2, the third ×3…). */
  coins: number;
  feathers: number;
  /** × marsh flock arrivals when fully grown (1.08 = +8%). */
  flockRate: number;
  /** + birds per marsh flock when fully grown. */
  flockSize: number;
  /** Species weight multipliers when fully grown. */
  species: Partial<Record<SpeciesId, number>>;
  /** How it's drawn on the bank. */
  look: { stalk: number; head: number; style: 'seed' | 'droop' | 'tall' | 'bush' | 'ribbon' };
}

/** Sim seconds for a crop to grow in (its effect ramps up meanwhile). */
export const CROP_GROW_SECONDS = 180;
/** A crop draws its birds once it's this far grown. */
export const CROP_DRAW_GROWTH = 0.5;
/** Plots open with the lodge: none at the shack, then 1, 2, 3, 4. */
export function plotCount(lodge: number): number {
  return Math.max(0, Math.min(4, lodge - 1));
}

export const CROPS: Record<CropId, CropDef> = {
  millet: {
    id: 'millet', name: 'Japanese Millet', blurb: 'Quick-growing millet on the mudflats.',
    effect: '+8% flocks · brings gadwall & shovelers', flyways: ['mississippi', 'central', 'pacific', 'atlantic'],
    coins: 400, feathers: 40, flockRate: 1.08, flockSize: 0, species: { gadwall: 1.6, shoveler: 1.6 },
    look: { stalk: 0x7c8f5a, head: 0xb89a5a, style: 'seed' },
  },
  rice: {
    id: 'rice', name: 'Rice', blurb: 'A flooded rice check, heavy with grain.',
    effect: '+1 bird per flock · brings pintail', flyways: ['mississippi', 'pacific'],
    coins: 900, feathers: 80, flockRate: 1, flockSize: 1, species: { pintail: 1.6, teal: 1.4 },
    look: { stalk: 0xa8b070, head: 0xe2c26a, style: 'droop' },
  },
  smartweed: {
    id: 'smartweed', name: 'Smartweed', blurb: 'Pink-headed smartweed on the moist-soil flats. Wood ducks and black ducks love the seeds.',
    effect: '+6% flocks · more wood ducks & black ducks', flyways: ['mississippi', 'atlantic'],
    coins: 600, feathers: 60, flockRate: 1.06, flockSize: 0, species: { woodDuck: 1.5, blackDuck: 1.5, teal: 1.3 },
    look: { stalk: 0x6e8a52, head: 0xd88aa0, style: 'seed' },
  },
  soybeans: {
    id: 'soybeans', name: 'Soybeans', blurb: 'A low, leafy field of beans. Mallards can\'t resist a flooded bean field.',
    effect: '+10% flocks · more mallards', flyways: ['mississippi', 'central'],
    coins: 800, feathers: 70, flockRate: 1.1, flockSize: 0, species: { mallard: 1.3, woodDuck: 1.2 },
    look: { stalk: 0x6a7a3e, head: 0x8a9a4a, style: 'bush' },
  },
  corn: {
    id: 'corn', name: 'Standing Corn', blurb: 'Tall rows of corn left standing for the birds.',
    effect: '+12% flocks · more mallards', flyways: ['central'],
    coins: 1_200, feathers: 100, flockRate: 1.12, flockSize: 0, species: { mallard: 1.5 },
    look: { stalk: 0xa89a5a, head: 0xe0c070, style: 'tall' },
  },
  milo: {
    id: 'milo', name: 'Milo', blurb: 'Grain sorghum with rusty red seed heads.',
    effect: '+1 bird per flock · brings pintail & teal', flyways: ['central'],
    coins: 900, feathers: 80, flockRate: 1, flockSize: 1, species: { pintail: 1.4, teal: 1.4, cinnamonTeal: 1.5 },
    look: { stalk: 0x8a8a4a, head: 0xb5562b, style: 'seed' },
  },
  barley: {
    id: 'barley', name: 'Barley', blurb: 'Green barley sprouts. Wigeon graze it like lawn.',
    effect: '+8% flocks · more wigeon', flyways: ['pacific'],
    coins: 700, feathers: 60, flockRate: 1.08, flockSize: 0, species: { wigeon: 1.6, eurasianWigeon: 1.5 },
    look: { stalk: 0x8aa05a, head: 0xd8c880, style: 'droop' },
  },
  eelgrass: {
    id: 'eelgrass', name: 'Eelgrass', blurb: 'Long ribbons of eelgrass in the shallows. The sea ducks dive for it.',
    effect: '+6% flocks · more divers & black ducks', flyways: ['atlantic'],
    coins: 900, feathers: 80, flockRate: 1.06, flockSize: 0, species: { scaup: 1.5, bufflehead: 1.5, blackDuck: 1.4 },
    look: { stalk: 0x4a6a4a, head: 0x5a7a52, style: 'ribbon' },
  },
};

/**
 * Plot levels: a planted plot can be worked up level by level (disked,
 * limed, seeded thicker...). Each level draws more flocks; every few levels
 * flocks come in bigger. The crop decides which birds come; the level stays
 * when you change crops.
 */
export const PLOT_LEVELS = {
  /** × flocks for every level beyond the first. */
  flockRateGrowth: 1.05,
  /** +1 bird per flock every this many levels. */
  birdsEvery: 10,
  /** Price of level 2 on the first plot; later plots cost (plot number)² as much. */
  costCoins: 600,
  costFeathers: 60,
  costGrowth: 4,
} as const;

/** The other grounds each have one plot of their own, which lifts only that ground. */
export type FarPlotGround = 'timber' | 'field' | 'bay';
export interface FarPlotDef {
  name: string;
  blurb: string;
  /** Price of the first level (planting it). */
  coins: number;
  feathers: number;
  costGrowth: number;
  /** × that ground's flocks per level. */
  flockRateGrowth: number;
  look: CropDef['look'];
}
export const FAR_PLOTS: Record<FarPlotGround, FarPlotDef> = {
  timber: {
    name: 'Acorn Flats', blurb: 'Pin oaks dropping acorns into the shallows. Wood ducks gorge on them.',
    coins: 4_000, feathers: 800, costGrowth: 4, flockRateGrowth: 1.08,
    look: { stalk: 0x6a5a3a, head: 0x8a6a3a, style: 'bush' },
  },
  field: {
    name: 'Winter Rye', blurb: 'A strip of green rye along the field edge. Geese graze it like a lawn.',
    coins: 40_000, feathers: 3_000, costGrowth: 4, flockRateGrowth: 1.08,
    look: { stalk: 0x7a9a4a, head: 0xa8c070, style: 'droop' },
  },
  bay: {
    name: 'Sea Lettuce Beds', blurb: 'Bright green sea lettuce in the shallow coves. Brant and black ducks come for it.',
    coins: 2_000_000, feathers: 120_000, costGrowth: 4, flockRateGrowth: 1.08,
    look: { stalk: 0x3a7a4a, head: 0x6ab05a, style: 'ribbon' },
  },
};
export const FAR_PLOT_ORDER: readonly FarPlotGround[] = ['timber', 'field', 'bay'];

export const CROP_ORDER: readonly CropId[] = ['millet', 'rice', 'smartweed', 'soybeans', 'corn', 'milo', 'barley', 'eelgrass'];

export function cropsFor(flyway: FlywayId): CropId[] {
  return CROP_ORDER.filter((c) => CROPS[c].flyways.includes(flyway));
}
