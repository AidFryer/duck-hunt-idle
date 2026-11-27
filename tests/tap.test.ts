import { describe, expect, it } from 'vitest';
import { TICK_SECONDS } from '../src/config';
import { RHYTHM } from '../src/data/economy';
import { birdValue } from '../src/sim/economy';
import { rhythmSnag, rhythmTarget } from '../src/sim/rhythm';
import { claimDrifter, drifterReady, DRIFTER } from '../src/sim/drifter';
import type { SimEvent } from '../src/sim/events';
import { doAction } from '../src/sim/hunt';
import { claimDailyBonus } from '../src/sim/daily';
import { exportSave, importSave } from '../src/sim/save';
import { createInitialState } from '../src/sim/state';
import { advance } from '../src/sim/tick';

describe('tapping a specific flock', () => {
  it('calls the flock that was tapped, not just the oldest', () => {
    const s = createInitialState(5);
    s.hunt.decoys = 3;
    s.hunt.incoming.push({ id: 1, species: 'mallard', size: 4, age: 5 }, { id: 2, species: 'teal', size: 3, age: 1 });
    const ev: SimEvent[] = [];
    expect(doAction(s, 'call', 'manual', ev, 2)).toBe(true);
    expect(s.hunt.committed.map((f) => f.id)).toEqual([2]);
    expect(s.hunt.incoming.map((f) => f.id)).toEqual([1]);
  });

  it('shoots the tapped flock over the decoys', () => {
    const s = createInitialState(5);
    s.hunt.committed.push({ id: 7, species: 'mallard', size: 6, age: 0 }, { id: 8, species: 'pintail', size: 3, age: 0 });
    const ev: SimEvent[] = [];
    expect(doAction(s, 'shoot', 'manual', ev, 8)).toBe(true);
    expect(s.hunt.committed.map((f) => f.id)).toEqual([7]);
    expect(s.hunt.downed.every((sp) => sp === 'pintail')).toBe(true);
  });

  it('falls back to the oldest flock for an unknown id', () => {
    const s = createInitialState(5);
    s.hunt.incoming.push({ id: 1, species: 'mallard', size: 4, age: 0 });
    expect(doAction(s, 'call', 'manual', [], 42)).toBe(true);
    expect(s.hunt.committed[0]!.id).toBe(1);
  });
});

describe('Crew Rhythm', () => {
  it('your taps nudge it up, and it fades when nobody is hunting', () => {
    const s = createInitialState(9);
    const fetch = () => {
      s.hunt.downed.push('mallard');
      doAction(s, 'retrieve', 'manual', []);
    };
    for (let i = 0; i < 5; i++) fetch();
    expect(s.hunt.rhythm).toBeCloseTo(5 * RHYTHM.tapGain, 5);
    advance(s, RHYTHM.handWindow + RHYTHM.fallSeconds + 2, TICK_SECONDS, []);
    expect(s.hunt.rhythm).toBe(0);
  });

  it('a working crew builds it when the hunt flows, and it pays extra coins', () => {
    const s = createInitialState(9);
    s.bots.caller.owned = 1;
    const before = birdValue(s, 'mallard').coins;
    advance(s, 60, TICK_SECONDS, []);
    expect(s.hunt.rhythm).toBeGreaterThan(0.2);
    expect(birdValue(s, 'mallard').coins).toBeGreaterThan(before);
  });

  it('birds piling up on the water pull it down', () => {
    const s = createInitialState(9);
    s.bots.caller.owned = 1;
    s.hunt.rhythm = 1;
    for (let i = 0; i < 30; i++) s.hunt.downed.push('mallard');
    expect(rhythmTarget(s)).toBeLessThan(0.7);
    expect(rhythmSnag(s)).toBe('piling');
  });
});

describe('discovering a species', () => {
  it("pays a finder's bonus the first time only", () => {
    const s = createInitialState(4);
    s.hunt.downed.push('pintail', 'pintail', 'mallard');
    const ev: SimEvent[] = [];
    doAction(s, 'retrieve', 'setter', ev);
    doAction(s, 'retrieve', 'setter', ev);
    doAction(s, 'retrieve', 'setter', ev);
    const found = ev.filter((e) => e.type === 'newSpecies');
    expect(found).toHaveLength(2);
    const pin = found.find((e) => e.type === 'newSpecies' && e.species === 'pintail');
    expect(pin && pin.type === 'newSpecies' && pin.coins).toBeGreaterThan(0);
    expect(s.currencies.coins.toNumber()).toBe(pin && pin.type === 'newSpecies' ? pin.coins : -1);
    expect(s.stats.lifetimeCoins.toNumber()).toBe(0); // a reward, not earnings
  });
});

describe('First Light daily gift', () => {
  it('skips the very first launch, then gives once per day', () => {
    const s = createInitialState(1);
    expect(claimDailyBonus(s, '2026-11-26')).toBe(0);
    expect(claimDailyBonus(s, '2026-11-26')).toBe(0);
    const ev: SimEvent[] = [];
    const coins = claimDailyBonus(s, '2026-11-27', ev);
    expect(coins).toBeGreaterThanOrEqual(100);
    expect(ev[0]?.type).toBe('dailyBonus');
    expect(claimDailyBonus(s, '2026-11-27')).toBe(0);
  });

  it('survives a save round-trip', () => {
    const s = createInitialState(1);
    claimDailyBonus(s, '2026-11-26');
    const back = importSave(exportSave(s));
    expect(back.meta.lastDailyBonus).toBe('2026-11-26');
    expect(claimDailyBonus(back, '2026-11-26')).toBe(0);
  });
});

describe('drifting decoy', () => {
  it('only comes by once there is a crew, and not too often', () => {
    const s = createInitialState(3);
    s.elapsed = 1000;
    expect(drifterReady(s)).toBe(false);
    s.bots.caller.owned = 1;
    expect(drifterReady(s)).toBe(true);
    const ev: SimEvent[] = [];
    expect(claimDrifter(s, ev)).toBe(true);
    expect(s.currencies.coins.toNumber()).toBeGreaterThanOrEqual(DRIFTER.minCoins);
    expect(ev.some((e) => e.type === 'drifterClaimed')).toBe(true);
    expect(claimDrifter(s, [])).toBe(false);
    s.elapsed += DRIFTER.minGapSeconds;
    expect(drifterReady(s)).toBe(true);
  });
});
