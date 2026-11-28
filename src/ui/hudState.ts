import { acreGain, botGain, calibrate, decoyGain, groundBirdsPerMinute, upgradeGain } from '../sim/estimate';
import type { SpecialDayId } from '../data/days';
import Decimal from 'break_infinity.js';
import type { DayPhaseId } from '../data/dayCycle';
import {
  BOT_ORDER, BOTS, DECOYS, FOREMAN, GROUND_LODGE, GROUND_NAMES, GROUND_ORDER, HUNT, JOB_ORDER, JOBS, LEDGER, PROBLEMS, TINKER, type Step,
  type GroundId,
  type BotId, type HuntStage, type JobId, type ProblemKind,
} from '../data/economy';
import { RHYTHM } from '../data/economy';
import { rhythmSnag, rhythmTarget, type RhythmSnag } from '../sim/rhythm';
import { currentGoal } from '../data/goals';
import { FEATURE_ORDER, FEATURES, type FeatureId } from '../data/features';
import { ACHIEVEMENTS } from '../data/achievements';
import type { BreedId } from '../data/crew';
import { CARVING_ORDER, type CarvingId } from '../data/carvings';
import { CALENDAR, stageDay, stageFor, stageIndex, type StageId } from '../data/calendar';
import { canAffordCarving, carvingStatus, type CarvingStatus } from '../sim/carvings';
import { busyMarsh, volleyPayout } from '../sim/volley';
import { GUESTS } from '../data/guests';
import { requestText } from '../sim/guests';
import { SPECIES, SPECIES_ORDER, type SpeciesId } from '../data/species';
import { UPGRADE_ORDER, UPGRADES, type UpgradeId } from '../data/upgrades';
import { WEATHER, type WeatherId } from '../data/weather';
import { offlineCapSeconds, upgradePrice } from '../sim/upgrades';
import { FLYWAYS, FLYWAY_ORDER, type FlywayId } from '../data/flyways';
import { PERK_ORDER, PERKS, PRESTIGE, type PerkId } from '../data/legacy';
import { branchOpen, canBuyPerk, canRespec, coinsForNextStar, nextFlyway, perkCost, perkMaxRank, perkRank, starsFor, starsInPerks } from '../sim/prestige';
import { BRANCH_ORDER, type BranchId } from '../data/legacy';
import { masteryRows } from '../sim/mastery';
import { workflowEval } from '../sim/workflow';
import { TRAINING_ORDER, DOG_MAX, DOG_SKILLS, type TrainingId } from '../data/training';
import { canAffordTraining, dogNext, trainingStatus, type TrainingStatus } from '../sim/training';
import { clockAt, duckActivityAt, formatClock } from '../sim/clock';
import {
  acrePrice, decoyBagPrice, botPrice, botReliability, botUnitSpeed, canAfford, levelPrice, maxAffordableBots,
  milestoneMultiplier, nextMilestone, reputationMultiplier, spreadSize, maxIncoming, maxCommitted, botPriceMult, type Price,
  patchMultiplier, groundOpen, GROUND_PARAMS,
} from '../sim/economy';
import { canDo, fieldOpen } from '../sim/hunt';
import { assigned, contribution, jobRate, stuck } from '../sim/jobs';
import { successRate, throughput } from '../sim/metrics';
import { foremanCapacity, retryChance, retryDelay } from '../sim/problems';
import type { GameState, Problem } from '../sim/state';
import { CROPS, cropsFor, plotCount, type CropId } from '../data/crops';
import { canPlant, cropPrice } from '../sim/crops';
import { COUNTER_LABEL, PLANS, RUNGS, SPECIES_DRAW, ladderFor, type CounterId, type Draw, type RungId } from '../data/progression';
import { canBuildLodge, counter, lodgeDef, lodgeReady, nextLodge, rungPrice, rungReady, speciesAvailable, speciesNeeds } from '../sim/progression';

export interface Req {
  label: string;
  cur: number;
  goal: number;
}

export interface RungSnapshot {
  id: RungId;
  name: string;
  blurb: string;
  effect: string;
  tier: number;
  built: boolean;
  /** Every requirement met (price aside). */
  ready: boolean;
  affordable: boolean;
  price: Price;
  reqs: Req[];
}

export interface PlanSnapshot {
  earned: boolean;
  /** Lodge level reached, so the plans can be earned. */
  open: boolean;
  lodgeName: string;
  req: Req;
}

export interface LodgeSnapshot {
  level: number;
  name: string;
  next: null | {
    level: number;
    name: string;
    reqs: Req[];
    price: Price;
    ready: boolean;
    affordable: boolean;
    points: readonly string[];
  };
}

