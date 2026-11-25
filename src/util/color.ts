import { clamp } from './math';

/** Linear blend of two 0xRRGGBB colors. */
export function lerpColor(a: number, b: number, t: number): number {
  const k = clamp(t, 0, 1);
  const ar = (a >> 16) & 0xff, ag = (a >> 8) & 0xff, ab = a & 0xff;
  const br = (b >> 16) & 0xff, bg = (b >> 8) & 0xff, bb = b & 0xff;
  const r = Math.round(ar + (br - ar) * k);
  const g = Math.round(ag + (bg - ag) * k);
  const bl = Math.round(ab + (bb - ab) * k);
  return (r << 16) | (g << 8) | bl;
}

/** Multiply two colors channel-wise (like a tint). */
export function multiplyColor(a: number, b: number): number {
  const r = Math.round((((a >> 16) & 0xff) * ((b >> 16) & 0xff)) / 255);
  const g = Math.round((((a >> 8) & 0xff) * ((b >> 8) & 0xff)) / 255);
  const bl = Math.round(((a & 0xff) * (b & 0xff)) / 255);
  return (r << 16) | (g << 8) | bl;
}

/** Scale brightness (0 = black, 1 = unchanged, >1 brighter, clamped). */
export function shadeColor(c: number, f: number): number {
  const r = clamp(Math.round(((c >> 16) & 0xff) * f), 0, 255);
  const g = clamp(Math.round(((c >> 8) & 0xff) * f), 0, 255);
  const b = clamp(Math.round((c & 0xff) * f), 0, 255);
  return (r << 16) | (g << 8) | b;
}

export function toCssRgba(c: number, alpha = 1): string {
  return `rgba(${(c >> 16) & 0xff}, ${(c >> 8) & 0xff}, ${c & 0xff}, ${alpha})`;
}

/** Perceived luminance 0–1. */
export function luminance(c: number): number {
  return (0.2126 * ((c >> 16) & 0xff) + 0.7152 * ((c >> 8) & 0xff) + 0.0722 * (c & 0xff)) / 255;
}
