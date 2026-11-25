import Decimal from 'break_infinity.js';
import { describe, expect, it } from 'vitest';
import { TICK_SECONDS } from '../src/config';
import { BOTS, CROSS_JOB_EFFICIENCY, FOREMAN, HUNT, LEDGER, TINKER } from '../src/data/economy';
import { jumpToPhase } from '../src/sim/actions';
import { buyBot } from '../src/sim/economy';
import type { SimEvent } from '../src/sim/events';
import { doAction } from '../src/sim/hunt';
import { assigned, canWork, jobRate, moveBots, working } from '../src/sim/jobs';
import { throughput } from '../src/sim/metrics';
import { fixBot, foremanCapacity, raiseProblem, retryChance, retryDelay, setForemanSettings } from '../src/sim/problems';
import { fromPlain } from '../src/sim/save';
import { createInitialState, type GameState } from '../src/sim/state';
import { advance } from '../src/sim/tick';

function rich(seed = 3): GameState {
  const s = createInitialState(seed);
  s.currencies.coins = new Decimal(1e12);
  s.currencies.feathers = new Decimal(1e12);
  return s;
}

describe('job board', () => {
  it('new bots start on their home job', () => {
    const s = rich();
    buyBot(s, 'caller', 3);
    expect(assigned(s, 'caller', 'call')).toBe(3);
    expect(jobRate(s, 'call')).toBeCloseTo(3 * BOTS.caller.baseSpeed);
  });

  it('moving a bot to another job works at reduced speed', () => {
    const s = rich();
    buyBot(s, 'caller', 2);
    expect(moveBots(s, 'caller', 'call', 'shoot', 1)).toBe(1);
    expect(jobRate(s, 'call')).toBeCloseTo(BOTS.caller.baseSpeed);
    expect(jobRate(s, 'shoot')).toBeCloseTo(BOTS.caller.baseSpeed * CROSS_JOB_EFFICIENCY);
  });

  it('refuses jobs a bot cannot do, and bench works', () => {
    const s = rich();
    buyBot(s, 'retriever', 1);
    expect(canWork('retriever', 'call')).toBe(false);
    expect(moveBots(s, 'retriever', 'retrieve', 'call')).toBe(0);
    expect(moveBots(s, 'retriever', 'retrieve', 'bench')).toBe(1);
    expect(jobRate(s, 'retrieve')).toBe(0);
  });

  it('records throughput over the last minute', () => {
    const s = rich();
    jumpToPhase(s, 'sunrise');
    s.hunt.decoys = HUNT.baseSpreadSize;
    buyBot(s, 'caller', 3);
    buyBot(s, 'blind', 3);
    buyBot(s, 'retriever', 3);
    advance(s, 70, TICK_SECONDS);
    expect(throughput(s, 'log')).toBeGreaterThan(0);
    expect(throughput(s, 'log')).toBeLessThanOrEqual(LEDGER.keeperRate + 0.01);
  });
});

describe('problems & foremen', () => {
  it('a stuck bot stops working until fixed', () => {
    const s = rich();
    buyBot(s, 'caller', 1);
    const ev: SimEvent[] = [];
    expect(raiseProblem(s, 'caller', 'call', ev)).toBe(true);
    expect(working(s, 'caller', 'call')).toBe(0);
    expect(jobRate(s, 'call')).toBe(0);
    expect(raiseProblem(s, 'caller', 'call', ev)).toBe(false); // nobody left to get stuck
    expect(fixBot(s, 'caller', ev)).toBe(true);
    expect(working(s, 'caller', 'call')).toBe(1);
    expect(s.problems.fixedByYou).toBe(1);
    expect(ev.map((e) => e.type)).toEqual(['problem', 'problemFixed']);
  });

  it('bots hit problems over time at roughly 1 − reliability', () => {
    const s = rich(9);
    jumpToPhase(s, 'sunrise');
    s.hunt.decoys = HUNT.baseSpreadSize;
    buyBot(s, 'caller', 10);
    buyBot(s, 'blind', 10);
    buyBot(s, 'retriever', 10);
    const ev: SimEvent[] = [];
    advance(s, 300, TICK_SECONDS, ev);
    const actions = ev.filter((e) => e.type === 'flockCalled' || e.type === 'shot' || e.type === 'retrieved').length;
    const problems = ev.filter((e) => e.type === 'problem').length;
    expect(problems).toBeGreaterThan(0);
    expect(problems / (actions + problems)).toBeLessThan(0.15);
  });

  it('retry delay doubles each attempt and backoff improves the odds', () => {
    const s = rich();
    setForemanSettings(s, 3, 2);
    expect(retryDelay(s, 1)).toBeCloseTo(2 * retryDelay(s, 0));
    const fast = retryChance(s);
    setForemanSettings(s, 3, 8);
    expect(retryChance(s)).toBeGreaterThan(fast);
    setForemanSettings(s, 99, -5);
    expect(s.foreman.retries).toBe(FOREMAN.retriesMax);
    expect(s.foreman.backoff).toBe(FOREMAN.backoffMin);
  });

  it('foremen resolve problems, or hand them back after the retry limit', () => {
    const s = rich(42);
    buyBot(s, 'caller', 30);
    buyBot(s, 'foreman', 1);
    expect(foremanCapacity(s)).toBe(1);
    setForemanSettings(s, 1, 1);
    const ev: SimEvent[] = [];
    for (let i = 0; i < 12; i++) raiseProblem(s, 'caller', 'call', ev);
    advance(s, 60, TICK_SECONDS, ev);
    const fixed = ev.filter((e) => e.type === 'problemFixed' && e.by === 'foreman').length;
    const escalated = ev.filter((e) => e.type === 'problemEscalated').length;
    expect(fixed).toBeGreaterThan(0);
    expect(escalated).toBeGreaterThan(0);
    expect(s.problems.open.every((p) => p.status === 'escalated' || p.status === 'retrying' || p.status === 'open')).toBe(true);
  });
});