export interface BotSnapshot {
  id: BotId;
  owned: number;
  level: number;
  /** Actions/sec for all of this type that are working right now. */
  rate: number;
  unitSpeed: number;
  reliability: number;
  multiplier: number;
  nextMilestone: number | null;
  price: Price;
  affordable: boolean;
  maxAffordable: number;
  levelPrice: Price;
  levelAffordable: boolean;
  revealed: boolean;
  stuck: number;
  bench: number;
  /** Birds a minute one more would add (null for crew that doesn't bring birds in). */
  gain: number | null;
}

export interface JobToken {
  bot: BotId;
  count: number;
  stuck: number;
}

export interface JobSnapshot {
  id: JobId;
  name: string;
  blurb: string;
  /** Capacity: actions/sec the assigned crew could do. */
  rate: number;
  /** Actual completed actions/sec over the last minute. */
  throughput: number;
  queue: string;
  /** True when work is piling up faster than this job clears it. */
  backedUp: boolean;
  success: number;
  spark: number[];
  fails: number[];
  tokens: JobToken[];
  /** Done by hand / Ray when no bots are here. */
  manual: string | null;
}

export interface ProblemRow {
  id: number;
  bot: BotId;
  title: string;
  status: Problem['status'];
  statusText: string;
  ago: number;
  needsYou: boolean;
}

/** A read-only, render-friendly view of the sim for the HUD. */
export interface HudSnapshot {
  day: number;
  clock: string;
  phaseId: DayPhaseId;
  phaseLabel: string;
  hour: number;
  activity: number;
  wind: number;
  coins: Decimal;
  feathers: Decimal;
  bag: number;
  bestBag: number;
  lifetimeBirds: number;
  lostToday: number;
  decoys: number;
  spread: number;
  incoming: number;
  committed: number;
  downed: number;
  ledger: number;
  /** Crew Rhythm: fill (0–1), the coin bonus it pays (%), where it's heading, and what's holding it back. */
  rhythm: { level: number; bonus: number; rising: boolean; snag: RhythmSnag; crew: boolean };
  reputation: number;
  keeperRate: number;
  can: Record<HuntStage, boolean>;
  /** Automation per stage (actions/sec), for the hunt buttons. */
  auto: Record<HuntStage, number>;
  /** The goose field's numbers (same shape as the marsh's). */
  field: {
    open: boolean;
    decoys: number;
    spread: number;
    incoming: number;
    committed: number;
    downed: number;
    can: Record<Step, boolean>;
    auto: Record<Step, number>;
  };
  bots: Record<BotId, BotSnapshot>;
  jobs: Record<JobId, JobSnapshot>;
  /** The job most in need of help, as a plain sentence (null when the crew keeps up). */
  crewNote: string | null;
  problems: ProblemRow[];
  openProblems: number;
  needsYou: number;
  problemStats: { total: number; byYou: number; byForeman: number; escalated: number };
  foreman: { retries: number; backoff: number; chance: number; delays: number[]; capacity: number; hired: boolean };
  weather: { id: WeatherId; name: string; blurb: string; next: WeatherId; nextName: string; changeAt: string };
  guide: { id: SpeciesId; count: number; found: boolean; available: boolean; draws: string }[];
  speciesFound: number;
  achievements: { id: string; unlocked: boolean }[];
  patches: number;
  upgrades: { id: UpgradeId; level: number; max: number; price: Price; affordable: boolean; revealed: boolean; lodgeName: string; lodge: number; gain: number }[];
  lodge: LodgeSnapshot;
  profile: { name: string; avatar: string; dogName: string; breed: BreedId };
  /** Coins-per-bird bonus from patches (e.g. 0.36 for +36%). */
  patchBonus: number;
  guests: {
    open: boolean;
    board: { id: number; who: string; text: string; progress: number; target: number; coins: number; feathers: number; ready: boolean; daysLeft: number }[];
    served: number;
    /** Parties until the next guestbook line, and the bonus so far. */
    toNextLine: number;
    bookBonus: number;
  };
  volley: {
    unlocked: boolean;
    charge: number;
    ready: boolean;
    /** Lots happening: show a running tally instead of per-bird popups. */
    busy: boolean;
    birdsRate: number;
    coinsRate: number;
    feathersRate: number;
    payout: { birds: number; coins: number; feathers: number };
  };
  calendar: { id: StageId; name: string; blurb: string; day: number; of: number; nextName: string };
  carvings: { id: CarvingId; status: CarvingStatus; affordable: boolean }[];
  maxCircling: number;
  spreads: Record<GroundId, { decoys: number; draw: number; price: Price; affordable: boolean; gain: number }>;
  /** Birds a minute the whole lodge brings in, and what's holding each ground back. */
  birdsPerMin: number;
  limits: Partial<Record<GroundId, 'flocks' | 'call' | 'shoot' | 'fetch' | 'crew'>>;
  /** Birds a minute one more acre would add. */
  acreGain: number;
  /** The best-value buy right now (most birds a minute per coin), e.g. 'bot:caller', 'decoys:marsh', 'acre'. */
  bestBuy: string | null;
  /** Every hunting ground, open or not, in the order they open. */
  grounds: { id: GroundId; name: string; open: boolean; lodgeName: string }[];
  plots: {
    open: number;
    /** Lodge that opens the next plot (null when all four are open). */
    nextLodgeName: string | null;
    list: { crop: CropId | null; growth: number; options: { crop: CropId; price: Price; affordable: boolean }[] }[];
  };
  plans: Record<BotId, PlanSnapshot>;
  ladder: Record<BotId, RungSnapshot[]>;
  offlineHours: number;
  unlocks: Record<FeatureId, boolean>;
  featureProgress: Record<FeatureId, [number, number]>;
  training: {
    skills: { id: TrainingId; status: TrainingStatus; affordable: boolean }[];
    /** Bonus lines for what the crew has learned. */
    effects: string[];
  };
  dog: {
    level: number;
    max: number;
    next: { level: number; fetches: number; feathers: number; haveFetches: number; ready: boolean; affordable: boolean } | null;
    skills: { level: number; name: string; desc: string; has: boolean }[];
  };
  season: {
    number: number;
    coins: Decimal;
    starsNow: number;
    nextStarAt: Decimal;
    progress: number;
    flyway: FlywayId;
    nextFlyway: FlywayId;
    /** What closing the season right now would bring. */
    preview: ClosePreview;
  };
  legacy: {
    stars: number;
    earned: number;
    bonus: number;
    perks: { id: PerkId; owned: boolean; rank: number; maxRank: number; nextCost: number; canBuy: boolean; prereqsMet: boolean }[];
    /** Which branches are open (a flyway's opens once you've hunted it). */
    branches: { id: BranchId; open: boolean }[];
    /** The free once-a-season refund: available now, and how many stars it'd return. */
    respec: { can: boolean; stars: number };
    /** Flyway mastery: each flyway's four challenges. */
    mastery: Partial<Record<FlywayId, { rows: { id: string; label: string; cur: number; goal: number }[]; mastered: boolean }>>;
  };
  flyways: { id: FlywayId; status: 'current' | 'visited' | 'next' | 'locked' | 'soon' }[];
  acres: number;
  acrePrice: Price;
  acreAffordable: boolean;
  lifetimeCoins: Decimal;
  goalId: string;
  goalTitle: string;
  /** Today's named day, if any. */
  specialDay: SpecialDayId | null;
  /** How far along the current goal is (0–1), when it can be measured. */
  goalProgress: number | null;
  goalGus: string;
  goalIndex: number;
}

