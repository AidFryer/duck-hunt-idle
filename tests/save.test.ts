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

  it('rejects garbage with a friendly message', () => {
    expect(() => importSave('not a save!!')).toThrow(/not valid|damaged/);
    expect(() => importSave(btoa('{"hello":1}'))).toThrow(/save/);
  });

  it('refuses saves from a newer game version', () => {
    expect(() => deserialize(JSON.stringify({ v: SAVE_VERSION + 1, s: {} }))).toThrow(/newer/);
  });
});
