import { describe, expect, it } from 'vitest';
import { DAY_LENGTH_SECONDS, TICK_SECONDS } from '../src/config';
import { jumpToPhase } from '../src/sim/actions';
import { clockAt } from '../src/sim/clock';
import { windAt } from '../src/sim/environment';
import { SimRunner } from '../src/sim/runner';
import { createInitialState } from '../src/sim/state';
import { advance, step } from '../src/sim/tick';

describe('fixed-step simulation', () => {
  it('step advances time by exactly one tick', () => {
    const s = createInitialState();
    const t0 = s.clock.dayTime;
    step(s, TICK_SECONDS);
    expect(s.tick).toBe(1);
    expect(s.elapsed).toBeCloseTo(TICK_SECONDS);
    expect(s.clock.dayTime).toBeCloseTo(t0 + TICK_SECONDS);
  });

  it('rolls over to the next day', () => {
    const s = createInitialState();
    s.clock.dayTime = DAY_LENGTH_SECONDS - 0.05;
    step(s, TICK_SECONDS);
    expect(s.clock.day).toBe(2);
    expect(s.clock.dayTime).toBeCloseTo(0.05);
  });

  it('advance() runs a whole day in ticks', () => {
    const s = createInitialState();
    const ticks = advance(s, DAY_LENGTH_SECONDS, TICK_SECONDS);
    expect(ticks).toBe(DAY_LENGTH_SECONDS / TICK_SECONDS);
    expect(s.clock.day).toBe(2);
  });

  it('is deterministic for the same seed', () => {
    const a = createInitialState(42);
    const b = createInitialState(42);
    advance(a, 123.4, TICK_SECONDS);
    advance(b, 123.4, TICK_SECONDS);
    expect(a).toEqual(b);
  });

  it('state is plain JSON (save-friendly)', () => {
    const s = createInitialState();
    advance(s, 30, TICK_SECONDS);
    expect(JSON.parse(JSON.stringify(s))).toEqual(s);
  });
});

describe('SimRunner', () => {
  it('converts real time into whole ticks and keeps the remainder', () => {
    let now = 0;
    const r = new SimRunner(createInitialState(), () => now);
    now = 250; // 2.5 ticks
    expect(r.update()).toBe(2);
    expect(r.alpha).toBeCloseTo(0.5);
    now = 300;
    expect(r.update()).toBe(1);
    expect(r.alpha).toBeCloseTo(0, 5);
  });

  it('catches up after a long gap (throttled background tab)', () => {
    let now = 0;
    const r = new SimRunner(createInitialState(), () => now);
    now = 60_000;
    expect(r.update()).toBe(600);
    expect(r.state.elapsed).toBeCloseTo(60);
  });

  it('honours timeScale for time-lapse previews', () => {
    let now = 0;
    const r = new SimRunner(createInitialState(), () => now);
    r.timeScale = 10;
    now = 1000;
    expect(r.update()).toBe(100);
  });

  it('notifies listeners only when ticks ran', () => {
    let now = 0;
    const r = new SimRunner(createInitialState(), () => now);
    let calls = 0;
    r.listeners.add(() => calls++);
    now = 50;
    r.update();
    expect(calls).toBe(0);
    now = 120;
    r.update();
    expect(calls).toBe(1);
  });
});

describe('environment & actions', () => {
  it('wind stays within 0–1 and is deterministic', () => {
    for (let t = 0; t < 5000; t += 7.3) {
      const w = windAt(t, 9);
      expect(w).toBeGreaterThanOrEqual(0);
      expect(w).toBeLessThanOrEqual(1);
      expect(windAt(t, 9)).toBe(w);
    }
  });

  it('jumpToPhase moves the clock into that phase', () => {
    const s = createInitialState();
    jumpToPhase(s, 'dusk');
    expect(clockAt(s.clock.dayTime).phase.id).toBe('dusk');
    jumpToPhase(s, 'predawn');
    expect(clockAt(s.clock.dayTime).phase.id).toBe('predawn');
  });
});
