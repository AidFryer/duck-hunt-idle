import Decimal from 'break_infinity.js';
import { describe, expect, it } from 'vitest';
import { FEATURE_ORDER } from '../src/data/features';
import { checkUnlocks } from '../src/sim/achievements';
import type { SimEvent } from '../src/sim/events';
import { closeSeason } from '../src/sim/prestige';
import { fromPlain } from '../src/sim/save';
import { createInitialState } from '../src/sim/state';

describe('feature stages', () => {
  it('a new marsh starts with only the Marsh tab', () => {
    const s = createInitialState(1);
    checkUnlocks(s);
    expect(Object.keys(s.unlocks)).toHaveLength(0);
  });

  it('stages open in order, one per check, with an event each', () => {
    const s = createInitialState(1);
    s.stats.lifetimeCoins = new Decimal(1e9);
    s.season.coins = new Decimal(1e9);
    s.stats.lifetimeBirds = 10_000;
    s.bots.caller.owned = 50;
    const ev: SimEvent[] = [];
    for (let i = 0; i < FEATURE_ORDER.length; i++) checkUnlocks(s, ev);
    expect(ev.map((e) => (e as { feature: string }).feature)).toEqual([...FEATURE_ORDER]);
  });

  it('waits for an earlier stage even if a later one is ready', () => {
    const s = createInitialState(1);
    s.stats.lifetimeCoins = new Decimal(30); // Bots ready, Upgrades not
    s.bots.caller.owned = 50; // Job Board condition met, but it comes later
    const ev: SimEvent[] = [];
    for (let i = 0; i < 5; i++) checkUnlocks(s, ev);
    expect(Object.keys(s.unlocks)).toEqual(['bots']);
  });

  it('unlocks survive closing a season', () => {
    const s = createInitialState(1);
    s.stats.lifetimeCoins = new Decimal(1e9);
    s.season.coins = new Decimal(4e6);
    s.stats.lifetimeBirds = 10_000;
    s.bots.caller.owned = 50;
    for (let i = 0; i < 10; i++) checkUnlocks(s);
    closeSeason(s, 'central');
    expect(Object.keys(s.unlocks)).toHaveLength(FEATURE_ORDER.length);
  });

  it('older saves get the stages they already earned, quietly', () => {
    const s = fromPlain({
      version: 5,
      stats: { lifetimeCoins: '50000', lifetimeBirds: 900 },
      bots: { caller: { owned: 20, level: 1 } },
      season: { number: 1, coins: '50000' },
      environment: { seed: 1, weather: 'clear', wind: 0.3 },
    });
    expect(s.unlocks.bots).toBeDefined();
    expect(s.unlocks.jobs).toBeDefined();
    expect(s.unlocks.workflows).toBeDefined();
    expect(s.unlocks.legacy).toBeUndefined();
  });
});
