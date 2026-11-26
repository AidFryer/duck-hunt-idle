import Decimal from 'break_infinity.js';
import { BOT_ORDER } from '../data/economy';
import { normalizeAssignments } from './jobs';
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
};

const DECIMAL_PATHS: [keyof GameState, string][] = [
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
