import { stageFor, stageIndex } from '../data/calendar';
import { refreshGuests } from './guests';
import { DAY_LENGTH_SECONDS } from '../config';
import type { GameState } from './state';
import { clockAt, duckActivityAt } from './clock';
import { stepWeather } from './weather';
import type { EventSink } from './events';
import { stepHunt } from './hunt';

/**
 * Advance the simulation by exactly one fixed step of `dt` seconds.
 * Mutates `state` in place (cheap at 10 Hz, and keeps GC quiet).
 */
export function step(state: GameState, dt: number, events: EventSink = []): void {
  state.tick += 1;
  state.elapsed += dt;

  const clock = state.clock;
  clock.dayTime += dt;
  while (clock.dayTime >= DAY_LENGTH_SECONDS) {
    clock.dayTime -= DAY_LENGTH_SECONDS;
    clock.day += 1;
    // A new day begins at pre-dawn: tally yesterday's bag.
    const bag = state.hunt.bag;
    const best = bag > state.stats.bestBag;
    if (best) state.stats.bestBag = bag;
    events.push({ type: 'dayEnded', day: clock.day - 1, bag, best });
    state.hunt.bag = 0;
    state.stats.lostToday = 0;
    if (stageIndex(clock.day) !== stageIndex(clock.day - 1)) events.push({ type: 'stageChanged', stage: stageFor(clock.day).id });
    refreshGuests(state, events);
  }

  stepWeather(state, events);
  stepHunt(state, dt, duckActivityAt(clockAt(clock.dayTime).hour), events);
}

/** Advance by many seconds at once (offline progress / time-lapse). */
export function advance(state: GameState, seconds: number, dt: number, events: EventSink = []): number {
  const ticks = Math.floor(seconds / dt);
  for (let i = 0; i < ticks; i++) step(state, dt, events);
  return ticks;
}
