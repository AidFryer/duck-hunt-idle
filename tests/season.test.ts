import Decimal from 'break_infinity.js';
import { describe, expect, it } from 'vitest';
import { WORKFLOW } from '../src/data/workflows';
import { BOTS } from '../src/data/economy';
import { buyBot, birdValue, botPrice, botPriceMult } from '../src/sim/economy';
import type { SimEvent } from '../src/sim/events';
import { buyPerk, closeSeason, coinsForNextStar, nextFlyway, starMultiplier, starsFor } from '../src/sim/prestige';
import { fromPlain, serialize, deserialize } from '../src/sim/save';
import { createInitialState, SAVE_VERSION, type GameState } from '../src/sim/state';
import { advance } from '../src/sim/tick';
import { addNode, connect, cut, evaluateWorkflow, removeNode, workflowEval } from '../src/sim/workflow';
import { jobRate } from '../src/sim/jobs';
import { offlineCapSeconds } from '../src/sim/upgrades';

function rich(seed = 3): GameState {
  const s = createInitialState(seed);
  s.currencies.coins = new Decimal(1e12);
  s.currencies.feathers = new Decimal(1e12);
  s.stats.lifetimeCoins = new Decimal(1e9);
  return s;
}

function chain(s: GameState, kinds: Parameters<typeof addNode>[1][]): number[] {
  const ids = kinds.map((k) => addNode(s, k)!);
  for (let i = 0; i + 1 < ids.length; i++) connect(s, ids[i]!, ids[i + 1]!);
  return ids;
}

describe('workflows', () => {
  it('locked until enough coins', () => {
    const s = createInitialState(1);
    expect(addNode(s, 'scout')).toBeNull();
  });

  it('a complete chain gives the big bonus; links in order count', () => {
    const s = rich();
    chain(s, ['scout', 'call', 'shoot', 'retrieve', 'log']);
    const ev = workflowEval(s);
    expect(ev.complete).toBe(true);
    expect(ev.goodLinks).toBe(4);
    expect(ev.bonus).toBeCloseTo(4 * WORKFLOW.perLink + WORKFLOW.complete);
  });

  it('decoys in the right place add a little more', () => {
    const s = rich();
    chain(s, ['scout', 'decoys', 'call', 'shoot', 'retrieve', 'log']);
    expect(workflowEval(s).bonus).toBeCloseTo(5 * WORKFLOW.perLink + WORKFLOW.complete + WORKFLOW.decoys);
  });

  it('out-of-order links are tangled and give nothing', () => {
    const s = rich();
    const [a, b] = chain(s, ['shoot', 'call']);
    const ev = workflowEval(s);
    expect(ev.goodLinks).toBe(0);
    expect(ev.linkState[`${a}>${b}`]).toBe('tangled');
  });

  it('special cards work only in the right spot', () => {
    const s = rich();
    chain(s, ['scout', 'fogBonus', 'call', 'shoot', 'retrieve', 'log']);
    const ev = workflowEval(s);
    expect(ev.complete).toBe(true);
    expect(ev.fogFlockRate).toBe(WORKFLOW.fogFlockRate);
    const nodes = [{ id: 1, kind: 'call' as const }, { id: 2, kind: 'fogBonus' as const }];
    expect(evaluateWorkflow(nodes, [{ from: 1, to: 2 }]).fogFlockRate).toBe(1);
  });

  it('chain bonus speeds up hunt jobs', () => {
    const s = rich();
    buyBot(s, 'caller', 5);
    const before = jobRate(s, 'call');
    chain(s, ['scout', 'call', 'shoot', 'retrieve', 'log']);
    expect(jobRate(s, 'call')).toBeCloseTo(before * (1 + 4 * WORKFLOW.perLink + WORKFLOW.complete));
  });

  it('no loops; one rope in and out; cut and remove', () => {
    const s = rich();
    const [a, b, c] = chain(s, ['scout', 'call', 'shoot']);
    expect(connect(s, c!, a!)).toBe(false);
    expect(connect(s, a!, c!)).toBe(true);
    expect(s.workflow.links.filter((l) => l.from === a)).toHaveLength(1);
    expect(cut(s, a!)).toBe(true);
    expect(removeNode(s, b!)).toBe(true);
    expect(s.workflow.links.some((l) => l.from === b || l.to === b)).toBe(false);
    expect(addNode(s, 'scout')).toBeNull(); // one card of each kind
  });
});

