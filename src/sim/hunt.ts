import { ACRES, BOTS, HUNT, LEDGER, PIPELINE_JOBS, SCOUT, TINKER, BOT_ORDER, type HuntStage, type JobId } from '../data/economy';
import { birdValue, botReliability, flockDraw, spreadSize } from './economy';
import type { ActionSource, EventSink } from './events';
import { jobRate, pickWorker } from './jobs';
import { advanceMetrics, recordJob } from './metrics';
import { raiseProblem, stepForemen } from './problems';
import { rand, type GameState } from './state';

/**
 * The hunt pipeline: Scout → Set Decoys → Call → Shoot → Retrieve → Log.
 * Each action is a pure state transition used by taps, Gus, and bots.
 */

type ActionJob = HuntStage | 'scout';

export function canDo(state: GameState, job: ActionJob): boolean {
  const h = state.hunt;
  switch (job) {
    case 'scout':
      return h.incoming.length < HUNT.maxIncoming;
    case 'decoys':
      return h.decoys < spreadSize(state);
    case 'call':
      return h.incoming.length > 0 && h.committed.length < HUNT.maxCommitted;
    case 'shoot':
      return h.committed.length > 0;
    case 'retrieve':
      return h.downed.length > 0;
    case 'log':
      return h.ledger.length > 0;
  }
}

export function doAction(state: GameState, job: ActionJob, source: ActionSource | 'keeper', events: EventSink): boolean {
  if (!canDo(state, job)) return false;
  if (source === 'manual') state.stats.manualActions += 1;
  const h = state.hunt;
  const src = source === 'keeper' ? 'manual' : source;
  switch (job) {
    case 'scout': {
      h.flockCountdown -= SCOUT.spotPower;
      events.push({ type: 'scouted', source: src });
      break;
    }
    case 'decoys': {
      h.decoys += 1;
      events.push({ type: 'decoySet', decoys: h.decoys, source: src });
      break;
    }
    case 'call': {
      const flock = h.incoming.shift()!;
      flock.age = 0;
      h.committed.push(flock);
      state.stats.flocksCalled += 1;
      events.push({ type: 'flockCalled', flockId: flock.id, source: src });
      break;
    }
    case 'shoot': {
      const flock = h.committed.shift()!;
      const room = HUNT.maxDowned - h.downed.length;
      const downed = Math.max(0, Math.min(room, Math.max(1, Math.ceil(flock.size * HUNT.shotFraction))));
      for (let i = 0; i < downed; i++) h.downed.push(flock.species);
      state.stats.shots += 1;
      events.push({ type: 'shot', flockId: flock.id, downed, source: src });
      break;
    }
    case 'retrieve': {
      const species = h.downed.shift()!;
      const v = birdValue(state, species);
      state.currencies.feathers = state.currencies.feathers.add(v.feathers);
      state.stats.lifetimeFeathers = state.stats.lifetimeFeathers.add(v.feathers);
      state.stats.lifetimeBirds += 1;
      h.bag += 1;
      h.ledger.push(species);
      events.push({ type: 'retrieved', species, feathers: v.feathers, source: src });
      break;
    }
    case 'log': {
      const species = h.ledger.shift()!;
      const v = birdValue(state, species);
      state.currencies.coins = state.currencies.coins.add(v.coins);
      state.stats.lifetimeCoins = state.stats.lifetimeCoins.add(v.coins);
      state.stats.lifetimeLogged += 1;
      events.push({ type: 'logged', species, coins: v.coins, source });
      break;
    }
  }
  recordJob(state, job, true);
  return true;
}

