import { SAVE_KEY } from '../config';
import { deserialize, serialize } from '../sim/save';
import type { GameState } from '../sim/state';

/** How often the game autosaves (ms). */
export const AUTOSAVE_MS = 15_000;

export type LoadResult =
  | { kind: 'loaded'; state: GameState }
  | { kind: 'none' }
  | { kind: 'error'; message: string; raw: string };

/** Read the save from localStorage. Never throws. */
export function loadGame(): LoadResult {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(SAVE_KEY);
  } catch {
    return { kind: 'none' };
  }
  if (!raw) return { kind: 'none' };
  try {
    return { kind: 'loaded', state: deserialize(raw) };
  } catch (e) {
    return { kind: 'error', message: (e as Error).message, raw };
  }
}

/** Write the save. Returns false if storage is unavailable or full. */
export function saveGame(state: GameState, now = Date.now()): boolean {
  try {
    state.meta.lastSaved = now;
    localStorage.setItem(SAVE_KEY, serialize(state));
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
