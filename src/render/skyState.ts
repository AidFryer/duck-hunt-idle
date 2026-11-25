import { CELESTIAL, SKY_KEYFRAMES, type SkyKeyframe } from '../data/dayCycle';
import { lerpColor } from '../util/color';
import { clamp, findSpan, lerp, wrap } from '../util/math';

/** Interpolated lighting for a single moment. Pure — no Pixi. */
export interface SkyState {
  hour: number;
  skyTop: number;
  skyMid: number;
  skyLow: number;
  glow: number;
  light: number;
  farLand: number;
  nearLand: number;
  waterTop: number;
  waterLow: number;
  cloud: number;
  stars: number;
  fog: number;
  /** Sun: progress across the sky 0–1 and altitude 0–1 (≤0 = below horizon). */
  sunProgress: number;
  sunAltitude: number;
  moonProgress: number;
  moonAltitude: number;
  /** 0 = full day, 1 = full night (lamps, fireflies). */
  darkness: number;
}

const COLOR_KEYS = [
  'skyTop', 'skyMid', 'skyLow', 'glow', 'light', 'farLand', 'nearLand',
  'waterTop', 'waterLow', 'cloud',
] as const satisfies readonly (keyof SkyKeyframe)[];

export function createSkyState(): SkyState {
  return computeSkyState(6.5);
}

/** Compute sky state for a clock hour, writing into `out` if provided. */
export function computeSkyState(hour: number, out?: SkyState): SkyState {
  const [a, b, t] = findSpan(SKY_KEYFRAMES, hour, 24);
  const s = (out ?? ({} as SkyState));
  s.hour = wrap(hour, 24);
  for (const k of COLOR_KEYS) s[k] = lerpColor(a[k], b[k], t);
  s.stars = lerp(a.stars, b.stars, t);
  s.fog = lerp(a.fog, b.fog, t);

  const sunSpan = CELESTIAL.sunset - CELESTIAL.sunrise;
  s.sunProgress = (s.hour - CELESTIAL.sunrise) / sunSpan;
  s.sunAltitude = Math.sin(clamp(s.sunProgress, -0.1, 1.1) * Math.PI);

  const moonSpan = CELESTIAL.moonset - CELESTIAL.moonrise;
  const mh = s.hour < CELESTIAL.moonrise - 12 ? s.hour + 24 : s.hour;
  s.moonProgress = (mh - CELESTIAL.moonrise) / moonSpan;
  s.moonAltitude = s.moonProgress >= -0.05 && s.moonProgress <= 1.05
    ? Math.sin(clamp(s.moonProgress, 0, 1) * Math.PI)
    : -1;

  s.darkness = clamp(s.stars * 1.1, 0, 1);
  return s;
}
