import { DOG_FX } from '../data/training';
import { BOT_ORDER, BOTS, CROSS_JOB_EFFICIENCY, type BotId, type JobId, type Slot } from '../data/economy';
import { botUnitSpeed, milestoneMultiplier } from './economy';
import type { EventSink } from './events';
import type { GameState } from './state';
import { botSpeedMultiplier } from './upgrades';
import { workflowEval } from './workflow';
import { clockAt } from './clock';
import { rungFx } from './progression';
import { UPGRADE_EFFECTS } from '../data/upgrades';

/** Bots of a type currently placed in a slot (job or bench). */
export function assigned(state: GameState, bot: BotId, slot: Slot): number {
  return state.assign[bot][slot] ?? 0;
}

/** Bots of a type stuck with an unresolved problem at a job. */
export function stuck(state: GameState, bot: BotId, job: JobId): number {
  let n = 0;
  for (const p of state.problems.open) if (p.bot === bot && p.job === job) n++;
  return n;
}

/** Bots actually working a job right now. */
export function working(state: GameState, bot: BotId, job: JobId): number {
  return Math.max(0, assigned(state, bot, job) - stuck(state, bot, job));
}

/** 1 at a bot's home job, CROSS_JOB_EFFICIENCY at allowed others, else 0. */
export function efficiency(bot: BotId, job: JobId): number {
  const d = BOTS[bot];
  if (d.job === job) return 1;
  return d.crossJobs.includes(job) ? CROSS_JOB_EFFICIENCY : 0;
}

export function canWork(bot: BotId, slot: Slot): boolean {
  return slot === 'bench' || efficiency(bot, slot) > 0;
}

/** Actions per second one bot type contributes to a job. */
export function contribution(state: GameState, bot: BotId, job: JobId): number {
  const w = working(state, bot, job);
  if (w === 0) return 0;
  const b = state.bots[bot];
  return w * botUnitSpeed(bot, b.level) * milestoneMultiplier(b.owned) * efficiency(bot, job) * botSpeedMultiplier(state) * pipelineBoost(state, job) * jobGear(state, job);
}

/** Ladder rungs and job-specific upgrades (e.g. the boat house) for a job. */
export function jobGear(state: GameState, job: JobId): number {
  const rung = rungFx(state).jobMult[job] ?? 1;
  const boat = job === 'retrieve' ? 1 + UPGRADE_EFFECTS.boatHouseRetrieve * (state.upgrades.boatHouse ?? 0) : 1;
  const champ = (job === 'retrieve' || job === 'fRetrieve') && state.dog.level >= DOG_FX.championLevel ? DOG_FX.championRetrieve : 1;
  return rung * boat * champ;
}

/** Workflow chain bonus (and Dawn Rush) for hunt jobs. */
export function pipelineBoost(state: GameState, job: JobId): number {
  if (job === 'foreman' || job === 'tinker') return 1;
  const wf = workflowEval(state);
  const dawn = wf.dawnSpeed > 0 && clockAt(state.clock.dayTime).phase.id === 'sunrise' ? 1 + wf.dawnSpeed : 1;
  return wf.speed * dawn * (wf.jobSpeed[job] ?? 1);
}

/** Total actions per second for a job across every bot assigned to it. */
export function jobRate(state: GameState, job: JobId): number {
  let r = 0;
  for (const bot of BOT_ORDER) r += contribution(state, bot, job);
  return r;
}

/** Pick which bot type performs the next action, weighted by contribution. */
export function pickWorker(state: GameState, job: JobId, roll: number): BotId | null {
  const total = jobRate(state, job);
  if (total <= 0) return null;
  let t = roll * total;
  for (const bot of BOT_ORDER) {
    const c = contribution(state, bot, job);
    if (c <= 0) continue;
    if (t < c) return bot;
    t -= c;
  }
  return null;
}

