/**
 * Waterfowl species: economy values, rarity, preferences, Field Guide text
 * and the plumage palette the procedural painter uses.
 */
import type { WeatherId } from './weather';

export type SpeciesId =
  | 'mallard'
  | 'woodDuck'
  | 'teal'
  | 'gadwall'
  | 'wigeon'
  | 'pintail'
  | 'canvasback'
  | 'blackDuck'
  | 'kingEider';

export type Rarity = 'common' | 'uncommon' | 'rare' | 'legendary';

/** Colors and pattern flags for painting a bird. */
export interface DuckLook {
  head: number;
  headSheen?: number;
  /** Eye patch / cheek accent. */
  eyePatch?: number;
  /** Forehead stripe (wigeon). */
  crown?: number;
  breast: number;
  flank: number;
  back: number;
  tail: number;
  bill: number;
  speculum: number;
  /** White neck ring (mallard) or neck stripe (pintail). */
  neckMark?: 'ring' | 'stripe';
  crest?: boolean;
  /** Wood duck face lines. */
  faceLines?: boolean;
  longTail?: boolean;
  /** Bright bill shield (king eider). */
  billShield?: boolean;
  /** Fine dark streaking over the body (hens, black duck). */
  streaky?: boolean;
  /** Pale side panel (king eider). */
  sidePatch?: number;
}

export interface SpeciesDef {
  id: SpeciesId;
  name: string;
  rarity: Rarity;
  /** Coins when logged (before multipliers). */
  coins: number;
  feathers: number;
  /** Relative chance a flock is this species (before preferences). */
  weight: number;
  /** Clock-hour windows when this species is most active. */
  hours: readonly [number, number][];
  weather: readonly WeatherId[];
  /** Body size multiplier (teal are small, eiders big). */
  size: number;
  /** Flock size multiplier (pintail come in big groups, eiders alone-ish). */
  flockSize: number;
  guide: string;
  /** Hint shown on the undiscovered Field Guide page. */
  hint: string;
  drake: DuckLook;
  hen: DuckLook;
}

const henBase = (head: number, body: number, bill: number, speculum: number): DuckLook => ({
  head,
  breast: body,
  flank: body,
  back: 0x5e452e,
  tail: 0x5e452e,
  bill,
  speculum,
  streaky: true,
});

