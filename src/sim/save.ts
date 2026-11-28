import { evaluateWorkflow } from './workflow';
import type { WorkflowLink, WorkflowNode } from './state';
import { LODGE_LEVELS } from '../data/progression';
import { PRESTIGE } from '../data/legacy';
import Decimal from 'break_infinity.js';
import { BOT_ORDER } from '../data/economy';
import { normalizeAssignments } from './jobs';
import { checkUnlocks } from './achievements';
import { createInitialState, SAVE_VERSION, type GameState } from './state';

/**
 * Save format: JSON with Decimals stored as strings, wrapped as
 * { v: <version>, s: <state> }. Older versions are upgraded step by step
 * through MIGRATIONS, so old saves keep loading as the game grows.
 */

type Json = Record<string, unknown>;

/** MIGRATIONS[n] upgrades a version-n state object to version n+1. */
const MIGRATIONS: Record<number, (s: Json) => Json> = {
  // v1 (Phase 1) had only the clock and environment.
  1: (s) => {
    const fresh = toPlain(createInitialState((s.environment as Json | undefined)?.seed as number | undefined));
    return { ...fresh, ...s, version: 2 };
  },
  // v2 (Phase 2) had no job assignments, ledger or problems. Every owned
  // bot starts on its home job (normalizeAssignments does that on load).
  2: (s) => {
    const bots = (s.bots ?? {}) as Record<string, Json>;
    for (const b of Object.values(bots)) delete b.progress;
    return { ...s, version: 3 };
  },
  // v3 (Phase 3) → v4 adds species, weather spells, upgrades and achievements.
  // Birds already harvested were all mallards, so seed the Field Guide.
  3: (s) => {
    const stats = (s.stats ?? {}) as Json;
    const birds = typeof stats.lifetimeBirds === 'number' ? stats.lifetimeBirds : 0;
    const guide = birds > 0 ? { mallard: { count: birds, firstAt: 0 } } : {};
    return { ...s, guide, version: 4 };
  },
  // v4 (Phase 4) → v5 adds seasons, legacy, flyways and workflows.
  // Coins earned so far count toward the first season.
  4: (s) => {
    const stats = (s.stats ?? {}) as Json;
    return { ...s, season: { number: 1, coins: stats.lifetimeCoins ?? '0' }, version: 5 };
  },
  // v5 → v6 adds feature stages. Players from before get what they've earned, quietly.
  5: (s) => ({ ...s, silentUnlocks: true, version: 6 }),
  // v6 → v7 adds tap streaks and the daily First Light gift. Existing players
  // get a gift on their next visit (fresh games skip the very first day).
  6: (s) => {
    const meta = (s.meta ?? {}) as Json;
    return { ...s, meta: { ...meta, lastDailyBonus: 'before-v7' }, version: 7 };
  },
  // v7 → v8 adds the lodge, bot plans and the automation ladder. Players keep
  // what they'd opened: the lodge level matches their open tabs, and any bot
  // kind they already own comes with its plans.
  7: (s) => {
    const unlocks = (s.unlocks ?? {}) as Record<string, unknown>;
    const bots = (s.bots ?? {}) as Record<string, { owned?: number }>;
    let lodge = unlocks.legacy !== undefined ? 5 : unlocks.workflows !== undefined ? 4 : unlocks.jobs !== undefined ? 3 : unlocks.bots !== undefined ? 2 : 1;
    if (s.silentUnlocks) {
      // Very old saves never had stages: judge by what they'd earned.
      const coins = Number((s.stats as Json | undefined)?.lifetimeCoins ?? 0);
      const crew = Object.values(bots).reduce((a, b) => a + (b?.owned ?? 0), 0);
      lodge = coins >= 25_000 ? 4 : crew >= 15 ? 3 : coins >= 20 ? 2 : 1;
    }
    const plans: Record<string, true> = {};
    for (const [id, b] of Object.entries(bots)) if ((b?.owned ?? 0) > 0) plans[id] = true;
    if (lodge >= 2) unlocks.upgrades ??= unlocks.bots;
    return { ...s, unlocks, lodge, plans, rungs: {}, version: 8 };
  },
  // v8 → v9 adds the goose field; its state comes from the defaults.
  8: (s) => ({ ...s, version: 9 }),
  // v9 → v10 retires the Job Board: every bot goes back to its own job.
  9: (s) => {
    const { assign: _gone, ...rest } = s;
    void _gone;
    return { ...rest, version: 10 };
  },
  // v10 → v11 adds the player profile (defaults fill it in).
  10: (s) => ({ ...s, version: 11 }),
  // v11 → v12 turns the Rice and Millet upgrades into planted food plots.
  11: (s) => {
    const up = (s.upgrades ?? {}) as Record<string, number>;
    const plots: { crop: string | null; growth: number }[] = [0, 1, 2, 3].map(() => ({ crop: null, growth: 0 }));
    let i = 0;
    for (const c of ['millet', 'rice']) if ((up[c] ?? 0) > 0 && i < 4) plots[i++] = { crop: c, growth: 1 };
    return { ...s, plots, version: 12 };
  },
  // v12 → v13: decoys stay out now. Decoy Setters and Stakers retire and
  // become bags of decoys for the spread they kept.
  12: (s) => {
    const bots = (s.bots ?? {}) as Record<string, { owned?: number; level?: number }>;
    const setters = bots.setter?.owned ?? 0;
    const stakers = bots.staker?.owned ?? 0;
    for (const id of ['setter', 'staker']) if (bots[id]) bots[id] = { owned: 0, level: 1 };
    const { assign: _gone, ...rest } = s;
    void _gone;
    return { ...rest, bots, decoyBags: { marsh: setters, field: stakers }, version: 13 };
  },
  // v14: decoy collection, Big Volley, dog name & breed, season calendar stats (defaults fill in).
  13: (s) => ({ ...s, version: 14 }),
  // v15: the slower, weeks-long economy. Keep everything built and found;
  // trim banked coins and feathers to fit the new, higher prices.
  14: (s) => {
    const lodge = typeof s.lodge === 'number' ? s.lodge : 1;
    const next = LODGE_LEVELS[lodge];
    const capCoins = next ? next.coins * 0.1 : PRESTIGE.divisor * 0.02;
    const capFeathers = next ? next.feathers * 0.1 : (LODGE_LEVELS[LODGE_LEVELS.length - 1]?.feathers ?? 0) * 0.1;
    const cur = (s.currencies ?? {}) as Json;
    const trim = (v: unknown, cap: number) => {
      const n = Number(v);
      return String(Number.isFinite(n) ? Math.min(n, cap) : 0);
    };
    return { ...s, currencies: { ...cur, coins: trim(cur.coins, capCoins), feathers: trim(cur.feathers, capFeathers) }, version: 15 };
  },
  // v16: lodge rooms (renamed upgrades, same ids) and guest bookings (defaults fill in).
  15: (s) => ({ ...s, version: 16 }),
  // v17: Crew Training replaces the workflow board; what the board did carries over as skills.
  16: (s) => {
    const wf = (s.workflow ?? { nodes: [], links: [] }) as { nodes: WorkflowNode[]; links: WorkflowLink[] };
    const ev = evaluateWorkflow(wf.nodes ?? [], wf.links ?? []);
    const kinds = new Set((wf.nodes ?? []).map((n) => n.kind));
    const t: Record<string, true> = {};
    if (ev.goodLinks >= 2 || ev.complete) t.tOrder = true;
    if (ev.complete) t.tSignals = true;
    if (kinds.has('fogBonus')) Object.assign(t, { cDuet: true, cFog: true });
    if (kinds.has('dawnRush')) Object.assign(t, { cDuet: true, cFog: true, cDawn: true });
    if (kinds.has('coldPrep')) Object.assign(t, { bSteady: true, bCold: true });
    if (kinds.has('doubleCheck')) Object.assign(t, { rDrill: true, rCheck: true });
    return { ...s, training: t, version: 17 };
  },
  // v18: Flooded Timber and Coastal Bay (new grounds, bags and bots fill in with defaults).
  17: (s) => ({ ...s, version: 18 }),
  // v19: no shape change; marks the fresh start (see FRESH_START_VERSION).
  18: (s) => ({ ...s, version: 19 }),
  // v20: a spot for the online leaderboard identity.
  19: (s) => ({ ...s, online: s.online ?? null, version: 20 }),
  // v21: the tap streak becomes Crew Rhythm (starts empty).
  20: (s) => {
    const hunt = { ...((s.hunt as Json) ?? {}) };
    delete hunt.streak;
    hunt.rhythm = 0;
    return { ...s, hunt, drifterAt: typeof s.elapsed === 'number' ? s.elapsed : 0, version: 21 };
  },
  // v22: perks become ranks (owned = 1); flyways hunted so far open their Legacy branches.
  21: (s) => {
    const legacy = { ...((s.legacy as Json) ?? {}) };
    const perks: Json = {};
    for (const [k, v] of Object.entries((legacy.perks as Json) ?? {})) if (v) perks[k] = typeof v === 'number' ? v : 1;
    const order = ['mississippi', 'central', 'pacific', 'atlantic'];
    const cur = typeof s.flyway === 'string' ? s.flyway : 'mississippi';
    const flyways: Json = { mississippi: true };
    // Seasons move through the flyways in order, so everything up to the current one was hunted.
    for (const f of order.slice(0, Math.max(0, order.indexOf(cur)) + 1)) flyways[f] = true;
    legacy.perks = perks;
    legacy.flyways = flyways;
    legacy.respecSeason = -1;
    return { ...s, legacy, version: 22 };
  },
  // v23: flyway mastery. Flyways already left behind had a season closed there (a star).
  22: (s) => {
    const mastery: Json = {};
    const legacy = (s.legacy as Json) ?? {};
    for (const f of Object.keys((legacy.flyways as Json) ?? {})) {
      if (f !== s.flyway) mastery[f] = { bag: 0, kinds: {}, guests: 0, star: true, mastered: false };
    }
    // …and named days (none today).
    const environment = { ...((s.environment as Json) ?? {}), special: null };
    return { ...s, mastery, environment, version: 23 };
  },
  // v24: crew gear and lodge projects.
  23: (s) => ({ ...s, gear: s.gear ?? {}, projects: s.projects ?? {}, version: 24 }),
  // v25: Crew Gear and Lodge Projects are gone; everything spent on them comes back.
  24: (s) => {
    let coins = 0;
    let feathers = 0;
    const gear: Record<string, [number, number]> = {
      shells: [40, 4], calls: [60, 6], vests: [800, 80], blindPaint: [1200, 100],
      ink: [15000, 1200], decoyPaint: [20000, 1500], lantern: [300000, 25000], featherBags: [250000, 20000],
    };
    for (const [id, lvl] of Object.entries((s.gear as Json) ?? {})) {
      const b = gear[id];
      if (!b || typeof lvl !== 'number') continue;
      for (let i = 0; i < lvl; i++) {
        coins += Math.ceil(b[0] * Math.pow(1.32, i));
        feathers += Math.ceil(b[1] * Math.pow(1.32, i));
      }
    }
    const stages: Record<string, [number, number][]> = {
      boathouse: [[5e4, 5e3], [5e6, 3e5], [5e8, 2e7], [5e10, 1.5e9]],
      carvingShop: [[2e4, 2e3], [2e6, 1.5e5], [2e8, 1e7], [2e10, 1e9]],
      lookout: [[3e4, 3e3], [3e6, 2e5], [3e8, 1.5e7], [3e10, 1.2e9]],
    };
    for (const [id, p] of Object.entries((s.projects as Json) ?? {})) {
      const list = stages[id];
      const pj = p as { stage?: number; coins?: number; feathers?: number };
      if (!list) continue;
      for (let i = 0; i < (pj.stage ?? 0); i++) {
        coins += list[i]?.[0] ?? 0;
        feathers += list[i]?.[1] ?? 0;
      }
      coins += pj.coins ?? 0;
      feathers += pj.feathers ?? 0;
    }
    const cur = { ...((s.currencies as Json) ?? {}) };
    cur.coins = String(Number(cur.coins ?? 0) + coins);
    cur.feathers = String(Number(cur.feathers ?? 0) + feathers);
    const out: Json = { ...s, currencies: cur, version: 25 };
    delete out.gear;
    delete out.projects;
    return out;
  },
};

