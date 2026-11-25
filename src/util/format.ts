import Decimal, { type DecimalSource } from 'break_infinity.js';

export type Notation = 'letters' | 'scientific';

const SUFFIXES = ['', 'K', 'M', 'B', 'T', 'Qa', 'Qi', 'Sx', 'Sp', 'Oc', 'No', 'Dc'];

/**
 * Friendly number formatting for idle-game scales.
 *   999 → "999", 1234 → "1.23K", 5.6e9 → "5.6B"
 * Past decillions: letter pairs ("aa", "ab", …) or scientific ("1.2e36").
 */
export function formatNumber(value: DecimalSource, notation: Notation = 'letters', decimals = 2): string {
  const d = value instanceof Decimal ? value : new Decimal(value);
  if (!Number.isFinite(d.mantissa) || Number.isNaN(d.mantissa)) return '∞';
  if (d.lt(0)) return `-${formatNumber(d.neg(), notation, decimals)}`;
  if (d.lt(1000)) {
    const n = d.toNumber();
    if (n === 0) return '0';
    if (n < 10 && n % 1 !== 0) return trimZeros(n.toFixed(1));
    return Math.floor(n).toString();
  }
  const e = d.exponent;
  const tier = Math.floor(e / 3);
  if (notation === 'scientific' && tier >= SUFFIXES.length - 4) {
    return `${trimZeros(d.mantissa.toFixed(decimals))}e${e}`;
  }
  const scaled = d.mantissa * Math.pow(10, e - tier * 3);
  // 999.995K should read 1M, not "1000K".
  let mant = trimZeros(scaled.toFixed(scaled >= 100 ? 0 : scaled >= 10 ? 1 : decimals));
  let t = tier;
  if (Number(mant) >= 1000) {
    mant = '1';
    t += 1;
  }
  return `${mant}${suffixFor(t, notation, e)}`;
}

function suffixFor(tier: number, notation: Notation, exponent: number): string {
  if (tier < SUFFIXES.length) return SUFFIXES[tier]!;
  if (notation === 'scientific') return `e${exponent}`;
  const n = tier - SUFFIXES.length; // 0 → "aa"
  const a = String.fromCharCode(97 + Math.floor(n / 26) % 26);
  const b = String.fromCharCode(97 + (n % 26));
  return a + b;
}

function trimZeros(s: string): string {
  return s.includes('.') ? s.replace(/\.?0+$/, '') : s;
}

/** Rates like "0.4/s" or "12/s". */
export function formatRate(perSecond: number, notation: Notation = 'letters'): string {
  if (perSecond > 0 && perSecond < 10) return `${trimZeros(perSecond.toFixed(perSecond < 1 ? 2 : 1))}/s`;
  return `${formatNumber(perSecond, notation)}/s`;
}

/** "2m 05s", "1h 20m" */
export function formatDuration(seconds: number): string {
  const s = Math.max(0, Math.round(seconds));
  if (s < 60) return `${s}s`;
  if (s < 3600) return `${Math.floor(s / 60)}m ${(s % 60).toString().padStart(2, '0')}s`;
  return `${Math.floor(s / 3600)}h ${Math.floor((s % 3600) / 60).toString().padStart(2, '0')}m`;
}