function queueFor(state: GameState, job: JobId): { text: string; backedUp: boolean } {
  const h = state.hunt;
  switch (job) {
    case 'scout':
      return { text: `${h.incoming.length}/${maxIncoming(state)} circling`, backedUp: false };
    case 'decoys':
      return { text: `${spreadSize(state)} decoys out`, backedUp: false };
    case 'call':
      return { text: `${h.incoming.length} waiting`, backedUp: h.incoming.length >= maxIncoming(state) };
    case 'shoot':
      return { text: `${h.committed.length} in range`, backedUp: h.committed.length >= HUNT.maxCommitted };
    case 'retrieve':
      return { text: `${h.downed.length} on water`, backedUp: h.downed.length >= 6 };
    case 'log':
      return { text: `${h.ledger.length} unlogged`, backedUp: h.ledger.length >= 10 };
    case 'fDecoys':
      return { text: `${spreadSize(state, 'field')} decoys out`, backedUp: false };
    case 'flag':
      return { text: `${state.field.incoming.length} circling`, backedUp: state.field.incoming.length >= maxIncoming(state, 'field') };
    case 'fShoot':
      return { text: `${state.field.committed.length} over the spread`, backedUp: state.field.committed.length >= maxCommitted(state, 'field') };
    case 'fRetrieve':
      return { text: `${state.field.downed.length} in the stubble`, backedUp: state.field.downed.length >= 6 };
    case 'tCall': case 'tShoot': case 'tRetrieve': case 'tHunt':
      return { text: `${state.timber.downed.length} birds down in the timber`, backedUp: state.timber.downed.length >= 8 };
    case 'bCall': case 'bShoot': case 'bRetrieve': case 'bHunt':
      return { text: `${state.bay.downed.length} birds on the bay`, backedUp: state.bay.downed.length >= 10 };
    case 'foreman': {
      const open = state.problems.open.length;
      return { text: `${open} open`, backedUp: open > foremanCapacity(state) };
    }
    case 'tinker': {
      let low = Infinity;
      for (const id of BOT_ORDER) if (id !== 'tinker' && state.bots[id].owned > 0) low = Math.min(low, state.bots[id].level);
      const need = Number.isFinite(low) ? TINKER.workPerLevel * low : 0;
      return { text: need ? `${Math.floor((state.tinkerWork / need) * 100)}% to a tune-up` : 'Nothing to tune', backedUp: false };
    }
  }
}

