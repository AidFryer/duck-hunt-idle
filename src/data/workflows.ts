/** Workflow chain editor: node cards, placement rules and bonuses. */
import type { JobId } from './economy';

export type JobNode = Extract<JobId, 'scout' | 'decoys' | 'call' | 'shoot' | 'retrieve' | 'log'>;
export type SpecialNode = 'fogBonus' | 'rareFilter' | 'doubleCheck' | 'dawnRush' | 'coldPrep';
export type NodeKind = JobNode | SpecialNode;

/** The canonical order of the hunt. */
export const JOB_NODE_ORDER: readonly JobNode[] = ['scout', 'decoys', 'call', 'shoot', 'retrieve', 'log'];
/** Jobs a complete chain must include, in order (decoys are optional). */
export const REQUIRED_CHAIN: readonly JobNode[] = ['scout', 'call', 'shoot', 'retrieve', 'log'];

export interface SpecialDef {
  id: SpecialNode;
  name: string;
  desc: string;
  /** Must come straight after one of these job nodes (any job if empty). */
  after: readonly JobNode[];
  /** Lifetime coins needed to unlock this card. */
  unlockCoins: number;
  /** Seasons closed needed to unlock this card. */
  unlockSeasons: number;
}

export const SPECIALS: Record<SpecialNode, SpecialDef> = {
  fogBonus: {
    id: 'fogBonus', name: 'Fog Bonus', desc: 'Flocks come 50% more often in fog.', after: ['scout'],
    unlockCoins: 0, unlockSeasons: 0,
  },
  rareFilter: {
    id: 'rareFilter', name: 'Rare Species Filter', desc: 'Rare birds twice as likely, but 10% fewer flocks.', after: ['call'],
    unlockCoins: 20_000, unlockSeasons: 0,
  },
  doubleCheck: {
    id: 'doubleCheck', name: 'Double Check', desc: 'Halves problems at the job right before it.', after: [],
    unlockCoins: 50_000, unlockSeasons: 0,
  },
  dawnRush: {
    id: 'dawnRush', name: 'Dawn Rush', desc: 'Bots work 30% faster during the golden sunrise.', after: ['decoys', 'call'],
    unlockCoins: 0, unlockSeasons: 1,
  },
  coldPrep: {
    id: 'coldPrep', name: 'Cold Snap Prep', desc: 'No icy calls, and +1 bird per flock in cold fronts.', after: ['decoys'],
    unlockCoins: 0, unlockSeasons: 1,
  },
};

export const SPECIAL_ORDER: readonly SpecialNode[] = ['fogBonus', 'rareFilter', 'doubleCheck', 'dawnRush', 'coldPrep'];

export const WORKFLOW = {
  /** Lifetime coins before the Workflows tab opens. */
  unlockCoins: 25_000,
  /** Bonus to every hunt job per correctly ordered link. */
  perLink: 0.04,
  /** Extra bonus for a complete Scout → … → Log chain. */
  complete: 0.2,
  /** Extra for including Decoys in the right place. */
  decoys: 0.05,
  /** Extra per working special card inside a complete chain. */
  perSpecial: 0.03,
  fogFlockRate: 1.5,
  rareMult: 2,
  rareFlockRate: 0.9,
  doubleCheckProblems: 0.5,
  dawnSpeed: 0.3,
  coldFlockSize: 1,
} as const;

export const NODE_NAMES: Record<JobNode, string> = {
  scout: 'Scout', decoys: 'Set Decoys', call: 'Call', shoot: 'Shoot', retrieve: 'Retrieve', log: 'Log',
};
