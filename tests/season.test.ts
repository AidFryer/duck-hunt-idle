import { buyGear, gearPrice } from '../src/sim/gear';
import { fundProject } from '../src/sim/projects';
import { PROJECTS } from '../src/data/projects';
import { rollSpecialDay } from '../src/sim/days';
import { flockDraw } from '../src/sim/economy';
import { masteryBird, masteryGuest, masteryStar } from '../src/sim/mastery';
import { MASTERY } from '../src/data/mastery';
import { SPECIES } from '../src/data/species';
import { canRespec, perkCost, perkMaxRank, respecPerks } from '../src/sim/prestige';
import { PRESTIGE } from '../src/data/legacy';
import Decimal from 'break_infinity.js';
import { describe, expect, it } from 'vitest';
import { BOTS } from '../src/data/economy';
import { buyBot, birdValue, botPrice, botPriceMult } from '../src/sim/economy';
import type { SimEvent } from '../src/sim/events';
import { buyPerk, closeSeason, coinsForNextStar, nextFlyway, starMultiplier, starsFor } from '../src/sim/prestige';
import { fromPlain, serialize, deserialize } from '../src/sim/save';
import { createInitialState, SAVE_VERSION, type GameState } from '../src/sim/state';
import { advance } from '../src/sim/tick';
import { workflowEval } from '../src/sim/workflow';
import { buyTraining, trainDog } from '../src/sim/training';
import { jobRate } from '../src/sim/jobs';
import { offlineCapSeconds } from '../src/sim/upgrades';
import { opened } from './helpers';

function rich(seed = 3): GameState {
  const s = opened(createInitialState(seed));
  s.currencies.coins = new Decimal(1e12);
  s.currencies.feathers = new Decimal(1e12);
  s.stats.lifetimeCoins = new Decimal(1e9);
  return s;
}


describe('crew training', () => {
  it('skills need the lodge, the skill before, feathers and coins, and speed up the hunt', () => {
    const s = opened(createInitialState(1));
    s.lodge = 2;
    s.currencies.coins = new Decimal(1e12);
    s.currencies.feathers = new Decimal(1e12);
    buyBot(s, 'caller', 3);
    const before = jobRate(s, 'call');
    expect(buyTraining(s, 'tSignals')).toBe(false); // needs Know the Order and the Marsh Lodge
    expect(buyTraining(s, 'tOrder')).toBe(true);
    expect(buyTraining(s, 'tOrder')).toBe(false); // once
    expect(buyTraining(s, 'cDuet')).toBe(true);
    expect(jobRate(s, 'call')).toBeCloseTo(before * 1.08 * 1.2);
    expect(workflowEval(s).complete).toBe(true);
    s.lodge = 3;
    expect(buyTraining(s, 'cFog')).toBe(true);
    expect(workflowEval(s).fogFlockRate).toBeCloseTo(1.5);
  });

  it('your retriever levels up from birds fetched by hand', () => {
    const s = opened(createInitialState(1));
    s.currencies.feathers = new Decimal(1e9);
    expect(trainDog(s)).toBe(false); // no fetches yet
    s.stats.manualByJob.retrieve = 1000;
    expect(trainDog(s)).toBe(true);
    expect(s.dog.level).toBe(2);
    expect(trainDog(s)).toBe(true);
    expect(s.dog.level).toBe(3);
  });

  it('an old workflow board carries over as skills', () => {
    const plain = JSON.parse(serialize(createInitialState(1))) as { v: number; s: Record<string, unknown> };
    plain.v = 16;
    plain.s.workflow = {
      nextId: 7,
      nodes: [
        { id: 1, kind: 'scout' }, { id: 2, kind: 'call' }, { id: 3, kind: 'shoot' }, { id: 4, kind: 'retrieve' }, { id: 5, kind: 'log' }, { id: 6, kind: 'fogBonus' },
      ],
      links: [{ from: 1, to: 6 }, { from: 6, to: 2 }, { from: 2, to: 3 }, { from: 3, to: 4 }, { from: 4, to: 5 }],
    };
    delete plain.s.training;
    const s = deserialize(JSON.stringify(plain));
    expect(s.training.tOrder).toBe(true);
    expect(s.training.tSignals).toBe(true);
    expect(s.training.cFog).toBe(true);
  });
});

