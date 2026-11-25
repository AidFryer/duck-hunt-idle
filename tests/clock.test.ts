import { describe, expect, it } from 'vitest';
import { DAY_LENGTH_SECONDS } from '../src/config';
import { DAY_PHASES, NEW_GAME_DAY_TIME } from '../src/data/dayCycle';
import { clockAt, duckActivityAt, formatClock } from '../src/sim/clock';

describe('day clock', () => {
  it('phases add up to one full day', () => {
    expect(DAY_PHASES.reduce((s, p) => s + p.seconds, 0)).toBe(DAY_LENGTH_SECONDS);
  });

  it('phases are contiguous in clock hours', () => {
    for (let i = 1; i < DAY_PHASES.length; i++) {
      expect(DAY_PHASES[i]!.startHour).toBe(DAY_PHASES[i - 1]!.endHour);
    }
    const last = DAY_PHASES[DAY_PHASES.length - 1]!;
    expect(last.endHour - 24).toBeCloseTo(DAY_PHASES[0]!.startHour);
  });

  it('a new game opens in pre-dawn, just before sunrise', () => {
    expect(clockAt(NEW_GAME_DAY_TIME).phase.id).toBe('predawn');
  });

  it('maps the start of each phase to its start hour', () => {
    let acc = 0;
    for (const p of DAY_PHASES) {
      const c = clockAt(acc);
      expect(c.phase.id).toBe(p.id);
      expect(c.hour).toBeCloseTo(p.startHour % 24, 5);
      acc += p.seconds;
    }
  });

  it('wraps cleanly at the end of the day', () => {
    expect(clockAt(DAY_LENGTH_SECONDS).phase.id).toBe(DAY_PHASES[0]!.id);
    expect(clockAt(-1).phase.id).toBe('night');
    const end = clockAt(DAY_LENGTH_SECONDS - 0.001);
    expect(end.hour).toBeCloseTo(4.5, 2);
  });

  it('clock hour always increases through the day (mod 24)', () => {
    let prev = clockAt(0).hour;
    for (let t = 1; t < DAY_LENGTH_SECONDS; t++) {
      const h = clockAt(t).hour;
      const step = (h - prev + 24) % 24;
      expect(step).toBeGreaterThan(0);
      expect(step).toBeLessThan(0.2);
      prev = h;
    }
  });

  it('duck activity peaks at sunrise and is low at night', () => {
    expect(duckActivityAt(6.8)).toBeCloseTo(1, 5);
    expect(duckActivityAt(2)).toBeLessThan(0.15);
    expect(duckActivityAt(12)).toBeLessThan(duckActivityAt(7));
    for (let h = 0; h < 24; h += 0.25) {
      const a = duckActivityAt(h);
      expect(a).toBeGreaterThanOrEqual(0);
      expect(a).toBeLessThanOrEqual(1);
    }
  });

  it('formats a friendly clock', () => {
    expect(formatClock(0)).toBe('12:00 AM');
    expect(formatClock(6.5)).toBe('6:30 AM');
    expect(formatClock(12)).toBe('12:00 PM');
    expect(formatClock(19.79)).toBe('7:45 PM');
    expect(formatClock(25)).toBe('1:00 AM');
  });
});
