/**
 * How the marsh grows: lodge levels open new parts of the game, bot plans
 * are earned by doing a job by hand, and each job climbs an automation
 * ladder of big, visible upgrades. Every number here is a tuning knob.
 */
import type { BotId, JobId } from './economy';
import type { FeatureId } from './features';
import type { FlywayId } from './flyways';
import type { SpeciesId } from './species';
import type { UpgradeId } from './upgrades';
import type { CropId } from './crops';

// ---------------------------------------------------------------- counters

/** Things the game counts, used by plans, rungs and lodge levels. */
export type CounterId =
  | 'handDecoys' | 'handCalls' | 'handShots' | 'handFetches' | 'handFixes'
  | 'birds' | 'flocksCalled' | 'shots' | 'logged' | 'species' | 'bots'
  | 'handStakes' | 'handFlags' | 'handFieldShots' | 'handPickups' | 'geese';

export const COUNTER_LABEL: Record<CounterId, (n: string) => string> = {
  handDecoys: (n) => `Set ${n} decoys by hand`,
  handCalls: (n) => `Call in ${n} flocks by hand`,
  handShots: (n) => `Take ${n} shots by hand`,
  handFetches: (n) => `Fetch ${n} birds by hand`,
  handFixes: (n) => `Fix ${n} stuck bots yourself`,
  birds: (n) => `Bring in ${n} birds`,
  flocksCalled: (n) => `Call in ${n} flocks`,
  shots: (n) => `Take ${n} shots`,
  logged: (n) => `Log ${n} birds at the lodge`,
  species: (n) => `Find ${n} kinds of duck`,
  bots: (n) => `Own ${n} bots`,
  handStakes: (n) => `Stake ${n} goose decoys by hand`,
  handFlags: (n) => `Flag in ${n} flocks by hand`,
  handFieldShots: (n) => `Take ${n} shots from the layout blind`,
  handPickups: (n) => `Pick up ${n} geese by hand`,
  geese: (n) => `Bring in ${n} geese and cranes`,
};

// ---------------------------------------------------------------- lodge

export interface LodgeLevel {
  level: number;
  name: string;
  /** What Gus says when it's built. */
  gus: string;
  /** Requirements to start building (earned this season or ever: birds/species are lifetime). */
  birds: number;
  species: number;
  /** Building cost. */
  coins: number;
  feathers: number;
  /** Tabs that open with this level. */
  opens: readonly FeatureId[];
  /** What's new, for the level-up card and the lodge panel. */
  points: readonly string[];
}

export const LODGE_LEVELS: readonly LodgeLevel[] = [
  {
    level: 1, name: 'Duck Shack', gus: '', birds: 0, species: 0, coins: 0, feathers: 0, opens: [],
    points: ['A leaky roof, a woodstove and a good dog. Everything starts here.'],
  },
  {
    level: 2, name: "Trapper's Cabin",
    gus: "Four real walls and a workbench. Now we can start carving help.",
    birds: 150, species: 2, coins: 400, feathers: 60, opens: ['bots', 'upgrades'],
    points: [
      'The Workshop: do a job by hand enough times and you earn the plans for its bot. Then carve bots with coins.',
      'Your first food plot: plant millet and more on the far bank. What grows depends on the flyway.',
      'More upgrades, like the Coffee Pot.',
    ],
  },
  {
    level: 3, name: 'Marsh Lodge',
    gus: "Guests are coming from three counties. We'll need a ledger keeper and a proper job board.",
    birds: 1_000, species: 4, coins: 3_000, feathers: 300, opens: [],
    points: [
      'Ledger Bot plans, so Gus gets help at the porch.',
      'Second rungs on the automation ladder: Spinning-wing Decoys, Duet Callers, Steady Blind, Kennel Pack.',
      'A second food plot, plus flooded timber, wild celery, the boat house, lantern posts and more.',
    ],
  },
  {
    level: 4, name: 'Sporting Club',
    gus: "A real club now. Members, a trophy room, the works. Time to run this place like a well-oiled call.",
    birds: 7_000, species: 7, coins: 30_000, feathers: 2_000, opens: ['field', 'workflows'],
    points: [
      'The Goose Field: a harvested cornfield with its own geese, cranes, crew and ladder. Switch to it from the marsh.',
      'Workflows: tie the jobs together with rope for big crew bonuses.',
      'Scout and Foreman plans.',
      'Third rungs: Decoy Skiff, Long Call, Twin Blinds, Retriever Skiff, Front Desk.',
      'The Deep Pool for diving ducks, the Guest Dock and the Smokehouse.',
    ],
  },
  {
    level: 5, name: 'Grand Lodge',
    gus: "Look at her. Stone chimney, three wings, a flag on the roof. Your grandfather would weep.",
    birds: 40_000, species: 10, coins: 400_000, feathers: 12_000, opens: ['legacy'],
    points: [
      'Legacy: close out a season for Flyway Stars and move to a new flyway.',
      'Tinker Bot plans.',
      'Top rungs: Floating Rig, Lure Master, Marksman, Retriever Boat, Guest Wing, Lookout Tower.',
      'The Carving Shed makes every bot cheaper.',
    ],
  },
];

