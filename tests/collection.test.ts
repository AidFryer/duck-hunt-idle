import Decimal from 'break_infinity.js';
import { describe, expect, it } from 'vitest';
import { CALENDAR, DAYS_PER_STAGE, stageFor } from '../src/data/calendar';
import { VOLLEY } from '../src/data/economy';
import { buyCarving, carvingFx, carvingStatus } from '../src/sim/carvings';
import { birdValue, flockDraw } from '../src/sim/economy';
import type { SimEvent } from '../src/sim/events';
import { deserialize, serialize } from '../src/sim/save';
import { createInitialState, type GameState } from '../src/sim/state';
import { checkAchievements } from '../src/sim/achievements';
import { busyMarsh, fireVolley, markPace, stepVolley } from '../src/sim/volley';

function rich(): GameState {
  const s = createInitialState(5, 0);
  s.currencies.coins = new Decimal(1e12);
  s.currencies.feathers = new Decimal(1e9);
  return s;
}

describe('Big Volley', () => {
  it('unlocks once the pace is high, charges, and pays a burst', () => {
    const s = rich();
    const ev: SimEvent[] = [];
    // Simulate a busy marsh: 100 birds and 1000 coins every second.
    for (let i = 0; i < 300; i++) {
      markPace(s);
      s.stats.lifetimeBirds += 100;
      s.stats.lifetimeCoins = s.stats.lifetimeCoins.add(1000);
      stepVolley(s, 1, ev);
    }
    expect(s.volley.unlocked).toBe(true);
    expect(ev.some((e) => e.type === 'volleyUnlocked')).toBe(true);
    expect(busyMarsh(s)).toBe(true);
    const coins = s.currencies.coins;
    expect(fireVolley(s, ev)).toBe(true);
    const v = ev.find((e) => e.type === 'volley');
    expect(v && v.type === 'volley' && v.birds).toBeGreaterThan(100 * VOLLEY.payoutSeconds * 0.9);
    expect(s.currencies.coins.gt(coins)).toBe(true);
    expect(fireVolley(s, ev)).toBe(false); // needs to charge again
  });

  it('stays locked on a quiet marsh', () => {
    const s = rich();
    const ev: SimEvent[] = [];
    for (let i = 0; i < 100; i++) {
      markPace(s);
      s.stats.lifetimeBirds += 2;
      stepVolley(s, 1, ev);
    }
    expect(s.volley.unlocked).toBe(false);
    expect(fireVolley(s, ev)).toBe(false);
  });
});

describe('decoy collection', () => {
  it('needs the lodge and the bird, then adds its bonus for good', () => {
    const s = rich();
    expect(carvingStatus(s, 'corkMallard')).toBe('needsLodge');
    s.lodge = 2;
    expect(carvingStatus(s, 'canvasPintail')).toBe('needsBird');
    const before = flockDraw(s);
    expect(buyCarving(s, 'corkMallard', [])).toBe(true);
    expect(carvingStatus(s, 'corkMallard')).toBe('owned');
    expect(buyCarving(s, 'corkMallard', [])).toBe(false);
    expect(flockDraw(s)).toBeCloseTo(before * 1.05, 5);
    expect(carvingFx(s).flockRate).toBeCloseTo(1.05);
  });
});

describe('season calendar', () => {
  it('moves through every stage and back', () => {
    const seen = new Set<string>();
    for (let d = 1; d <= DAYS_PER_STAGE * CALENDAR.length; d++) seen.add(stageFor(d).id);
    expect(seen.size).toBe(CALENDAR.length);
    expect(stageFor(1).id).toBe(stageFor(1 + DAYS_PER_STAGE * CALENDAR.length).id);
  });

  it('the Hard Freeze pays more per bird', () => {
    const s = rich();
    const freezeDay = 1 + DAYS_PER_STAGE * CALENDAR.findIndex((c) => c.id === 'freeze');
    const base = birdValue(s, 'mallard').coins;
    s.clock.day = freezeDay;
    expect(birdValue(s, 'mallard').coins).toBeGreaterThan(base);
  });
});

describe('patches', () => {
  it('pay feathers when earned and raise coins per bird', () => {
    const s = rich();
    const base = birdValue(s, 'mallard').coins;
    const feathers = s.currencies.feathers;
    s.stats.lifetimeBirds = 1;
    expect(checkAchievements(s, [])).toBeGreaterThan(0);
    expect(s.currencies.feathers.gt(feathers)).toBe(true);
    expect(birdValue(s, 'mallard').coins).toBeGreaterThan(base);
  });
});

describe('save', () => {
  it('keeps the new fields and loads older saves', () => {
    const s = rich();
    s.carvings.corkMallard = true;
    s.profile.dogName = 'Scout';
    s.profile.breed = 'chessie';
    s.volley.fired = 3;
    const back = deserialize(serialize(s));
    expect(back.carvings.corkMallard).toBe(true);
    expect(back.profile.dogName).toBe('Scout');
    expect(back.profile.breed).toBe('chessie');
    expect(back.volley.fired).toBe(3);
    // A v13 save without the new fields fills in defaults.
    const old = JSON.parse(serialize(s)) as { v: number; s: Record<string, unknown> };
    delete old.s.carvings;
    delete old.s.volley;
    old.s.profile = { name: 'Fry', avatar: 'hunter' };
    old.v = 13;
    const up = deserialize(JSON.stringify(old));
    expect(up.profile.name).toBe('Fry');
    expect(up.profile.breed).toBe('yellowLab');
    expect(up.volley.unlocked).toBe(false);
    expect(up.carvings).toEqual({});
  });
});

describe('golden flocks in a busy marsh', () => {
  it('a tapped golden flock comes in even when the spread is full', async () => {
    const { canDo, doAction } = await import('../src/sim/hunt');
    const { maxCommitted } = await import('../src/sim/economy');
    const s = rich();
    s.lodge = 5;
    const h = s.hunt;
    const full = maxCommitted(s, 'marsh');
    for (let i = 0; i < full; i++) h.committed.push({ id: 100 + i, size: 4, species: 'mallard', age: 0 });
    h.incoming.push({ id: 7, size: 4, species: 'mallard', age: 0 });
    h.incoming.push({ id: 8, size: 6, species: 'mallard', age: 0, golden: true });
    expect(canDo(s, 'call')).toBe(false); // a plain flock still waits its turn
    expect(canDo(s, 'call', 8)).toBe(true);
    expect(doAction(s, 'call', 'manual', [], 8)).toBe(true);
    expect(h.committed.some((f) => f.id === 8)).toBe(true);
    expect(doAction(s, 'call', 'caller', [], 8)).toBe(false); // bots can't use the golden pass
    const ev: SimEvent[] = [];
    expect(doAction(s, 'shoot', 'manual', ev, 8)).toBe(true);
    expect(ev.some((e) => e.type === 'goldenShot')).toBe(true);
  });
});