const DECIMAL_PATHS: [keyof GameState, string][] = [
  ['season', 'coins'],
  ['currencies', 'coins'],
  ['currencies', 'feathers'],
  ['stats', 'lifetimeCoins'],
  ['stats', 'lifetimeFeathers'],
];

/** State → plain JSON-safe object. */
export function toPlain(state: GameState): Json {
  const plain = JSON.parse(JSON.stringify(state, (_k, v) => (v instanceof Decimal ? v.toString() : v))) as Json;
  return plain;
}

/** Plain object (any version) → live GameState. */
export function fromPlain(input: Json): GameState {
  let s = input;
  let v = typeof s.version === 'number' ? s.version : 1;
  if (v > SAVE_VERSION) throw new Error(`This save is from a newer version of the game (v${v}).`);
  while (v < SAVE_VERSION) {
    const m = MIGRATIONS[v];
    if (!m) throw new Error(`No migration from save version ${v}.`);
    s = m(s);
    v += 1;
    s.version = v;
  }
  // Fill any missing fields from a fresh state (defensive against partial saves).
  const base = toPlain(createInitialState());
  const merged = deepMerge(base, s) as Json;
  const bots = merged.bots as Json;
  for (const id of BOT_ORDER) bots[id] = deepMerge((base.bots as Json)[id] as Json, (bots[id] ?? {}) as Json);
  const state = merged as unknown as GameState;
  for (const [group, key] of DECIMAL_PATHS) {
    const g = state[group] as unknown as Record<string, unknown>;
    g[key] = toDecimal(g[key]);
  }
  normalizeAssignments(state);
  const st = state as GameState & { silentUnlocks?: boolean };
  if (st.silentUnlocks) {
    delete st.silentUnlocks;
    for (let i = 0; i < 10; i++) checkUnlocks(state);
  }
  return state;
}

