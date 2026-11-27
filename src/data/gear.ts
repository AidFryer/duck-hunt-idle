/**
 * Crew gear: cheap, many-level buys between the big ones. Each level adds a
 * little; gear starts over each season, like upgrades.
 */
export type GearId = 'shells' | 'calls' | 'vests' | 'blindPaint' | 'decoyPaint' | 'ink' | 'lantern' | 'featherBags';

export interface GearDef {
  id: GearId;
  name: string;
  /** What one level does, in plain words. */
  per: string;
  /** Lodge level that puts it on the shelf. */
  lodge: number;
  coins: number;
  feathers: number;
  /** Effect per level (as a fraction, e.g. 0.03 = +3%). */
  step: number;
}

export const GEAR_GROWTH = 1.32;
export const GEAR_MAX = 25;

export const GEAR: Record<GearId, GearDef> = {
  shells: { id: 'shells', name: 'Better Shells', per: '+1% birds per shot', lodge: 1, coins: 40, feathers: 4, step: 0.01 },
  calls: { id: 'calls', name: 'Duck Calls', per: 'Callers +2% faster', lodge: 1, coins: 60, feathers: 6, step: 0.02 },
  vests: { id: 'vests', name: 'Dog Vests', per: 'Fetching +2% faster', lodge: 2, coins: 800, feathers: 80, step: 0.02 },
  blindPaint: { id: 'blindPaint', name: 'Blind Paint', per: 'Flocks wait +2% longer', lodge: 2, coins: 1_200, feathers: 100, step: 0.02 },
  ink: { id: 'ink', name: 'Ledger Ink', per: 'Logging +3% faster', lodge: 3, coins: 15_000, feathers: 1_200, step: 0.03 },
  decoyPaint: { id: 'decoyPaint', name: 'Decoy Paint', per: '+1.5% flocks on every ground', lodge: 3, coins: 20_000, feathers: 1_500, step: 0.015 },
  lantern: { id: 'lantern', name: 'Lantern Oil', per: '+1% coins per bird', lodge: 4, coins: 300_000, feathers: 25_000, step: 0.01 },
  featherBags: { id: 'featherBags', name: 'Feather Bags', per: '+2% feathers per bird', lodge: 4, coins: 250_000, feathers: 20_000, step: 0.02 },
};

export const GEAR_ORDER: readonly GearId[] = ['shells', 'calls', 'vests', 'blindPaint', 'ink', 'decoyPaint', 'lantern', 'featherBags'];
