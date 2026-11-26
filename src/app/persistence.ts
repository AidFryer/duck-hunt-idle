import { SAVE_KEY } from '../config';
import { deserialize, serialize } from '../sim/save';
import type { GameState } from '../sim/state';

/** How often the game autosaves (ms). */
export const AUTOSAVE_MS = 15_000;

export type LoadResult =
  | { kind: 'loaded'; state: GameState }
  | { kind: 'none' }
  | { kind: 'error'; message: string; raw: string };

/** Read the save from localStorage. Never throws. Falls back to the newest backup that loads. */
export function loadGame(): LoadResult {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(SAVE_KEY);
  } catch {
    return { kind: 'none' };
  }
  let error: LoadResult | null = null;
  if (raw) {
    try {
      return { kind: 'loaded', state: deserialize(raw) };
    } catch (e) {
      error = { kind: 'error', message: (e as Error).message, raw };
    }
  }
  for (const b of listBackups()) {
    try {
      const state = deserialize(b.raw);
      if (raw && error) backupBrokenSave(raw); // keep the damaged one too
      return { kind: 'loaded', state };
    } catch {
      /* try the next one */
    }
  }
  return error ?? { kind: 'none' };
}

// --- Backups ------------------------------------------------------------------
// A few older copies of the save, so a bad moment (a reset tapped by mistake,
// a damaged save) never costs everything. Kept on this device only.

const BACKUP_KEY = `${SAVE_KEY}.backups`;
/** How many backups to keep, and how far apart the automatic ones are. */
export const BACKUP_SLOTS = 4;
const BACKUP_EVERY_MS = 10 * 60_000;

export interface Backup {
  at: number;
  /** Why it was made: 'auto', 'reset', 'import', 'restore'. */
  why: string;
  name: string;
  lodge: number;
  birds: number;
  raw: string;
}

export function listBackups(): Backup[] {
  try {
    const list = JSON.parse(localStorage.getItem(BACKUP_KEY) ?? '[]') as Backup[];
    return Array.isArray(list) ? list.filter((b) => b && typeof b.raw === 'string').sort((a, b) => b.at - a.at) : [];
  } catch {
    return [];
  }
}

/** Store a copy of `state`. Skips empty starts, which aren't worth keeping. */
export function backupNow(state: GameState, why: string, now = Date.now()): void {
  if (state.stats.lifetimeBirds <= 0) return;
  try {
    const entry: Backup = { at: now, why, name: state.profile.name, lodge: state.lodge, birds: state.stats.lifetimeBirds, raw: serialize(state) };
    const list = [entry, ...listBackups()];
    // Keep the newest few, but never drop the furthest-along one.
    const best = list.reduce((a, b) => (b.birds > a.birds ? b : a));
    let keep = list.slice(0, BACKUP_SLOTS);
    if (!keep.includes(best)) keep = [...keep.slice(0, BACKUP_SLOTS - 1), best];
    localStorage.setItem(BACKUP_KEY, JSON.stringify(keep));
  } catch {
    /* storage full or blocked: the main save still stands */
  }
}

/** Ask the browser not to clear the game's storage when space runs low. */
export function askToKeepStorage(): void {
  try {
    void navigator.storage?.persist?.().catch(() => undefined);
  } catch {
    /* not supported */
  }
}

/** Write the save. Returns false if storage is unavailable or full. */
export function saveGame(state: GameState, now = Date.now()): boolean {
  try {
    state.meta.lastSaved = now;
    localStorage.setItem(SAVE_KEY, serialize(state));
    const last = listBackups()[0];
    if (!last || now - last.at > BACKUP_EVERY_MS) backupNow(state, 'auto', now);
    return true;
  } catch {
    return false;
  }
}

export function clearSave(): void {
  try {
    localStorage.removeItem(SAVE_KEY);
  } catch {
    /* ignore */
  }
}

/** Keep a copy of a save that failed to load, so it isn't lost on overwrite. */
export function backupBrokenSave(raw: string): void {
  try {
    localStorage.setItem(`${SAVE_KEY}.broken-${Date.now()}`, raw);
  } catch {
    /* ignore */
  }
}
