import { describe, expect, it } from 'vitest';
import { SKY_KEYFRAMES } from '../src/data/dayCycle';
import { computeSkyState } from '../src/render/skyState';
import { lerpColor } from '../src/util/color';
import { findSpan, wrap } from '../src/util/math';

const channelDelta = (a: number, b: number) =>
  Math.max(
    Math.abs(((a >> 16) & 0xff) - ((b >> 16) & 0xff)),
    Math.abs(((a >> 8) & 0xff) - ((b >> 8) & 0xff)),
    Math.abs((a & 0xff) - (b & 0xff)),
  );

describe('math helpers', () => {
  it('wrap handles negatives', () => {
    expect(wrap(-1, 24)).toBe(23);
    expect(wrap(25, 24)).toBe(1);
  });

  it('findSpan wraps across midnight', () => {
    const keys = [{ hour: 2 }, { hour: 10 }, { hour: 20 }];
    expect(findSpan(keys, 6, 24)).toEqual([keys[0], keys[1], 0.5]);
    const [a, b, t] = findSpan(keys, 23, 24);
    expect(a).toBe(keys[2]);
    expect(b).toBe(keys[0]);
    expect(t).toBeCloseTo(0.5);
    const [a2, b2, t2] = findSpan(keys, 1, 24);
    expect(a2).toBe(keys[2]);
    expect(b2).toBe(keys[0]);
    expect(t2).toBeCloseTo(5 / 6);
  });

  it('lerpColor blends channels', () => {
    expect(lerpColor(0x000000, 0xffffff, 0.5)).toBe(0x808080);
    expect(lerpColor(0xff0000, 0x0000ff, 0)).toBe(0xff0000);
    expect(lerpColor(0xff0000, 0x0000ff, 1)).toBe(0x0000ff);
  });
});

describe('sky state', () => {
  it('matches keyframes exactly at their hours', () => {
    for (const k of SKY_KEYFRAMES) {
      const s = computeSkyState(k.hour);
      expect(s.skyTop).toBe(k.skyTop);
      expect(s.stars).toBeCloseTo(k.stars);
    }
  });

  it('changes smoothly — no color jumps between nearby minutes', () => {
    let prev = computeSkyState(0);
    for (let h = 0.05; h <= 24; h += 0.05) {
      const s = computeSkyState(h);
      expect(channelDelta(prev.skyTop, s.skyTop)).toBeLessThan(12);
      expect(channelDelta(prev.light, s.light)).toBeLessThan(14);
      prev = s;
    }
  });

  it('sun is up by day and down at night; moon the reverse', () => {
    expect(computeSkyState(12.5).sunAltitude).toBeGreaterThan(0.9);
    expect(computeSkyState(2).sunAltitude).toBeLessThan(0);
    expect(computeSkyState(0).moonAltitude).toBeGreaterThan(0.5);
    expect(computeSkyState(12).moonAltitude).toBeLessThan(0);
  });

  it('night is dark, midday is bright', () => {
    expect(computeSkyState(0).darkness).toBeGreaterThan(0.9);
    expect(computeSkyState(12.5).darkness).toBe(0);
  });
});