function statusText(state: GameState, p: Problem): string {
  switch (p.status) {
    case 'open':
      return state.bots.foreman.owned > 0 ? 'Waiting for the foreman' : 'Needs you';
    case 'retrying':
      return `Foreman retrying (${p.attempts + 1}/${state.foreman.retries})`;
    case 'escalated':
      return `Foreman gave up after ${p.attempts} tries. Needs you`;
    case 'fixed':
      if (p.fixedBy === 'self') return 'Worked itself loose';
      return p.fixedBy === 'foreman' ? (p.attempts > 1 ? `Fixed by the foreman on try ${p.attempts}` : 'Fixed by the foreman') : 'Fixed by you';
  }
}

function req(state: GameState, counterId: CounterId, goal: number): Req {
  return { label: COUNTER_LABEL[counterId](goal.toLocaleString('en-US')), cur: Math.min(counter(state, counterId), goal), goal };
}

function lodgeSnap(state: GameState): LodgeSnapshot {
  const n = nextLodge(state);
  const cur = lodgeDef(state.lodge);
  if (!n) return { level: state.lodge, name: cur.name, next: null };
  const price = { coins: new Decimal(n.coins), feathers: new Decimal(n.feathers) };
  return {
    level: state.lodge,
    name: cur.name,
    next: {
      level: n.level,
      name: n.name,
      // Coins (and feathers) are the gate, plus kinds of bird to keep exploring worthwhile.
      reqs: [
        { label: `Save ${n.coins.toLocaleString('en-US')} coins`, cur: Math.min(state.currencies.coins.toNumber(), n.coins), goal: n.coins },
        { label: `Save ${n.feathers.toLocaleString('en-US')} feathers`, cur: Math.min(state.currencies.feathers.toNumber(), n.feathers), goal: n.feathers },
        req(state, 'species', n.species),
      ],
      price,
      ready: lodgeReady(state),
      affordable: canBuildLodge(state),
      points: n.points,
    },
  };
}

function planSnap(state: GameState, id: BotId): PlanSnapshot {
  const p = PLANS[id];
  return { earned: !!state.plans[id], open: state.lodge >= p.lodge, lodgeName: lodgeDef(p.lodge).name, req: req(state, p.counter, p.count) };
}

function spreadSnap(state: GameState, g: GroundId): HudSnapshot['spreads']['marsh'] {
  const decoys = spreadSize(state, g);
  const base = GROUND_PARAMS[g].baseSpreadSize;
  const price = decoyBagPrice(state, g);
  return { decoys, draw: Math.pow(decoys / base, DECOYS.drawExponent), price, affordable: canAfford(state, price) && groundOpen(state, g), gain: groundOpen(state, g) ? decoyGain(state, g) : 0 };
}

function rungSnap(state: GameState, id: RungId): RungSnapshot {
  const r = RUNGS[id];
  const price = rungPrice(id);
  const reqs: Req[] = [
    { label: `Build the ${lodgeDef(r.lodge).name}`, cur: Math.min(state.lodge, r.lodge), goal: r.lodge },
    ...(r.rig ? [] : [{ label: `Own ${r.owned} ${BOTS[r.bot].name}s`, cur: Math.min(state.bots[r.bot].owned, r.owned), goal: r.owned }]),
    req(state, r.counter, r.count),
  ];
  const built = !!state.rungs[id];
  const ready = rungReady(state, id);
  return {
    id, name: r.name, blurb: r.blurb, effect: r.effect, tier: r.tier, built, ready, price,
    affordable: ready && canAfford(state, price), reqs,
  };
}

function drawLabel(d: Draw): string {
  if ('upgrade' in d) return UPGRADES[d.upgrade].name;
  if ('rung' in d) return RUNGS[d.rung].name;
  if ('crop' in d) return `${d.crop.map((c) => CROPS[c].name).join(' or ')} (food plot)`;
  return d.flyway.map((f) => FLYWAYS[f].name).join(' or ');
}

const HELPER: Partial<Record<JobId, BotId>> = {
  log: 'ledger', retrieve: 'retriever', shoot: 'blind', call: 'caller', decoys: 'setter',
  fRetrieve: 'fieldDog', fShoot: 'layout', flag: 'flagger', fDecoys: 'staker',
};

/** Which job is backing up, and which bot would help. */
function crewNote(state: GameState): string | null {
  for (const [job, bot] of Object.entries(HELPER) as [JobId, BotId][]) {
    if ((job.startsWith('f') || job === 'flag') && !fieldOpen(state)) continue;
    const q = queueFor(state, job);
    if (!q.backedUp) continue;
    const who = state.plans[bot] ? `More ${BOTS[bot].name}s would help.` : `Earn the ${BOTS[bot].name} plans to get help.`;
    return `${JOBS[job].name} is backing up (${q.text}). ${who}`;
  }
  return null;
}