describe('ledger, scouts and tinkers', () => {
  it('Gus logs the bag on his own; coins arrive with logging', () => {
    const s = createInitialState(1);
    s.hunt.ledger = ['mallard', 'mallard', 'mallard'];
    advance(s, 3 / LEDGER.keeperRate + 0.5, TICK_SECONDS);
    expect(s.hunt.ledger).toHaveLength(0);
    expect(s.currencies.coins.toNumber()).toBeGreaterThan(0);
    expect(s.stats.lifetimeLogged).toBe(3);
  });

  it('scouting brings flocks in sooner', () => {
    const a = rich(5);
    const b = rich(5);
    for (const s of [a, b]) {
      jumpToPhase(s, 'midday');
      s.hunt.decoys = HUNT.baseSpreadSize;
    }
    buyBot(b, 'scout', 10);
    const ea: SimEvent[] = [];
    const eb: SimEvent[] = [];
    advance(a, 60, TICK_SECONDS, ea);
    advance(b, 60, TICK_SECONDS, eb);
    const count = (e: SimEvent[]) => e.filter((x) => x.type === 'flockArrived').length;
    expect(count(eb)).toBeGreaterThan(count(ea));
  });

  it('tinkers hand out free tune-ups', () => {
    const s = rich();
    buyBot(s, 'caller', 1);
    buyBot(s, 'tinker', 5);
    const ev: SimEvent[] = [];
    advance(s, (TINKER.workPerLevel / (5 * BOTS.tinker.baseSpeed)) + 2, TICK_SECONDS, ev);
    expect(ev.some((e) => e.type === 'botLevel' && e.by === 'tinker')).toBe(true);
    expect(s.bots.caller.level).toBeGreaterThan(1);
  });

  it('manual logging works', () => {
    const s = createInitialState(1);
    s.hunt.ledger = ['mallard'];
    expect(doAction(s, 'log', 'manual', [])).toBe(true);
    expect(doAction(s, 'log', 'manual', [])).toBe(false);
  });
});

describe('v2 → v3 migration', () => {
  it('places existing bots on their home jobs', () => {
    const v2 = {
      version: 2,
      elapsed: 10,
      tick: 100,
      rng: 5,
      clock: { dayTime: 100, day: 2 },
      environment: { weather: 'clear', wind: 0.3, seed: 1 },
      currencies: { coins: '500', feathers: '40' },
      hunt: { decoys: 4, decoyDrift: 0, flockCountdown: 1, nextFlockId: 9, incoming: [], committed: [], downed: ['mallard'], bag: 7 },
      bots: { caller: { owned: 3, level: 2, progress: 0.5 }, blind: { owned: 1, level: 1, progress: 0 }, retriever: { owned: 0, level: 1, progress: 0 } },
      acres: 2,
      stats: { lifetimeCoins: '900', lifetimeFeathers: '50', lifetimeBirds: 60, bestBag: 20, flocksCalled: 30, flocksFlared: 2, shots: 30, manualActions: 100 },
      meta: { createdAt: 0, lastSaved: 0 },
    };
    const s = fromPlain(v2);
    expect(s.version).toBe(3);
    expect(assigned(s, 'caller', 'call')).toBe(3);
    expect(assigned(s, 'blind', 'shoot')).toBe(1);
    expect(s.bots.scout.owned).toBe(0);
    expect(s.hunt.ledger).toEqual([]);
    expect(s.currencies.coins.toNumber()).toBe(500);
  });
});
