import { ACRES, BOTS, HUNT, LEDGER, PIPELINE_JOBS, SCOUT, STREAK, TINKER, BOT_ORDER, type HuntStage, type JobId } from '../data/economy';
import { DISCOVERY, SPECIES, type SpeciesId } from '../data/species';
import { WEATHER } from '../data/weather';
import { checkAchievements, checkUnlocks } from './achievements';
import { clockAt } from './clock';
import { birdValue, botReliability, extraFlockSize, flockDraw, incomingPatience, maxIncoming, shotFraction, spreadSize } from './economy';
import { FLYWAYS } from '../data/flyways';
import { workflowEval } from './workflow';
import { pickSpecies } from './species';
import type { ActionSource, EventSink } from './events';
import { pickFrom, rateTable, type RateTable } from './jobs';
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
      return h.incoming.length < maxIncoming(state);
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

/**
 * Do one hunt action. `targetId` picks a specific flock for call/shoot
 * (the one the player tapped); otherwise the one that's waited longest.
 */
export function doAction(state: GameState, job: ActionJob, source: ActionSource | 'keeper', events: EventSink, targetId?: number): boolean {
  if (!canDo(state, job)) return false;
  if (source === 'manual') {
    state.stats.manualActions += 1;
    state.stats.manualByJob[job] = (state.stats.manualByJob[job] ?? 0) + 1;
    bumpStreak(state, events);
  }
  const h = state.hunt;
  const src = source === 'keeper' ? 'manual' : source;
  switch (job) {
    case 'scout': {
      h.flockCountdown = Math.max(-maxIncoming(state), h.flockCountdown - SCOUT.spotPower * FLYWAYS[state.flyway].scoutPower);
      events.push({ type: 'scouted', source: src });
      break;
    }
    case 'decoys': {
      h.decoys += 1;
      events.push({ type: 'decoySet', decoys: h.decoys, source: src });
      break;
    }
    case 'call': {
      const idx = targetId !== undefined ? Math.max(0, h.incoming.findIndex((f) => f.id === targetId)) : 0;
      const flock = h.incoming.splice(idx, 1)[0]!;
      flock.age = 0;
      h.committed.push(flock);
      state.stats.flocksCalled += 1;
      events.push({ type: 'flockCalled', flockId: flock.id, source: src });
      break;
    }
    case 'shoot': {
      const idx = targetId !== undefined ? Math.max(0, h.committed.findIndex((f) => f.id === targetId)) : 0;
      const flock = h.committed.splice(idx, 1)[0]!;
      const room = HUNT.maxDowned - h.downed.length;
      const downed = Math.max(0, Math.min(room, Math.max(1, Math.ceil(flock.size * shotFraction(state)))));
      for (let i = 0; i < downed; i++) h.downed.push(flock.species);
      state.stats.shots += 1;
      events.push({ type: 'shot', flockId: flock.id, downed, source: src });
      break;
    }
    case 'retrieve':
    case 'log': {
      const species = job === 'retrieve' ? h.downed[0] : undefined;
      doMany(state, job, 1, source, events);
      // Hunter's Rhythm pays a bonus on birds you fetch by hand.
      if (source === 'manual' && species && h.streak > 1) {
        const bonus = Math.round(birdValue(state, species).coins * STREAK.bonusPerLevel * h.streak * 100) / 100;
        state.currencies.coins = state.currencies.coins.add(bonus);
        state.stats.lifetimeCoins = state.stats.lifetimeCoins.add(bonus);
        state.season.coins = state.season.coins.add(bonus);
        events.push({ type: 'streak', level: h.streak, bonus });
      }
      return true;
    }
  }
  recordJob(state, job, true);
  return true;
}

/**
 * A first-of-its-kind bird pays a finder's bonus (the starter mallard
 * doesn't). It's a reward, so it doesn't count toward unlocks or stars.
 */
function discoveryReward(state: GameState, species: SpeciesId): { coins: number; feathers: number } {
  if (species === 'mallard') return { coins: 0, feathers: 0 };
  const d = SPECIES[species];
  const k = DISCOVERY.birds * DISCOVERY.rarity[d.rarity];
  const coins = Math.round(d.coins * k);
  const feathers = Math.round(d.feathers * k * 0.5);
  state.currencies.coins = state.currencies.coins.add(coins);
  state.currencies.feathers = state.currencies.feathers.add(feathers);
  return { coins, feathers };
}

/** Manual actions in quick succession build the streak; a pause resets it. */
function bumpStreak(state: GameState, events: EventSink): void {
  const h = state.hunt;
  const quick = state.elapsed - h.lastManualAt <= STREAK.window;
  const before = h.streak;
  h.streak = quick ? Math.min(STREAK.max, h.streak + 1) : 1;
  h.lastManualAt = state.elapsed;
  if (h.streak > before && h.streak > 1) events.push({ type: 'streak', level: h.streak, bonus: 0 });
}

