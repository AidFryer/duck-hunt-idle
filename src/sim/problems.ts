import { BOTS, FOREMAN, JOB_PROBLEMS, type BotId, type JobId } from '../data/economy';
import { jobRate, working } from './jobs';
import type { EventSink } from './events';
import { rand, type GameState, type Problem } from './state';
import { workflowEval } from './workflow';

/**
 * Problems ("exceptions"): a bot hits a snag, stops working, and waits for
 * the player to tap-fix it or for a Foreman to retry it.
 */

/** A bot of this type at this job gets stuck. Returns false if none can. */
export function raiseProblem(state: GameState, bot: BotId, job: JobId, events: EventSink): boolean {
  if (working(state, bot, job) <= 0) return false;
  const noIce = workflowEval(state).noIce;
  const kinds = JOB_PROBLEMS[job].filter((k) => k !== 'ice' || (state.environment.weather === 'coldFront' && !noIce));
  if (kinds.length === 0) return false;
  const kind = kinds[Math.floor(rand(state) * kinds.length)]!;
  const p: Problem = {
    id: state.problems.nextId++, bot, job, kind, at: state.elapsed,
    attempts: 0, nextAt: -1, status: 'open',
  };
  state.problems.open.push(p);
  state.problems.total += 1;
  events.push({ type: 'problem', problemId: p.id, bot, job, kind });
  return true;
}

function close(state: GameState, p: Problem, by: 'you' | 'foreman' | 'self', events: EventSink): void {
  const i = state.problems.open.indexOf(p);
  if (i >= 0) state.problems.open.splice(i, 1);
  p.status = 'fixed';
  p.fixedBy = by;
  p.closedAt = state.elapsed;
  state.problems.closed.push(p);
  while (state.problems.closed.length > FOREMAN.logSize) state.problems.closed.shift();
  if (by === 'you') state.problems.fixedByYou += 1;
  else if (by === 'foreman') state.problems.fixedByForeman += 1;
  events.push({ type: 'problemFixed', problemId: p.id, bot: p.bot, by });
}

/** Player fixes a specific problem. */
export function fixProblem(state: GameState, id: number, events: EventSink): boolean {
  const p = state.problems.open.find((x) => x.id === id);
  if (!p) return false;
  close(state, p, 'you', events);
  return true;
}

/** Player taps a stuck bot in the scene: fix that type's most urgent problem. */
export function fixBot(state: GameState, bot: BotId, events: EventSink): boolean {
  const open = state.problems.open.filter((p) => p.bot === bot);
  if (open.length === 0) return false;
  const p = open.find((x) => x.status === 'escalated') ?? open[0]!;
  close(state, p, 'you', events);
  return true;
}

export function fixAll(state: GameState, events: EventSink): number {
  const all = [...state.problems.open];
  for (const p of all) close(state, p, 'you', events);
  return all.length;
}

/** Chance one foreman retry works, given the current settings. */
export function retryChance(state: GameState): number {
  const lvl = state.bots.foreman.level;
  return Math.min(
    FOREMAN.successCap,
    FOREMAN.successBase + FOREMAN.successPerBackoff * state.foreman.backoff + FOREMAN.successPerLevel * (lvl - 1),
  );
}

/** Seconds until retry number `attempt` (0-based), after level speed-ups. */
export function retryDelay(state: GameState, attempt: number): number {
  const lvl = state.bots.foreman.level;
  const speed = 1 + BOTS.foreman.levelSpeedBonus * (lvl - 1);
  return (state.foreman.backoff * Math.pow(2, attempt)) / speed;
}

/** How many problems the foremen can work on at once. */
export function foremanCapacity(state: GameState, rate = jobRate(state, 'foreman')): number {
  return rate <= 0 ? 0 : Math.max(1, Math.floor(rate));
}

export function setForemanSettings(state: GameState, retries: number, backoff: number): void {
  state.foreman.retries = Math.round(Math.min(FOREMAN.retriesMax, Math.max(FOREMAN.retriesMin, retries)));
  state.foreman.backoff = Math.round(Math.min(FOREMAN.backoffMax, Math.max(FOREMAN.backoffMin, backoff)));
}

/** Foremen pick up open problems and retry them with exponential backoff. */
export function stepForemen(state: GameState, events: EventSink, rate?: number): void {
  if (state.problems.open.length === 0) return;
  // Once you've learned the trade (Foreman plans earned), a stuck bot left
  // alone long enough works itself loose, so snags never pile up.
  if (state.plans.foreman) {
    for (const p of [...state.problems.open]) {
      if (state.elapsed - p.at >= FOREMAN.selfFixSeconds) close(state, p, 'self', events);
    }
    if (state.problems.open.length === 0) return;
  }
  const cap = foremanCapacity(state, rate);
  const now = state.elapsed;
  let busy = state.problems.open.filter((p) => p.status === 'retrying').length;
  if (cap === 0) {
    // No foreman on duty: anything mid-retry waits for the player.
    for (const p of state.problems.open) if (p.status === 'retrying') p.status = 'open';
    return;
  }
  for (const p of [...state.problems.open]) {
    if (p.status === 'open' && busy < cap) {
      p.status = 'retrying';
      p.nextAt = now + retryDelay(state, p.attempts);
      busy++;
    }
    if (p.status === 'retrying' && now >= p.nextAt) {
      p.attempts += 1;
      const ok = rand(state) < retryChance(state);
      events.push({ type: 'problemRetry', problemId: p.id, bot: p.bot, attempt: p.attempts, ok });
      if (ok) {
        close(state, p, 'foreman', events);
      } else if (p.attempts >= state.foreman.retries) {
        p.status = 'escalated';
        state.problems.escalated += 1;
        events.push({ type: 'problemEscalated', problemId: p.id, bot: p.bot });
      } else {
        p.nextAt = now + retryDelay(state, p.attempts);
      }
    }
  }
}
