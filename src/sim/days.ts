import { projectFx } from './projects';
import { DAY_LENGTH_SECONDS } from '../config';
import { SPECIAL_DAYS, SPECIAL_DAY_CHANCE, SPECIAL_DAY_ORDER, type SpecialDayDef } from '../data/days';
import type { EventSink } from './events';
import { rand, type GameState } from './state';

const NONE = { flockRate: 1, flockSize: 0, coins: 1, feathers: 1, patience: 1, rare: 1 };

/** Today's named day, if any. */
export function specialDay(state: GameState): SpecialDayDef | null {
  const id = state.environment.special;
  return id ? SPECIAL_DAYS[id] : null;
}

/** Today's effects (neutral on an ordinary day). */
export function dayFx(state: GameState): typeof NONE {
  return specialDay(state) ?? NONE;
}

/** A new day: maybe it's a named one. Brings its weather with it. */
export function rollSpecialDay(state: GameState, events: EventSink): void {
  const env = state.environment;
  const had = env.special;
  env.special = null;
  if (had || rand(state) >= SPECIAL_DAY_CHANCE * projectFx(state).namedDays) return;
  const id = SPECIAL_DAY_ORDER[Math.floor(rand(state) * SPECIAL_DAY_ORDER.length)]!;
  env.special = id;
  const d = SPECIAL_DAYS[id];
  if (env.weather !== d.weather) {
    const from = env.weather;
    env.weather = d.weather;
    events.push({ type: 'weatherChanged', from, to: d.weather });
  }
  // Hold that weather for most of the day.
  env.weatherUntil = state.elapsed + DAY_LENGTH_SECONDS * 0.7;
  events.push({ type: 'specialDay', day: id });
}
