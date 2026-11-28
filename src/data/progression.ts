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
  | 'handStakes' | 'handFlags' | 'handFieldShots' | 'handPickups' | 'geese'
  | 'handTCalls' | 'handTShots' | 'handTFetches' | 'handBCalls' | 'handBShots' | 'handBFetches'
  | 'timberBirds' | 'bayBirds';

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
  timberBirds: (n) => `Bring in ${n} birds from the timber`,
  bayBirds: (n) => `Bring in ${n} birds from the bay`,
  handTCalls: (n) => `Call in ${n} flocks by hand in the timber`,
  handTShots: (n) => `Take ${n} shots by hand in the timber`,
  handTFetches: (n) => `Fetch ${n} birds by hand in the timber`,
  handBCalls: (n) => `Call in ${n} flocks by hand on the bay`,
  handBShots: (n) => `Take ${n} shots by hand on the bay`,
  handBFetches: (n) => `Pick up ${n} birds by hand on the bay`,
};

// ---------------------------------------------------------------- lodge

export interface LodgeLevel {
  level: number;
  name: string;
  /** What Ray says when it's built. */
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
    birds: 0, species: 2, coins: 2_000, feathers: 200, opens: ['bots', 'upgrades', 'workflows'],
    points: [
      'The Workshop: do a job by hand enough times and you earn the plans for its bot. Then carve bots with coins.',
      'Your first food plot: plant millet and more on the far bank. What grows depends on the flyway.',
      'More upgrades, like the Coffee Pot.',
    ],
  },
  {
    level: 3, name: 'Marsh Lodge',
    gus: "Guests are coming from three counties. We'll need a ledger keeper and a proper job board.",
    birds: 0, species: 5, coins: 12_000, feathers: 1_200, opens: [],
    points: [
      'Second rungs on the automation ladder: Spinning-wing Decoys, Duet Callers, Steady Blind, Kennel Pack.',
      'Flooded Timber: a second hunting ground in drowned oaks, home to wood ducks and black ducks, with a crew of its own.',
      'A second food plot, plus wild celery, the boat house, lantern posts and more.',
    ],
  },
  {
    level: 4, name: 'Sporting Club',
    gus: "A real club now. Members, a trophy room, the works. Time to run this place like a well-oiled call.",
    birds: 0, species: 12, coins: 8_000_000, feathers: 500_000, opens: ['field'],
    points: [
      'The Goose Field: a harvested cornfield with its own geese, cranes, crew and ladder. Switch grounds from the button at the top of the screen.',
      'Third rungs: Decoy Skiff, Long Call, Twin Blinds, Retriever Skiff, Front Desk.',
      'The Deep Pool for diving ducks, the Guest Dock and the Smokehouse.',
    ],
  },
  {
    level: 5, name: 'Grand Lodge',
    gus: "Look at her. Stone chimney, three wings, a flag on the roof. Your grandfather would weep.",
    birds: 0, species: 20, coins: 100_000_000, feathers: 4_000_000, opens: ['legacy'],
    points: [
      'Coastal Bay: open salt water with scoters, eiders and long-tailed ducks, with a crew of its own.',
      'Legacy: close out a season for Flyway Stars and move to a new flyway.',
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
  blind: { lodge: 2, counter: 'handShots', count: 140 },
  retriever: { lodge: 2, counter: 'handFetches', count: 350 },
  setter: { lodge: 2, counter: 'handDecoys', count: 30 },
  ledger: { lodge: 3, counter: 'logged', count: 600 },
  scout: { lodge: 3, counter: 'flocksCalled', count: 2_500 },
  foreman: { lodge: 3, counter: 'handFixes', count: 12 },
  tinker: { lodge: 5, counter: 'bots', count: 120 },
  staker: { lodge: 4, counter: 'handStakes', count: 25 },
  flagger: { lodge: 4, counter: 'handFlags', count: 40 },
  layout: { lodge: 4, counter: 'handFieldShots', count: 40 },
  fieldDog: { lodge: 4, counter: 'handPickups', count: 100 },
  tCaller: { lodge: 3, counter: 'handTCalls', count: 8 },
  tBlind: { lodge: 3, counter: 'handTShots', count: 10 },
  tPup: { lodge: 3, counter: 'handTFetches', count: 25 },
  bCaller: { lodge: 5, counter: 'handBCalls', count: 12 },
  bBlind: { lodge: 5, counter: 'handBShots', count: 15 },
  bPup: { lodge: 5, counter: 'handBFetches', count: 40 },
  guide: { lodge: 3, counter: 'birds', count: 1_500 },
  boatman: { lodge: 5, counter: 'birds', count: 1_400_000 },
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
  | 'fieldKennel' | 'muleCart'
  | 'woodDuckWhistle' | 'cypressChorus' | 'stumpRest' | 'treeStand' | 'snorkelPack' | 'pirogue'
  | 'foghornCall' | 'raftCaller' | 'layoutBoat' | 'sneakBoat' | 'tenderLine' | 'harborTender';

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
  /** Which hunt its ground-wide effects apply to (default: the marsh). */
  ground?: 'field' | 'timber' | 'bay';
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

const T2 = { lodge: 3, owned: 10, coins: 25_000, feathers: 1_500 } as const;
/** Spread rigs need no crew. */
const RIG = { owned: 0 } as const;
const T3 = { lodge: 4, owned: 25, coins: 1_200_000, feathers: 45_000 } as const;
const T4 = { lodge: 5, owned: 50, coins: 60_000_000, feathers: 2_000_000 } as const;
/** Field rungs: the field opens at lodge 4, so its ladder is shorter and pricier. */
const F2 = { ground: 'field', tier: 2, lodge: 4, owned: 10, coins: 1_800_000, feathers: 90_000 } as const;
const F3 = { ground: 'field', tier: 3, lodge: 5, owned: 25, coins: 120_000_000, feathers: 4_000_000 } as const;
/** Flooded Timber rungs: the feather ground, so they lean on feathers. */
const W2 = { ground: 'timber', tier: 2, lodge: 3, owned: 10, coins: 60_000, feathers: 8_000 } as const;
const W3 = { ground: 'timber', tier: 3, lodge: 4, owned: 25, coins: 3_000_000, feathers: 300_000 } as const;
/** Coastal Bay rungs: the bay opens with the last lodge, so both steps come then. */
const B2 = { ground: 'bay', tier: 2, lodge: 5, owned: 10, coins: 40_000_000, feathers: 2_000_000 } as const;
const B3 = { ground: 'bay', tier: 3, lodge: 5, owned: 25, coins: 600_000_000, feathers: 25_000_000 } as const;

export const RUNGS: Record<RungId, RungDef> = {
  spinningWing: {
    id: 'spinningWing', rig: true, job: 'decoys', bot: 'setter', tier: 2, ...T2, ...RIG, counter: 'birds', count: 6000,
    name: 'Spinning-wing Decoys', blurb: 'A few decoys with wings that flicker in the sun. Flocks see the spread from miles off.',
    effect: '+15% flocks', fx: { mult: 2, draw: 1.15 },
  },
  decoySkiff: {
    id: 'decoySkiff', rig: true, job: 'decoys', bot: 'setter', tier: 3, ...T3, ...RIG, counter: 'birds', count: 64_000,
    name: 'Decoy Skiff', blurb: 'A little flat-bottomed boat that tows a diver spread out to open water.',
    effect: '+4 decoys · scaup & buffleheads', fx: { mult: 2, spread: 4 },
  },
  floatingRig: {
    id: 'floatingRig', rig: true, job: 'decoys', bot: 'setter', tier: 4, ...T4, ...RIG, counter: 'birds', count: 400_000,
    name: 'Floating Rig', blurb: 'A great long line of hand-carved sea ducks, bobbing on the swell.',
    effect: '+25% flocks', fx: { mult: 3, draw: 1.25 },
  },
  duetCallers: {
    id: 'duetCallers', job: 'call', bot: 'caller', tier: 2, ...T2, owned: 14, counter: 'flocksCalled', count: 4500,
    name: 'Duet Callers', blurb: 'Callers paired up hen-and-drake. Two voices sound like a whole flock on the water.',
    effect: 'Callers ×2 · one more flock over the decoys', fx: { mult: 2, committed: 1 },
  },
  longCall: {
    id: 'longCall', job: 'call', bot: 'caller', tier: 3, ...T3, owned: 35, counter: 'flocksCalled', count: 44_800,
    name: 'Long Call', blurb: 'Hand-turned cedar calls that carry across the whole marsh.',
    effect: 'Callers ×2 · flocks circle 50% longer · hooded mergansers', fx: { mult: 2, patience: 1.5 },
  },
  lureMaster: {
    id: 'lureMaster', job: 'call', bot: 'caller', tier: 4, ...T4, owned: 70, counter: 'flocksCalled', count: 280_000,
    name: 'Lure Master', blurb: "A caller so sweet, birds that have no business here come for a look.",
    effect: 'Callers ×3 · rare birds ×1.5 · harlequins', fx: { mult: 3, rare: 1.5 },
  },
  steadyBlind: {
    id: 'steadyBlind', job: 'shoot', bot: 'blind', tier: 2, ...T2, owned: 18, counter: 'shots', count: 5800,
    name: 'Steady Blind', blurb: 'A proper shooting rail and a bench that does not wobble.',
    effect: 'Blind Bots ×2 · +8% of each flock per shot', fx: { mult: 2, shot: 0.08 },
  },
  twinBlinds: {
    id: 'twinBlinds', job: 'shoot', bot: 'blind', tier: 3, ...T3, owned: 45, counter: 'shots', count: 57_600,
    name: 'Twin Blinds', blurb: 'A second blind across the spread, so no flock slips past.',
    effect: 'Blind Bots ×2 · called flocks stay 50% longer', fx: { mult: 2, committedPatience: 1.5 },
  },
  marksman: {
    id: 'marksman', job: 'shoot', bot: 'blind', tier: 4, ...T4, owned: 90, counter: 'shots', count: 360_000,
    name: 'Marksman', blurb: 'Brass sights, oiled walnut and a very calm bot.',
    effect: 'Blind Bots ×3 · +10% of each flock per shot', fx: { mult: 3, shot: 0.1 },
  },
  kennelPack: {
    id: 'kennelPack', job: 'retrieve', bot: 'retriever', tier: 2, ...T2, owned: 22, counter: 'birds', count: 13_200,
    name: 'Kennel Pack', blurb: 'A warm kennel by the shore. The pups run as a pack now.',
    effect: 'Retrievers ×2', fx: { mult: 2 },
  },
  retrieverSkiff: {
    id: 'retrieverSkiff', job: 'retrieve', bot: 'retriever', tier: 3, ...T3, owned: 55, counter: 'birds', count: 140_800,
    name: 'Retriever Skiff', blurb: 'A low boat the pups ride out on, so nobody swims the long way.',
    effect: 'Retrievers ×3', fx: { mult: 3 },
  },
  retrieverBoat: {
    id: 'retrieverBoat', job: 'retrieve', bot: 'retriever', tier: 4, ...T4, owned: 110, counter: 'birds', count: 880_000,
    name: 'Retriever Boat', blurb: 'A putt-putt motor and a captain in a tiny cap.',
    effect: 'Retrievers ×3', fx: { mult: 3 },
  },
  frontDesk: {
    id: 'frontDesk', job: 'log', bot: 'ledger', tier: 3, ...T3, owned: 65, counter: 'logged', count: 104_000,
    name: 'Front Desk', blurb: 'A brass bell, a guest book and a Ledger Bot in a waistcoat.',
    effect: 'Ledger Bots ×2 · +10% coins', fx: { mult: 2, coins: 1.1 },
  },
  guestWing: {
    id: 'guestWing', job: 'log', bot: 'ledger', tier: 4, ...T4, owned: 130, counter: 'logged', count: 650_000,
    name: 'Guest Wing', blurb: 'Twelve new rooms with quilts and a view of the water.',
    effect: 'Ledger Bots ×3 · +25% coins', fx: { mult: 3, coins: 1.25 },
  },
  lookoutTower: {
    id: 'lookoutTower', job: 'scout', bot: 'scout', tier: 4, ...T4, owned: 60, counter: 'flocksCalled', count: 390_000,
    name: 'Lookout Tower', blurb: 'A cedar tower over the reeds. The scouts can see clear to the river.',
    effect: 'Scouts ×3 · +10% flocks', fx: { mult: 3, draw: 1.1 },
  },
  silhouetteSpread: {
    id: 'silhouetteSpread', rig: true, job: 'fDecoys', bot: 'staker', ...F2, ...RIG, counter: 'geese', count: 6400,
    name: 'Silhouette Spread', blurb: 'Dozens of flat, painted silhouettes fan out behind the full-bodies. From the air it looks like a whole field of geese.',
    effect: '+6 decoys · Ross\'s geese', fx: { mult: 2, spread: 6 },
  },
  fullBodyFleet: {
    id: 'fullBodyFleet', rig: true, job: 'fDecoys', bot: 'staker', ...F3, ...RIG, counter: 'geese', count: 50_000,
    name: 'Full-body Fleet', blurb: 'A trailer of hand-flocked full-bodies, feeders and sentries and sleepers.',
    effect: '+25% goose flocks · blue geese', fx: { mult: 3, draw: 1.25 },
  },
  kiteFlag: {
    id: 'kiteFlag', job: 'flag', bot: 'flagger', ...F2, owned: 14, counter: 'geese', count: 9000,
    name: 'Kite Flags', blurb: 'Goose-shaped kites that hover and bob over the spread like birds settling in.',
    effect: 'Flaggers ×2 · geese circle 40% longer · white-fronts', fx: { mult: 2, patience: 1.4 },
  },
  honkerChorus: {
    id: 'honkerChorus', job: 'flag', bot: 'flagger', ...F3, owned: 35, counter: 'geese', count: 70_000,
    name: 'Honker Chorus', blurb: 'A whole line of flaggers calling in harmony: clucks, moans and the double honk.',
    effect: 'Flaggers ×3 · rare geese ×1.5 · the Emperor Goose', fx: { mult: 3, rare: 1.5 },
  },
  stubbleBlinds: {
    id: 'stubbleBlinds', job: 'fShoot', bot: 'layout', ...F2, owned: 18, counter: 'geese', count: 11_500,
    name: 'Stubbled Blinds', blurb: 'Layout blinds brushed in with real corn stubble. Even a crane can\'t pick them out.',
    effect: 'Layout Bots ×2 · +6% of each flock per shot · cranes', fx: { mult: 2, shot: 0.06 },
  },
  pitBlind: {
    id: 'pitBlind', job: 'fShoot', bot: 'layout', ...F3, owned: 45, counter: 'geese', count: 90_000,
    name: 'Pit Blind', blurb: 'A dug-in pit with a sliding lid, a heater and a bench for the whole crew.',
    effect: 'Layout Bots ×3 · geese stay 50% longer over the spread', fx: { mult: 3, committedPatience: 1.5 },
  },
  fieldKennel: {
    id: 'fieldKennel', job: 'fRetrieve', bot: 'fieldDog', ...F2, owned: 22, counter: 'geese', count: 14_100,
    name: 'Field Kennel', blurb: 'A warm doghouse at the field edge with straw and a water bowl.',
    effect: 'Field Pups ×2', fx: { mult: 2 },
  },
  muleCart: {
    id: 'muleCart', job: 'fRetrieve', bot: 'fieldDog', ...F3, owned: 55, counter: 'geese', count: 110_000,
    name: 'Mule Cart', blurb: 'A patient clockwork mule pulls a cart along the rows. The pups just load it up.',
    effect: 'Field Pups ×3', fx: { mult: 3 },
  },

  woodDuckWhistle: {
    id: 'woodDuckWhistle', job: 'tCall', bot: 'tCaller', ...W2, counter: 'timberBirds', count: 8_000,
    name: 'Wood Duck Whistle', blurb: 'A thin squealing whistle, just like a wood duck hen. Flocks drop down through the branches to look.',
    effect: 'Cypress Callers ×2 · flocks circle 40% longer', fx: { mult: 2, patience: 1.4 },
  },
  cypressChorus: {
    id: 'cypressChorus', job: 'tCall', bot: 'tCaller', ...W3, owned: 30, counter: 'timberBirds', count: 90_000,
    name: 'Cypress Chorus', blurb: 'Callers spread through the trees, so the whole timber sounds alive with ducks.',
    effect: 'Cypress Callers ×3 · one more flock over the decoys', fx: { mult: 3, committed: 1 },
  },
  stumpRest: {
    id: 'stumpRest', job: 'tShoot', bot: 'tBlind', ...W2, counter: 'timberBirds', count: 9_000,
    name: 'Stump Rest', blurb: 'A notch cut in an old oak stump makes a steady rest for the shot.',
    effect: 'Stump Blinds ×2 · +6% of each flock per shot', fx: { mult: 2, shot: 0.06 },
  },
  treeStand: {
    id: 'treeStand', job: 'tShoot', bot: 'tBlind', ...W3, owned: 30, counter: 'timberBirds', count: 100_000,
    name: 'Tree Stand', blurb: 'A little platform up in a cypress, out of sight of ducks coming in low.',
    effect: 'Stump Blinds ×3 · called flocks stay 50% longer', fx: { mult: 3, committedPatience: 1.5 },
  },
  snorkelPack: {
    id: 'snorkelPack', job: 'tRetrieve', bot: 'tPup', ...W2, owned: 12, counter: 'timberBirds', count: 10_000,
    name: 'Snorkel Pack', blurb: 'The Timber Pups learn to work as a pack, one nose up and the rest fetching.',
    effect: 'Timber Pups ×2', fx: { mult: 2 },
  },
  pirogue: {
    id: 'pirogue', job: 'tRetrieve', bot: 'tPup', ...W3, owned: 35, counter: 'timberBirds', count: 110_000,
    name: 'Pirogue', blurb: 'A long, narrow cypress boat the pups paddle between the trunks, loaded to the gunwales.',
    effect: 'Timber Pups ×3', fx: { mult: 3 },
  },
  foghornCall: {
    id: 'foghornCall', job: 'bCall', bot: 'bCaller', ...B2, counter: 'bayBirds', count: 5_000,
    name: 'Foghorn Call', blurb: 'A deep brass call that carries over the swell. Rafts of sea ducks turn to look.',
    effect: 'Sea Callers ×2 · sea ducks circle 40% longer', fx: { mult: 2, patience: 1.4 },
  },
  raftCaller: {
    id: 'raftCaller', job: 'bCall', bot: 'bCaller', ...B3, counter: 'bayBirds', count: 60_000,
    name: 'Raft Caller', blurb: 'A caller that sounds like a whole raft of eiders feeding. Rare birds come in close.',
    effect: 'Sea Callers ×3 · rare birds ×1.5', fx: { mult: 3, rare: 1.5 },
  },
  layoutBoat: {
    id: 'layoutBoat', job: 'bShoot', bot: 'bBlind', ...B2, counter: 'bayBirds', count: 5_500,
    name: 'Layout Boat', blurb: 'A low, flat boat painted like the sea. Ducks don\'t see it until it\'s too late.',
    effect: 'Boat Blinds ×2 · +6% of each flock per shot', fx: { mult: 2, shot: 0.06 },
  },
  sneakBoat: {
    id: 'sneakBoat', job: 'bShoot', bot: 'bBlind', ...B3, counter: 'bayBirds', count: 66_000,
    name: 'Sneak Boat', blurb: 'A brushed-in boat that drifts right up to the rig.',
    effect: 'Boat Blinds ×3 · called flocks stay 50% longer', fx: { mult: 3, committedPatience: 1.5 },
  },
  tenderLine: {
    id: 'tenderLine', job: 'bRetrieve', bot: 'bPup', ...B2, owned: 12, counter: 'bayBirds', count: 6_000,
    name: 'Tender Line', blurb: 'The Pickup Skiffs run on a line from the rig, so nobody loses the way in the chop.',
    effect: 'Pickup Skiffs ×2', fx: { mult: 2 },
  },
  harborTender: {
    id: 'harborTender', job: 'bRetrieve', bot: 'bPup', ...B3, owned: 30, counter: 'bayBirds', count: 72_000,
    name: 'Harbor Tender', blurb: 'A proper tender with a winch and a warm cabin. The skiffs unload straight onto it.',
    effect: 'Pickup Skiffs ×3', fx: { mult: 3 },
  },
};

export const RUNG_ORDER: readonly RungId[] = [
  'spinningWing', 'decoySkiff', 'floatingRig',
  'duetCallers', 'longCall', 'lureMaster',
  'steadyBlind', 'twinBlinds', 'marksman',
  'kennelPack', 'retrieverSkiff', 'retrieverBoat',
  'frontDesk', 'guestWing', 'lookoutTower',
  'silhouetteSpread', 'fullBodyFleet', 'kiteFlag', 'honkerChorus', 'stubbleBlinds', 'pitBlind', 'fieldKennel', 'muleCart',
  'woodDuckWhistle', 'cypressChorus', 'stumpRest', 'treeStand', 'snorkelPack', 'pirogue',
  'foghornCall', 'raftCaller', 'layoutBoat', 'sneakBoat', 'tenderLine', 'harborTender',
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
  wigeon: [{ upgrade: 'celeryBeds' }],
  ringNeck: [{ upgrade: 'celeryBeds' }],
  pintail: [{ crop: ['rice', 'milo'] }],
  blackDuck: [{ upgrade: 'timber' }],
  redhead: [{ upgrade: 'deepPool' }],
  canvasback: [{ upgrade: 'deepPool' }, { upgrade: 'celeryBeds' }],
  scaup: [{ rung: 'decoySkiff' }],
  bufflehead: [{ rung: 'decoySkiff' }],
  hoodedMerganser: [{ upgrade: 'timber' }],
  cinnamonTeal: [{ crop: ['rice', 'milo'] }, { flyway: ['central', 'pacific'] }],
  eurasianWigeon: [{ upgrade: 'celeryBeds' }, { flyway: ['pacific'] }],
  longtail: [{ upgrade: 'kelpLine' }],
  harlequin: [{ upgrade: 'kelpLine' }],
  kingEider: [{ upgrade: 'breakwater' }],
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
  blackBelliedWhistler: [{ crop: ['rice', 'milo'] }, { flyway: ['mississippi', 'central'] }],
  fulvousWhistler: [{ crop: ['rice'] }],
  barrowsGoldeneye: [{ rung: 'decoySkiff' }, { flyway: ['pacific'] }],
  whiteWingedScoter: [{ upgrade: 'musselBeds' }],
  blackScoter: [{ upgrade: 'musselBeds' }],
  commonEider: [{ upgrade: 'musselBeds' }],
  tuftedDuck: [{ upgrade: 'breakwater' }, { flyway: ['pacific', 'atlantic'] }],
  spectacledEider: [{ upgrade: 'breakwater' }, { flyway: ['pacific'] }],
  stellersEider: [{ upgrade: 'breakwater' }, { flyway: ['pacific'] }],
  tundraSwan: [{ upgrade: 'roostPond' }, { upgrade: 'winterWheat' }],
  barnacleGoose: [{ rung: 'honkerChorus' }, { flyway: ['atlantic'] }],
  pinkFootedGoose: [{ upgrade: 'winterWheat' }, { flyway: ['atlantic'] }],
};
