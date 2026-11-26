import Decimal from 'break_infinity.js';
import { describe, expect, it } from 'vitest';
import { TICK_SECONDS } from '../src/config';
import { BOTS, HUNT, SPECIES } from '../src/data/economy';
import { acrePrice, botPrice, buyAcre, buyBot, levelUpBot, maxAffordableBots, milestoneMultiplier, nextMilestone } from '../src/sim/economy';
import { jobRate } from '../src/sim/jobs';
import type { SimEvent } from '../src/sim/events';
import { canDo, doAction } from '../src/sim/hunt';
import { createInitialState, type GameState } from '../src/sim/state';
import { advance, step } from '../src/sim/tick';
import { jumpToPhase } from '../src/sim/actions';
import { opened } from './helpers';

function rich(): GameState {
  const s = opened(createInitialState(7));
  s.currencies.coins = new Decimal(1e9);
  s.currencies.feathers = new Decimal(1e9);
  return s;
}

describe('manual hunt pipeline', () => {
  it('runs Call → Shoot → Retrieve and pays out', () => {
    const s = createInitialState(3);
    const ev: SimEvent[] = [];
    expect(canDo(s, 'call')).toBe(false);
    s.hunt.incoming.push({ id: 99, species: 'mallard', size: 6, age: 0 });
    expect(doAction(s, 'call', 'manual', ev)).toBe(true);
    expect(s.hunt.committed).toHaveLength(1);

    expect(doAction(s, 'shoot', 'manual', ev)).toBe(true);
    const downed = Math.ceil(6 * HUNT.shotFraction);
    expect(s.hunt.downed).toHaveLength(downed);

    for (let i = 0; i < downed; i++) doAction(s, 'retrieve', 'manual', ev);
    expect(s.hunt.bag).toBe(downed);
    expect(s.hunt.ledger).toHaveLength(downed);
    // Birds pay when logged; only the Hunter's Rhythm bonus pays on the spot.
    const rhythm = ev.filter((e) => e.type === 'streak').reduce((t, e) => t + (e.type === 'streak' ? e.bonus : 0), 0);
    expect(s.currencies.coins.toNumber()).toBeCloseTo(rhythm, 6);
    expect(s.currencies.feathers.toNumber()).toBe(downed * SPECIES.mallard.feathers);
    for (let i = 0; i < downed; i++) doAction(s, 'log', 'manual', ev);
    expect(s.hunt.ledger).toHaveLength(0);
    expect(s.currencies.coins.toNumber()).toBeGreaterThanOrEqual(downed * SPECIES.mallard.coins);
    expect(s.stats.lifetimeBirds).toBe(downed);
    expect(ev.map((e) => e.type)).toContain('retrieved');
  });

  it('flocks arrive at sunrise once decoys are out', () => {
    const s = opened(createInitialState(11));
    jumpToPhase(s, 'sunrise');
    s.hunt.decoys = HUNT.baseSpreadSize;
    const ev: SimEvent[] = [];
    advance(s, 60, TICK_SECONDS, ev);
    expect(ev.filter((e) => e.type === 'flockArrived').length).toBeGreaterThan(2);
  });

  it('circling flocks move on if nobody calls them', () => {
    const s = opened(createInitialState(11));
    s.hunt.incoming.push({ id: 1, species: 'mallard', size: 4, age: 0 });
    const ev: SimEvent[] = [];
    advance(s, HUNT.incomingPatience + 1, TICK_SECONDS, ev);
    expect(ev.some((e) => e.type === 'flockLeft' && e.flockId === 1)).toBe(true);
  });

  it('called flocks flare off if nobody shoots', () => {
    const s = opened(createInitialState(11));
    s.hunt.committed.push({ id: 5, species: 'mallard', size: 4, age: 0 });
    const ev: SimEvent[] = [];
    advance(s, HUNT.committedPatience + 1, TICK_SECONDS, ev);
    expect(ev.some((e) => e.type === 'flockFlared')).toBe(true);
    expect(s.stats.flocksFlared).toBe(1);
  });

  it('the spread stays out, and buying decoys grows it and draws more flocks', async () => {
    const { buyDecoyBag, flockDraw, spreadSize } = await import('../src/sim/economy');
    const s = opened(createInitialState(2));
    advance(s, 300, TICK_SECONDS);
    expect(s.hunt.decoys).toBe(spreadSize(s));
    expect(canDo(s, 'decoys')).toBe(false);
    s.currencies.coins = new Decimal(1e6);
    s.currencies.feathers = new Decimal(1e6);
    s.unlocks.upgrades = 1;
    const before = flockDraw(s);
    for (let i = 0; i < 5; i++) expect(buyDecoyBag(s)).toBe(true);
    expect(spreadSize(s)).toBe(HUNT.baseSpreadSize + 10);
    expect(flockDraw(s)).toBeGreaterThan(before * 1.5);
  });

  it('bag resets at the start of each day and records the best', () => {
    const s = opened(createInitialState(2));
    s.hunt.bag = 12;
    s.clock.dayTime = 599.95;
    const ev: SimEvent[] = [];
    step(s, TICK_SECONDS, ev);
    expect(s.hunt.bag).toBe(0);
    expect(s.stats.bestBag).toBe(12);
    expect(ev.find((e) => e.type === 'dayEnded')).toMatchObject({ bag: 12, best: true });
  });
});

