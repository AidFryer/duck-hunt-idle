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
  | 'kingEider'
  | 'shoveler'
  | 'ringNeck'
  | 'redhead'
  | 'scaup'
  | 'bufflehead'
  | 'hoodedMerganser'
  | 'cinnamonTeal'
  | 'harlequin'
  | 'canadaGoose'
  | 'cacklingGoose'
  | 'snowGoose'
  | 'rossGoose'
  | 'blueGoose'
  | 'whiteFront'
  | 'brant'
  | 'sandhillCrane'
  | 'emperorGoose'
  | 'eurasianWigeon'
  | 'longtail'
  | 'blueWingedTeal'
  | 'americanCoot'
  | 'mottledDuck'
  | 'ruddyDuck'
  | 'goldeneye'
  | 'commonMerganser'
  | 'greaterScaup'
  | 'blackBelliedWhistler'
  | 'fulvousWhistler'
  | 'redBreastedMerganser'
  | 'barrowsGoldeneye'
  | 'surfScoter'
  | 'whiteWingedScoter'
  | 'blackScoter'
  | 'commonEider'
  | 'tuftedDuck'
  | 'spectacledEider'
  | 'stellersEider'
  | 'tundraSwan'
  | 'barnacleGoose'
  | 'pinkFootedGoose';

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
  /** Body plan: geese have long necks; cranes long necks and legs. */
  form?: 'goose' | 'crane';
  /** Goose neck color (defaults to head). */
  neck?: number;
  /** White chinstrap / cheek patch (Canada geese, brant necklace). */
  cheek?: number;
  /** Dark belly bars (white-fronted "specklebellies"). */
  belly?: number;
  /** Red crown (cranes). */
  crownRed?: boolean;
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
  /** Where it's hunted: the marsh (default) or the goose field. */
  ground?: 'field';
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
  shoveler: {
    id: 'shoveler', name: 'Northern Shoveler', rarity: 'common',
    coins: 7, feathers: 1, weight: 42,
    hours: [[7, 14]], weather: ['clear', 'drizzle'],
    size: 0.95, flockSize: 1,
    guide: 'That spoon of a bill sieves the shallows for seeds and tiny critters. Green head, white chest, chestnut sides.',
    hint: 'Sifts the shallow mudflats where millet grows.',
    drake: {
      head: 0x24604a, headSheen: 0x3f8a64, breast: 0xf2eee4, flank: 0xa8532e, back: 0x5a5048,
      tail: 0x2a2622, bill: 0x2a2622, speculum: 0x2f7a5a,
    },
    hen: henBase(0x9a7a58, 0xa48462, 0xc98a3c, 0x2f7a5a),
  },
  ringNeck: {
    id: 'ringNeck', name: 'Ring-necked Duck', rarity: 'uncommon',
    coins: 9, feathers: 2, weight: 32,
    hours: [[6, 10], [15, 18]], weather: ['clear', 'fog'],
    size: 0.9, flockSize: 1,
    guide: 'Named for a chestnut collar you can almost never see. Look for the white-ringed bill and a peaked purple-black head.',
    hint: 'Dives for wild celery in quiet water.',
    drake: {
      head: 0x2a2234, headSheen: 0x5a3f7a, breast: 0x1e1a18, flank: 0xb8b4ac, back: 0x24201c,
      tail: 0x1e1a18, bill: 0x6a7a8a, speculum: 0x7a7a7a,
    },
    hen: henBase(0x7a6a5a, 0x8a7460, 0x6a7a8a, 0x7a7a7a),
  },
  redhead: {
    id: 'redhead', name: 'Redhead', rarity: 'uncommon',
    coins: 11, feathers: 2, weight: 26,
    hours: [[6, 11]], weather: ['wind', 'coldFront'],
    size: 1.02, flockSize: 1.2,
    guide: 'A round copper head, black chest and soft grey back. Rafts up by the hundreds on deep open water.',
    hint: 'A diver. Needs a deep pool to raft on.',
    drake: {
      head: 0xb8461e, breast: 0x1e1a18, flank: 0xa8a8a8, back: 0x8a8a8a, tail: 0x2a2622,
      bill: 0x8aa0b8, speculum: 0x9a9a9a,
    },
    hen: henBase(0x9a7a56, 0xa88a68, 0x6a7a8a, 0x9a9a9a),
  },
  scaup: {
    id: 'scaup', name: 'Lesser Scaup', rarity: 'uncommon',
    coins: 10, feathers: 2, weight: 24,
    hours: [[7, 13]], weather: ['wind', 'coldFront'],
    size: 0.92, flockSize: 1.5,
    guide: 'The "bluebill." Dark at both ends and light in the middle, with a faint purple gloss. Comes to big spreads on open water.',
    hint: 'Bluebills want a big diver spread out on the open water.',
    drake: {
      head: 0x2a2432, headSheen: 0x4a3a6a, breast: 0x1e1a18, flank: 0xe4e0d8, back: 0xb0aca4,
      tail: 0x1e1a18, bill: 0x8aa0c0, speculum: 0xe4e0d8,
    },
    hen: { ...henBase(0x6a5440, 0x7a6450, 0x6a7a8a, 0xe4e0d8), eyePatch: 0xf0ece4 },
  },
  bufflehead: {
    id: 'bufflehead', name: 'Bufflehead', rarity: 'uncommon',
    coins: 10, feathers: 2, weight: 20,
    hours: [[7, 15]], weather: ['coldFront', 'clear'],
    size: 0.72, flockSize: 0.8,
    guide: 'A tiny diver with a big white bonnet on a glossy head. Pops under and bobs up somewhere else entirely.',
    hint: 'Little divers follow the cold and like a spread out on open water.',
    drake: {
      head: 0x2a3a3a, headSheen: 0x5a3a7a, eyePatch: 0xf4f2ec, breast: 0xf4f2ec, flank: 0xf4f2ec,
      back: 0x1e1a18, tail: 0x3a3632, bill: 0x6a7080, speculum: 0xf4f2ec, crest: true,
    },
    hen: { ...henBase(0x4a4238, 0x7a7068, 0x4a4640, 0xf4f2ec), eyePatch: 0xf0ece4 },
  },
  hoodedMerganser: {
    id: 'hoodedMerganser', name: 'Hooded Merganser', rarity: 'rare',
    coins: 18, feathers: 3, weight: 10,
    hours: [[6, 9], [16, 18.5]], weather: ['fog', 'clear'],
    size: 0.85, flockSize: 0.6,
    guide: 'Fans a white-and-black hood like a sail. Thin toothed bill for catching minnows in the timber.',
    hint: 'Shy timber birds. Only a long, patient call coaxes them in.',
    drake: {
      head: 0x1e1a18, eyePatch: 0xf4f2ec, breast: 0xf0ece4, flank: 0xb0622e, back: 0x1e1a18,
      tail: 0x2a2622, bill: 0x1e1a18, speculum: 0xf0ece4, crest: true,
    },
    hen: { ...henBase(0x9a6a3e, 0x8a7a6a, 0x6a5a3a, 0xf0ece4), crest: true },
  },
  cinnamonTeal: {
    id: 'cinnamonTeal', name: 'Cinnamon Teal', rarity: 'rare',
    coins: 15, feathers: 3, weight: 12,
    hours: [[7, 11], [15, 18]], weather: ['clear'],
    size: 0.8, flockSize: 0.8,
    guide: 'A western teal glowing the color of a cinnamon stick, with a bright red eye. A real treat to see on the prairie.',
    hint: 'A western bird. Rice on the Central flyway might bring one.',
    drake: {
      head: 0xa8461e, breast: 0xa8461e, flank: 0x9a3e1a, back: 0x5a3e2a, tail: 0x3a2e24,
      bill: 0x2a2622, speculum: 0x2f8a5a,
    },
    hen: henBase(0x9a7a5a, 0xa48262, 0x4a4640, 0x2f8a5a),
  },
  harlequin: {
    id: 'harlequin', name: 'Harlequin Duck', rarity: 'rare',
    coins: 24, feathers: 4, weight: 6,
    hours: [[6, 10]], weather: ['coldFront', 'wind'],
    size: 0.86, flockSize: 0.5,
    guide: 'Slate blue with bold white marks and rusty sides, like a painted toy. A mountain-stream bird; seeing one inland is a story to tell.',
    hint: 'Only a master caller\'s lure brings one this far from the rapids.',
    drake: {
      head: 0x3a4a62, eyePatch: 0xf4f2ec, breast: 0x3a4a62, flank: 0xa8522e, back: 0x34425a,
      tail: 0x1e1a18, bill: 0x4a4a4a, speculum: 0x3a4a8a, faceLines: true, sidePatch: 0x3a4a62,
    },
    hen: { ...henBase(0x5a4a40, 0x6a5a4e, 0x4a4a4a, 0x5a4a40), eyePatch: 0xf0ece4 },
  },
  canadaGoose: {
    id: 'canadaGoose', name: 'Canada Goose', rarity: 'common', ground: 'field',
    coins: 18, feathers: 3, weight: 100,
    hours: [[7, 10], [15, 17.5]], weather: ['clear', 'wind'],
    size: 1.6, flockSize: 1,
    guide: 'The honker. Black neck and a white chinstrap, flying in long V\'s and talking the whole way down.',
    hint: 'Comes to any decent field spread.',
    drake: {
      form: 'goose', head: 0x1e1a18, neck: 0x1e1a18, cheek: 0xf4f2ec, breast: 0xd8ccb4, flank: 0x9a8a74,
      back: 0x6e5e4c, tail: 0x1e1a18, bill: 0x1e1a18, speculum: 0x6e5e4c,
    },
    hen: {
      form: 'goose', head: 0x1e1a18, neck: 0x1e1a18, cheek: 0xf4f2ec, breast: 0xd8ccb4, flank: 0x9a8a74,
      back: 0x6e5e4c, tail: 0x1e1a18, bill: 0x1e1a18, speculum: 0x6e5e4c,
    },
  },
  cacklingGoose: {
    id: 'cacklingGoose', name: 'Cackling Goose', rarity: 'common', ground: 'field',
    coins: 15, feathers: 2, weight: 55,
    hours: [[7, 11], [14, 17]], weather: ['wind', 'coldFront'],
    size: 1.15, flockSize: 1.3,
    guide: 'A pocket-sized Canada with a stubby bill and a high, squeaky cackle. Travels in tight, chattering bunches.',
    hint: 'Loves picked corn stubble.',
    drake: {
      form: 'goose', head: 0x1e1a18, neck: 0x1e1a18, cheek: 0xf4f2ec, breast: 0xa8947a, flank: 0x86745e,
      back: 0x5e4e3e, tail: 0x1e1a18, bill: 0x1e1a18, speculum: 0x5e4e3e,
    },
    hen: {
      form: 'goose', head: 0x1e1a18, neck: 0x1e1a18, cheek: 0xf4f2ec, breast: 0xa8947a, flank: 0x86745e,
      back: 0x5e4e3e, tail: 0x1e1a18, bill: 0x1e1a18, speculum: 0x5e4e3e,
    },
  },
  snowGoose: {
    id: 'snowGoose', name: 'Snow Goose', rarity: 'common', ground: 'field',
    coins: 14, feathers: 3, weight: 70,
    hours: [[7, 12]], weather: ['coldFront', 'wind'],
    size: 1.35, flockSize: 2.2,
    guide: 'White with black wingtips and a pink "grin" on the bill. Arrives in noisy tornadoes of hundreds.',
    hint: 'Big white flocks follow the winter wheat.',
    drake: {
      form: 'goose', head: 0xf4f2ec, neck: 0xf0ece4, breast: 0xf4f2ec, flank: 0xeeeae2, back: 0xe6e2da,
      tail: 0xe6e2da, bill: 0xe88a8a, speculum: 0x1e1a18,
    },
    hen: {
      form: 'goose', head: 0xf4f2ec, neck: 0xf0ece4, breast: 0xf4f2ec, flank: 0xeeeae2, back: 0xe6e2da,
      tail: 0xe6e2da, bill: 0xe88a8a, speculum: 0x1e1a18,
    },
  },
  rossGoose: {
    id: 'rossGoose', name: "Ross's Goose", rarity: 'uncommon', ground: 'field',
    coins: 17, feathers: 3, weight: 30,
    hours: [[7, 12]], weather: ['coldFront', 'clear'],
    size: 1.1, flockSize: 1.6,
    guide: 'A dainty little snow goose with a short, warty bill. Mixes in with the snows and fools everybody.',
    hint: 'Hides among the snows. A silhouette spread helps.',
    drake: {
      form: 'goose', head: 0xf8f6f0, neck: 0xf4f2ec, breast: 0xf8f6f0, flank: 0xf2eee6, back: 0xeae6de,
      tail: 0xeae6de, bill: 0xd87a6a, speculum: 0x1e1a18,
    },
    hen: {
      form: 'goose', head: 0xf8f6f0, neck: 0xf4f2ec, breast: 0xf8f6f0, flank: 0xf2eee6, back: 0xeae6de,
      tail: 0xeae6de, bill: 0xd87a6a, speculum: 0x1e1a18,
    },
  },
  blueGoose: {
    id: 'blueGoose', name: 'Blue Goose', rarity: 'uncommon', ground: 'field',
    coins: 20, feathers: 4, weight: 22,
    hours: [[7, 12]], weather: ['coldFront', 'wind'],
    size: 1.35, flockSize: 1.2,
    guide: 'The dark "blue phase" of the snow goose: slate body, white head. Old-timers swear they are smarter than the white ones.',
    hint: 'Only a big full-body fleet fools the wise blues.',
    drake: {
      form: 'goose', head: 0xf4f2ec, neck: 0xe6e2da, breast: 0x5a6070, flank: 0x4a5060, back: 0x5a6070,
      tail: 0x3a3e48, bill: 0xe88a8a, speculum: 0x1e1a18,
    },
    hen: {
      form: 'goose', head: 0xf4f2ec, neck: 0xe6e2da, breast: 0x5a6070, flank: 0x4a5060, back: 0x5a6070,
      tail: 0x3a3e48, bill: 0xe88a8a, speculum: 0x1e1a18,
    },
  },
  whiteFront: {
    id: 'whiteFront', name: 'White-fronted Goose', rarity: 'rare', ground: 'field',
    coins: 26, feathers: 4, weight: 16,
    hours: [[6.5, 9.5], [16, 18]], weather: ['clear', 'fog'],
    size: 1.4, flockSize: 0.9,
    guide: 'The "specklebelly": brown with a white face blaze, orange legs and black bars across the belly. Wary, and the finest on the table.',
    hint: 'Specks need winter wheat and a flag that knows what it\'s doing.',
    drake: {
      form: 'goose', head: 0x6e5a46, neck: 0x6e5a46, cheek: 0xf4f2ec, breast: 0x9a8670, flank: 0x86725c,
      back: 0x5e4c3a, tail: 0x3e3226, bill: 0xe8a07a, speculum: 0x5e4c3a, belly: 0x1e1a18,
    },
    hen: {
      form: 'goose', head: 0x6e5a46, neck: 0x6e5a46, cheek: 0xf4f2ec, breast: 0x9a8670, flank: 0x86725c,
      back: 0x5e4c3a, tail: 0x3e3226, bill: 0xe8a07a, speculum: 0x5e4c3a, belly: 0x1e1a18,
    },
  },
  brant: {
    id: 'brant', name: 'Brant', rarity: 'rare', ground: 'field',
    coins: 28, feathers: 4, weight: 10,
    hours: [[7, 11]], weather: ['wind', 'fog'],
    size: 1.15, flockSize: 1.1,
    guide: 'A small sea goose with a black neck and a delicate white necklace. Flies low and ragged, never in a tidy V.',
    hint: 'Brant like water nearby. A roost pond might bring them.',
    drake: {
      form: 'goose', head: 0x1e1a18, neck: 0x1e1a18, cheek: 0xf0ece4, breast: 0x2a2622, flank: 0x5a5048,
      back: 0x3e3630, tail: 0xf0ece4, bill: 0x1e1a18, speculum: 0x3e3630,
    },
    hen: {
      form: 'goose', head: 0x1e1a18, neck: 0x1e1a18, cheek: 0xf0ece4, breast: 0x2a2622, flank: 0x5a5048,
      back: 0x3e3630, tail: 0xf0ece4, bill: 0x1e1a18, speculum: 0x3e3630,
    },
  },
  sandhillCrane: {
    id: 'sandhillCrane', name: 'Sandhill Crane', rarity: 'rare', ground: 'field',
    coins: 40, feathers: 6, weight: 8,
    hours: [[8, 12], [15, 17]], weather: ['clear', 'wind'],
    size: 1.7, flockSize: 0.6,
    guide: 'Tall and grey with a red cap, bugling a rattling call you can hear for miles. Glides in on long, slow wings.',
    hint: 'Cranes roost on shallow water and want blinds they can\'t spot.',
    drake: {
      form: 'crane', head: 0xc8c4bc, neck: 0xb8b4ac, cheek: 0xf0ece4, breast: 0xb0aca4, flank: 0xa8a49c,
      back: 0x9a8a78, tail: 0x8a7a68, bill: 0x2a2622, speculum: 0x8a8a8a, crownRed: true,
    },
    hen: {
      form: 'crane', head: 0xc8c4bc, neck: 0xb8b4ac, cheek: 0xf0ece4, breast: 0xb0aca4, flank: 0xa8a49c,
      back: 0x9a8a78, tail: 0x8a7a68, bill: 0x2a2622, speculum: 0x8a8a8a, crownRed: true,
    },
  },
  emperorGoose: {
    id: 'emperorGoose', name: 'Emperor Goose', rarity: 'legendary', ground: 'field',
    coins: 220, feathers: 40, weight: 0.5,
    hours: [[7, 10]], weather: ['coldFront', 'fog'],
    size: 1.4, flockSize: 0.4,
    guide: 'A goose from the far Bering coast: silver-grey scales, a snow-white head and orange feet. Most hunters never see one.',
    hint: 'A legend. Only the greatest honker chorus on the flyway could call one in.',
    drake: {
      form: 'goose', head: 0xf4f2ec, neck: 0x2a2632, breast: 0x8a90a0, flank: 0x9aa0b0, back: 0x7a8090,
      tail: 0xf0ece4, bill: 0xe8a0b0, speculum: 0x5a6070, streaky: true,
    },
    hen: {
      form: 'goose', head: 0xf4f2ec, neck: 0x2a2632, breast: 0x8a90a0, flank: 0x9aa0b0, back: 0x7a8090,
      tail: 0xf0ece4, bill: 0xe8a0b0, speculum: 0x5a6070, streaky: true,
    },
  },
  eurasianWigeon: {
    id: 'eurasianWigeon', name: 'Eurasian Wigeon', rarity: 'rare',
    coins: 22, feathers: 4, weight: 8,
    hours: [[9, 15]], weather: ['fog', 'clear'],
    size: 0.95, flockSize: 0.5,
    guide: 'An Old World cousin of the American wigeon, with a chestnut head and a cream forehead. A stray that rides in with Pacific wigeon flocks.',
    hint: 'Only on the Pacific, mixed in with wigeon on the celery beds.',
    drake: {
      head: 0xa84a26, crown: 0xf0dca0, breast: 0xc8a4a0, flank: 0xb8b8b4, back: 0x8a8a88,
      tail: 0x2a2622, bill: 0x9ab0c0, speculum: 0x2f7a5a,
    },
    hen: henBase(0x9a7a5e, 0xa8805e, 0x9ab0c0, 0x2f7a5a),
  },
  longtail: {
    id: 'longtail', name: 'Long-tailed Duck', rarity: 'rare',
    coins: 24, feathers: 4, weight: 8,
    hours: [[7, 12]], weather: ['coldFront', 'wind'],
    size: 0.95, flockSize: 0.8,
    guide: 'A chattering sea duck in black, white and soft tan, trailing two long tail feathers. Dives deeper than almost any duck.',
    hint: 'Only on the Atlantic, out over a deep pool.',
    drake: {
      head: 0xf0ece4, eyePatch: 0x6a5a4a, breast: 0x2a2622, flank: 0xe8e4dc, back: 0x3a3430,
      tail: 0x1e1a18, bill: 0xe8a0b0, speculum: 0x3a3430, longTail: true,
    },
    hen: { ...henBase(0x8a7a6a, 0xd8ccb8, 0x4a4a4a, 0x5a4a3a), longTail: true },
  },
  blueWingedTeal: {
    id: 'blueWingedTeal', name: 'Blue-winged Teal', rarity: 'common',
    coins: 6, feathers: 1, weight: 35,
    hours: [[6, 9.5], [16, 19]], weather: ['clear'],
    size: 0.8, flockSize: 0.9,
    guide: 'The first duck south every fall, buzzing low in tight little bunches. Drakes wear a white crescent in front of the eye.',
    hint: 'An early-season bird. Watch for them in Opening Week.',
    drake: {
      head: 0x4a5a7a, eyePatch: 0xf4f2ec, breast: 0xb89a7a, flank: 0xa88a6a, back: 0x5a4a3a,
      tail: 0x2a2622, bill: 0x2a2622, speculum: 0x2f8a5a, streaky: true,
    },
    hen: henBase(0x8a7258, 0x9a8062, 0x3a3632, 0x2f8a5a),
  },
  americanCoot: {
    id: 'americanCoot', name: 'American Coot', rarity: 'common',
    coins: 3, feathers: 1, weight: 25,
    hours: [[7, 17]], weather: ['clear', 'drizzle', 'fog'],
    size: 0.85, flockSize: 0.8,
    guide: 'The "mud hen": slate gray with a chalk-white bill, bobbing its head as it paddles. Not a duck at all, but it shares every marsh.',
    hint: 'Always around. Just keep hunting.',
    drake: {
      head: 0x1e1a18, breast: 0x3a3a40, flank: 0x45454c, back: 0x3a3a40, tail: 0x2a2a2e,
      bill: 0xf4f2ec, speculum: 0x3a3a40, billShield: true,
    },
    hen: {
      head: 0x1e1a18, breast: 0x3a3a40, flank: 0x45454c, back: 0x3a3a40, tail: 0x2a2a2e,
      bill: 0xf4f2ec, speculum: 0x3a3a40, billShield: true,
    },
  },
  mottledDuck: {
    id: 'mottledDuck', name: 'Mottled Duck', rarity: 'uncommon',
    coins: 10, feathers: 2, weight: 16,
    hours: [[5.8, 9], [17, 19.5]], weather: ['drizzle', 'fog'],
    size: 1, flockSize: 0.6,
    guide: 'A Gulf Coast cousin of the mallard that never migrates. Warm brown all over with a clean buff face and a yellow bill.',
    hint: 'A southern bird of the Mississippi and Central flyways.',
    drake: {
      head: 0x8a7458, breast: 0x7a5e44, flank: 0x6e543c, back: 0x5a4430, tail: 0x3a2e24,
      bill: 0xd8b84a, speculum: 0x3a7a8a, streaky: true,
    },
    hen: henBase(0x8a7458, 0x7a6048, 0xb8963a, 0x3a7a8a),
  },
  ruddyDuck: {
    id: 'ruddyDuck', name: 'Ruddy Duck', rarity: 'uncommon',
    coins: 9, feathers: 2, weight: 18,
    hours: [[7, 12], [14, 17]], weather: ['clear', 'wind'],
    size: 0.72, flockSize: 0.9,
    guide: 'A tubby little diver with a stiff tail cocked up like a wren. In spring the drake\'s bill turns sky blue.',
    hint: 'Needs open water to dive. A deep pool might bring them.',
    drake: {
      head: 0x1e1a18, eyePatch: 0xf4f2ec, breast: 0xa0441e, flank: 0xa0441e, back: 0x8a3a1a,
      tail: 0x2a2622, bill: 0x5a9ad0, speculum: 0x8a3a1a,
    },
    hen: { ...henBase(0x6a5a4a, 0x8a7a68, 0x3a3a3a, 0x6a5a4a), eyePatch: 0xd8ccb8 },
  },
  goldeneye: {
    id: 'goldeneye', name: 'Common Goldeneye', rarity: 'uncommon',
    coins: 11, feathers: 2, weight: 16,
    hours: [[6, 10], [15, 17]], weather: ['coldFront', 'wind'],
    size: 0.95, flockSize: 0.8,
    guide: 'Called "whistlers" for the ringing sound of their wings. A bright yellow eye and a round white spot by the bill.',
    hint: 'A cold-water diver. Get decoys out on open water.',
    drake: {
      head: 0x1e3a2e, headSheen: 0x2f6b4a, eyePatch: 0xf4f2ec, breast: 0xf4f2ec, flank: 0xf0ece4,
      back: 0x1e1a18, tail: 0x2a2622, bill: 0x1e1a18, speculum: 0xf4f2ec,
    },
    hen: henBase(0x6a4a2e, 0x9a9a9a, 0x3a3a3a, 0xf0ece4),
  },
  commonMerganser: {
    id: 'commonMerganser', name: 'Common Merganser', rarity: 'uncommon',
    coins: 10, feathers: 2, weight: 14,
    hours: [[7, 11], [14, 17]], weather: ['coldFront', 'clear'],
    size: 1.15, flockSize: 0.7,
    guide: 'A long, low "sawbill" with a thin red bill for catching fish. The drake is crisp white with a dark green head.',
    hint: 'Fish eaters. Deep water brings them.',
    drake: {
      head: 0x1e3a2e, headSheen: 0x2f6b4a, breast: 0xf4efe4, flank: 0xf0ece4, back: 0x1e1a18,
      tail: 0x6a6a6a, bill: 0xc0402a, speculum: 0xf0ece4,
    },
    hen: { ...henBase(0x9a4a22, 0xa8a8a8, 0xc0402a, 0xf0ece4), crest: true },
  },
  greaterScaup: {
    id: 'greaterScaup', name: 'Greater Scaup', rarity: 'uncommon',
    coins: 12, feathers: 2, weight: 14,
    hours: [[6, 10], [14, 17]], weather: ['wind', 'coldFront'],
    size: 1, flockSize: 1.4,
    guide: 'The big-water bluebill, with a rounder green-glossed head than its lesser cousin. Rafts up by the thousand on the coasts.',
    hint: 'A coastal diver of the Atlantic and Pacific.',
    drake: {
      head: 0x1e2a24, headSheen: 0x2f5a44, breast: 0x1e1a18, flank: 0xe8e4dc, back: 0xa8aaa8,
      tail: 0x1e1a18, bill: 0x7a9ac0, speculum: 0xf0ece4,
    },
    hen: { ...henBase(0x5a4232, 0x7a6450, 0x6a7a8a, 0xf0ece4), eyePatch: 0xf0ece4 },
  },
  blackBelliedWhistler: {
    id: 'blackBelliedWhistler', name: 'Black-bellied Whistling-Duck', rarity: 'uncommon',
    coins: 12, feathers: 2, weight: 12,
    hours: [[6, 9], [17.5, 20]], weather: ['clear', 'drizzle'],
    size: 1, flockSize: 1.2,
    guide: 'Long pink legs, a coral-red bill and a black belly. Flocks whistle to each other all night long over the rice.',
    hint: 'A southern bird that loves rice and milo.',
    drake: {
      head: 0x9a8a7a, eyePatch: 0xe8e4dc, breast: 0x9a5a3a, flank: 0x1e1a18, back: 0x8a5a3a,
      tail: 0x1e1a18, bill: 0xe0503a, speculum: 0xf4f2ec,
    },
    hen: {
      head: 0x9a8a7a, eyePatch: 0xe8e4dc, breast: 0x9a5a3a, flank: 0x1e1a18, back: 0x8a5a3a,
      tail: 0x1e1a18, bill: 0xe0503a, speculum: 0xf4f2ec,
    },
  },
  fulvousWhistler: {
    id: 'fulvousWhistler', name: 'Fulvous Whistling-Duck', rarity: 'rare',
    coins: 16, feathers: 3, weight: 7,
    hours: [[6, 9], [17.5, 20]], weather: ['clear'],
    size: 0.95, flockSize: 1,
    guide: 'A warm tawny duck with cream stripes down its sides. A rice-field wanderer that turns up where you least expect it.',
    hint: 'Only rice will tempt one.',
    drake: {
      head: 0xb07a4a, breast: 0xc08850, flank: 0xb07a48, back: 0x5a3a24, tail: 0x2a2622,
      bill: 0x3a3a40, speculum: 0x5a3a24, sidePatch: 0xf0e4d0,
    },
    hen: {
      head: 0xb07a4a, breast: 0xc08850, flank: 0xb07a48, back: 0x5a3a24, tail: 0x2a2622,
      bill: 0x3a3a40, speculum: 0x5a3a24, sidePatch: 0xf0e4d0,
    },
  },
  redBreastedMerganser: {
    id: 'redBreastedMerganser', name: 'Red-breasted Merganser', rarity: 'rare',
    coins: 15, feathers: 3, weight: 8,
    hours: [[7, 11], [14, 16.5]], weather: ['wind', 'coldFront'],
    size: 1, flockSize: 0.8,
    guide: 'A shaggy-crested sawbill of salt bays, with a white collar and a speckled rusty chest. One of the fastest ducks in the air.',
    hint: 'Salt water birds of the Atlantic coast.',
    drake: {
      head: 0x1e3a2e, headSheen: 0x2f6b4a, crest: true, neckMark: 'ring', breast: 0x9a6a44, flank: 0x8a8a8a,
      back: 0x1e1a18, tail: 0x5a5a5a, bill: 0xc0402a, speculum: 0xf0ece4,
    },
    hen: { ...henBase(0x9a5a32, 0x9a9a9a, 0xc0402a, 0xf0ece4), crest: true },
  },
  barrowsGoldeneye: {
    id: 'barrowsGoldeneye', name: "Barrow's Goldeneye", rarity: 'rare',
    coins: 18, feathers: 3, weight: 6,
    hours: [[6, 10]], weather: ['coldFront'],
    size: 0.95, flockSize: 0.6,
    guide: 'A mountain goldeneye with a purple-glossed head and a white crescent by the bill. Winters on rocky Pacific shores.',
    hint: 'A Pacific diver. Open water and the right flyway.',
    drake: {
      head: 0x2a2048, headSheen: 0x4a3a7a, eyePatch: 0xf4f2ec, breast: 0xf4f2ec, flank: 0xf0ece4,
      back: 0x1e1a18, tail: 0x1e1a18, bill: 0x1e1a18, speculum: 0xf4f2ec, sidePatch: 0x1e1a18,
    },
    hen: henBase(0x5a3a22, 0x9a9a9a, 0xd8a83a, 0xf0ece4),
  },
  surfScoter: {
    id: 'surfScoter', name: 'Surf Scoter', rarity: 'rare',
    coins: 17, feathers: 3, weight: 7,
    hours: [[6, 11]], weather: ['wind', 'coldFront'],
    size: 1.05, flockSize: 1.1,
    guide: 'The "skunk-head coot": jet black with white patches on the head and a big painted bill of orange, white and black.',
    hint: 'A sea duck of both coasts. Deep water helps.',
    drake: {
      head: 0x1e1a18, eyePatch: 0xf4f2ec, breast: 0x1e1a18, flank: 0x1e1a18, back: 0x1e1a18,
      tail: 0x1e1a18, bill: 0xe8702a, speculum: 0x1e1a18, billShield: true,
    },
    hen: henBase(0x4a3e34, 0x4e4238, 0x3a3a3a, 0x4a3e34),
  },
  whiteWingedScoter: {
    id: 'whiteWingedScoter', name: 'White-winged Scoter', rarity: 'rare',
    coins: 18, feathers: 3, weight: 6,
    hours: [[6, 11]], weather: ['wind', 'coldFront'],
    size: 1.2, flockSize: 1,
    guide: 'The biggest scoter, all black but for a white wing patch that flashes in flight and a tiny white comma by the eye.',
    hint: 'Big water on the coasts.',
    drake: {
      head: 0x1e1a18, breast: 0x1e1a18, flank: 0x1e1a18, back: 0x1e1a18, tail: 0x1e1a18,
      bill: 0xe8803a, speculum: 0xf4f2ec, billShield: true,
    },
    hen: henBase(0x4a3e34, 0x4e4238, 0x3a3a3a, 0xf4f2ec),
  },
  blackScoter: {
    id: 'blackScoter', name: 'Black Scoter', rarity: 'rare',
    coins: 17, feathers: 3, weight: 6,
    hours: [[6, 11]], weather: ['coldFront', 'fog'],
    size: 1, flockSize: 1.1,
    guide: 'Black from bill to tail except for a big butter-yellow knob on the bill. Whistles a mournful note over the swells.',
    hint: 'An Atlantic sea duck.',
    drake: {
      head: 0x1e1a18, breast: 0x1e1a18, flank: 0x1e1a18, back: 0x1e1a18, tail: 0x1e1a18,
      bill: 0xf2c43a, speculum: 0x1e1a18, billShield: true,
    },
    hen: { ...henBase(0x3a322c, 0x5a4e44, 0x3a3a3a, 0x3a322c), eyePatch: 0xb8aea0 },
  },
  commonEider: {
    id: 'commonEider', name: 'Common Eider', rarity: 'rare',
    coins: 30, feathers: 6, weight: 4,
    hours: [[6, 11]], weather: ['coldFront', 'wind'],
    size: 1.3, flockSize: 1,
    guide: 'The big sea duck of eiderdown fame. Drakes are white above and black below, with a soft green wash on the back of the head.',
    hint: 'Out on the Atlantic, and only for a fine rig.',
    drake: {
      head: 0xf4f2ec, crown: 0x1e1a18, breast: 0xf0e4d4, flank: 0x1e1a18, back: 0xf4f2ec,
      tail: 0x1e1a18, bill: 0x9aa070, speculum: 0x1e1a18, sidePatch: 0xf4f2ec,
    },
    hen: henBase(0x8a5e3a, 0x8a5e3a, 0x6a6a5a, 0x5a3a24),
  },
  tuftedDuck: {
    id: 'tuftedDuck', name: 'Tufted Duck', rarity: 'legendary',
    coins: 90, feathers: 18, weight: 0.8,
    hours: [[6, 10], [15, 17]], weather: ['wind', 'fog'],
    size: 0.95, flockSize: 0.4,
    guide: 'An Old World diver that wanders over now and then, tagging along with scaup. Look for the floppy tuft on the back of the head.',
    hint: 'A stray from across the ocean. Coastal flyways only.',
    drake: {
      head: 0x1e1a2a, headSheen: 0x3a2a5a, crest: true, breast: 0x1e1a18, flank: 0xf4f2ec,
      back: 0x1e1a18, tail: 0x1e1a18, bill: 0x7a8aa0, speculum: 0xf0ece4,
    },
    hen: { ...henBase(0x4a3a2e, 0x6a5a4a, 0x6a7a8a, 0xf0ece4), crest: true },
  },
  spectacledEider: {
    id: 'spectacledEider', name: 'Spectacled Eider', rarity: 'legendary',
    coins: 140, feathers: 30, weight: 0.4,
    hours: [[6, 10]], weather: ['coldFront'],
    size: 1.2, flockSize: 0.4,
    guide: 'A ghost of the Bering Sea: pale green head and great white "goggles" around the eyes. Few hunters ever see one.',
    hint: 'Far out on the Pacific, for the finest rig on the water.',
    drake: {
      head: 0xc8d8a0, eyePatch: 0xf4f2ec, breast: 0x2a2a2a, flank: 0x2a2a2a, back: 0xf4f2ec,
      tail: 0x1e1a18, bill: 0xe8803a, speculum: 0x1e1a18,
    },
    hen: { ...henBase(0x8a6a48, 0x8a6a48, 0x6a6a5a, 0x5a3a24), eyePatch: 0xc8b8a0 },
  },
  stellersEider: {
    id: 'stellersEider', name: "Steller's Eider", rarity: 'legendary',
    coins: 130, feathers: 28, weight: 0.4,
    hours: [[6, 10]], weather: ['coldFront', 'wind'],
    size: 0.95, flockSize: 0.5,
    guide: 'The smallest eider: a white head with a tiny green tuft, a black collar and a warm butterscotch chest.',
    hint: 'A Pacific rarity. Only the floating rig draws one.',
    drake: {
      head: 0xf4f2ec, crown: 0x8aa87a, neckMark: 'ring', breast: 0xc8904a, flank: 0xd8a060, back: 0x1e1a18,
      tail: 0x1e1a18, bill: 0x6a7a8a, speculum: 0x3a4a8a,
    },
    hen: henBase(0x6a4a32, 0x6a4a32, 0x6a7a8a, 0x3a4a8a),
  },
  tundraSwan: {
    id: 'tundraSwan', name: 'Tundra Swan', rarity: 'rare', ground: 'field',
    coins: 60, feathers: 10, weight: 4,
    hours: [[8, 11], [14, 16.5]], weather: ['coldFront', 'clear'],
    size: 2.1, flockSize: 0.5,
    guide: 'Huge, pure white and wonderfully loud, calling "woo-woo" like a far-off crowd. A small yellow spot sits by the black bill.',
    hint: 'Swans rest on a field pond with green wheat nearby.',
    drake: {
      form: 'goose', head: 0xf8f6f0, neck: 0xf8f6f0, breast: 0xf8f6f0, flank: 0xf4f2ec, back: 0xeeeae2,
      tail: 0xeeeae2, bill: 0x1e1a18, speculum: 0xf4f2ec,
    },
    hen: {
      form: 'goose', head: 0xf8f6f0, neck: 0xf8f6f0, breast: 0xf8f6f0, flank: 0xf4f2ec, back: 0xeeeae2,
      tail: 0xeeeae2, bill: 0x1e1a18, speculum: 0xf4f2ec,
    },
  },
  barnacleGoose: {
    id: 'barnacleGoose', name: 'Barnacle Goose', rarity: 'legendary', ground: 'field',
    coins: 200, feathers: 36, weight: 0.5,
    hours: [[8, 11], [14, 16]], weather: ['wind', 'coldFront'],
    size: 1.25, flockSize: 0.4,
    guide: 'A crisp little goose with a white face, black neck and silver-barred back. A stray from Greenland that sometimes joins the honkers.',
    hint: 'An Atlantic stray. Only the best goose chorus calls one down.',
    drake: {
      form: 'goose', head: 0xf4f2ec, neck: 0x1e1a18, cheek: 0xf4f2ec, breast: 0x1e1a18, flank: 0xb8bcc0,
      back: 0x7a7e84, tail: 0x1e1a18, bill: 0x1e1a18, speculum: 0x7a7e84,
    },
    hen: {
      form: 'goose', head: 0xf4f2ec, neck: 0x1e1a18, cheek: 0xf4f2ec, breast: 0x1e1a18, flank: 0xb8bcc0,
      back: 0x7a7e84, tail: 0x1e1a18, bill: 0x1e1a18, speculum: 0x7a7e84,
    },
  },
  pinkFootedGoose: {
    id: 'pinkFootedGoose', name: 'Pink-footed Goose', rarity: 'legendary', ground: 'field',
    coins: 190, feathers: 34, weight: 0.5,
    hours: [[8, 11], [14, 16]], weather: ['coldFront', 'fog'],
    size: 1.35, flockSize: 0.5,
    guide: 'A soft gray goose with a dark brown head and bright pink feet and bill band. Wanders over from Iceland with the snow geese.',
    hint: 'An Atlantic stray that loves green wheat.',
    drake: {
      form: 'goose', head: 0x5a4a3a, neck: 0x5a4a3a, breast: 0xb8aa98, flank: 0x9a8e80, back: 0x8a8a8a,
      tail: 0x6a6a6a, bill: 0xe89aa0, speculum: 0x8a8a8a,
    },
    hen: {
      form: 'goose', head: 0x5a4a3a, neck: 0x5a4a3a, breast: 0xb8aa98, flank: 0x9a8e80, back: 0x8a8a8a,
      tail: 0x6a6a6a, bill: 0xe89aa0, speculum: 0x8a8a8a,
    },
  },
};

