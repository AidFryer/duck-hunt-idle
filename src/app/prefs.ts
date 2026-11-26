import type { Notation } from '../util/format';

/** Per-device preferences (not part of the game save). */
export interface Prefs {
  notation: Notation;
  reducedMotion: boolean;
  /** Show preview/time controls on the Marsh tab. */
  devTools: boolean;
  /** 0–1 volumes. */
  music: number;
  ambience: number;
  effects: number;
  muted: boolean;
  /** Gentle screen shake on big moments. */
  screenShake: boolean;
  /** The first-run tutorial has been finished or skipped. */
  tutorialDone: boolean;
  /** Which hunting ground was on screen last. */
  ground: 'marsh' | 'field';
}

const KEY = 'duck-hunt-idle.prefs';

export function loadPrefs(): Prefs {
  const reduced = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  const defaults: Prefs = {
    notation: 'letters',
    reducedMotion: reduced,
    devTools: false,
    music: 0.35,
    ambience: 0.55,
    effects: 0.7,
    muted: false,
    screenShake: !reduced,
    tutorialDone: false,
    ground: 'marsh',
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