/** Bots of a type in a slot that are free to move (not stuck). */
export function movable(state: GameState, bot: BotId, slot: Slot): number {
  return slot === 'bench' ? assigned(state, bot, 'bench') : working(state, bot, slot);
}

/** Move `count` bots of a type between slots. Returns how many moved. */
export function moveBots(state: GameState, bot: BotId, from: Slot, to: Slot, count = 1, events?: EventSink): number {
  if (from === to || !canWork(bot, to)) return 0;
  const n = Math.min(count, movable(state, bot, from));
  if (n <= 0) return 0;
  const a = state.assign[bot];
  a[from] = (a[from] ?? 0) - n;
  a[to] = (a[to] ?? 0) + n;
  state.stats.botMoves += 1;
  events?.push({ type: 'botMoved', bot, from, to });
  return n;
}

/** Make sure every owned bot is placed somewhere (repairs old or edited saves). */
export function normalizeAssignments(state: GameState): void {
  for (const bot of BOT_ORDER) {
    const a = state.assign[bot] ?? (state.assign[bot] = {});
    let total = 0;
    for (const [slot, v] of Object.entries(a)) {
      const n = Math.max(0, Math.floor(v ?? 0));
      if (!canWork(bot, slot as Slot)) {
        delete a[slot as Slot];
        continue;
      }
      a[slot as Slot] = n;
      total += n;
    }
    const owned = state.bots[bot].owned;
    const home = BOTS[bot].job;
    if (total < owned) a[home] = (a[home] ?? 0) + (owned - total);
    if (total > owned) {
      let extra = total - owned;
      for (const slot of ['bench', ...Object.keys(a)] as Slot[]) {
        const take = Math.min(extra, a[slot] ?? 0);
        a[slot] = (a[slot] ?? 0) - take;
        extra -= take;
        if (extra === 0) break;
      }
    }
  }
}

/** Per-step snapshot of who contributes what to each job (avoids recomputing per action). */
export interface RateTable {
  total: Record<JobId, number>;
  parts: Record<JobId, [BotId, number][]>;
}

export function rateTable(state: GameState): RateTable {
  const total = {} as Record<JobId, number>;
  const parts = {} as Record<JobId, [BotId, number][]>;
  // Count stuck bots once instead of per (bot, job) lookup.
  const stuckBy = new Map<string, number>();
  for (const p of state.problems.open) stuckBy.set(`${p.bot}|${p.job}`, (stuckBy.get(`${p.bot}|${p.job}`) ?? 0) + 1);
  const speed = botSpeedMultiplier(state);
  const wf = workflowEval(state);
  const dawn = wf.dawnSpeed > 0 && clockAt(state.clock.dayTime).phase.id === 'sunrise' ? 1 + wf.dawnSpeed : 1;
  for (const bot of BOT_ORDER) {
    const b = state.bots[bot];
    if (b.owned === 0) continue;
    const unit = botUnitSpeed(bot, b.level) * milestoneMultiplier(b.owned) * speed;
    for (const [slot, n] of Object.entries(state.assign[bot])) {
      if (slot === 'bench' || !n) continue;
      const job = slot as JobId;
      const w = n - (stuckBy.get(`${bot}|${job}`) ?? 0);
      if (w <= 0) continue;
      const pipeline = job !== 'foreman' && job !== 'tinker';
      const c = w * unit * efficiency(bot, job) * (pipeline ? wf.speed * dawn * (wf.jobSpeed[job as JobId] ?? 1) : 1) * jobGear(state, job);
      if (c <= 0) continue;
      (parts[job] ??= []).push([bot, c]);
      total[job] = (total[job] ?? 0) + c;
    }
  }
  return { total, parts };
}

export function pickFrom(t: RateTable, job: JobId, roll: number): BotId | null {
  const list = t.parts[job];
  const total = t.total[job] ?? 0;
  if (!list || total <= 0) return null;
  let x = roll * total;
  for (const [bot, c] of list) {
    if (x < c) return bot;
    x -= c;
  }
  return list[list.length - 1]![0];
}
