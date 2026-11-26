/** Flyways: one map per prestige tier, each with its own look, birds and twist. */
import type { SpeciesId } from './species';
import type { WeatherId } from './weather';

export type FlywayId = 'mississippi' | 'central' | 'pacific' | 'atlantic';

export interface FlywayDef {
  id: FlywayId;
  name: string;
  /** One-line flavor for the map card. */
  blurb: string;
  /** The new mechanic this flyway adds. */
  twist: string;
  /** False = shown on the map as "coming in a future update". */
  available: boolean;
  /** Which treeline the scene draws. */
  land: 'bayou' | 'prairie' | 'coast' | 'saltmarsh';
  /** Horizon height as a fraction of the scene (lower = bigger sky). */
  horizon: number;
  /** Colors the land silhouettes are nudged toward, and by how much. */
  farLandTint: number;
  nearLandTint: number;
  tintAmount: number;
  /** Species weight multipliers in this flyway. */
  species: Partial<Record<SpeciesId, number>>;
  /** Weather weight multipliers. */
  weather: Partial<Record<WeatherId, number>>;
  /** Scouting power multiplier. */
  scoutPower: number;
  /** Chance a flock that gave up waiting circles back later. */
  returnChance: number;
  /** Extra birds in every marsh flock. */
  flockSizeBonus?: number;
  /** × how often golden flocks show up. */
  goldenMult?: number;
}

export const FLYWAYS: Record<FlywayId, FlywayDef> = {
  mississippi: {
    id: 'mississippi', name: 'Mississippi Flyway',
    blurb: 'Cypress bayou and an old lodge. Where it all started.',
    twist: 'The home marsh. Wood ducks love the timber.',
    available: true, land: 'bayou', horizon: 0.52,
    farLandTint: 0x000000, nearLandTint: 0x000000, tintAmount: 0,
    species: { woodDuck: 1.3, cinnamonTeal: 0 }, weather: {},
    scoutPower: 1, returnChance: 0,
  },
  central: {
    id: 'central', name: 'Central Flyway',
    blurb: 'Prairie potholes under a huge sky. Wind in the grass and a windmill on the rise.',
    twist: 'Big sky: scouts spot flocks twice as well, and flocks that leave often circle back.',
    available: true, land: 'prairie', horizon: 0.58,
    farLandTint: 0xc0a070, nearLandTint: 0x6a6440, tintAmount: 0.35,
    species: { woodDuck: 0.3, teal: 1.4, pintail: 1.6, gadwall: 1.4, wigeon: 1.3, canvasback: 1.8, shoveler: 1.4, redhead: 1.5, cinnamonTeal: 1 },
    weather: { wind: 2, clear: 1.2, fog: 0.6 },
    scoutPower: 2, returnChance: 0.5,
  },
  pacific: {
    id: 'pacific', name: 'Pacific Flyway',
    blurb: 'Flooded rice fields under snowy mountains, with fog rolling in off the coast.',
    twist: 'Rice country: every flock brings 2 more birds, and fog rolls in often. Eurasian wigeon visit.',
    available: true, land: 'coast', horizon: 0.54,
    farLandTint: 0x7a9aa0, nearLandTint: 0x3a5a50, tintAmount: 0.3,
    species: {
      woodDuck: 0.5, pintail: 2, wigeon: 1.6, teal: 1.3, cinnamonTeal: 1.5, shoveler: 1.4,
      snowGoose: 1.8, rossGoose: 1.6, whiteFront: 1.5, blackDuck: 0.2,
    },
    weather: { fog: 2, drizzle: 1.5, coldFront: 0.7 },
    scoutPower: 1, returnChance: 0, flockSizeBonus: 2,
  },
  atlantic: {
    id: 'atlantic', name: 'Atlantic Flyway',
    blurb: 'Salt marsh and a lighthouse on the point, where the sea ducks ride the cold fronts in.',
    twist: 'Sea-duck coast: cold fronts come twice as often and golden flocks show up 50% more. Long-tailed ducks visit.',
    available: true, land: 'saltmarsh', horizon: 0.56,
    farLandTint: 0x8a9aa8, nearLandTint: 0x4a5a5a, tintAmount: 0.3,
    species: {
      blackDuck: 2.5, bufflehead: 1.6, scaup: 1.6, kingEider: 3, harlequin: 2, canvasback: 1.3,
      brant: 2.5, woodDuck: 0.7, cinnamonTeal: 0, pintail: 0.8,
    },
    weather: { coldFront: 2, wind: 1.4, fog: 1.2 },
    scoutPower: 1, returnChance: 0, goldenMult: 1.5,
  },
};

export const FLYWAY_ORDER: readonly FlywayId[] = ['mississippi', 'central', 'pacific', 'atlantic'];
