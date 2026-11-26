import { WEATHER, WEATHER_ORDER, WEATHER_SPELL, type WeatherId } from '../data/weather';
import { clamp } from '../util/math';
import { windAt } from './environment';
import type { EventSink } from './events';
import { rand, type GameState } from './state';
import { FLYWAYS } from '../data/flyways';

/** Pick the next weather (never the same as the current one twice in a row). */
function pickWeather(state: GameState, not: WeatherId): WeatherId {
  const pool = WEATHER_ORDER.filter((w) => w !== not);
  const fw = FLYWAYS[state.flyway].weather;
  const weight = (w: WeatherId) => WEATHER[w].weight * (fw[w] ?? 1);
  const total = pool.reduce((s, w) => s + weight(w), 0);
  let t = rand(state) * total;
  for (const w of pool) {
    t -= weight(w);
    if (t <= 0) return w;
  }
  return pool[pool.length - 1]!;
}

/** Advance weather spells and update wind. */
export function stepWeather(state: GameState, events: EventSink): void {
  const env = state.environment;
  if (state.elapsed >= env.weatherUntil) {
    const from = env.weather;
    env.weather = env.nextWeather;
    env.nextWeather = pickWeather(state, env.weather);
    env.weatherUntil = state.elapsed + WEATHER_SPELL.min + rand(state) * (WEATHER_SPELL.max - WEATHER_SPELL.min);
    events.push({ type: 'weatherChanged', from, to: env.weather });
  }
  env.wind = clamp(windAt(state.elapsed, env.seed) + WEATHER[env.weather].wind, 0, 1);
}

export function weatherDef(state: GameState) {
  return WEATHER[state.environment.weather];
}
