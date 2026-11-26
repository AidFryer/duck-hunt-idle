/**
 * Lodge levels, bot plans and the automation ladder (see data/progression).
 * Pure state transitions plus read helpers the economy uses for effects.
 */
import Decimal from 'break_infinity.js';
import { BOT_ORDER, RETIRED_BOTS, type BotId, type GroundId, type JobId } from '../data/economy';
import { FEATURES, type FeatureId } from '../data/features';
import {
  LODGE_LEVELS, MAX_LODGE, PLANS, RUNG_ORDER, RUNGS, SPECIES_DRAW,
  type CounterId, type Draw, type LodgeLevel, type RungEffect, type RungId,
} from '../data/progression';
import type { SpeciesId } from '../data/species';
import { cropGrown } from './crops';
import type { EventSink } from './events';
import type { GameState } from './state';

// ---------------------------------------------------------------- counters

export function counter(s: GameState, id: CounterId): number {
  const hand = s.stats.manualByJob;
  switch (id) {
    case 'handDecoys': return hand.decoys ?? 0;
    case 'handCalls': return hand.call ?? 0;
    case 'handShots': return hand.shoot ?? 0;
    case 'handFetches': return hand.retrieve ?? 0;
    case 'handFixes': return s.problems.fixedByYou;
    case 'birds': return s.stats.lifetimeBirds;
    case 'flocksCalled': return s.stats.flocksCalled;
    case 'shots': return s.stats.shots;
    case 'logged': return s.stats.lifetimeLogged;
    case 'species': return speciesFound(s);
    case 'bots': return BOT_ORDER.reduce((a, b) => a + s.bots[b].owned, 0);
    case 'handStakes': return hand.fDecoys ?? 0;
    case 'handFlags': return hand.flag ?? 0;
    case 'handFieldShots': return hand.fShoot ?? 0;
    case 'handPickups': return hand.fRetrieve ?? 0;
    case 'geese': return s.stats.geese;
  }
}

export function speciesFound(s: GameState): number {
  return Object.values(s.guide).filter((g) => (g?.count ?? 0) > 0).length;
}

// ---------------------------------------------------------------- lodge

export function lodgeDef(level: number): LodgeLevel {
  return LODGE_LEVELS[Math.max(1, Math.min(MAX_LODGE, level)) - 1]!;
}

/** The next level to build, or null at the top. */
export function nextLodge(s: GameState): LodgeLevel | null {
  return s.lodge >= MAX_LODGE ? null : LODGE_LEVELS[s.lodge]!;
}

/** Bird and species requirements met (cost aside). */
export function lodgeReady(s: GameState): boolean {
  const n = nextLodge(s);
  return !!n && s.stats.lifetimeBirds >= n.birds && speciesFound(s) >= n.species;
}

export function canBuildLodge(s: GameState): boolean {
  const n = nextLodge(s);
  return !!n && lodgeReady(s) && s.currencies.coins.gte(n.coins) && s.currencies.feathers.gte(n.feathers);
}

export function buildLodge(s: GameState, events?: EventSink): boolean {
  if (!canBuildLodge(s)) return false;
  const n = nextLodge(s)!;
  s.currencies.coins = s.currencies.coins.sub(n.coins);
  s.currencies.feathers = s.currencies.feathers.sub(n.feathers);
  s.lodge = n.level;
  for (const f of n.opens) if (s.unlocks[f] === undefined) s.unlocks[f] = s.elapsed;
  events?.push({ type: 'lodgeBuilt', level: n.level });
  checkPlans(s, events);
  return true;
}

/** Lodge level that opens a feature (guide opens with the first bird). */
export function featureLodge(id: FeatureId): number {
  return FEATURES[id].lodge;
}

// ---------------------------------------------------------------- plans

export function planProgress(s: GameState, bot: BotId): [number, number] {
  const p = PLANS[bot];
  return [Math.min(counter(s, p.counter), p.count), p.count];
}

export function hasPlans(s: GameState, bot: BotId): boolean {
  return !!s.plans[bot];
}

/** Mark any plans the player has just earned. Cheap; called about once a second. */
export function checkPlans(s: GameState, events?: EventSink): void {
  for (const bot of BOT_ORDER) {
    if (s.plans[bot] || RETIRED_BOTS.includes(bot)) continue;
    const p = PLANS[bot];
    if (s.lodge < p.lodge) continue;
    if (counter(s, p.counter) < p.count) continue;
    s.plans[bot] = true;
    events?.push({ type: 'planEarned', bot });
  }
}

