import Decimal from 'break_infinity.js';
import { describe, expect, it } from 'vitest';
import { TICK_SECONDS } from '../src/config';
import { buyBot } from '../src/sim/economy';
import { deserialize, exportSave, fromPlain, importSave, serialize } from '../src/sim/save';
import { createInitialState, SAVE_VERSION } from '../src/sim/state';
import { advance } from '../src/sim/tick';

describe('save / load', () => {
  it('round-trips through serialize', () => {
    const s = createInitialState(5);
    s.currencies.coins = new Decimal('1.5e42');
    s.currencies.feathers = new Decimal(77);
    s.hunt.decoys = 4;
    buyBot(s, 'caller', 0);
    advance(s, 20, TICK_SECONDS);
    const back = deserialize(serialize(s));
    expect(back.currencies.coins.eq(s.currencies.coins)).toBe(true);
    expect(back.currencies.coins).toBeInstanceOf(Decimal);
    expect(back.hunt).toEqual(s.hunt);
    expect(back.clock).toEqual(s.clock);
    expect(back.version).toBe(SAVE_VERSION);
  });

  it('round-trips through the base64 export code', () => {
    const s = createInitialState(9);
    s.currencies.coins = new Decimal(12345);
    const back = importSave(exportSave(s));
    expect(back.currencies.coins.toNumber()).toBe(12345);
  });

  it('a loaded save keeps simulating identically', () => {
    const a = createInitialState(21);
    a.hunt.decoys = 6;
    advance(a, 30, TICK_SECONDS);
    const b = deserialize(serialize(a));
    advance(a, 60, TICK_SECONDS);
    advance(b, 60, TICK_SECONDS);
    expect(serialize(b)).toBe(serialize(a));
  });

  it('migrates a Phase 1 (v1) save', () => {
    const v1 = {
      version: 1,
      elapsed: 100,
      tick: 1000,
      clock: { dayTime: 123, day: 3 },
      environment: { weather: 'clear', wind: 0.4, seed: 99 },
    };
    const s = fromPlain(v1);
    expect(s.version).toBe(SAVE_VERSION);
    expect(s.clock.day).toBe(3);
    expect(s.currencies.coins.toNumber()).toBe(0);
    expect(s.bots.caller.owned).toBe(0);
  });

  it('turns Timber Guides and Bay Boatmen into full crews (v26 → v27)', () => {
    const plain = JSON.parse(serialize(createInitialState(4))).s;
    plain.version = 26;
    plain.lodge = 5;
    plain.bots.guide = { owned: 7, level: 3 };
    plain.bots.boatman = { owned: 2, level: 1 };
    plain.assign.guide = { tHunt: 7 };
    plain.assign.boatman = { bHunt: 2 };
    plain.plans = { ...plain.plans, guide: true, boatman: true };
    plain.problems.open = [{ id: 1, bot: 'guide', job: 'tHunt', kind: 'mud', at: 0, attempts: 0 }];
    const s = fromPlain(plain);
    for (const id of ['tCaller', 'tBlind', 'tPup'] as const) {
      expect(s.bots[id]).toEqual({ owned: 7, level: 3 });
      expect(s.plans[id]).toBe(true);
    }
    expect(s.assign.tCaller.tCall).toBe(7);
    expect(s.assign.tPup.tRetrieve).toBe(7);
    for (const id of ['bCaller', 'bBlind', 'bPup'] as const) expect(s.bots[id].owned).toBe(2);
    expect(s.bots.guide.owned).toBe(0);
    expect(s.bots.boatman.owned).toBe(0);
    expect(s.problems.open).toHaveLength(0);
    // The new crew actually hunts the timber.
    advance(s, 120, TICK_SECONDS);
    expect(s.metrics.jobs.tCall.totalDone + s.metrics.jobs.tRetrieve.totalDone).toBeGreaterThan(0);
  });

  it('rejects garbage with a friendly message', () => {
    expect(() => importSave('not a save!!')).toThrow(/not valid|damaged/);
    expect(() => importSave(btoa('{"hello":1}'))).toThrow(/save/);
  });

  it('refuses saves from a newer game version', () => {
    expect(() => deserialize(JSON.stringify({ v: SAVE_VERSION + 1, s: {} }))).toThrow(/newer/);
  });
});

describe('v14 → v15: the slower economy', () => {
  it('keeps what was built but trims banked coins and feathers', async () => {
    const { fromPlain } = await import('../src/sim/save');
    const { LODGE_LEVELS } = await import('../src/data/progression');
    const s = fromPlain({
      version: 14,
      lodge: 3,
      currencies: { coins: '5e9', feathers: '2e8' },
      stats: { lifetimeBirds: 90_000 },
      bots: { caller: { owned: 40, level: 3 } },
      environment: { seed: 1, weather: 'clear', wind: 0.3 },
    });
    expect(s.lodge).toBe(3);
    expect(s.bots.caller.owned).toBe(40);
    expect(s.stats.lifetimeBirds).toBe(90_000);
    expect(s.currencies.coins.toNumber()).toBeCloseTo(LODGE_LEVELS[3]!.coins * 0.1);
    expect(s.currencies.feathers.toNumber()).toBeCloseTo(LODGE_LEVELS[3]!.feathers * 0.1);
  });
});
