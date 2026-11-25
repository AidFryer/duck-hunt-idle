import { ACRES, BOT_ORDER, BOTS, HUNT, type BotId, type HuntStage } from '../data/economy';
import { birdValue, botRate, flockDraw, spreadSize } from './economy';
import type { ActionSource, EventSink } from './events';
import { rand, type GameState } from './state';

/**
 * The hunt pipeline: Set Decoys → Call → Shoot → Retrieve.
 * Each action is a pure state transition used by both taps and bots.
 */

export function canDo(state: GameState, stage: HuntStage): boolean {
  const h = state.hunt;
  switch (stage) {
    case 'decoys':
      return h.decoys < spreadSize(state);
    case 'call':
      return h.incoming.length > 0 && h.committed.length < HUNT.maxCommitted;
    case 'shoot':
      return h.committed.length > 0;
    case 'retrieve':
      return h.downed.length > 0;
  }
}

export function doAction(state: GameState, stage: HuntStage, source: ActionSource, events: EventSink): boolean {
  if (!canDo(state, stage)) return false;
  if (source === 'manual') state.stats.manualActions += 1;
  const h = state.hunt;
  switch (stage) {
    case 'decoys': {
      h.decoys += 1;
      events.push({ type: 'decoySet', decoys: h.decoys, source });
      return true;
    }
    case 'call': {
      const flock = h.incoming.shift()!;
      flock.age = 0;
      h.committed.push(flock);
      state.stats.flocksCalled += 1;
      events.push({ type: 'flockCalled', flockId: flock.id, source });
      return true;
    }
    case 'shoot': {
      const flock = h.committed.shift()!;
      const room = HUNT.maxDowned - h.downed.length;
      const downed = Math.max(0, Math.min(room, Math.max(1, Math.ceil(flock.size * HUNT.shotFraction))));
      for (let i = 0; i < downed; i++) h.downed.push(flock.species);
      state.stats.shots += 1;
      events.push({ type: 'shot', flockId: flock.id, downed, source });
      return true;
    }
    case 'retrieve': {
      const species = h.downed.shift()!;
      const v = birdValue(state, species);
      state.currencies.coins = state.currencies.coins.add(v.coins);
      state.currencies.feathers = state.currencies.feathers.add(v.feathers);
      state.stats.lifetimeCoins = state.stats.lifetimeCoins.add(v.coins);
      state.stats.lifetimeFeathers = state.stats.lifetimeFeathers.add(v.feathers);
      state.stats.lifetimeBirds += 1;
      h.bag += 1;
      events.push({ type: 'retrieved', species, coins: v.coins, feathers: v.feathers, source });
      return true;
    }
  }
}

/** Advance arrivals, patience timers, decoy drift and bots by dt seconds. */
export function stepHunt(state: GameState, dt: number, activity: number, events: EventSink): void {
  const h = state.hunt;

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
  if (h.flockCountdown <= 0) {
    h.flockCountdown += Math.min(2.5, Math.max(0.3, -Math.log(1 - rand(state) * 0.999)));
    const extra = ACRES.flockSizePerAcre * (state.acres - ACRES.start);
    const size = Math.round(HUNT.flockSizeMin + rand(state) * (HUNT.flockSizeMax - HUNT.flockSizeMin + extra));
    if (h.incoming.length < HUNT.maxIncoming) {
      const flock = { id: h.nextFlockId++, species: 'mallard' as const, size, age: 0 };
      h.incoming.push(flock);
      events.push({ type: 'flockArrived', flockId: flock.id, size, species: flock.species });
    } else {
      events.push({ type: 'flockPassed', size });
    }
  }

  // Patience: circling flocks move on; called flocks flare off.
  for (const f of h.incoming) f.age += dt;
  for (const f of h.committed) f.age += dt;
  while (h.incoming.length > 0 && h.incoming[0]!.age > HUNT.incomingPatience) {
    events.push({ type: 'flockLeft', flockId: h.incoming.shift()!.id });
  }
  while (h.committed.length > 0 && h.committed[0]!.age > HUNT.committedPatience) {
    state.stats.flocksFlared += 1;
    events.push({ type: 'flockFlared', flockId: h.committed.shift()!.id });
  }

  // Bots: retrieve first so the pipeline drains downstream-to-upstream.
  for (let i = BOT_ORDER.length - 1; i >= 0; i--) runBots(state, BOT_ORDER[i]!, dt, events);
}

function runBots(state: GameState, id: BotId, dt: number, events: EventSink): void {
  const b = state.bots[id];
  if (b.owned === 0) return;
  b.progress += botRate(state, id) * dt;
  const stage = BOTS[id].stage;
  while (b.progress >= 1) {
    if (!doAction(state, stage, id, events)) {
      // Nothing to do: idle bots don't bank more than one ready action.
      b.progress = 1;
      return;
    }
    b.progress -= 1;
  }
}