// ---------------------------------------------------------------- ladder

export function hasRung(s: GameState, id: RungId): boolean {
  return !!s.rungs[id];
}

/** Lodge level reached and the rung below is owned: worth showing. */
export function rungVisible(s: GameState, id: RungId): boolean {
  const r = RUNGS[id];
  if (!r.rig && !hasPlans(s, r.bot)) return false;
  const below = RUNG_ORDER.map((x) => RUNGS[x]).find((x) => x.bot === r.bot && x.tier === r.tier - 1);
  return !below || hasRung(s, below.id) || s.lodge >= r.lodge;
}

/** Every requirement except the price. */
export function rungReady(s: GameState, id: RungId): boolean {
  const r = RUNGS[id];
  const below = RUNG_ORDER.map((x) => RUNGS[x]).find((x) => x.bot === r.bot && x.tier === r.tier - 1);
  return (
    !hasRung(s, id) &&
    (r.rig || hasPlans(s, r.bot)) &&
    (!below || hasRung(s, below.id)) &&
    s.lodge >= r.lodge &&
    s.bots[r.bot].owned >= r.owned &&
    counter(s, r.counter) >= r.count
  );
}

export function rungPrice(id: RungId): { coins: Decimal; feathers: Decimal } {
  const r = RUNGS[id];
  return { coins: new Decimal(r.coins), feathers: new Decimal(r.feathers) };
}

export function buyRung(s: GameState, id: RungId, events?: EventSink): boolean {
  if (!rungReady(s, id)) return false;
  const p = rungPrice(id);
  if (s.currencies.coins.lt(p.coins) || s.currencies.feathers.lt(p.feathers)) return false;
  s.currencies.coins = s.currencies.coins.sub(p.coins);
  s.currencies.feathers = s.currencies.feathers.sub(p.feathers);
  s.rungs[id] = true;
  events?.push({ type: 'rungBuilt', rung: id });
  return true;
}

interface Fx {
  key: string;
  jobMult: Partial<Record<JobId, number>>;
  draw: number;
  spread: number;
  committed: number;
  patience: number;
  committedPatience: number;
  shot: number;
  rare: number;
  coins: number;
}

const fxCache: Record<GroundId, Fx | null> = { marsh: null, field: null };

/**
 * Combined effects of every rung owned (cached until the set changes).
 * Job speed multipliers come from every rung; ground-wide effects (draw,
 * spread, patience…) only from that ground's rungs.
 */
export function rungFx(s: GameState, g: GroundId = 'marsh'): Fx {
  let key = '';
  for (const id of RUNG_ORDER) if (s.rungs[id]) key += id[0]! + id.length;
  const cached = fxCache[g];
  if (cached && cached.key === key) return cached;
  const fx: Fx = { key, jobMult: {}, draw: 1, spread: 0, committed: 0, patience: 1, committedPatience: 1, shot: 0, rare: 1, coins: 1 };
  for (const id of RUNG_ORDER) {
    if (!s.rungs[id]) continue;
    const r = RUNGS[id];
    const e: RungEffect = r.fx;
    if (e.mult) fx.jobMult[r.job] = (fx.jobMult[r.job] ?? 1) * e.mult;
    if ((r.ground ?? 'marsh') !== g) continue;
    if (e.draw) fx.draw *= e.draw;
    if (e.spread) fx.spread += e.spread;
    if (e.committed) fx.committed += e.committed;
    if (e.patience) fx.patience *= e.patience;
    if (e.committedPatience) fx.committedPatience *= e.committedPatience;
    if (e.shot) fx.shot += e.shot;
    if (e.rare) fx.rare *= e.rare;
    if (e.coins) fx.coins *= e.coins;
  }
  fxCache[g] = fx;
  return fx;
}

// ---------------------------------------------------------------- species

function drawMet(s: GameState, d: Draw): boolean {
  if ('upgrade' in d) return (s.upgrades[d.upgrade] ?? 0) > 0;
  if ('rung' in d) return hasRung(s, d.rung);
  if ('crop' in d) return cropGrown(s, d.crop);
  return d.flyway.includes(s.flyway);
}

/** Will this species visit the marsh at all right now? */
export function speciesAvailable(s: GameState, id: SpeciesId): boolean {
  const need = SPECIES_DRAW[id];
  return !need || need.every((d) => drawMet(s, d));
}

export function speciesNeeds(id: SpeciesId): readonly Draw[] {
  return SPECIES_DRAW[id] ?? [];
}