function toDecimal(v: unknown): Decimal {
  const d = new Decimal(typeof v === 'string' || typeof v === 'number' ? v : 0);
  return Number.isFinite(d.mantissa) ? d : new Decimal(0);
}

function deepMerge(base: Json, over: Json): Json {
  const out: Json = { ...base };
  for (const [k, v] of Object.entries(over)) {
    const b = base[k];
    out[k] =
      v && typeof v === 'object' && !Array.isArray(v) && b && typeof b === 'object' && !Array.isArray(b)
        ? deepMerge(b as Json, v as Json)
        : v;
  }
  return out;
}

export function serialize(state: GameState): string {
  return JSON.stringify({ v: SAVE_VERSION, s: toPlain(state) });
}

/** The save version written in a save, without loading it (0 if unreadable). */
export function saveVersionOf(text: string): number {
  try {
    const parsed = JSON.parse(text) as { v?: number; s?: { version?: number } };
    return Number(parsed?.v ?? parsed?.s?.version ?? 0) || 0;
  } catch {
    return 0;
  }
}

export function deserialize(text: string): GameState {
  const parsed = JSON.parse(text) as { v?: number; s?: Json };
  if (!parsed || typeof parsed !== 'object' || !parsed.s) throw new Error('That does not look like a save file.');
  return fromPlain({ ...parsed.s, version: parsed.v ?? parsed.s.version });
}

/** Base64 export string (UTF-8 safe). */
export function exportSave(state: GameState): string {
  const bytes = new TextEncoder().encode(serialize(state));
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin);
}

export function importSave(code: string): GameState {
  const clean = code.trim().replace(/\s+/g, '');
  let text: string;
  try {
    const bin = atob(clean);
    text = new TextDecoder().decode(Uint8Array.from(bin, (c) => c.charCodeAt(0)));
  } catch {
    throw new Error('That save code is not valid. Copy the whole code and try again.');
  }
  try {
    return deserialize(text);
  } catch (e) {
    throw new Error(e instanceof SyntaxError ? 'That save code is damaged or incomplete.' : (e as Error).message);
  }
}
