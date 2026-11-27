import Decimal from 'break_infinity.js';
import { describe, expect, it } from 'vitest';
import { autoplay } from '../src/sim/autoplay';
import { createInitialState } from '../src/sim/state';
import { formatWeeks, playWeeks } from '../src/sim/weekplay';

/**
 * The game is meant to last weeks for someone who plays a long session most
 * days: the Cabin in the first sitting, the Marsh Lodge around day 2, the
 * Sporting Club around day 3–4, the Grand Lodge about a week in and the first
 * Flyway Star around week two, with something new every hour or so of play.
 * `FULL_BALANCE=1 npx vitest run tests/balance.test.ts` runs the two-week check.
 */
describe('balance: weeks of play', () => {
  it('the first session: the Cabin and first bots, then a goal for tomorrow', () => {
    const r = autoplay(createInitialState(1, 0), { seconds: 90 * 60, tapsPerSecond: 1 });
    const min = (t: number | null | undefined) => (t ?? Infinity) / 60;
    expect(min(r.firstBot)).toBeGreaterThan(5); // earned by hand first…
    expect(min(r.firstBot)).toBeLessThan(20); // …but not a slog
    expect(min(r.lodge[2])).toBeLessThan(20);
    expect(r.lodge[3]).toBeNull(); // the Marsh Lodge is a goal for another day
    expect(r.species).toBeGreaterThanOrEqual(5);
  }, 120_000);

  it('four days: a lodge every day or two, never long without something new', () => {
    const r = playWeeks(createInitialState(1, 0), { days: 4, dt: 1 });
    console.log(`\n=== Four days ===\n${formatWeeks(r)}\n`);
    expect(r.lodge[3]).not.toBeNull();
    expect(r.lodge[3]!).toBeGreaterThan(1.5);
    expect(r.lodge[3]!).toBeLessThan(2.7);
    expect(r.lodge[4]).not.toBeNull();
    expect(r.lodge[4]!).toBeGreaterThan(2.8);
    expect(r.lodge[4]!).toBeLessThan(4.7);
    expect(r.lodge[5]).toBeNull(); // the Grand Lodge takes about a week
    expect(r.longestGapMin).toBeLessThan(120);
  }, 300_000);

  it.skipIf(!process.env.FULL_BALANCE)('two weeks: the Grand Lodge in about a week, the first star in about two', () => {
    const r = playWeeks(createInitialState(1, 0), { days: 16, dt: 1 });
    console.log(`\n=== Two weeks ===\n${formatWeeks(r)}\n`);
    expect(r.lodge[5]!).toBeGreaterThan(5.5);
    expect(r.lodge[5]!).toBeLessThan(8.5);
    expect(r.firstStar!).toBeGreaterThan(10);
    expect(r.firstStar!).toBeLessThan(17);
  }, 1_800_000);

  it('Flyway Stars make the next season quicker', () => {
    const fresh = createInitialState(4, 0);
    const vet = createInitialState(4, 0);
    vet.legacy.earned = 4;
    vet.legacy.stars = 0;
    autoplay(fresh, { seconds: 60 * 60 });
    autoplay(vet, { seconds: 60 * 60 });
    expect(vet.stats.lifetimeCoins.gt(fresh.stats.lifetimeCoins.mul(new Decimal(1.1)))).toBe(true);
  }, 120_000);
});