export interface ClosePreview {
  starsAfter: number;
  bonusNow: number;
  bonusAfter: number;
  /** Perks you could buy right after closing. */
  perks: PerkId[];
  /** Birds the next flyway brings that you haven't found yet. */
  newBirds: SpeciesId[];
}

function closePreview(state: GameState, starsNow: number): ClosePreview {
  const starsAfter = state.legacy.stars + starsNow;
  const owned = (id: PerkId) => perkRank(state, id) > 0;
  const perks = PERK_ORDER.filter((id) => perkRank(state, id) < perkMaxRank(id) && branchOpen(state, PERKS[id].branch) && perkCost(id, perkRank(state, id)) <= starsAfter && PERKS[id].requires.every(owned));
  const fly = nextFlyway(state);
  const newBirds = SPECIES_ORDER.filter((sp) => {
    if ((state.guide[sp]?.count ?? 0) > 0) return false;
    const need = SPECIES_DRAW[sp];
    const fw = need?.find((d) => 'flyway' in d);
    return !!fw && 'flyway' in fw && fw.flyway.includes(fly) && !fw.flyway.includes(state.flyway);
  });
  return {
    starsAfter,
    bonusNow: PRESTIGE.bonusPerStar * state.legacy.earned,
    bonusAfter: PRESTIGE.bonusPerStar * (state.legacy.earned + starsNow),
    perks,
    newBirds,
  };
}