export const SPECIES: Record<SpeciesId, SpeciesDef> = {
  mallard: {
    id: 'mallard', name: 'Mallard', rarity: 'common',
    coins: 5, feathers: 1, weight: 100,
    hours: [[5.5, 9], [16.5, 19.5]], weather: ['clear', 'drizzle'],
    size: 1, flockSize: 1,
    guide: 'The marsh regular. Drakes wear a green head and a white collar; hens are mottled brown and do most of the talking.',
    hint: 'Comes to almost any spread.',
    drake: {
      head: 0x2f6b4a, headSheen: 0x4f9a6a, breast: 0x7a3e2a, flank: 0xc9c2b4, back: 0x7d7468,
      tail: 0x2a2622, bill: 0xe0b84a, speculum: 0x3a5ec0, neckMark: 'ring',
    },
    hen: henBase(0x9a7550, 0x9a7550, 0xc98a3c, 0x3a5ec0),
  },
  woodDuck: {
    id: 'woodDuck', name: 'Wood Duck', rarity: 'uncommon',
    coins: 9, feathers: 2, weight: 40,
    hours: [[5.8, 8], [17.5, 19.6]], weather: ['clear', 'fog'],
    size: 0.92, flockSize: 0.7,
    guide: 'Painted like a carousel horse: a swept-back crest, white face lines and a red eye. Loves flooded timber and nests in tree hollows.',
    hint: 'Look for them at first light, around flooded timber.',
    drake: {
      head: 0x24504a, headSheen: 0x6a3f8a, breast: 0x7a3a2a, flank: 0xd8c08a, back: 0x3a3028,
      tail: 0x2a2622, bill: 0xd8483a, speculum: 0x3a5ec0, crest: true, faceLines: true,
    },
    hen: { ...henBase(0x7a6a5e, 0x8a7a6a, 0x5a5048, 0x3a5ec0), crest: true },
  },
  teal: {
    id: 'teal', name: 'Green-winged Teal', rarity: 'common',
    coins: 6, feathers: 1, weight: 65,
    hours: [[6, 10], [15, 18]], weather: ['clear', 'wind'],
    size: 0.78, flockSize: 1.3,
    guide: 'Small, fast and twisty in flight, with a chestnut head and a green swoosh behind the eye. Flocks turn together like starlings.',
    hint: 'Small and quick. Rice draws them in.',
    drake: {
      head: 0x8a3a22, eyePatch: 0x2f7a5a, breast: 0xe0cfa8, flank: 0xa8a8a0, back: 0x8a8a84,
      tail: 0x4a4640, bill: 0x2a2622, speculum: 0x2f8a5a,
    },
    hen: henBase(0x8a7458, 0x9a8466, 0x4a4640, 0x2f8a5a),
  },
  gadwall: {
    id: 'gadwall', name: 'Gadwall', rarity: 'common',
    coins: 7, feathers: 1, weight: 50,
    hours: [[8, 15]], weather: ['clear', 'drizzle'],
    size: 0.96, flockSize: 1,
    guide: 'The quiet gentleman of the marsh: finely patterned grey with a black stern and a small white wing patch.',
    hint: 'A midday bird. Millet helps.',
    drake: {
      head: 0x8a7a68, breast: 0x6a6058, flank: 0x9a948a, back: 0x7a7268, tail: 0x2a2622,
      bill: 0x3a3632, speculum: 0xf0f0ea, streaky: true,
    },
    hen: henBase(0x8a7a68, 0x96826a, 0xc98a3c, 0xf0f0ea),
  },
  wigeon: {
    id: 'wigeon', name: 'American Wigeon', rarity: 'uncommon',
    coins: 8, feathers: 2, weight: 38,
    hours: [[9, 16]], weather: ['clear', 'wind'],
    size: 0.95, flockSize: 1.1,
    guide: 'Nicknamed "baldpate" for the cream stripe on its crown. Whistles instead of quacking, and loves to graze.',
    hint: 'Grazes millet on bright, breezy days.',
    drake: {
      head: 0xc8bfae, crown: 0xf4e9d4, eyePatch: 0x2f6b4a, breast: 0xb07a5a, flank: 0xc08a68,
      back: 0x8a7a6a, tail: 0x2a2622, bill: 0x9ab0c0, speculum: 0x2f7a5a,
    },
    hen: henBase(0x9a8a7a, 0xa8805e, 0x9ab0c0, 0x2f7a5a),
  },
  pintail: {
    id: 'pintail', name: 'Northern Pintail', rarity: 'uncommon',
    coins: 10, feathers: 2, weight: 30,
    hours: [[6.5, 10], [16, 18.5]], weather: ['clear', 'fog'],
    size: 1.05, flockSize: 1.4,
    guide: 'Elegant and long-necked, with a white stripe up a chocolate head and a needle tail. Rice fields fill with them in a good year.',
    hint: 'Big flocks over rice.',
    drake: {
      head: 0x6a4a32, breast: 0xf4efe4, flank: 0xb8b4ac, back: 0x7a7670, tail: 0x2a2622,
      bill: 0x8a9ab0, speculum: 0x4a7a5a, neckMark: 'stripe', longTail: true,
    },
    hen: { ...henBase(0x9a8a72, 0xa89070, 0x6a6a6a, 0x7a6a4a), longTail: true },
  },
  canvasback: {
    id: 'canvasback', name: 'Canvasback', rarity: 'rare',
    coins: 16, feathers: 3, weight: 14,
    hours: [[6, 11]], weather: ['coldFront', 'wind'],
    size: 1.1, flockSize: 0.9,
    guide: 'A diving duck with a sloped red head, black chest and a back as pale as canvas. Fast and proud; arrives with the cold.',
    hint: 'Rides in on a cold front.',
    drake: {
      head: 0x9a3a1a, breast: 0x2a2622, flank: 0xe8e4dc, back: 0xe0dcd2, tail: 0x2a2622,
      bill: 0x2a2622, speculum: 0xc8c4bc,
    },
    hen: henBase(0x9a7a5a, 0xb8a890, 0x2a2622, 0xc8c4bc),
  },
  blackDuck: {
    id: 'blackDuck', name: 'Black Duck', rarity: 'rare',
    coins: 12, feathers: 2, weight: 18,
    hours: [[17, 20], [5, 7]], weather: ['coldFront', 'fog', 'drizzle'],
    size: 1.02, flockSize: 0.8,
    guide: 'Darker than any hen mallard, with a pale face and a violet wing patch. Wary; comes in at dusk on raw grey days.',
    hint: 'Wary. Shows up on grey evenings.',
    drake: {
      head: 0x8a7a62, breast: 0x4a3a2e, flank: 0x3a2e24, back: 0x2e2620, tail: 0x2a2220,
      bill: 0xc8b04a, speculum: 0x4a3a9a, streaky: true,
    },
    hen: henBase(0x7a6a58, 0x3e322a, 0x8a8a4a, 0x4a3a9a),
  },
  kingEider: {
    id: 'kingEider', name: 'King Eider', rarity: 'legendary',
    coins: 120, feathers: 25, weight: 0.6,
    hours: [[5.5, 8]], weather: ['coldFront', 'fog'],
    size: 1.2, flockSize: 0.4,
    guide: 'A sea duck from the far north, almost never this far inland. Orange bill shield, pale blue crown, black back. Old-timers say seeing one brings a good season.',
    hint: 'A legend. Only the fiercest cold fronts push one this far south.',
    drake: {
      head: 0xa8c0d8, eyePatch: 0xb8d8a8, breast: 0xf0dcc0, flank: 0x1e1a18, back: 0x1e1a18,
      tail: 0x1e1a18, bill: 0xf08a2a, speculum: 0x1e1a18, billShield: true, sidePatch: 0xf4efe4,
    },
    hen: henBase(0x8a5a3a, 0x9a6a42, 0x5a5a4a, 0x6a5a4a),
  },
};

export const SPECIES_ORDER: readonly SpeciesId[] = [
  'mallard', 'woodDuck', 'teal', 'gadwall', 'wigeon', 'pintail', 'canvasback', 'blackDuck', 'kingEider',
];

export const RARITY_STARS: Record<Rarity, number> = { common: 1, uncommon: 2, rare: 3, legendary: 4 };

/** First-find bonus: worth this many of the bird, times a rarity multiplier. */
export const DISCOVERY = {
  birds: 20,
  rarity: { common: 1, uncommon: 1.5, rare: 2.5, legendary: 5 } as Record<Rarity, number>,
} as const;

/** Preference multipliers on a species' weight. */
export const SPECIES_PREFERENCE = {
  inHours: 1.8,
  inWeather: 2.4,
} as const;
