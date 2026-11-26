import type { JobId } from '../data/economy';
import {
  JOB_NODE_ORDER, REQUIRED_CHAIN, SPECIAL_ORDER, SPECIALS, WORKFLOW,
  type JobNode, type NodeKind, type SpecialNode,
} from '../data/workflows';
import type { EventSink } from './events';
import type { GameState, WorkflowLink, WorkflowNode } from './state';

export interface WorkflowEval {
  /** Multiplier on every hunt job's bot speed. */
  speed: number;
  /** Percent bonus shown to the player (speed − 1). */
  bonus: number;
  complete: boolean;
  goodLinks: number;
  /** Per link "from>to": good (in order) or tangled. */
  linkState: Record<string, 'good' | 'tangled'>;
  /** Per node id: is this card doing something? */
  active: Record<number, boolean>;
  fogFlockRate: number;
  rareMult: number;
  flockRate: number;
  problemMult: Partial<Record<JobId, number>>;
  dawnSpeed: number;
  coldFlockSize: number;
  noIce: boolean;
}

const isJob = (k: NodeKind): k is JobNode => (JOB_NODE_ORDER as readonly string[]).includes(k);
const order = (k: JobNode) => JOB_NODE_ORDER.indexOf(k);

export const linkKey = (l: WorkflowLink) => `${l.from}>${l.to}`;

/** Pure evaluation of a workflow board. */
export function evaluateWorkflow(nodes: WorkflowNode[], links: WorkflowLink[], mastery = false): WorkflowEval {
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const next = new Map<number, number>();
  const prev = new Map<number, number>();
  for (const l of links) {
    if (byId.has(l.from) && byId.has(l.to)) {
      next.set(l.from, l.to);
      prev.set(l.to, l.from);
    }
  }
  const ev: WorkflowEval = {
    speed: 1, bonus: 0, complete: false, goodLinks: 0, linkState: {}, active: {},
    fogFlockRate: 1, rareMult: 1, flockRate: 1, problemMult: {}, dawnSpeed: 0, coldFlockSize: 0, noIce: false,
  };
  let bonus = 0;
  // Walk every chain from its first card.
  for (const start of nodes) {
    if (prev.has(start.id)) continue;
    const chain: WorkflowNode[] = [];
    const seen = new Set<number>();
    let cur: number | undefined = start.id;
    while (cur !== undefined && !seen.has(cur)) {
      seen.add(cur);
      chain.push(byId.get(cur)!);
      cur = next.get(cur);
    }
    // Links between consecutive job cards (specials in between are skipped over).
    const jobs = chain.filter((n) => isJob(n.kind)) as (WorkflowNode & { kind: JobNode })[];
    for (let i = 0; i + 1 < chain.length; i++) {
      ev.linkState[`${chain[i]!.id}>${chain[i + 1]!.id}`] = 'tangled';
    }
    let good = 0;
    for (let i = 0; i + 1 < jobs.length; i++) {
      const a = jobs[i]!.kind;
      const b = jobs[i + 1]!.kind;
      // In order, and skipping nothing required (Decoys may be skipped).
      const skipped = JOB_NODE_ORDER.slice(order(a) + 1, order(b));
      const ok = order(b) > order(a) && skipped.every((k) => k === 'decoys');
      if (ok) {
        good++;
        // Mark every rope between these two job cards as good.
        const ia = chain.indexOf(jobs[i]!);
        const ib = chain.indexOf(jobs[i + 1]!);
        for (let k = ia; k < ib; k++) ev.linkState[`${chain[k]!.id}>${chain[k + 1]!.id}`] = 'good';
        ev.active[jobs[i]!.id] = true;
        ev.active[jobs[i + 1]!.id] = true;
      }
    }
    ev.goodLinks += good;
    bonus += good * WORKFLOW.perLink;
    const seq = jobs.map((n) => n.kind).filter((k) => k !== 'decoys');
    const complete = REQUIRED_CHAIN.every((k, i) => seq[i] === k) && seq.length === REQUIRED_CHAIN.length && good === jobs.length - 1;
    if (complete) {
      ev.complete = true;
      bonus += WORKFLOW.complete;
      if (jobs.some((n) => n.kind === 'decoys')) bonus += WORKFLOW.decoys;
    }
    // Special cards: active if placed straight after a job they accept.
    for (let i = 0; i < chain.length; i++) {
      const n = chain[i]!;
      if (isJob(n.kind)) continue;
      const def = SPECIALS[n.kind as SpecialNode];
      const before = chain[i - 1];
      const placed = !!before && isJob(before.kind) && (def.after.length === 0 || (def.after as readonly string[]).includes(before.kind));
      if (!placed) continue;
      ev.active[n.id] = true;
      if (complete) bonus += WORKFLOW.perSpecial;
      switch (n.kind as SpecialNode) {
        case 'fogBonus':
          ev.fogFlockRate = WORKFLOW.fogFlockRate;
          break;
        case 'rareFilter':
          ev.rareMult = WORKFLOW.rareMult;
          ev.flockRate *= WORKFLOW.rareFlockRate;
          break;
        case 'doubleCheck':
          ev.problemMult[before!.kind as JobId] = WORKFLOW.doubleCheckProblems;
          break;
        case 'dawnRush':
          ev.dawnSpeed = WORKFLOW.dawnSpeed;
          break;
        case 'coldPrep':
          ev.noIce = true;
          ev.coldFlockSize = WORKFLOW.coldFlockSize;
          break;
      }
    }
  }
  ev.bonus = bonus * (mastery ? 1.5 : 1);
  ev.speed = 1 + ev.bonus;
  return ev;
}

