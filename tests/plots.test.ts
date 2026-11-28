import Decimal from 'break_infinity.js';
import { describe, expect, it } from 'vitest';
import { PLOT_LEVELS } from '../src/data/crops';
import { cropFlockRate, levelFarPlot, levelPlot, plantCrop, plotLevelPrice } from '../src/sim/crops';
import { flockDraw } from '../src/sim/economy';
import { fromPlain, serialize } from '../src/sim/save';
import { createInitialState } from '../src/sim/state';

const rich = () => {
  const s = createInitialState(5);
  s.lodge = 5;
  s.currencies.coins = new Decimal(1e15);
  s.currencies.feathers = new Decimal(1e14);
  return s;
};

describe('food plots', () => {
  it('a planted plot levels up, draws more flocks, and keeps its level when the crop changes', () => {
    const s = rich();
    expect(plantCrop(s, 0, 'millet')).toBe(true);
    s.plots[0]!.growth = 1;
    const before = cropFlockRate(s);
    expect(levelPlot(s, 0)).toBe(true);
    expect(s.plots[0]!.level).toBe(2);
    expect(cropFlockRate(s)).toBeCloseTo(before * PLOT_LEVELS.flockRateGrowth, 6);
    expect(plantCrop(s, 0, 'soybeans')).toBe(true);
    expect(s.plots[0]!.level).toBe(2);
    expect(plotLevelPrice(0, 3).coins.gt(plotLevelPrice(0, 2).coins)).toBe(true);
    expect(levelPlot(s, 1)).toBe(false); // nothing planted there yet
  });

  it('the timber, field and bay plots each lift only their own ground', () => {
    const s = rich();
    const timber = flockDraw(s, 'timber');
    const marsh = flockDraw(s, 'marsh');
    expect(levelFarPlot(s, 'timber')).toBe(true);
    expect(flockDraw(s, 'timber')).toBeGreaterThan(timber);
    expect(flockDraw(s, 'marsh')).toBeCloseTo(marsh, 9);
  });

  it('old saves keep their crops at level 1 (v28 → v29)', () => {
    const plain = JSON.parse(serialize(createInitialState(2))).s;
    plain.version = 28;
    plain.plots = [{ crop: 'millet', growth: 1 }, { crop: null, growth: 0 }, { crop: null, growth: 0 }, { crop: null, growth: 0 }];
    delete plain.farPlots;
    const s = fromPlain(plain);
    expect(s.plots[0]!.level).toBe(1);
    expect(s.plots[1]!.level).toBe(0);
    expect(s.farPlots).toEqual({ timber: 0, field: 0, bay: 0 });
  });
});