export const MAX_LODGE = LODGE_LEVELS.length;

// ---------------------------------------------------------------- plans

export interface PlanDef {
  /** Lodge level that makes the plans possible. */
  lodge: number;
  counter: CounterId;
  count: number;
}

/** Earn a bot's plans by doing its job yourself; then carve it with coins. */
export const PLANS: Record<BotId, PlanDef> = {
  caller: { lodge: 2, counter: 'handCalls', count: 60 },
  blind: { lodge: 2, counter: 'handShots', count: 60 },
  retriever: { lodge: 2, counter: 'handFetches', count: 150 },
  setter: { lodge: 2, counter: 'handDecoys', count: 30 },
  ledger: { lodge: 3, counter: 'logged', count: 600 },
  scout: { lodge: 4, counter: 'flocksCalled', count: 1_500 },
  foreman: { lodge: 4, counter: 'handFixes', count: 12 },
  tinker: { lodge: 5, counter: 'bots', count: 120 },
  staker: { lodge: 4, counter: 'handStakes', count: 25 },
  flagger: { lodge: 4, counter: 'handFlags', count: 40 },
  layout: { lodge: 4, counter: 'handFieldShots', count: 40 },
  fieldDog: { lodge: 4, counter: 'handPickups', count: 100 },
};

// ---------------------------------------------------------------- ladder

export type RungId =
  | 'spinningWing' | 'decoySkiff' | 'floatingRig'
  | 'duetCallers' | 'longCall' | 'lureMaster'
  | 'steadyBlind' | 'twinBlinds' | 'marksman'
  | 'kennelPack' | 'retrieverSkiff' | 'retrieverBoat'
  | 'frontDesk' | 'guestWing'
  | 'lookoutTower'
  | 'silhouetteSpread' | 'fullBodyFleet'
  | 'kiteFlag' | 'honkerChorus'
  | 'stubbleBlinds' | 'pitBlind'
  | 'fieldKennel' | 'muleCart';

export interface RungEffect {
  /** × the job's bot output. */
  mult?: number;
  /** × flock arrivals. */
  draw?: number;
  /** + decoys in the spread. */
  spread?: number;
  /** + flocks that can work the decoys at once. */
  committed?: number;
  /** × how long circling flocks wait. */
  patience?: number;
  /** × how long called flocks stay over the decoys. */
  committedPatience?: number;
  /** + fraction of a flock taken per shot. */
  shot?: number;
  /** × rare and legendary species weight. */
  rare?: number;
  /** × coins per logged bird. */
  coins?: number;
}

export interface RungDef {
  id: RungId;
  /** A spread rig: bought in Upgrades, needs no bots. */
  rig?: boolean;
  /** Which hunt its marsh-wide effects apply to (default: the marsh). */
  ground?: 'field';
  job: JobId;
  /** The bot whose crew this rung improves. */
  bot: BotId;
  tier: 2 | 3 | 4;
  name: string;
  blurb: string;
  /** Short effect text for the card. */
  effect: string;
  lodge: number;
  /** Bots of this kind you must own. */
  owned: number;
  counter: CounterId;
  count: number;
  coins: number;
  feathers: number;
  fx: RungEffect;
}

const T2 = { lodge: 3, owned: 10, coins: 5_000, feathers: 300 } as const;
/** Spread rigs need no crew. */
const RIG = { owned: 0 } as const;
const T3 = { lodge: 4, owned: 25, coins: 80_000, feathers: 3_000 } as const;
const T4 = { lodge: 5, owned: 50, coins: 400_000, feathers: 15_000 } as const;
/** Field rungs: the field opens at lodge 4, so its ladder is shorter and pricier. */
const F2 = { ground: 'field', tier: 2, lodge: 4, owned: 10, coins: 120_000, feathers: 6_000 } as const;
const F3 = { ground: 'field', tier: 3, lodge: 5, owned: 25, coins: 900_000, feathers: 30_000 } as const;