/** Advance arrivals, patience, decoy drift, Gus, bots and foremen by dt seconds. */
export function stepHunt(state: GameState, dt: number, activity: number, events: EventSink): void {
  const h = state.hunt;
  advanceMetrics(state);

  // Decoys slowly drift loose, faster in wind.
  if (h.decoys > 0) {
    h.decoyDrift += (dt * (1 + state.environment.wind * HUNT.decoyDriftWind)) / HUNT.decoyDriftSeconds;
    if (h.decoyDrift >= 1) {
      h.decoyDrift -= 1;
      h.decoys -= 1;
      events.push({ type: 'decoyDrift', decoys: h.decoys });
    }
  } else {
    h.decoyDrift = 0;
  }

  // Flock arrivals: an exponential countdown scaled by draw × activity.
  h.flockCountdown -= dt * flockDraw(state) * activity;
  while (h.flockCountdown <= 0) {
    h.flockCountdown += Math.min(2.5, Math.max(0.3, -Math.log(1 - rand(state) * 0.999)));
    const extra = ACRES.flockSizePerAcre * (state.acres - ACRES.start);
    const size = Math.round(HUNT.flockSizeMin + rand(state) * (HUNT.flockSizeMax - HUNT.flockSizeMin + extra));
    if (h.incoming.length < HUNT.maxIncoming) {
      const flock = { id: h.nextFlockId++, species: 'mallard' as const, size, age: 0 };
      h.incoming.push(flock);
      events.push({ type: 'flockArrived', flockId: flock.id, size, species: flock.species });
    } else {
      state.stats.lostToday += 1;
      events.push({ type: 'flockPassed', size });
    }
  }

  // Patience: circling flocks move on; called flocks flare off.
  for (const f of h.incoming) f.age += dt;
  for (const f of h.committed) f.age += dt;
  while (h.incoming.length > 0 && h.incoming[0]!.age > HUNT.incomingPatience) {
    state.stats.lostToday += 1;
    events.push({ type: 'flockLeft', flockId: h.incoming.shift()!.id });
  }
  while (h.committed.length > 0 && h.committed[0]!.age > HUNT.committedPatience) {
    state.stats.flocksFlared += 1;
    state.stats.lostToday += 1;
    events.push({ type: 'flockFlared', flockId: h.committed.shift()!.id });
  }

  // Gus keeps the ledger himself at a gentle pace.
  h.keeperProgress = Math.min(1, h.keeperProgress + LEDGER.keeperRate * dt);
  if (h.keeperProgress >= 1 && doAction(state, 'log', 'keeper', events)) h.keeperProgress -= 1;

  // Bots: downstream jobs first so the pipeline drains toward the lodge.
  for (let i = PIPELINE_JOBS.length - 1; i >= 0; i--) runJob(state, PIPELINE_JOBS[i]!, dt, events);

  stepForemen(state, events);
  stepTinkers(state, dt, events);
}

/** Problem chance is softened by Tinker Bots on duty. */
function problemChance(state: GameState, bot: (typeof BOT_ORDER)[number]): number {
  const base = 1 - botReliability(bot, state.bots[bot].level);
  return base / (1 + TINKER.reliabilityPerRate * jobRate(state, 'tinker'));
}

function runJob(state: GameState, job: JobId, dt: number, events: EventSink): void {
  const rate = jobRate(state, job);
  const j = state.jobs[job];
  if (rate <= 0) {
    j.progress = 0;
    return;
  }
  j.progress += rate * dt;
  while (j.progress >= 1) {
    if (!canDo(state, job as ActionJob)) {
      // Nothing to do: idle bots don't bank more than one ready action.
      j.progress = 1;
      return;
    }
    j.progress -= 1;
    const bot = pickWorker(state, job, rand(state));
    if (!bot) return;
    if (rand(state) < problemChance(state, bot) && raiseProblem(state, bot, job, events)) {
      recordJob(state, job, false);
      continue;
    }
    doAction(state, job as ActionJob, bot, events);
  }
}

/** Tinkers bank work and hand out free tune-ups to the lowest-level crew. */
function stepTinkers(state: GameState, dt: number, events: EventSink): void {
  const rate = jobRate(state, 'tinker');
  if (rate <= 0) return;
  state.tinkerWork += rate * dt;
  let target: (typeof BOT_ORDER)[number] | null = null;
  for (const id of BOT_ORDER) {
    if (id === 'tinker' || state.bots[id].owned === 0) continue;
    if (!target || state.bots[id].level < state.bots[target].level) target = id;
  }
  if (!target) return;
  const need = TINKER.workPerLevel * state.bots[target].level;
  if (state.tinkerWork >= need) {
    state.tinkerWork -= need;
    state.bots[target].level += 1;
    recordJob(state, 'tinker', true);
    events.push({ type: 'botLevel', bot: target, level: state.bots[target].level, by: 'tinker' });
  }
}

/** Is this bot type's home job one of the hunt stages? (for UI labels) */
export function homeJob(bot: (typeof BOT_ORDER)[number]): JobId {
  return BOTS[bot].job;
}