export const SPECIES_ORDER: readonly SpeciesId[] = [
  'mallard', 'teal', 'blueWingedTeal', 'americanCoot', 'gadwall', 'shoveler', 'woodDuck', 'wigeon', 'ringNeck', 'pintail',
  'mottledDuck', 'blackDuck', 'redhead', 'scaup', 'ruddyDuck', 'bufflehead', 'goldeneye', 'commonMerganser', 'greaterScaup',
  'blackBelliedWhistler', 'canvasback', 'hoodedMerganser', 'cinnamonTeal', 'fulvousWhistler', 'redBreastedMerganser',
  'barrowsGoldeneye', 'surfScoter', 'whiteWingedScoter', 'blackScoter', 'harlequin', 'commonEider', 'eurasianWigeon', 'longtail',
  'kingEider', 'tuftedDuck', 'spectacledEider', 'stellersEider',
  'canadaGoose', 'cacklingGoose', 'snowGoose', 'rossGoose', 'blueGoose', 'whiteFront', 'brant', 'tundraSwan', 'sandhillCrane',
  'emperorGoose', 'barnacleGoose', 'pinkFootedGoose',
];

/** Species hunted at a ground. */
export function speciesAt(ground: 'marsh' | 'field', id: SpeciesId): boolean {
  return (SPECIES[id].ground ?? 'marsh') === ground;
}

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