export function snapshot(state: GameState): HudSnapshot {
  const realBirdsPerMin = calibrate(state);
  const c = clockAt(state.clock.dayTime);
  const bots = {} as Record<BotId, BotSnapshot>;
  for (const id of BOT_ORDER) {
    const b = state.bots[id];
    const price = botPrice(id, b.owned, 1, botPriceMult(state, id));
    const lp = levelPrice(id, b.level);
    let rate = 0;
    let st = 0;
    for (const j of JOB_ORDER) st += stuck(state, id, j);
    for (const j of JOB_ORDER) rate += contribution(state, id, j);
    bots[id] = {
      id,
      owned: b.owned,
      level: b.level,
      rate,
      unitSpeed: botUnitSpeed(id, b.level),
      reliability: botReliability(id, b.level),
      multiplier: milestoneMultiplier(b.owned),
      nextMilestone: nextMilestone(b.owned),
      price,
      affordable: canAfford(state, price),
      maxAffordable: maxAffordableBots(state, id),
      levelPrice: lp,
      levelAffordable: b.owned > 0 && canAfford(state, lp),
      revealed: b.owned > 0 || state.stats.lifetimeCoins.gte(BOTS[id].revealAtCoins),
      stuck: st,
      bench: assigned(state, id, 'bench'),
      gain: BIRD_JOBS.has(BOTS[id].job) ? botGain(state, id) : null,
    };
  }

  const jobs = {} as Record<JobId, JobSnapshot>;
  for (const j of JOB_ORDER) {
    const q = queueFor(state, j);
    const tokens: JobToken[] = [];
    for (const id of BOT_ORDER) {
      const n = assigned(state, id, j);
      if (n > 0) tokens.push({ bot: id, count: n, stuck: stuck(state, id, j) });
    }
    const m = state.metrics.jobs[j];
    jobs[j] = {
      id: j,
      name: JOBS[j].name,
      blurb: JOBS[j].blurb,
      rate: jobRate(state, j) + (j === 'log' ? LEDGER.keeperRate : 0),
      throughput: throughput(state, j),
      queue: q.text,
      backedUp: q.backedUp,
      success: successRate(state, j),
      spark: [...m.done],
      fails: [...m.fail],
      tokens,
      manual: j === 'log' ? `Ray logs ${LEDGER.keeperRate}/s` : j === 'foreman' || j === 'tinker' || j === 'scout' ? null : 'You, by hand',
    };
  }

  const rows: ProblemRow[] = [];
  const order = { escalated: 0, open: 1, retrying: 2, fixed: 3 } as const;
  for (const p of [...state.problems.open].sort((a, b) => order[a.status] - order[b.status] || b.at - a.at)) {
    rows.push(row(state, p));
  }
  for (let i = state.problems.closed.length - 1; i >= 0; i--) rows.push(row(state, state.problems.closed[i]!));
  const needsYou = state.problems.open.filter((p) => p.status === 'escalated' || (p.status === 'open' && state.bots.foreman.owned === 0)).length;

  const ap = acrePrice(state.acres);
  const goal = currentGoal(state);
  const env = state.environment;
  const changeClock = clockAt(state.clock.dayTime + Math.max(0, env.weatherUntil - state.elapsed));
  return {
    day: state.clock.day,
    clock: formatClock(c.hour),
    phaseId: c.phase.id,
    phaseLabel: c.phase.label,
    hour: c.hour,
    activity: duckActivityAt(c.hour),
    wind: state.environment.wind,
    coins: state.currencies.coins,
    feathers: state.currencies.feathers,
    bag: state.hunt.bag,
    bestBag: state.stats.bestBag,
    lifetimeBirds: state.stats.lifetimeBirds,
    lostToday: state.stats.lostToday,
    decoys: state.hunt.decoys,
    spread: spreadSize(state),
    incoming: state.hunt.incoming.length,
    committed: state.hunt.committed.length,
    downed: state.hunt.downed.length,
    ledger: state.hunt.ledger.length,
    rhythm: {
      level: state.hunt.rhythm,
      bonus: Math.round(state.hunt.rhythm * RHYTHM.maxBonus * 100),
      rising: rhythmTarget(state) > state.hunt.rhythm + 0.005,
      snag: rhythmSnag(state),
      crew: BOT_ORDER.some((id) => state.bots[id].owned > 0),
    },
    reputation: reputationMultiplier(state),
    keeperRate: LEDGER.keeperRate,
    can: {
      decoys: canDo(state, 'decoys'),
      call: canDo(state, 'call'),
      shoot: canDo(state, 'shoot'),
      retrieve: canDo(state, 'retrieve'),
      log: canDo(state, 'log'),
    },
    auto: {
      decoys: jobRate(state, 'decoys'),
      call: jobRate(state, 'call'),
      shoot: jobRate(state, 'shoot'),
      retrieve: jobRate(state, 'retrieve'),
      log: jobRate(state, 'log'),
    },
    field: {
      open: fieldOpen(state),
      decoys: state.field.decoys,
      spread: spreadSize(state, 'field'),
      incoming: state.field.incoming.length,
      committed: state.field.committed.length,
      downed: state.field.downed.length,
      can: { decoys: canDo(state, 'fDecoys'), call: canDo(state, 'flag'), shoot: canDo(state, 'fShoot'), retrieve: canDo(state, 'fRetrieve') },
      auto: { decoys: jobRate(state, 'fDecoys'), call: jobRate(state, 'flag'), shoot: jobRate(state, 'fShoot'), retrieve: jobRate(state, 'fRetrieve') },
    },
    bots,
    jobs,
    crewNote: crewNote(state),
    problems: rows,
    openProblems: state.problems.open.length,
    needsYou,
    problemStats: {
      total: state.problems.total,
      byYou: state.problems.fixedByYou,
      byForeman: state.problems.fixedByForeman,
      escalated: state.problems.escalated,
    },
    foreman: {
      retries: state.foreman.retries,
      backoff: state.foreman.backoff,
      chance: retryChance(state),
      delays: Array.from({ length: state.foreman.retries }, (_, i) => retryDelay(state, i)),
      capacity: foremanCapacity(state),
      hired: state.bots.foreman.owned > 0,
    },
    weather: {
      id: env.weather,
      name: WEATHER[env.weather].name,
      blurb: WEATHER[env.weather].blurb,
      next: env.nextWeather,
      nextName: WEATHER[env.nextWeather].name,
      changeAt: formatClock(changeClock.hour),
    },
    guide: SPECIES_ORDER.map((id) => ({
      id,
      count: state.guide[id]?.count ?? 0,
      found: (state.guide[id]?.count ?? 0) > 0,
      available: speciesAvailable(state, id),
      draws: speciesNeeds(id).map(drawLabel).join(' + '),
    })),
    speciesFound: SPECIES_ORDER.filter((id) => (state.guide[id]?.count ?? 0) > 0).length,
    achievements: ACHIEVEMENTS.map((a) => ({ id: a.id, unlocked: state.achievements[a.id] !== undefined })),
    patches: Object.keys(state.achievements).length,
    upgrades: UPGRADE_ORDER.map((id) => {
      const level = state.upgrades[id] ?? 0;
      const price = upgradePrice(id, level);
      const max = UPGRADES[id].maxLevel;
      return {
        id, level, max, price,
        affordable: level < max && state.lodge >= UPGRADES[id].lodge && canAfford(state, price),
        revealed: level > 0 || state.lodge >= UPGRADES[id].lodge,
        lodgeName: lodgeDef(UPGRADES[id].lodge).name,
        lodge: UPGRADES[id].lodge,
        gain: level < max && (level > 0 || state.lodge >= UPGRADES[id].lodge) ? upgradeGain(state, id) : 0,
      };
    }),
    lodge: lodgeSnap(state),
    profile: { ...state.profile },
    patchBonus: patchMultiplier(state) - 1,
    guests: {
      open: state.lodge >= GUESTS.fromLodge,
      board: state.guests.board.map((r) => ({
        id: r.id, who: r.who, text: requestText(r), progress: r.progress, target: r.target, coins: r.coins, feathers: r.feathers,
        ready: r.progress >= r.target, daysLeft: Math.max(0, r.expires - state.clock.day),
      })),
      served: state.guests.served,
      toNextLine: GUESTS.bookEvery - (state.guests.served % GUESTS.bookEvery),
      bookBonus: GUESTS.bookBonus * Math.floor(state.guests.served / GUESTS.bookEvery),
    },
    volley: {
      unlocked: state.volley.unlocked,
      charge: state.volley.charge,
      ready: state.volley.unlocked && state.volley.charge >= 1,
      busy: busyMarsh(state),
      birdsRate: state.volley.birdsRate,
      coinsRate: state.volley.coinsRate,
      feathersRate: state.volley.feathersRate,
      payout: volleyPayout(state),
    },
    calendar: (() => {
      const st = stageFor(state.clock.day);
      const d = stageDay(state.clock.day);
      return { id: st.id, name: st.name, blurb: st.blurb, day: d.day, of: d.of, nextName: CALENDAR[(stageIndex(state.clock.day) + 1) % CALENDAR.length]!.name };
    })(),
    carvings: CARVING_ORDER.map((id) => ({ id, status: carvingStatus(state, id), affordable: canAffordCarving(state, id) })),
    maxCircling: maxIncoming(state),
    spreads: {
      marsh: spreadSnap(state, 'marsh'),
      field: spreadSnap(state, 'field'),
      timber: spreadSnap(state, 'timber'),
      bay: spreadSnap(state, 'bay'),
    },
    grounds: GROUND_ORDER.map((id) => ({ id, name: GROUND_NAMES[id], open: groundOpen(state, id), lodgeName: lodgeDef(GROUND_LODGE[id]).name })),
    plots: {
      open: plotCount(state.lodge),
      nextLodgeName: plotCount(state.lodge) < 4 ? lodgeDef(Math.max(2, state.lodge + 1)).name : null,
      list: state.plots.slice(0, plotCount(state.lodge)).map((p, i) => ({
        crop: p.crop,
        growth: p.growth,
        options: cropsFor(state.flyway).map((c) => ({ crop: c, price: cropPrice(c, i), affordable: canPlant(state, i, c) })),
      })),
    },
    plans: Object.fromEntries(BOT_ORDER.map((id) => [id, planSnap(state, id)])) as Record<BotId, PlanSnapshot>,
    ladder: Object.fromEntries(BOT_ORDER.map((id) => [id, ladderFor(id).map((r) => rungSnap(state, r.id))])) as Record<BotId, RungSnapshot[]>,
    offlineHours: offlineCapSeconds(state) / 3600,
    unlocks: Object.fromEntries(FEATURE_ORDER.map((f) => [f, state.unlocks[f] !== undefined])) as Record<FeatureId, boolean>,
    featureProgress: Object.fromEntries(FEATURE_ORDER.map((f) => [f, FEATURES[f].progress(state)])) as Record<FeatureId, [number, number]>,
    training: trainingSnap(state),
    dog: {
      level: state.dog.level,
      max: DOG_MAX,
      next: dogNext(state),
      skills: DOG_SKILLS.map((k) => ({ ...k, has: state.dog.level >= k.level })),
    },
    season: (() => {
      const starsNow = starsFor(state.season.coins);
      const next = coinsForNextStar(state.season.coins);
      const prev = new Decimal(PRESTIGE.divisor).mul(starsNow * starsNow);
      const span = next.sub(prev);
      return {
        number: state.season.number,
        coins: state.season.coins,
        starsNow,
        nextStarAt: next,
        progress: Math.max(0, Math.min(1, state.season.coins.sub(prev).div(span).toNumber())),
        flyway: state.flyway,
        nextFlyway: nextFlyway(state),
        preview: closePreview(state, starsNow),
      };
    })(),
    legacy: {
      stars: state.legacy.stars,
      earned: state.legacy.earned,
      bonus: PRESTIGE.bonusPerStar * state.legacy.earned,
      perks: PERK_ORDER.map((id) => ({
        id,
        owned: perkRank(state, id) > 0,
        rank: perkRank(state, id),
        maxRank: perkMaxRank(id),
        nextCost: perkCost(id, perkRank(state, id)),
        canBuy: canBuyPerk(state, id),
        prereqsMet: PERKS[id].requires.every((q) => !!state.legacy.perks[q]),
      })),
      branches: BRANCH_ORDER.map((id) => ({ id, open: branchOpen(state, id) })),
      respec: { can: canRespec(state), stars: starsInPerks(state) },
      mastery: Object.fromEntries(FLYWAY_ORDER.map((f) => [f, { rows: masteryRows(state, f).map((r) => ({ ...r })), mastered: !!state.mastery[f]?.mastered }])),
    },
    flyways: FLYWAY_ORDER.map((id) => {
      const i = FLYWAY_ORDER.indexOf(id);
      const cur = FLYWAY_ORDER.indexOf(state.flyway);
      const status = id === state.flyway ? 'current' : !FLYWAYS[id].available ? 'soon' : i < cur ? 'visited' : id === nextFlyway(state) ? 'next' : 'locked';
      return { id, status } as const;
    }),
    acres: state.acres,
    acrePrice: ap,
    birdsPerMin: realBirdsPerMin,
    ...buyGuide(state, bots, ap),
    acreAffordable: canAfford(state, ap),
    lifetimeCoins: state.stats.lifetimeCoins,
    goalId: goal.goal.id,
    goalTitle: goal.goal.title,
    specialDay: state.environment.special ?? null,
    goalProgress: goal.goal.progress ? Math.max(0, Math.min(1, goal.goal.progress(state))) : null,
    goalGus: goal.goal.gus,
    goalIndex: goal.index,
  };
}

