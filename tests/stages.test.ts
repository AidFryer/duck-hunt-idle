import Decimal from 'break_infinity.js';
import { describe, expect, it } from 'vitest';
import { FEATURE_ORDER } from '../src/data/features';
import { LODGE_LEVELS, PLANS, RUNGS } from '../src/data/progression';
import { SPECIES_ORDER } from '../src/data/species';
import { PRESTIGE } from '../src/data/legacy';
import { checkUnlocks } from '../src/sim/achievements';
import { buyBot } from '../src/sim/economy';
import type { SimEvent } from '../src/sim/events';
import { closeSeason } from '../src/sim/prestige';
import { buildLodge, buyRung, canBuildLodge, checkPlans, rungReady } from '../src/sim/progression';
import { fromPlain } from '../src/sim/save';
import { createInitialState, type GameState } from '../src/sim/state';

function readyFor(s: GameState, level: number): void {
  const l = LODGE_LEVELS[level - 1]!;
  s.stats.lifetimeBirds = Math.max(s.stats.lifetimeBirds, l.birds);
  for (const id of SPECIES_ORDER.slice(0, l.species)) s.guide[id] = { count: 1, firstAt: 0 };
  s.currencies.coins = s.currencies.coins.add(l.coins);
  s.currencies.feathers = s.currencies.feathers.add(l.feathers);
}

describe('the lodge', () => {
  it('a new marsh starts as a Duck Shack with only the Marsh tab', () => {
    const s = createInitialState(1);
    checkUnlocks(s);
    expect(s.lodge).toBe(1);
    expect(Object.keys(s.unlocks)).toHaveLength(0);
  });

  it('the Field Guide opens with the first bird, with its own card', () => {
    const s = createInitialState(1);
    s.stats.lifetimeBirds = 1;
    const ev: SimEvent[] = [];
    checkUnlocks(s, ev);
    expect(s.unlocks.guide).toBeDefined();
    expect(ev.map((e) => e.type)).toEqual(['featureUnlocked']);
  });

  it('needs birds, species and coins to build each level, and opens tabs', () => {
    const s = createInitialState(1);
    expect(canBuildLodge(s)).toBe(false);
    readyFor(s, 2);
    s.guide = { mallard: { count: 1, firstAt: 0 } }; // one species short
    expect(canBuildLodge(s)).toBe(false);
    readyFor(s, 2);
    const ev: SimEvent[] = [];
    expect(buildLodge(s, ev)).toBe(true);
    expect(s.lodge).toBe(2);
    expect(s.unlocks.bots).toBeDefined();
    expect(s.unlocks.upgrades).toBeDefined();
    expect(ev.some((e) => e.type === 'lodgeBuilt')).toBe(true);
    for (let lv = 3; lv <= 5; lv++) {
      readyFor(s, lv);
      expect(buildLodge(s)).toBe(true);
    }
    expect(Object.keys(s.unlocks).sort()).toEqual(FEATURE_ORDER.filter((f) => f !== 'guide').sort());
    expect(buildLodge(s)).toBe(false); // top level
  });

  it('the lodge, plans and tabs survive closing a season; rungs do not', () => {
    const s = createInitialState(1);
    for (let lv = 2; lv <= 5; lv++) {
      readyFor(s, lv);
      buildLodge(s);
    }
    s.plans.caller = true;
    s.rungs.duetCallers = true;
    s.season.coins = new Decimal(4 * PRESTIGE.divisor);
    closeSeason(s, 'central');
    expect(s.lodge).toBe(5);
    expect(s.plans.caller).toBe(true);
    expect(s.rungs.duetCallers).toBeUndefined();
    expect(s.unlocks.legacy).toBeDefined();
  });

  it('older saves keep what they had opened', () => {
    const s = fromPlain({
      version: 7,
      unlocks: { bots: 10, upgrades: 20, guide: 30, jobs: 40 },
      bots: { caller: { owned: 20, level: 1 }, blind: { owned: 0, level: 1 } },
      environment: { seed: 1, weather: 'clear', wind: 0.3 },
    });
    expect(s.lodge).toBe(3);
    expect(s.plans.caller).toBe(true);
    expect(s.plans.blind).toBeUndefined();
  });
});

describe('bot plans and the ladder', () => {
  it('a bot can only be carved once its plans are earned by hand', () => {
    const s = createInitialState(1);
    s.currencies.coins = new Decimal(1e6);
    s.currencies.feathers = new Decimal(1e6);
    expect(buyBot(s, 'caller', 1)).toBe(0);
    s.lodge = 2;
    s.stats.manualByJob.call = PLANS.caller.count - 1;
    checkPlans(s);
    expect(s.plans.caller).toBeUndefined();
    s.stats.manualByJob.call = PLANS.caller.count;
    const ev: SimEvent[] = [];
    checkPlans(s, ev);
    expect(ev).toEqual([{ type: 'planEarned', bot: 'caller' }]);
    expect(buyBot(s, 'caller', 1)).toBe(1);
  });

  it('rungs need the lodge, a crew, experience and coins, in order', () => {
    const s = createInitialState(1);
    s.currencies.coins = new Decimal(1e9);
    s.currencies.feathers = new Decimal(1e9);
    s.plans.caller = true;
    s.lodge = 3;
    expect(rungReady(s, 'duetCallers')).toBe(false);
    s.bots.caller.owned = RUNGS.duetCallers.owned;
    s.stats.flocksCalled = RUNGS.duetCallers.count;
    expect(rungReady(s, 'duetCallers')).toBe(true);
    expect(rungReady(s, 'longCall')).toBe(false); // the rung below comes first
    expect(buyRung(s, 'duetCallers')).toBe(true);
    s.lodge = 4;
    s.bots.caller.owned = RUNGS.longCall.owned;
    s.stats.flocksCalled = RUNGS.longCall.count;
    expect(buyRung(s, 'longCall')).toBe(true);
  });
});
