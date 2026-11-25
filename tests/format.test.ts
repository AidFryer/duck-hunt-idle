import Decimal from 'break_infinity.js';
import { describe, expect, it } from 'vitest';
import { formatDuration, formatNumber, formatRate } from '../src/util/format';

describe('formatNumber', () => {
  it('leaves small numbers alone', () => {
    expect(formatNumber(0)).toBe('0');
    expect(formatNumber(7)).toBe('7');
    expect(formatNumber(999)).toBe('999');
    expect(formatNumber(2.5)).toBe('2.5');
    expect(formatNumber(42.9)).toBe('42');
  });

  it('uses K/M/B/T suffixes', () => {
    expect(formatNumber(1200)).toBe('1.2K');
    expect(formatNumber(3_400_000)).toBe('3.4M');
    expect(formatNumber(5.6e9)).toBe('5.6B');
    expect(formatNumber(12_345)).toBe('12.3K');
    expect(formatNumber(123_456)).toBe('123K');
    expect(formatNumber(1e12)).toBe('1T');
  });

  it('rolls 999.99K over to 1M', () => {
    expect(formatNumber(999_999)).toBe('1M');
  });

  it('handles huge Decimals with letters or scientific', () => {
    expect(formatNumber(new Decimal('1.5e36'))).toBe('1.5aa');
    expect(formatNumber(new Decimal('1.5e39'))).toBe('1.5ab');
    expect(formatNumber(new Decimal('2.34e120'), 'scientific')).toBe('2.34e120');
    expect(formatNumber(new Decimal('1e300'))).toMatch(/^[0-9.]+[a-z]{2}$/);
  });

  it('formats negatives', () => {
    expect(formatNumber(-1500)).toBe('-1.5K');
  });
});

describe('rates and durations', () => {
  it('formats rates', () => {
    expect(formatRate(0.25)).toBe('0.25/s');
    expect(formatRate(2.5)).toBe('2.5/s');
    expect(formatRate(1500)).toBe('1.5K/s');
  });

  it('formats durations', () => {
    expect(formatDuration(5)).toBe('5s');
    expect(formatDuration(125)).toBe('2m 05s');
    expect(formatDuration(4800)).toBe('1h 20m');
  });
});