function row(state: GameState, p: Problem): ProblemRow {
  return {
    id: p.id,
    bot: p.bot,
    title: PROBLEMS[p.kind as ProblemKind].title,
    status: p.status,
    statusText: statusText(state, p),
    ago: Math.max(0, state.elapsed - (p.closedAt ?? p.at)),
    needsYou: p.status === 'escalated' || (p.status === 'open' && state.bots.foreman.owned === 0),
  };
}

export const MAX_COMMITTED = HUNT.maxCommitted;
export const SPECIES_DEFS = SPECIES;
export const FOREMAN_LIMITS = FOREMAN;

export function activityLabel(a: number): string {
  if (a > 0.8) return 'Ducks are flying!';
  if (a > 0.55) return 'Lots of activity';
  if (a > 0.3) return 'Steady';
  if (a > 0.12) return 'Quiet';
  return 'Resting';
}

export function windLabel(w: number): string {
  if (w > 0.65) return 'Gusty';
  if (w > 0.45) return 'Breezy';
  if (w > 0.25) return 'Light breeze';
  return 'Calm';
}

function trainingSnap(state: GameState): HudSnapshot['training'] {
  const ev = workflowEval(state);
  const effects: string[] = [];
  if (ev.bonus > 0) effects.push(`+${Math.round(ev.bonus * 100)}% speed for every hunt job`);
  for (const [j, m] of Object.entries(ev.jobSpeed)) if ((m ?? 1) > 1) effects.push(`${JOBS[j as JobId]?.name ?? j} +${Math.round(((m ?? 1) - 1) * 100)}%`);
  if (ev.fogFlockRate > 1) effects.push(`+${Math.round((ev.fogFlockRate - 1) * 100)}% flocks in fog`);
  if (ev.rareMult > 1) effects.push(`Rare birds ×${ev.rareMult.toFixed(1)}`);
  if (ev.dawnSpeed > 0) effects.push(`+${Math.round(ev.dawnSpeed * 100)}% speed at sunrise`);
  if (ev.noIce) effects.push('No icy calls; more birds in cold fronts');
  const fewer = Object.keys(ev.problemMult).length;
  if (fewer > 0) effects.push(`Fewer snags at ${fewer} job${fewer > 1 ? 's' : ''}`);
  return {
    skills: TRAINING_ORDER.map((id) => ({ id, status: trainingStatus(state, id), affordable: canAffordTraining(state, id) })),
    effects,
  };
}