describe('prestige', () => {
  it('stars follow floor(sqrt(coins / 1e6))', () => {
    expect(starsFor(new Decimal(999_999))).toBe(0);
    expect(starsFor(new Decimal(1e6))).toBe(1);
    expect(starsFor(new Decimal(4e6))).toBe(2);
    expect(starsFor(new Decimal(8.9e6))).toBe(2);
    expect(coinsForNextStar(new Decimal(1e6)).toNumber()).toBe(4e6);
  });

  it('closing a season banks stars and resets the marsh, keeping the guide', () => {
    const s = rich();
    buyBot(s, 'caller', 5);
    s.upgrades.coffee = 2;
    s.guide.mallard = { count: 50, firstAt: 0 };
    s.achievements.firstBird = 1;
    s.season.coins = new Decimal(9e6);
    const ev: SimEvent[] = [];
    expect(closeSeason(s, nextFlyway(s), ev)).toBe(3);
    expect(s.legacy.stars).toBe(3);
    expect(s.flyway).toBe('central');
    expect(s.bots.caller.owned).toBe(0);
    expect(s.upgrades.coffee).toBe(0);
    expect(s.currencies.coins.toNumber()).toBe(0);
    expect(s.guide.mallard?.count).toBe(50);
    expect(s.achievements.firstBird).toBe(1);
    expect(s.season.number).toBe(2);
    expect(starMultiplier(s)).toBeCloseTo(1.15);
    expect(ev.some((e) => e.type === 'seasonClosed')).toBe(true);
  });

  it('cannot close a season worth no stars', () => {
    const s = rich();
    s.season.coins = new Decimal(10);
    expect(closeSeason(s, 'central')).toBe(0);
    expect(s.season.number).toBe(1);
  });

  it('stars boost coins and feathers', () => {
    const s = createInitialState(1);
    const base = birdValue(s, 'mallard').coins;
    s.legacy.earned = 4;
    expect(birdValue(s, 'mallard').coins).toBeCloseTo(base * 1.2, 1);
  });

  it('perks need stars and prerequisites, and apply next season', () => {
    const s = rich();
    s.legacy.stars = 10;
    expect(buyPerk(s, 'keenEyes')).toBe(false); // needs Early Riser
    expect(buyPerk(s, 'earlyRiser')).toBe(true);
    expect(buyPerk(s, 'unionRates')).toBe(true);
    expect(buyPerk(s, 'longNights')).toBe(true);
    expect(botPriceMult(s, 'foreman')).toBe(0.5);
    expect(botPrice('foreman', 0, 1, botPriceMult(s, 'foreman')).coins.toNumber()).toBe(Math.ceil(BOTS.foreman.costCoins / 2));
    expect(offlineCapSeconds(s)).toBe(10 * 3600);
    s.season.coins = new Decimal(1e6);
    closeSeason(s, 'central');
    expect(s.bots.caller.owned).toBe(2);
    expect(s.assign.caller.call).toBe(2);
  });
});

describe('central flyway', () => {
  it('flocks that leave sometimes circle back', () => {
    const s = rich(8);
    s.flyway = 'central';
    s.hunt.decoys = 6;
    const ev: SimEvent[] = [];
    advance(s, 600, 0.5, ev);
    expect(ev.some((e) => e.type === 'flockReturned')).toBe(true);
  });
});

describe('save v5', () => {
  it('round-trips seasons, legacy and workflows', () => {
    const s = rich();
    chain(s, ['scout', 'call']);
    s.season.coins = new Decimal('2.5e7');
    s.legacy = { stars: 2, earned: 5, perks: { headStart: true } };
    const b = deserialize(serialize(s));
    expect(b.season.coins.toNumber()).toBe(2.5e7);
    expect(b.legacy).toEqual(s.legacy);
    expect(b.workflow).toEqual(s.workflow);
  });

  it('migrates v4: coins so far count toward season 1', () => {
    const s = fromPlain({ version: 4, stats: { lifetimeCoins: '123456' }, environment: { seed: 1, weather: 'clear', wind: 0.3 } });
    expect(s.version).toBe(SAVE_VERSION);
    expect(s.season.coins.toNumber()).toBe(123456);
    expect(s.flyway).toBe('mississippi');
  });
});