export const RUNGS: Record<RungId, RungDef> = {
  spinningWing: {
    id: 'spinningWing', rig: true, job: 'decoys', bot: 'setter', tier: 2, ...T2, ...RIG, counter: 'birds', count: 1_500,
    name: 'Spinning-wing Decoys', blurb: 'A few decoys with wings that flicker in the sun. Flocks see the spread from miles off.',
    effect: '+15% flocks', fx: { mult: 2, draw: 1.15 },
  },
  decoySkiff: {
    id: 'decoySkiff', rig: true, job: 'decoys', bot: 'setter', tier: 3, ...T3, ...RIG, counter: 'birds', count: 8_000,
    name: 'Decoy Skiff', blurb: 'A little flat-bottomed boat that tows a diver spread out to open water.',
    effect: '+4 decoys · scaup & buffleheads', fx: { mult: 2, spread: 4 },
  },
  floatingRig: {
    id: 'floatingRig', rig: true, job: 'decoys', bot: 'setter', tier: 4, ...T4, ...RIG, counter: 'birds', count: 40_000,
    name: 'Floating Rig', blurb: 'A great long line of hand-carved sea ducks, bobbing on the swell.',
    effect: '+25% flocks · draws the King Eider', fx: { mult: 3, draw: 1.25 },
  },
  duetCallers: {
    id: 'duetCallers', job: 'call', bot: 'caller', tier: 2, ...T2, counter: 'flocksCalled', count: 800,
    name: 'Duet Callers', blurb: 'Callers paired up hen-and-drake. Two voices sound like a whole flock on the water.',
    effect: 'Callers ×2 · one more flock over the decoys', fx: { mult: 2, committed: 1 },
  },
  longCall: {
    id: 'longCall', job: 'call', bot: 'caller', tier: 3, ...T3, counter: 'flocksCalled', count: 4_000,
    name: 'Long Call', blurb: 'Hand-turned cedar calls that carry across the whole marsh.',
    effect: 'Callers ×2 · flocks circle 50% longer · hooded mergansers', fx: { mult: 2, patience: 1.5 },
  },
  lureMaster: {
    id: 'lureMaster', job: 'call', bot: 'caller', tier: 4, ...T4, counter: 'flocksCalled', count: 20_000,
    name: 'Lure Master', blurb: "A caller so sweet, birds that have no business here come for a look.",
    effect: 'Callers ×3 · rare birds ×1.5 · harlequins', fx: { mult: 3, rare: 1.5 },
  },
  steadyBlind: {
    id: 'steadyBlind', job: 'shoot', bot: 'blind', tier: 2, ...T2, counter: 'shots', count: 800,
    name: 'Steady Blind', blurb: 'A proper shooting rail and a bench that does not wobble.',
    effect: 'Blind Bots ×2 · +8% of each flock per shot', fx: { mult: 2, shot: 0.08 },
  },
  twinBlinds: {
    id: 'twinBlinds', job: 'shoot', bot: 'blind', tier: 3, ...T3, counter: 'shots', count: 4_000,
    name: 'Twin Blinds', blurb: 'A second blind across the spread, so no flock slips past.',
    effect: 'Blind Bots ×2 · called flocks stay 50% longer', fx: { mult: 2, committedPatience: 1.5 },
  },
  marksman: {
    id: 'marksman', job: 'shoot', bot: 'blind', tier: 4, ...T4, counter: 'shots', count: 20_000,
    name: 'Marksman', blurb: 'Brass sights, oiled walnut and a very calm bot.',
    effect: 'Blind Bots ×3 · +10% of each flock per shot', fx: { mult: 3, shot: 0.1 },
  },
  kennelPack: {
    id: 'kennelPack', job: 'retrieve', bot: 'retriever', tier: 2, ...T2, counter: 'birds', count: 1_500,
    name: 'Kennel Pack', blurb: 'A warm kennel by the shore. The pups run as a pack now.',
    effect: 'Retrievers ×2', fx: { mult: 2 },
  },
  retrieverSkiff: {
    id: 'retrieverSkiff', job: 'retrieve', bot: 'retriever', tier: 3, ...T3, counter: 'birds', count: 8_000,
    name: 'Retriever Skiff', blurb: 'A low boat the pups ride out on, so nobody swims the long way.',
    effect: 'Retrievers ×3', fx: { mult: 3 },
  },
  retrieverBoat: {
    id: 'retrieverBoat', job: 'retrieve', bot: 'retriever', tier: 4, ...T4, counter: 'birds', count: 40_000,
    name: 'Retriever Boat', blurb: 'A putt-putt motor and a captain in a tiny cap.',
    effect: 'Retrievers ×3', fx: { mult: 3 },
  },
  frontDesk: {
    id: 'frontDesk', job: 'log', bot: 'ledger', tier: 3, ...T3, counter: 'logged', count: 5_000,
    name: 'Front Desk', blurb: 'A brass bell, a guest book and a Ledger Bot in a waistcoat.',
    effect: 'Ledger Bots ×2 · +10% coins', fx: { mult: 2, coins: 1.1 },
  },
  guestWing: {
    id: 'guestWing', job: 'log', bot: 'ledger', tier: 4, ...T4, counter: 'logged', count: 25_000,
    name: 'Guest Wing', blurb: 'Twelve new rooms with quilts and a view of the water.',
    effect: 'Ledger Bots ×3 · +25% coins', fx: { mult: 3, coins: 1.25 },
  },
  lookoutTower: {
    id: 'lookoutTower', job: 'scout', bot: 'scout', tier: 4, ...T4, owned: 25, counter: 'flocksCalled', count: 15_000,
    name: 'Lookout Tower', blurb: 'A cedar tower over the reeds. The scouts can see clear to the river.',
    effect: 'Scouts ×3 · +10% flocks', fx: { mult: 3, draw: 1.1 },
  },
  silhouetteSpread: {
    id: 'silhouetteSpread', rig: true, job: 'fDecoys', bot: 'staker', ...F2, ...RIG, counter: 'geese', count: 800,
    name: 'Silhouette Spread', blurb: 'Dozens of flat, painted silhouettes fan out behind the full-bodies. From the air it looks like a whole field of geese.',
    effect: '+6 decoys · Ross\'s geese', fx: { mult: 2, spread: 6 },
  },
  fullBodyFleet: {
    id: 'fullBodyFleet', rig: true, job: 'fDecoys', bot: 'staker', ...F3, ...RIG, counter: 'geese', count: 5_000,
    name: 'Full-body Fleet', blurb: 'A trailer of hand-flocked full-bodies, feeders and sentries and sleepers.',
    effect: '+25% goose flocks · blue geese', fx: { mult: 3, draw: 1.25 },
  },
  kiteFlag: {
    id: 'kiteFlag', job: 'flag', bot: 'flagger', ...F2, counter: 'geese', count: 800,
    name: 'Kite Flags', blurb: 'Goose-shaped kites that hover and bob over the spread like birds settling in.',
    effect: 'Flaggers ×2 · geese circle 40% longer · white-fronts', fx: { mult: 2, patience: 1.4 },
  },
  honkerChorus: {
    id: 'honkerChorus', job: 'flag', bot: 'flagger', ...F3, counter: 'geese', count: 5_000,
    name: 'Honker Chorus', blurb: 'A whole line of flaggers calling in harmony: clucks, moans and the double honk.',
    effect: 'Flaggers ×3 · rare geese ×1.5 · the Emperor Goose', fx: { mult: 3, rare: 1.5 },
  },
  stubbleBlinds: {
    id: 'stubbleBlinds', job: 'fShoot', bot: 'layout', ...F2, counter: 'geese', count: 800,
    name: 'Stubbled Blinds', blurb: 'Layout blinds brushed in with real corn stubble. Even a crane can\'t pick them out.',
    effect: 'Layout Bots ×2 · +6% of each flock per shot · cranes', fx: { mult: 2, shot: 0.06 },
  },
  pitBlind: {
    id: 'pitBlind', job: 'fShoot', bot: 'layout', ...F3, counter: 'geese', count: 5_000,
    name: 'Pit Blind', blurb: 'A dug-in pit with a sliding lid, a heater and a bench for the whole crew.',
    effect: 'Layout Bots ×3 · geese stay 50% longer over the spread', fx: { mult: 3, committedPatience: 1.5 },
  },
  fieldKennel: {
    id: 'fieldKennel', job: 'fRetrieve', bot: 'fieldDog', ...F2, counter: 'geese', count: 800,
    name: 'Field Kennel', blurb: 'A warm doghouse at the field edge with straw and a water bowl.',
    effect: 'Field Pups ×2', fx: { mult: 2 },
  },
  muleCart: {
    id: 'muleCart', job: 'fRetrieve', bot: 'fieldDog', ...F3, counter: 'geese', count: 5_000,
    name: 'Mule Cart', blurb: 'A patient clockwork mule pulls a cart along the rows. The pups just load it up.',
    effect: 'Field Pups ×3', fx: { mult: 3 },
  },
};