/** Crew whose work brings birds in (the rest keep the lodge running). */
const BIRD_JOBS = new Set<JobId>(['scout', 'call', 'shoot', 'retrieve', 'flag', 'fShoot', 'fRetrieve', 'tHunt', 'bHunt']);

/** Birds a minute, what limits each ground, and the best-value buy. */
function buyGuide(state: GameState, bots: Record<BotId, BotSnapshot>, acrePrice: Price) {
  const limits: Partial<Record<GroundId, 'flocks' | 'call' | 'shoot' | 'fetch' | 'crew'>> = {};
  for (const g of GROUND_ORDER) if (groundOpen(state, g)) limits[g] = groundBirdsPerMinute(state, g).limit;
  const acre = acreGain(state);
  const options: { key: string; gain: number; coins: number; label: string; price: Price }[] = [];
  for (const id of BOT_ORDER) {
    const b = bots[id];
    if (b.gain && state.plans[id]) options.push({ key: `bot:${id}`, gain: b.gain, coins: b.price.coins.toNumber(), label: BOTS[id].name, price: b.price });
  }
  for (const g of GROUND_ORDER) {
    if (!groundOpen(state, g)) continue;
    const dp = decoyBagPrice(state, g);
    options.push({ key: `decoys:${g}`, gain: decoyGain(state, g), coins: dp.coins.toNumber(), label: g === 'marsh' ? 'Decoys' : `${GROUND_NAMES[g]} decoys`, price: dp });
  }
  if (state.unlocks.upgrades !== undefined) options.push({ key: 'acre', gain: acre, coins: acrePrice.coins.toNumber(), label: 'Wetland Acre', price: acrePrice });
  let best: string | null = null;
  let bestValue = 0;
  for (const o of options) {
    const v = o.gain / Math.max(1, o.coins);
    if (o.gain > 0.05 && v > bestValue) {
      bestValue = v;
      best = o.key;
    }
  }
  return { limits, acreGain: acre, bestBuy: best };
}
