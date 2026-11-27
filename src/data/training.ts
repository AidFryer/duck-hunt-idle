/**
 * Crew Training: drills and skills for the crew, bought with feathers and
 * coins. Replaces the old rope-and-cards workflow board. Skills are kept for
 * good (across seasons); drills (bot levels) are per season.
 */
import type { JobId } from './economy';

export type BranchId = 'teamwork' | 'callers' | 'blinds' | 'retrievers' | 'ledger' | 'field';
export type TrainingId =
  | 'tOrder' | 'tSignals' | 'tClockwork' | 'tOneCrew'
  | 'cDuet' | 'cFog' | 'cDawn' | 'cRare'
  | 'bSteady' | 'bCold' | 'bQuick'
  | 'rDrill' | 'rCheck' | 'rRelay'
  | 'lNeat' | 'lAudit'
  | 'fFlag' | 'fHide' | 'fTalk';

export interface TrainingFx {
  /** × speed of every hunt job. */
  speed?: number;
  /** × speed of particular jobs. */
  job?: Partial<Record<JobId, number>>;
  /** × flock arrivals in fog. */
  fog?: number;
  /** × chance of rare birds. */
  rare?: number;
  /** + bot speed during the golden sunrise (0.3 = +30%). */
  dawn?: number;
  /** + birds per flock in a cold front. */
  cold?: number;
  /** No icy-call snags in a cold front. */
  noIce?: boolean;
  /** × snag chance at particular jobs. */
  problems?: Partial<Record<JobId, number>>;
}

export interface TrainingDef {
  id: TrainingId;
  branch: BranchId;
  name: string;
  desc: string;
  /** Lodge level needed. */
  lodge: number;
  requires?: TrainingId;
  coins: number;
  feathers: number;
  fx: TrainingFx;
}

export const BRANCHES: Record<BranchId, { name: string; blurb: string }> = {
  teamwork: { name: 'Teamwork', blurb: 'The whole crew learns the order of the hunt.' },
  callers: { name: 'Callers', blurb: 'Better calling brings more birds, and rarer ones.' },
  blinds: { name: 'Blinds', blurb: 'Steadier shooting, in any weather.' },
  retrievers: { name: 'Retrievers', blurb: 'Faster fetching and fewer lost birds.' },
  ledger: { name: 'Ledger', blurb: 'Neater books on the porch.' },
  field: { name: 'Goose crew', blurb: 'Drills for the field: flagging, hiding and calling geese.' },
};

const T = {
  2: { coins: 400, feathers: 80 },
  3: { coins: 15_000, feathers: 2_500 },
  4: { coins: 500_000, feathers: 60_000 },
  5: { coins: 25_000_000, feathers: 1_500_000 },
} as const;
const at = (lodge: 2 | 3 | 4 | 5, k = 1) => ({ lodge, coins: T[lodge].coins * k, feathers: T[lodge].feathers * k });