describe('bots', () => {
  it('cost follows base × 1.15^owned', () => {
    const d = BOTS.caller;
    expect(botPrice('caller', 0).coins.toNumber()).toBeCloseTo(d.costCoins);
    expect(botPrice('caller', 3).coins.toNumber()).toBe(Math.ceil(d.costCoins * 1.15 ** 3));
    const sum = d.costCoins * (1 + 1.15 + 1.15 ** 2);
    expect(botPrice('caller', 0, 3).coins.toNumber()).toBe(Math.ceil(sum - 1e-9));
  });

  it('buying spends both currencies and fails when broke', () => {
    const s = opened(createInitialState(1));
    expect(buyBot(s, 'caller', 1)).toBe(0);
    s.currencies.coins = new Decimal(BOTS.caller.costCoins);
    s.currencies.feathers = new Decimal(BOTS.caller.costFeathers);
    expect(buyBot(s, 'caller', 1)).toBe(1);
    expect(s.bots.caller.owned).toBe(1);
    expect(s.currencies.coins.toNumber()).toBeCloseTo(0);
  });

  it('max affordable respects the scarcer currency', () => {
    const s = opened(createInitialState(1));
    s.currencies.coins = new Decimal(1e9);
    s.currencies.feathers = new Decimal(BOTS.blind.costFeathers * 2.2);
    expect(maxAffordableBots(s, 'blind')).toBe(2);
  });

  it('milestones double output at 10/25/50/100/200 … 1000', () => {
    expect(milestoneMultiplier(9)).toBe(1);
    expect(milestoneMultiplier(10)).toBe(2);
    expect(milestoneMultiplier(25)).toBe(4);
    expect(milestoneMultiplier(200)).toBe(32);
    expect(nextMilestone(10)).toBe(25);
    expect(nextMilestone(200)).toBe(300);
    expect(milestoneMultiplier(1000)).toBe(1024);
    expect(nextMilestone(1000)).toBeNull();
    const s = rich();
    const ev: SimEvent[] = [];
    buyBot(s, 'caller', 10, ev);
    expect(ev.some((e) => e.type === 'botMilestone')).toBe(true);
    expect(jobRate(s, 'call')).toBeCloseTo(10 * BOTS.caller.baseSpeed * 2);
  });

  it('tune-ups raise speed', () => {
    const s = rich();
    buyBot(s, 'retriever', 1);
    const before = jobRate(s, 'retrieve');
    expect(levelUpBot(s, 'retriever')).toBe(true);
    expect(jobRate(s, 'retrieve')).toBeCloseTo(before * (1 + BOTS.retriever.levelSpeedBonus));
  });

  it('a full bot crew runs the hunt on its own (decoys pre-set)', () => {
    const s = rich();
    jumpToPhase(s, 'sunrise');
    s.hunt.decoys = HUNT.baseSpreadSize;
    buyBot(s, 'caller', 2);
    buyBot(s, 'blind', 2);
    buyBot(s, 'retriever', 2);
    const coins0 = s.currencies.coins;
    advance(s, 90, TICK_SECONDS);
    expect(s.stats.lifetimeBirds).toBeGreaterThan(5);
    expect(s.currencies.coins.gt(coins0)).toBe(true);
  });

  it('acres get pricier and draw bigger flocks', () => {
    const s = rich();
    const p1 = acrePrice(s.acres).coins;
    expect(buyAcre(s)).toBe(true);
    expect(s.acres).toBe(2);
    expect(acrePrice(s.acres).coins.gt(p1)).toBe(true);
  });
});
