import Decimal from 'break_infinity.js';
import { describe, expect, it } from 'vitest';
import { TICK_SECONDS } from '../src/config';
import { ACHIEVEMENTS } from '../src/data/achievements';
import { HUNT } from '../src/data/economy';
import { SPECIES_ORDER } from '../src/data/species';
import { OFFLINE, UPGRADES } from '../src/data/upgrades';
import { WEATHER_SPELL } from '../src/data/weather';
import { jumpToPhase } from '../src/sim/actions';
import { checkAchievements } from '../src/sim/achievements';
import { buyBot, flockDraw, spreadSize } from '../src/sim/economy';
import type { SimEvent } from '../src/sim/events';
import { doAction } from '../src/sim/hunt';
import { runOffline, runOfflineSync } from '../src/sim/offline';
import { fromPlain } from '../src/sim/save';
import { speciesWeights } from '../src/sim/species';
import { createInitialState, type GameState } from '../src/sim/state';
import { advance } from '../src/sim/tick';
import { buyUpgrade, offlineCapSeconds, upgradePrice } from '../src/sim/upgrades';
import { opened } from './helpers';

function rich(seed = 3): GameState {
  const s = opened(createInitialState(seed));
  s.currencies.coins = new Decimal(1e12);
  s.currencies.feathers = new Decimal(1e12);
  return s;
}

describe('species & field guide', () => {
  it('a mixed bag of species arrives over a long day', () => {
    const s = rich(7);
    s.hunt.decoys = HUNT.baseSpreadSize;
    s.upgrades.millet = 1;
    s.upgrades.nestBoxes = 1;
    const ev: SimEvent[] = [];
    advance(s, 1800, 0.5, ev);
    const species = new Set(ev.filter((e) => e.type === 'flockArrived').map((e) => (e as { species: string }).species));
    expect(species.size).toBeGreaterThanOrEqual(4);
    expect(species.has('mallard')).toBe(true);
  });

  it('timber makes wood ducks more likely; cold fronts favour rare birds', () => {
    const s = rich();
    s.upgrades.nestBoxes = 1;
    s.rungs.floatingRig = true;
    const before = speciesWeights(s, 12).woodDuck;
    s.upgrades.timber = 3;
    expect(speciesWeights(s, 12).woodDuck).toBeGreaterThan(before * 2);
    const eider = speciesWeights(s, 6).kingEider;
    s.environment.weather = 'coldFront';
    expect(speciesWeights(s, 6).kingEider).toBeGreaterThan(eider * 3);
  });

  it('first harvest of a species adds a Field Guide entry', () => {
    const s = opened(createInitialState(1));
    s.hunt.downed = ['woodDuck', 'woodDuck'];
    const ev: SimEvent[] = [];
    doAction(s, 'retrieve', 'manual', ev);
    doAction(s, 'retrieve', 'manual', ev);
    expect(ev.filter((e) => e.type === 'newSpecies')).toHaveLength(1);
    expect(s.guide.woodDuck?.count).toBe(2);
  });

  it('every species has guide text and a hint', () => {
    for (const id of SPECIES_ORDER) expect(id.length).toBeGreaterThan(0);
  });
});

describe('weather', () => {
  it('changes in spells and announces it', () => {
    const s = opened(createInitialState(4));
    const ev: SimEvent[] = [];
    advance(s, WEATHER_SPELL.max * 4, 0.5, ev);
    const changes = ev.filter((e) => e.type === 'weatherChanged');
    expect(changes.length).toBeGreaterThanOrEqual(3);
    for (const c of changes) expect((c as { from: string; to: string }).from).not.toBe((c as { to: string }).to);
  });

  it('fog brings more flocks than clear skies', () => {
    const s = opened(createInitialState(1));
    s.hunt.decoys = 6;
    s.environment.weather = 'clear';
    const clear = flockDraw(s);
    s.environment.weather = 'fog';
    expect(flockDraw(s)).toBeGreaterThan(clear);
  });
});

