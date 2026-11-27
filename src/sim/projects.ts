import { PROJECTS, PROJECTS_LODGE, type ProjectId } from '../data/projects';
import type { EventSink } from './events';
import type { GameState, ProjectState } from './state';

export function project(state: GameState, id: ProjectId): ProjectState {
  return state.projects[id] ?? { stage: 0, coins: 0, feathers: 0 };
}

const done = (state: GameState, id: ProjectId, stage: number) => project(state, id).stage >= stage;

/**
 * Put what you can toward the next stage (up to `share` of what you have).
 * Finishing a stage rolls straight into the next one's fund. Returns true if
 * anything went in.
 */
export function fundProject(state: GameState, id: ProjectId, events?: EventSink, share = 1): boolean {
  if (state.lodge < PROJECTS_LODGE) return false;
  const p = { ...project(state, id) };
  const stage = PROJECTS[id].stages[p.stage];
  if (!stage) return false;
  const c = Math.min(stage.coins - p.coins, Math.floor(state.currencies.coins.toNumber() * share));
  const f = Math.min(stage.feathers - p.feathers, Math.floor(state.currencies.feathers.toNumber() * share));
  if (c <= 0 && f <= 0) return false;
  if (c > 0) {
    p.coins += c;
    state.currencies.coins = state.currencies.coins.sub(c);
  }
  if (f > 0) {
    p.feathers += f;
    state.currencies.feathers = state.currencies.feathers.sub(f);
  }
  if (p.coins >= stage.coins && p.feathers >= stage.feathers) {
    p.stage += 1;
    p.coins = 0;
    p.feathers = 0;
    events?.push({ type: 'projectStage', project: id, stage: p.stage });
  }
  state.projects[id] = p;
  return true;
}

/** Everything finished project stages add up to. */
export function projectFx(state: GameState) {
  return {
    fetch: done(state, 'boathouse', 1) ? 1.1 : 1,
    committed: done(state, 'boathouse', 2) ? 1 : 0,
    farFlocks: done(state, 'boathouse', 3) ? 1.2 : 1,
    farCrews: done(state, 'boathouse', 4) ? 1.3 : 1,
    botPrice: done(state, 'carvingShop', 1) ? 0.95 : 1,
    gearPrice: done(state, 'carvingShop', 2) ? 0.75 : 1,
    decoyPrice: done(state, 'carvingShop', 3) ? 0.8 : 1,
    coins: done(state, 'carvingShop', 4) ? 1.15 : 1,
    marshFlocks: done(state, 'lookout', 1) ? 1.08 : 1,
    golden: done(state, 'lookout', 2) ? 1.3 : 1,
    patience: done(state, 'lookout', 3) ? 1.15 : 1,
    namedDays: done(state, 'lookout', 4) ? 2 : 1,
  };
}