// Cache evaluations by board contents so the sim can ask every tick for free.
let cacheKey = '';
let cacheVal: WorkflowEval | null = null;

export function workflowEval(state: GameState): WorkflowEval {
  const w = state.workflow;
  const key = `${state.legacy.perks.workflowMastery ? 'm' : ''}|${w.nodes.map((n) => `${n.id}:${n.kind}`).join(',')}|${w.links.map(linkKey).join(',')}`;
  if (key !== cacheKey || !cacheVal) {
    cacheKey = key;
    cacheVal = evaluateWorkflow(w.nodes, w.links, !!state.legacy.perks.workflowMastery);
  }
  return cacheVal;
}

export function workflowUnlocked(state: GameState): boolean {
  return state.unlocks.workflows !== undefined || state.lodge >= 4;
}

export function cardUnlocked(state: GameState, kind: NodeKind): boolean {
  if (isJob(kind)) return true;
  const d = SPECIALS[kind];
  return state.stats.lifetimeCoins.gte(d.unlockCoins) && state.stats.seasonsClosed >= d.unlockSeasons;
}

/** Cards in the palette, in display order. */
export const ALL_CARDS: readonly NodeKind[] = [...JOB_NODE_ORDER, ...SPECIAL_ORDER];

// ---------------------------------------------------------------- edits

export function addNode(state: GameState, kind: NodeKind, events?: EventSink): number | null {
  const w = state.workflow;
  if (!workflowUnlocked(state) || !cardUnlocked(state, kind)) return null;
  if (w.nodes.some((n) => n.kind === kind)) return null;
  const id = w.nextId++;
  w.nodes.push({ id, kind });
  events?.push({ type: 'workflowChanged' });
  return id;
}

export function removeNode(state: GameState, id: number, events?: EventSink): boolean {
  const w = state.workflow;
  const before = w.nodes.length;
  w.nodes = w.nodes.filter((n) => n.id !== id);
  w.links = w.links.filter((l) => l.from !== id && l.to !== id);
  if (w.nodes.length === before) return false;
  events?.push({ type: 'workflowChanged' });
  return true;
}

/** Tie a rope from one card to another (each card has one rope in, one out). */
export function connect(state: GameState, from: number, to: number, events?: EventSink): boolean {
  const w = state.workflow;
  if (from === to) return false;
  if (!w.nodes.some((n) => n.id === from) || !w.nodes.some((n) => n.id === to)) return false;
  // No loops: walking forward from `to` must not reach `from`.
  const next = new Map(w.links.map((l) => [l.from, l.to]));
  next.delete(from);
  let cur: number | undefined = to;
  const seen = new Set<number>();
  while (cur !== undefined && !seen.has(cur)) {
    if (cur === from) return false;
    seen.add(cur);
    cur = next.get(cur);
  }
  w.links = w.links.filter((l) => l.from !== from && l.to !== to);
  w.links.push({ from, to });
  events?.push({ type: 'workflowChanged' });
  return true;
}

export function cut(state: GameState, from: number, events?: EventSink): boolean {
  const w = state.workflow;
  const before = w.links.length;
  w.links = w.links.filter((l) => l.from !== from);
  if (w.links.length === before) return false;
  events?.push({ type: 'workflowChanged' });
  return true;
}
