import { ACRES, BOTS, GROUND_ORDER, SCOUT, type BotId, type GroundId, type JobId } from '../data/economy';
import { FLYWAYS } from '../data/flyways';
import type { UpgradeId } from '../data/upgrades';
import { extraFlockSize, flockDraw, GROUND_PARAMS, groundOpen, shotFraction } from './economy';
import { jobRate } from './jobs';
import type { GameState } from './state';

/** A typical hour's duck activity (the day's average, roughly). */
const TYPICAL_ACTIVITY = 0.6;

const JOBS: Record<GroundId, { call: JobId; shoot: JobId; fetch: JobId } | { crew: JobId }> = {
  marsh: { call: 'call', shoot: 'shoot', fetch: 'retrieve' },
  field: { call: 'flag', shoot: 'fShoot', fetch: 'fRetrieve' },
  timber: { crew: 'tHunt' },
  bay: { crew: 'bHunt' },
};

/** Birds a ground brings in per minute: the slowest of flock supply, calling, shooting and fetching. */
export function groundBirdsPerMinute(state: GameState, g: GroundId): { birds: number; limit: 'flocks' | 'call' | 'shoot' | 'fetch' | 'crew' } {
  if (!groundOpen(state, g)) return { birds: 0, limit: 'flocks' };
  const P = GROUND_PARAMS[g];
  const scouts = g === 'marsh' ? jobRate(state, 'scout') * SCOUT.spotPower * FLYWAYS[state.flyway].scoutPower : 0;
  const supply = flockDraw(state, g) * TYPICAL_ACTIVITY + scouts;
  const extra = (g === 'marsh' ? ACRES.flockSizePerAcre * (state.acres - ACRES.start) : 0) + extraFlockSize(state, g);
  const size = P.flockSizeMin + (P.flockSizeMax - P.flockSizeMin + extra) / 2;
  const perShot = Math.max(1, Math.ceil(size * shotFraction(state, g)));
  const j = JOBS[g];
  if ('crew' in j) {
    // One crew calls, shoots and fetches each bird itself.
    const crewFlocks = jobRate(state, j.crew) / (2 + perShot);
    const flocks = Math.min(supply, crewFlocks);
    return { birds: flocks * perShot * 60, limit: crewFlocks < supply ? 'crew' : 'flocks' };
  }
  const call = jobRate(state, j.call);
  const shoot = jobRate(state, j.shoot);
  const flocks = Math.min(supply, call, shoot);
  const fetch = jobRate(state, j.fetch);
  const birds = Math.min(flocks * perShot, fetch);
  const limit = birds < flocks * perShot ? 'fetch' : flocks === supply ? 'flocks' : flocks === call ? 'call' : 'shoot';
  return { birds: birds * 60, limit };
}

export function birdsPerMinute(state: GameState): number {
  let n = 0;
  for (const g of GROUND_ORDER) n += groundBirdsPerMinute(state, g).birds;
  return n;
}

/**
 * The estimate leaves out some of the hunt's fine detail, so gains are scaled
 * by how the real, measured birds a minute compare with it.
 */
let scale = 1;

/** Measure once per HUD update: real birds a minute vs the estimate. Returns the real figure. */
export function calibrate(state: GameState): number {
  const est = birdsPerMinute(state);
  const real = state.volley.birdsRate * 60;
  scale = est > 1 && real > 0 ? Math.min(2, Math.max(0.02, real / est)) : 1;
  return real > 0 ? real : est;
}

/** How many more birds a minute a change would bring (the change is undone after). */
function gainFrom(state: GameState, change: () => () => void): number {
  const before = birdsPerMinute(state);
  const undo = change();
  const after = birdsPerMinute(state);
  undo();
  return Math.max(0, after - before) * scale;
}

export function botGain(state: GameState, bot: BotId): number {
  const home = BOTS[bot].job;
  return gainFrom(state, () => {
    state.bots[bot].owned += 1;
    state.assign[bot][home] = (state.assign[bot][home] ?? 0) + 1;
    return () => {
      state.bots[bot].owned -= 1;
      state.assign[bot][home] = (state.assign[bot][home] ?? 1) - 1;
    };
  });
}

export function decoyGain(state: GameState, g: GroundId): number {
  return gainFrom(state, () => {
    state.decoyBags[g] = (state.decoyBags[g] ?? 0) + 1;
    return () => {
      state.decoyBags[g] = (state.decoyBags[g] ?? 1) - 1;
    };
  });
}

export function standGain(state: GameState): number {
  return gainFrom(state, () => {
    state.stands += 1;
    return () => {
      state.stands -= 1;
    };
  });
}

export function acreGain(state: GameState): number {
  return gainFrom(state, () => {
    state.acres += 1;
    return () => {
      state.acres -= 1;
    };
  });
}

export function upgradeGain(state: GameState, u: UpgradeId): number {
  return gainFrom(state, () => {
    state.upgrades[u] = (state.upgrades[u] ?? 0) + 1;
    return () => {
      state.upgrades[u] = (state.upgrades[u] ?? 1) - 1;
    };
  });
}
