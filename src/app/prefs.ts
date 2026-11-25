import type { Notation } from '../util/format';

/** Per-device preferences (not part of the game save). */
export interface Prefs {
  notation: Notation;
  reducedMotion: boolean;
  /** Show preview/time controls on the Marsh tab. */
  devTools: boolean;
}

const KEY = 'duck-hunt-idle.prefs';

export function loadPrefs(): Prefs {
  const defaults: Prefs = {
    notation: 'letters',
    reducedMotion: typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches,
    devTools: false,
  };
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? { ...defaults, ...(JSON.parse(raw) as Partial<Prefs>) } : defaults;
  } catch {
    return defaults;
  }
}

export function savePrefs(p: Prefs): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(p));
  } catch {
    /* storage unavailable (private mode) — preferences just won't persist */
  }
}