/** Let the streak fade once the player stops tapping. */
export function decayStreak(state: GameState): void {
  const h = state.hunt;
  if (h.streak > 0 && state.elapsed - h.lastManualAt > STREAK.window) h.streak = 0;
}

/** Most per-action events emitted for one batch; the rest are summed into one. */
const EVENT_CAP = 3;

/**
 * Retrieve or log up to `count` birds at once (bots at high speed, offline
 * catch-up). Returns how many were done. Emits individual events for the
 * first few (for animations) and one combined event for the rest.
 */
export function doMany(state: GameState, job: 'retrieve' | 'log', count: number, source: ActionSource | 'keeper', events: EventSink): number {
  const h = state.hunt;
  const src = source === 'keeper' ? 'manual' : source;
  if (job === 'retrieve') {
    const n = Math.min(count, h.downed.length);
    if (n <= 0) return 0;
    const birds = h.downed.splice(0, n);
    const hour = clockAt(state.clock.dayTime).hour;
    const night = hour >= 20 || hour < 5;
    const w = state.environment.weather;
    let restFeathers = 0;
    let restSpecies = birds[0]!;
    for (let i = 0; i < n; i++) {
      const species = birds[i]!;
      const v = birdValue(state, species);
      state.currencies.feathers = state.currencies.feathers.add(v.feathers);
      state.stats.lifetimeFeathers = state.stats.lifetimeFeathers.add(v.feathers);
      h.ledger.push(species);
      const entry = state.guide[species];
      if (entry) entry.count += 1;
      else {
        state.guide[species] = { count: 1, firstAt: state.elapsed };
        events.push({ type: 'newSpecies', species, ...discoveryReward(state, species) });
      }
      if (i < EVENT_CAP) events.push({ type: 'retrieved', species, feathers: v.feathers, count: 1, source: src });
      else {
        restFeathers += v.feathers;
        restSpecies = species;
      }
    }
    if (n > EVENT_CAP) events.push({ type: 'retrieved', species: restSpecies, feathers: restFeathers, count: n - EVENT_CAP, source: src });
    state.stats.lifetimeBirds += n;
    h.bag += n;
    state.stats.birdsByWeather[w] = (state.stats.birdsByWeather[w] ?? 0) + n;
    if (night) state.stats.nightBirds += n;
    recordJobMany(state, 'retrieve', n);
    return n;
  }
  const n = Math.min(count, h.ledger.length);
  if (n <= 0) return 0;
  const birds = h.ledger.splice(0, n);
  let coins = 0;
  for (const species of birds) coins += birdValue(state, species).coins;
  state.currencies.coins = state.currencies.coins.add(coins);
  state.stats.lifetimeCoins = state.stats.lifetimeCoins.add(coins);
  state.season.coins = state.season.coins.add(coins);
  state.stats.lifetimeLogged += n;
  events.push({ type: 'logged', coins, count: n, source });
  recordJobMany(state, 'log', n);
  return n;
}

function recordJobMany(state: GameState, job: JobId, n: number): void {
  for (let i = 0; i < Math.min(n, 1); i++) recordJob(state, job, true);
  if (n > 1) {
    const m = state.metrics.jobs[job];
    m.done[m.done.length - 1]! += n - 1;
    m.totalDone += n - 1;
  }
}

