import { SPECIES, SPECIES_ORDER, SPECIES_PREFERENCE, speciesAt, type SpeciesId } from '../data/species';
import type { GroundId } from '../data/economy';
import { UPGRADE_SPECIES } from '../data/upgrades';
import { WEATHER } from '../data/weather';
import type { UpgradeId } from '../data/upgrades';
import { rand, type GameState } from './state';
import { FLYWAYS } from '../data/flyways';
import { workflowEval } from './workflow';
import { rungFx, speciesAvailable } from './progression';

function inHours(hour: number, windows: readonly [number, number][]): boolean {
  return windows.some(([a, b]) => hour >= a && hour < b);
}

/** Relative chance of each species right now (time, weather, upgrades). */
export function speciesWeights(state: GameState, hour: number, g: GroundId = 'marsh'): Record<SpeciesId, number> {
  const out = {} as Record<SpeciesId, number>;
  const w = state.environment.weather;
  const wf = workflowEval(state);
  const fx = rungFx(state, g);
  for (const id of SPECIES_ORDER) {
    const d = SPECIES[id];
    // Birds only visit their own ground, once it has what they need.
    if (!speciesAt(g, id) || !speciesAvailable(state, id)) {
      out[id] = 0;
      continue;
    }
    let v = d.weight;
    if (inHours(hour, d.hours)) v *= SPECIES_PREFERENCE.inHours;
    if (d.weather.includes(w)) v *= SPECIES_PREFERENCE.inWeather;
    if (d.rarity === 'rare' || d.rarity === 'legendary') {
      v *= WEATHER[w].rare * wf.rareMult * fx.rare * (state.legacy.perks.birdersLuck ? 1.5 : 1);
    }
    if (id === 'kingEider' && state.legacy.perks.legendHunter) v *= 3;
    v *= FLYWAYS[state.flyway].species[id] ?? 1;
    for (const [u, mods] of Object.entries(UPGRADE_SPECIES)) {
      const k = mods?.[id];
      if (k) v *= 1 + k * (state.upgrades[u as UpgradeId] ?? 0);
    }
    out[id] = v;
  }
  return out;
}

export function pickSpecies(state: GameState, hour: number, g: GroundId = 'marsh'): SpeciesId {
  const weights = speciesWeights(state, hour, g);
  let total = 0;
  for (const id of SPECIES_ORDER) total += weights[id];
  let t = rand(state) * total;
  for (const id of SPECIES_ORDER) {
    t -= weights[id];
    if (t <= 0) return id;
  }
  return g === 'field' ? 'canadaGoose' : 'mallard';
}
