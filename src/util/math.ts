export const clamp = (v: number, min: number, max: number): number =>
  v < min ? min : v > max ? max : v;

export const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;

export const invLerp = (a: number, b: number, v: number): number =>
  a === b ? 0 : (v - a) / (b - a);

export const smoothstep = (t: number): number => {
  const x = clamp(t, 0, 1);
  return x * x * (3 - 2 * x);
};

/** Positive modulo: wrap(-1, 24) === 23. */
export const wrap = (v: number, m: number): number => ((v % m) + m) % m;

/** Deterministic PRNG (mulberry32). Returns a function producing [0,1). */
export function seededRandom(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Integer hash → [0,1). */
export function hash1(n: number): number {
  let x = Math.imul((n | 0) ^ 0x9e3779b9, 0x85ebca6b);
  x ^= x >>> 13;
  x = Math.imul(x, 0xc2b2ae35);
  x ^= x >>> 16;
  return (x >>> 0) / 4294967296;
}

/** Smooth 1D value noise in [0,1]. Deterministic for a given seed. */
export function valueNoise1D(x: number, seed = 0): number {
  const i = Math.floor(x);
  const f = x - i;
  const a = hash1(i * 374761393 + seed * 668265263);
  const b = hash1((i + 1) * 374761393 + seed * 668265263);
  return lerp(a, b, smoothstep(f));
}

/** Piecewise-linear lookup over sorted keys, wrapping at `period`. */
export function sampleWrapped(
  keys: readonly { hour: number; value: number }[],
  x: number,
  period: number,
): number {
  const [a, b, t] = findSpan(keys, x, period);
  return lerp(a.value, b.value, t);
}

/**
 * Locate the two keyframes surrounding x on a wrapped timeline.
 * Returns [prev, next, t] with t in [0,1].
 */
export function findSpan<K extends { hour: number }>(
  keys: readonly K[],
  x: number,
  period: number,
): [K, K, number] {
  const n = keys.length;
  if (n === 0) throw new Error('findSpan: no keys');
  const v = wrap(x, period);
  const first = keys[0]!;
  const last = keys[n - 1]!;
  if (v < first.hour) return [last, first, invLerp(last.hour - period, first.hour, v)];
  if (v >= last.hour) return [last, first, invLerp(last.hour, first.hour + period, v)];
  for (let i = 0; i < n - 1; i++) {
    const a = keys[i]!;
    const b = keys[i + 1]!;
    if (v >= a.hour && v < b.hour) return [a, b, invLerp(a.hour, b.hour, v)];
  }
  return [last, first, 0];
}