/** Advance arrivals, patience, decoy drift, Gus, bots and foremen by dt seconds. */
export function stepHunt(state: GameState, dt: number, activity: number, events: EventSink): void {
  const h = state.hunt;
  advanceMetrics(state);
  decayStreak(state);

  // Decoys slowly drift loose, faster in wind.
  if (h.decoys > 0) {
    const drift = WEATHER[state.environment.weather].decoyDrift;
    h.decoyDrift += (dt * drift * (1 + state.environment.wind * HUNT.decoyDriftWind)) / HUNT.decoyDriftSeconds;
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
  // Never let a big batch of scouting queue up more arrivals than can matter.
  if (h.flockCountdown < -maxIncoming(state)) h.flockCountdown = -maxIncoming(state);
  let arrivals = 0;
  while (h.flockCountdown <= 0 && arrivals++ <= maxIncoming(state) + 2) {
    h.flockCountdown += Math.min(2.5, Math.max(0.3, -Math.log(1 - rand(state) * 0.999)));
    const species = pickSpecies(state, clockAt(state.clock.dayTime).hour);
    const extra = ACRES.flockSizePerAcre * (state.acres - ACRES.start) + extraFlockSize(state);
    const raw = HUNT.flockSizeMin + rand(state) * (HUNT.flockSizeMax - HUNT.flockSizeMin + extra);
    const size = Math.max(1, Math.round(raw * SPECIES[species].flockSize));
    if (h.incoming.length < maxIncoming(state)) {
      const flock = { id: h.nextFlockId++, species, size, age: 0 };
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
  while (h.incoming.length > 0 && h.incoming[0]!.age > incomingPatience(state)) {
    const left = h.incoming.shift()!;
    events.push({ type: 'flockLeft', flockId: left.id });
    // Big-sky flyways: some flocks circle back for another look.
    if (rand(state) < FLYWAYS[state.flyway].returnChance) {
      state.returning.push({ flock: { ...left, age: 0 }, at: state.elapsed + 15 + rand(state) * 20 });
    } else {
      state.stats.lostToday += 1;
    }
  }
  while (state.returning.length > 0 && state.returning[0]!.at <= state.elapsed && h.incoming.length < maxIncoming(state)) {
    const back = state.returning.shift()!.flock;
    h.incoming.push(back);
    events.push({ type: 'flockArrived', flockId: back.id, size: back.size, species: back.species });
    events.push({ type: 'flockReturned', flockId: back.id });
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
  const table = rateTable(state);
  for (let i = PIPELINE_JOBS.length - 1; i >= 0; i--) runJob(state, table, PIPELINE_JOBS[i]!, dt, events);

  stepForemen(state, events, table.total.foreman ?? 0);
  stepTinkers(state, dt, events, table.total.tinker ?? 0);

  // Achievements: checked about once a second.
  if (Math.floor(state.elapsed) !== Math.floor(state.elapsed - dt)) {
    checkAchievements(state, events);
    checkUnlocks(state, events);
  }
}

/** Problem chance is softened by Tinker Bots on duty. */
function problemChance(state: GameState, t: RateTable, bot: (typeof BOT_ORDER)[number], job?: JobId): number {
  const base = (1 - botReliability(bot, state.bots[bot].level)) * WEATHER[state.environment.weather].problems * (job ? workflowEval(state).problemMult[job] ?? 1 : 1);
  return base / (1 + TINKER.reliabilityPerRate * (t.total.tinker ?? 0));
}

function runJob(state: GameState, t: RateTable, job: JobId, dt: number, events: EventSink): void {
  const rate = t.total[job] ?? 0;
  const j = state.jobs[job];
  if (rate <= 0) {
    j.progress = 0;
    return;
  }
  j.progress += rate * dt;
  if (job === 'retrieve' || job === 'log' || job === 'scout') {
    runBatch(state, t, job, events);
    return;
  }
  while (j.progress >= 1) {
    if (!canDo(state, job as ActionJob)) {
      // Nothing to do: idle bots don't bank more than one ready action.
      j.progress = 1;
      return;
    }
    j.progress -= 1;
    const bot = pickFrom(t, job, rand(state));
    if (!bot) return;
    if (rand(state) < problemChance(state, t, bot, job) && raiseProblem(state, bot, job, events)) {
      recordJob(state, job, false);
      continue;
    }
    doAction(state, job as ActionJob, bot, events);
  }
}

/** Batched version of runJob for high-volume jobs. */
function runBatch(state: GameState, t: RateTable, job: 'retrieve' | 'log' | 'scout', events: EventSink): void {
  const j = state.jobs[job];
  const want = Math.floor(j.progress);
  if (want <= 0) return;
  const h = state.hunt;
  const avail = job === 'retrieve' ? h.downed.length : job === 'log' ? h.ledger.length : h.incoming.length < maxIncoming(state) ? want : 0;
  const k = Math.min(want, avail);
  j.progress -= k;
  if (k < want) j.progress = Math.min(j.progress, 1);
  if (k <= 0) return;
  // Problems: roll per action for small batches, use the expected count for big ones.
  const lead = pickFrom(t, job, rand(state));
  if (!lead) return;
  const p = problemChance(state, t, lead, job);
  let problems = 0;
  if (k <= 12) {
    for (let i = 0; i < k; i++) if (rand(state) < p) problems++;
  } else {
    const exp = k * p;
    problems = Math.floor(exp) + (rand(state) < exp - Math.floor(exp) ? 1 : 0);
  }
  let raised = 0;
  for (let i = 0; i < problems; i++) {
    const bot = pickFrom(t, job, rand(state));
    if (bot && raiseProblem(state, bot, job, events)) {
      recordJob(state, job, false);
      raised++;
    }
  }
  const done = k - raised;
  if (done <= 0) return;
  if (job === 'scout') {
    h.flockCountdown = Math.max(-maxIncoming(state), h.flockCountdown - SCOUT.spotPower * FLYWAYS[state.flyway].scoutPower * done);
    events.push({ type: 'scouted', source: lead });
    recordJobMany(state, 'scout', done);
  } else {
    doMany(state, job, done, lead, events);
  }
}

/** Tinkers bank work and hand out free tune-ups to the lowest-level crew. */
function stepTinkers(state: GameState, dt: number, events: EventSink, rate: number): void {
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