export const RUNG_ORDER: readonly RungId[] = [
  'spinningWing', 'decoySkiff', 'floatingRig',
  'duetCallers', 'longCall', 'lureMaster',
  'steadyBlind', 'twinBlinds', 'marksman',
  'kennelPack', 'retrieverSkiff', 'retrieverBoat',
  'frontDesk', 'guestWing', 'lookoutTower',
  'silhouetteSpread', 'fullBodyFleet', 'kiteFlag', 'honkerChorus', 'stubbleBlinds', 'pitBlind', 'fieldKennel', 'muleCart',
];

/** The automation ladder for each bot, bottom to top. */
export function ladderFor(bot: BotId): RungDef[] {
  return RUNG_ORDER.map((id) => RUNGS[id]).filter((r) => r.bot === bot);
}

// ---------------------------------------------------------------- species draws

export type Draw = { upgrade: UpgradeId } | { rung: RungId } | { flyway: readonly FlywayId[] } | { crop: readonly CropId[] };

/** What a species needs before it will visit at all. Starter birds need nothing. */
export const SPECIES_DRAW: Partial<Record<SpeciesId, readonly Draw[]>> = {
  gadwall: [{ crop: ['millet'] }],
  shoveler: [{ crop: ['millet'] }],
  woodDuck: [{ upgrade: 'nestBoxes' }],
  wigeon: [{ upgrade: 'celeryBeds' }],
  ringNeck: [{ upgrade: 'celeryBeds' }],
  pintail: [{ crop: ['rice', 'milo'] }],
  blackDuck: [{ upgrade: 'timber' }],
  redhead: [{ upgrade: 'deepPool' }],
  canvasback: [{ upgrade: 'deepPool' }, { upgrade: 'celeryBeds' }],
  scaup: [{ rung: 'decoySkiff' }],
  bufflehead: [{ rung: 'decoySkiff' }],
  hoodedMerganser: [{ upgrade: 'timber' }, { rung: 'longCall' }],
  cinnamonTeal: [{ crop: ['rice', 'milo'] }, { flyway: ['central', 'pacific'] }],
  eurasianWigeon: [{ upgrade: 'celeryBeds' }, { flyway: ['pacific'] }],
  longtail: [{ upgrade: 'deepPool' }, { flyway: ['atlantic'] }],
  harlequin: [{ rung: 'lureMaster' }],
  kingEider: [{ rung: 'floatingRig' }],
  cacklingGoose: [{ upgrade: 'cornStubble' }],
  snowGoose: [{ upgrade: 'winterWheat' }],
  rossGoose: [{ upgrade: 'winterWheat' }, { rung: 'silhouetteSpread' }],
  blueGoose: [{ upgrade: 'winterWheat' }, { rung: 'fullBodyFleet' }],
  whiteFront: [{ upgrade: 'winterWheat' }, { rung: 'kiteFlag' }],
  brant: [{ upgrade: 'roostPond' }],
  sandhillCrane: [{ upgrade: 'roostPond' }, { rung: 'stubbleBlinds' }],
  emperorGoose: [{ rung: 'honkerChorus' }],
  mottledDuck: [{ flyway: ['mississippi', 'central'] }],
  ruddyDuck: [{ upgrade: 'deepPool' }],
  goldeneye: [{ rung: 'decoySkiff' }],
  commonMerganser: [{ upgrade: 'deepPool' }],
  greaterScaup: [{ rung: 'decoySkiff' }, { flyway: ['atlantic', 'pacific'] }],
  blackBelliedWhistler: [{ crop: ['rice', 'milo'] }, { flyway: ['mississippi', 'central'] }],
  fulvousWhistler: [{ crop: ['rice'] }],
  redBreastedMerganser: [{ rung: 'decoySkiff' }, { flyway: ['atlantic'] }],
  barrowsGoldeneye: [{ rung: 'decoySkiff' }, { flyway: ['pacific'] }],
  surfScoter: [{ upgrade: 'deepPool' }, { flyway: ['pacific', 'atlantic'] }],
  whiteWingedScoter: [{ upgrade: 'deepPool' }, { flyway: ['atlantic', 'pacific'] }],
  blackScoter: [{ upgrade: 'deepPool' }, { flyway: ['atlantic'] }],
  commonEider: [{ rung: 'floatingRig' }, { flyway: ['atlantic'] }],
  tuftedDuck: [{ rung: 'decoySkiff' }, { flyway: ['pacific', 'atlantic'] }],
  spectacledEider: [{ rung: 'floatingRig' }, { flyway: ['pacific'] }],
  stellersEider: [{ rung: 'floatingRig' }, { flyway: ['pacific'] }],
  tundraSwan: [{ upgrade: 'roostPond' }, { upgrade: 'winterWheat' }],
  barnacleGoose: [{ rung: 'honkerChorus' }, { flyway: ['atlantic'] }],
  pinkFootedGoose: [{ upgrade: 'winterWheat' }, { flyway: ['atlantic'] }],
};