describe('prestige', () => {
  it('stars follow floor(sqrt(coins / divisor))', () => {
    expect(starsFor(new Decimal(PRESTIGE.divisor - 1))).toBe(0);
    expect(starsFor(new Decimal(PRESTIGE.divisor))).toBe(1);
    expect(starsFor(new Decimal(4 * PRESTIGE.divisor))).toBe(2);
    expect(starsFor(new Decimal(8.9 * PRESTIGE.divisor))).toBe(2);
    expect(coinsForNextStar(new Decimal(PRESTIGE.divisor)).toNumber()).toBe(4 * PRESTIGE.divisor);
  });

  it('closing a season banks stars and resets the marsh, keeping the guide', () => {
    const s = rich();
    buyBot(s, 'caller', 5);
    s.upgrades.coffee = 2;
    s.guide.mallard = { count: 50, firstAt: 0 };
    s.achievements.firstBird = 1;
    s.season.coins = new Decimal(9 * PRESTIGE.divisor);
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
    const s = opened(createInitialState(1));
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
    s.season.coins = new Decimal(PRESTIGE.divisor);
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
  it('round-trips seasons, legacy and training', () => {
    const s = rich();
    s.training.tOrder = true;
    s.dog.level = 4;
    s.season.coins = new Decimal('2.5e7');
    s.legacy = { stars: 2, earned: 5, perks: { headStart: 1, oldMoney: 3 }, flyways: { mississippi: true, central: true }, respecSeason: -1 };
    const b = deserialize(serialize(s));
    expect(b.season.coins.toNumber()).toBe(2.5e7);
    expect(b.legacy).toEqual(s.legacy);
    expect(b.training).toEqual(s.training);
    expect(b.dog.level).toBe(4);
  });

  it('migrates v4: coins so far count toward season 1', () => {
    const s = fromPlain({ version: 4, stats: { lifetimeCoins: '123456' }, environment: { seed: 1, weather: 'clear', wind: 0.3 } });
    expect(s.version).toBe(SAVE_VERSION);
    expect(s.season.coins.toNumber()).toBe(123456);
    expect(s.flyway).toBe('mississippi');
  });
});

describe('Legacy tree: ranks, flyway branches and the free refund', () => {
  it('ranked perks cost more each rank and stop at the top', () => {
    const s = createInitialState(5);
    s.legacy.stars = 1000;
    s.legacy.perks = { headStart: 1, nestEgg: 1 };
    const before = birdValue(s, 'mallard').coins;
    expect(buyPerk(s, 'oldMoney')).toBe(true);
    expect(buyPerk(s, 'oldMoney')).toBe(true);
    expect(s.legacy.stars).toBe(1000 - perkCost('oldMoney', 0) - perkCost('oldMoney', 1));
    expect(birdValue(s, 'mallard').coins).toBeGreaterThan(before);
    for (let i = 0; i < 20; i++) buyPerk(s, 'oldMoney');
    expect(s.legacy.perks.oldMoney).toBe(perkMaxRank('oldMoney'));
  });

  it("a flyway's branch opens only once you've hunted there", () => {
    const s = createInitialState(5);
    s.legacy.stars = 50;
    expect(buyPerk(s, 'prairieWind')).toBe(false);
    expect(buyPerk(s, 'cypressCalls')).toBe(true);
    s.legacy.flyways.central = true;
    expect(buyPerk(s, 'prairieWind')).toBe(true);
    expect(buyPerk(s, 'bigSky')).toBe(false); // needs Cornfield Deals first
  });

  it('refunds every star once per season', () => {
    const s = createInitialState(5);
    s.legacy.stars = 20;
    buyPerk(s, 'headStart');
    buyPerk(s, 'cypressCalls');
    expect(s.legacy.stars).toBe(17);
    expect(respecPerks(s)).toBe(3);
    expect(s.legacy.stars).toBe(20);
    expect(s.legacy.perks).toEqual({});
    buyPerk(s, 'headStart');
    expect(canRespec(s)).toBe(false);
    s.season.number += 1;
    expect(canRespec(s)).toBe(true);
  });

  it('old saves keep their perks and open the branches of flyways already hunted', () => {
    const s = createInitialState(5);
    const plain = JSON.parse(serialize(s));
    plain.v = 21;
    plain.s.version = 21;
    plain.s.flyway = 'pacific';
    plain.s.legacy = { stars: 3, earned: 9, perks: { headStart: true, keenEyes: true } };
    const b = deserialize(JSON.stringify(plain));
    expect(b.legacy.perks).toEqual({ headStart: 1, keenEyes: 1 });
    expect(b.legacy.flyways).toEqual({ mississippi: true, central: true, pacific: true });
    expect(b.legacy.respecSeason).toBe(-1);
  });
});

describe('flyway mastery', () => {
  it('four challenges on a flyway master it, for +10% coins', () => {
    const s = createInitialState(6);
    const ev: SimEvent[] = [];
    const before = birdValue(s, 'mallard').coins;
    s.hunt.bag = MASTERY.mississippi.bag;
    const kinds = Object.keys(SPECIES).slice(0, MASTERY.mississippi.kinds) as (keyof typeof SPECIES)[];
    for (const k of kinds) masteryBird(s, k, ev);
    for (let i = 0; i < MASTERY.mississippi.guests; i++) masteryGuest(s, ev);
    expect(s.mastery.mississippi?.mastered).toBe(false);
    masteryStar(s, ev);
    expect(s.mastery.mississippi?.mastered).toBe(true);
    expect(ev.filter((e) => e.type === 'flywayMastered')).toHaveLength(1);
    expect(birdValue(s, 'mallard').coins).toBeCloseTo(before * 1.1, 1);
  });
});

describe('named days', () => {
  it('change the hunt for the day and never come two in a row', () => {
    const s = createInitialState(8);
    const draw = flockDraw(s);
    const coins = birdValue(s, 'mallard').coins;
    s.environment.special = 'coldPush';
    expect(flockDraw(s)).toBeCloseTo(draw * 1.6, 5);
    s.environment.special = 'bluebird';
    expect(birdValue(s, 'mallard').coins).toBeCloseTo(coins * 1.4, 1);
    let named = 0;
    let prev = false;
    for (let d = 0; d < 400; d++) {
      rollSpecialDay(s, []);
      const now = s.environment.special !== null;
      expect(prev && now).toBe(false);
      if (now) named++;
      prev = now;
    }
    expect(named).toBeGreaterThan(40);
    expect(named).toBeLessThan(140);
  });
});

describe('crew gear and lodge projects', () => {
  it('gear levels cost more each time, help, and start over with the season', () => {
    const s = createInitialState(9);
    s.currencies.coins = new Decimal(1e9);
    s.currencies.feathers = new Decimal(1e8);
    const before = birdValue(s, 'mallard').coins;
    s.lodge = 4;
    expect(buyGear(s, 'lantern')).toBe(true);
    expect(buyGear(s, 'lantern')).toBe(true);
    expect(gearPrice('lantern', 2).coins.gt(gearPrice('lantern', 1).coins)).toBe(true);
    expect(birdValue(s, 'mallard').coins).toBeGreaterThan(before);
    s.season.coins = new Decimal(PRESTIGE.divisor);
    closeSeason(s, s.flyway);
    expect(s.gear).toEqual({});
  });

  it('projects take money bit by bit, finish stages, and keep them for good', () => {
    const s = createInitialState(9);
    s.lodge = 2;
    const st = PROJECTS.carvingShop.stages[0];
    s.currencies.coins = new Decimal(st.coins / 2);
    s.currencies.feathers = new Decimal(st.feathers);
    const ev: SimEvent[] = [];
    expect(fundProject(s, 'carvingShop', ev)).toBe(true);
    expect(s.projects.carvingShop?.stage).toBe(0);
    expect(s.projects.carvingShop?.coins).toBe(st.coins / 2);
    s.currencies.coins = new Decimal(st.coins);
    fundProject(s, 'carvingShop', ev);
    expect(s.projects.carvingShop?.stage).toBe(1);
    expect(ev.some((e) => e.type === 'projectStage')).toBe(true);
    expect(botPriceMult(s, 'caller')).toBeCloseTo(0.95, 5);
    s.season.coins = new Decimal(PRESTIGE.divisor);
    closeSeason(s, s.flyway);
    expect(s.projects.carvingShop?.stage).toBe(1);
  });
});
