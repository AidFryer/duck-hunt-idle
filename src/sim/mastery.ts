import type { FlywayId } from '../data/flyways';
import { MASTERY, MASTERY_BONUS } from '../data/mastery';
import type { SpeciesId } from '../data/species';
import type { EventSink } from './events';
import type { FlywayMastery, GameState } from './state';

function here(state: GameState, fw: FlywayId = state.flyway): FlywayMastery {
  return (state.mastery[fw] ??= { bag: 0, kinds: {}, guests: 0, star: false, mastered: false });
}

/** How far along each challenge is on a flyway. */
export function masteryRows(state: GameState, fw: FlywayId) {
  const m = state.mastery[fw];
  const g = MASTERY[fw];
  const kinds = m ? Object.keys(m.kinds).length : 0;
  return [
    { id: 'bag', label: `Bring in ${g.bag.toLocaleString('en-US')} birds in one day`, cur: Math.min(g.bag, m?.bag ?? 0), goal: g.bag },
    { id: 'kinds', label: `Find ${g.kinds} kinds of bird here`, cur: Math.min(g.kinds, kinds), goal: g.kinds },
    { id: 'guests', label: `Serve ${g.guests} guest parties here`, cur: Math.min(g.guests, m?.guests ?? 0), goal: g.guests },
    { id: 'star', label: 'Earn a Flyway Star here', cur: m?.star ? 1 : 0, goal: 1 },
  ] as const;
}

function check(state: GameState, fw: FlywayId, events?: EventSink): void {
  const m = here(state, fw);
  if (m.mastered) return;
  if (masteryRows(state, fw).every((r) => r.cur >= r.goal)) {
    m.mastered = true;
    events?.push({ type: 'flywayMastered', flyway: fw });
  }
}

/** A bird came in: count its kind and today's bag toward this flyway. */
export function masteryBird(state: GameState, species: SpeciesId, events: EventSink): void {
  const m = here(state);
  let changed = false;
  if (!m.kinds[species]) {
    m.kinds[species] = true;
    changed = true;
  }
  const g = MASTERY[state.flyway];
  if (state.hunt.bag > m.bag) {
    if (m.bag < g.bag && state.hunt.bag >= g.bag) changed = true;
    m.bag = state.hunt.bag;
  }
  if (changed) check(state, state.flyway, events);
}

export function masteryGuest(state: GameState, events: EventSink): void {
  here(state).guests += 1;
  check(state, state.flyway, events);
}

/** A season closed here with at least one star. */
export function masteryStar(state: GameState, events?: EventSink): void {
  here(state).star = true;
  check(state, state.flyway, events);
}

export function masteredCount(state: GameState): number {
  return Object.values(state.mastery).filter((m) => m?.mastered).length;
}

/** × coins from every mastered flyway. */
export function masteryMultiplier(state: GameState): number {
  return 1 + MASTERY_BONUS * masteredCount(state);
}