export const TRAINING: Record<TrainingId, TrainingDef> = {
  tOrder: { id: 'tOrder', branch: 'teamwork', name: 'Know the Order', desc: 'Every hunt job +8% faster.', ...at(2), fx: { speed: 1.08 } },
  tSignals: { id: 'tSignals', branch: 'teamwork', name: 'Hand Signals', desc: 'Every hunt job +10% faster.', requires: 'tOrder', ...at(3), fx: { speed: 1.1 } },
  tClockwork: { id: 'tClockwork', branch: 'teamwork', name: 'Like Clockwork', desc: 'Every hunt job +12% faster.', requires: 'tSignals', ...at(4), fx: { speed: 1.12 } },
  tOneCrew: { id: 'tOneCrew', branch: 'teamwork', name: 'One Crew', desc: 'Every hunt job +15% faster.', requires: 'tClockwork', ...at(5), fx: { speed: 1.15 } },

  cDuet: { id: 'cDuet', branch: 'callers', name: 'Calling Drills', desc: 'Callers +20% faster.', ...at(2, 1.2), fx: { job: { call: 1.2 } } },
  cFog: { id: 'cFog', branch: 'callers', name: 'Fog Calling', desc: 'Flocks come 50% more often in fog.', requires: 'cDuet', ...at(3), fx: { fog: 1.5 } },
  cDawn: { id: 'cDawn', branch: 'callers', name: 'Dawn Chorus', desc: 'Bots work 30% faster during the golden sunrise.', requires: 'cFog', ...at(4), fx: { dawn: 0.3 } },
  cRare: { id: 'cRare', branch: 'callers', name: 'Soft Chuckle', desc: 'Rare birds 60% more likely.', requires: 'cDawn', ...at(5), fx: { rare: 1.6 } },

  bSteady: { id: 'bSteady', branch: 'blinds', name: 'Steady Hands', desc: 'Half as many snags in the blind.', ...at(2, 1.4), fx: { problems: { shoot: 0.5, fShoot: 0.5 } } },
  bCold: { id: 'bCold', branch: 'blinds', name: 'Cold Snap Prep', desc: 'No icy calls, and +1 bird per flock in cold fronts.', requires: 'bSteady', ...at(3, 1.2), fx: { noIce: true, cold: 1 } },
  bQuick: { id: 'bQuick', branch: 'blinds', name: 'Quick Shouldering', desc: 'Blind Bots +25% faster.', requires: 'bCold', ...at(4), fx: { job: { shoot: 1.25 } } },

  rDrill: { id: 'rDrill', branch: 'retrievers', name: 'Water Drills', desc: 'Retrievers +20% faster.', ...at(2, 1.6), fx: { job: { retrieve: 1.2 } } },
  rCheck: { id: 'rCheck', branch: 'retrievers', name: 'Double Check', desc: 'Half as many lost birds and tangled pups.', requires: 'rDrill', ...at(3, 1.4), fx: { problems: { retrieve: 0.5, fRetrieve: 0.5 } } },
  rRelay: { id: 'rRelay', branch: 'retrievers', name: 'Relay Swims', desc: 'Retrievers +25% faster.', requires: 'rCheck', ...at(4, 1.2), fx: { job: { retrieve: 1.25 } } },

  lNeat: { id: 'lNeat', branch: 'ledger', name: 'Neat Hand', desc: 'Ledger Bots +25% faster.', ...at(3, 1.6), fx: { job: { log: 1.25 } } },
  lAudit: { id: 'lAudit', branch: 'ledger', name: 'Careful Audit', desc: 'Half as many ink blots and lost pages.', requires: 'lNeat', ...at(4, 1.4), fx: { problems: { log: 0.5 } } },

  fFlag: { id: 'fFlag', branch: 'field', name: 'Flag Drills', desc: 'Flaggers +25% faster.', ...at(4, 1.6), fx: { job: { flag: 1.25 } } },
  fHide: { id: 'fHide', branch: 'field', name: 'Hide Drills', desc: 'Layout Bots +25% and Field Pups +20% faster.', requires: 'fFlag', ...at(4, 2.5), fx: { job: { fShoot: 1.25, fRetrieve: 1.2 } } },
  fTalk: { id: 'fTalk', branch: 'field', name: 'Goose Talk', desc: 'Flaggers +30% faster.', requires: 'fHide', ...at(5), fx: { job: { flag: 1.3 } } },
};

export const BRANCH_ORDER: readonly BranchId[] = ['teamwork', 'callers', 'blinds', 'retrievers', 'ledger', 'field'];
export const TRAINING_ORDER = Object.keys(TRAINING) as TrainingId[];

// ---------------------------------------------------------------- your retriever

/** Hand fetches and feathers to reach each dog level (index = level reached). */
export const DOG_LEVELS: readonly { fetches: number; feathers: number }[] = [
  { fetches: 0, feathers: 0 },
  { fetches: 0, feathers: 0 },
  { fetches: 60, feathers: 60 },
  { fetches: 200, feathers: 400 },
  { fetches: 500, feathers: 2_500 },
  { fetches: 1_100, feathers: 15_000 },
  { fetches: 2_200, feathers: 80_000 },
  { fetches: 4_000, feathers: 350_000 },
  { fetches: 7_000, feathers: 1_200_000 },
  { fetches: 11_000, feathers: 4_000_000 },
  { fetches: 16_000, feathers: 12_000_000 },
];
export const DOG_MAX = DOG_LEVELS.length - 1;

export interface DogSkill {
  level: number;
  name: string;
  desc: string;
}

export const DOG_SKILLS: readonly DogSkill[] = [
  { level: 2, name: 'Fetch Two', desc: 'Brings back two birds every time you send her.' },
  { level: 4, name: 'Nose for Gold', desc: 'Golden flocks pay 25% more.' },
  { level: 6, name: 'Swims on Her Own', desc: 'Fetches birds by herself when you\'re not sending her.' },
  { level: 8, name: 'Soft Mouth', desc: 'Every bird is worth 15% more feathers.' },
  { level: 10, name: 'Champion', desc: 'Teaches the robo-pups: every retriever bot +20% faster.' },
];

export const DOG_FX = {
  fetchTwoLevel: 2,
  goldLevel: 4,
  goldMult: 1.25,
  swimLevel: 6,
  /** Birds per second she fetches on her own. */
  swimRate: 0.5,
  softMouthLevel: 8,
  softMouthFeathers: 1.15,
  championLevel: 10,
  championRetrieve: 1.2,
} as const;
