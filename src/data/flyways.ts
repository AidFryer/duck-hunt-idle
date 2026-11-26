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
}

export const FLYWAYS: Record<FlywayId, FlywayDef> = {
  mississippi: {
    id: 'mississippi', name: 'Mississippi Flyway',
    blurb: 'Cypress bayou and an old lodge. Where it all started.',
    twist: 'The home marsh. Wood ducks love the timber.',
    available: true, land: 'bayou', horizon: 0.52,
    farLandTint: 0x000000, nearLandTint: 0x000000, tintAmount: 0,
    species: { woodDuck: 1.3 }, weather: {},
    scoutPower: 1, returnChance: 0,
  },
  central: {
    id: 'central', name: 'Central Flyway',
    blurb: 'Prairie potholes under a huge sky. Wind in the grass and a windmill on the rise.',
    twist: 'Big sky: scouts spot flocks twice as well, and flocks that leave often circle back.',
    available: true, land: 'prairie', horizon: 0.58,
    farLandTint: 0xc0a070, nearLandTint: 0x6a6440, tintAmount: 0.35,
    species: { woodDuck: 0.3, teal: 1.4, pintail: 1.6, gadwall: 1.4, wigeon: 1.3, canvasback: 1.8 },
    weather: { wind: 2, clear: 1.2, fog: 0.6 },
    scoutPower: 2, returnChance: 0.5,
  },
  pacific: {
    id: 'pacific', name: 'Pacific Flyway',
    blurb: 'Misty coast and flooded rice fields.',
    twist: 'Coming in a future update.',
    available: false, land: 'coast', horizon: 0.52,
    farLandTint: 0x7a9aa0, nearLandTint: 0x3a5a50, tintAmount: 0.3,
    species: {}, weather: {}, scoutPower: 1, returnChance: 0,
  },
  atlantic: {
    id: 'atlantic', name: 'Atlantic Flyway',
    blurb: 'Salt marsh and sea ducks.',
    twist: 'Coming in a future update.',
    available: false, land: 'saltmarsh', horizon: 0.52,
    farLandTint: 0x8a9aa8, nearLandTint: 0x4a5a5a, tintAmount: 0.3,
    species: {}, weather: {}, scoutPower: 1, returnChance: 0,
  },
};

export const FLYWAY_ORDER: readonly FlywayId[] = ['mississippi', 'central', 'pacific', 'atlantic'];