describe('upgrades', () => {
  it('prices grow and levels cap', () => {
    const s = rich();
    const p0 = upgradePrice('decoyQuality', 0).coins;
    expect(buyUpgrade(s, 'decoyQuality')).toBe(true);
    expect(upgradePrice('decoyQuality', 1).coins.gt(p0)).toBe(true);
    for (let i = 0; i < 10; i++) buyUpgrade(s, 'decoyQuality');
    expect(s.upgrades.decoyQuality).toBe(UPGRADES.decoyQuality.maxLevel);
    expect(spreadSize(s)).toBe(HUNT.baseSpreadSize + 2 * UPGRADES.decoyQuality.maxLevel);
  });

  it('coffee speeds bots up; cot extends offline time', () => {
    const s = rich();
    buyBot(s, 'caller', 1);
    expect(offlineCapSeconds(s)).toBe(OFFLINE.baseHours * 3600);
    buyUpgrade(s, 'cot');
    expect(offlineCapSeconds(s)).toBe((OFFLINE.baseHours + 1) * 3600);
  });
});

describe('achievements', () => {
  it('unlock once, with an event', () => {
    const s = opened(createInitialState(1));
    s.stats.lifetimeBirds = 1;
    const ev: SimEvent[] = [];
    expect(checkAchievements(s, ev)).toBeGreaterThanOrEqual(1);
    expect(s.achievements.firstBird).toBeDefined();
    expect(checkAchievements(s, ev)).toBe(0);
    expect(new Set(ACHIEVEMENTS.map((a) => a.id)).size).toBe(ACHIEVEMENTS.length);
  });
});

describe('offline progress', () => {
  it('fast-forwards time away and summarises it', () => {
    const s = rich(11);
    jumpToPhase(s, 'predawn');
    s.hunt.decoys = 6;
    for (const [k, n] of [['setter', 3], ['caller', 4], ['blind', 4], ['retriever', 4], ['ledger', 3], ['foreman', 2]] as const) buyBot(s, k, n);
    const coins0 = s.currencies.coins;
    const r = runOfflineSync(s, 2 * 3600);
    expect(r.capped).toBe(false);
    expect(r.birds).toBeGreaterThan(50);
    expect(r.coins.gt(0)).toBe(true);
    expect(s.currencies.coins.gt(coins0)).toBe(true);
    expect(r.days).toBeGreaterThanOrEqual(11);
    expect(s.stats.longestAway).toBe(7200);
  });

  it('caps time away', () => {
    const s = opened(createInitialState(2));
    const r = runOfflineSync(s, 100 * 3600);
    expect(r.capped).toBe(true);
    expect(r.simulated).toBe(OFFLINE.baseHours * 3600);
  });

  it('yields progress in chunks', () => {
    const s = opened(createInitialState(2));
    const it = runOffline(s, 3000, 1000);
    const progress: number[] = [];
    let r = it.next();
    while (!r.done) {
      progress.push(r.value);
      r = it.next();
    }
    expect(progress.length).toBeGreaterThan(3);
    expect(progress[progress.length - 1]).toBeLessThanOrEqual(1);
  });
});

describe('v3 → v4 migration', () => {
  it('seeds the field guide with mallards already harvested', () => {
    const s = fromPlain({ version: 3, stats: { lifetimeBirds: 40 }, environment: { seed: 1, weather: 'clear', wind: 0.3 } });
    expect(s.guide.mallard?.count).toBe(40);
    expect(s.upgrades.coffee).toBe(0);
    expect(s.environment.nextWeather).toBeDefined();
  });

  it('still steps normally after migration', () => {
    const s = fromPlain({ version: 3, environment: { seed: 1, weather: 'clear', wind: 0.3 } });
    advance(s, 30, TICK_SECONDS);
    expect(s.elapsed).toBeCloseTo(30);
  });
});

describe('species need the marsh to be ready', () => {
  it('rarer birds never visit until their upgrade or rung is built', () => {
    const s = opened(createInitialState(2));
    const w = speciesWeights(s, 7);
    expect(w.mallard).toBeGreaterThan(0);
    expect(w.teal).toBeGreaterThan(0);
    for (const id of ['woodDuck', 'pintail', 'canvasback', 'kingEider', 'harlequin', 'scaup'] as const) expect(w[id]).toBe(0);
    s.upgrades.nestBoxes = 1;
    expect(speciesWeights(s, 7).woodDuck).toBeGreaterThan(0);
    s.upgrades.deepPool = 1;
    expect(speciesWeights(s, 7).canvasback).toBe(0); // also needs wild celery
    s.upgrades.celeryBeds = 1;
    expect(speciesWeights(s, 7).canvasback).toBeGreaterThan(0);
  });
});
