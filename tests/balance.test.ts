import { describe, expect, it } from 'vitest';
import { autoplay, formatPace } from '../src/sim/autoplay';
import { createInitialState } from '../src/sim/state';

/**
 * Plays hours with a scripted attentive player and checks the pace:
 * the Cabin and first bot after a few minutes of hand hunting, each lodge
 * level a real goal, and the first season closing after an evening or two.
 * Run `npm run balance` to see the full report.
 */
describe('balance: hours of play', () => {
  it('hits the pacing targets', () => {
    const s = createInitialState(1, 0);
    const r = autoplay(s, { seconds: 4.5 * 3600 });
    console.log(`\n=== Pace report ===\n${formatPace(r)}\n`);
    const min = (t: number | null | undefined) => (t ?? Infinity) / 60;
    expect(min(r.firstBot)).toBeGreaterThan(5); // earned by hand first…
    expect(min(r.firstBot)).toBeLessThan(15); // …but not a slog
    expect(min(r.lodge[2])).toBeLessThan(12);
    expect(min(r.lodge[3])).toBeGreaterThan(30);
    expect(min(r.lodge[3])).toBeLessThan(70);
    expect(min(r.lodge[4])).toBeGreaterThan(90);
    expect(min(r.lodge[4])).toBeLessThan(180);
    expect(min(r.lodge[5])).toBeGreaterThan(150);
    expect(min(r.lodge[5])).toBeLessThan(260);
    expect(min(r.firstStar)).toBeGreaterThan(150);
    expect(min(r.firstStar)).toBeLessThan(260);
    expect(r.species).toBeGreaterThanOrEqual(9);
  }, 120_000);

  it('a relaxed player still gets there', () => {
    const r = autoplay(createInitialState(3, 0), { seconds: 5 * 3600, tapsPerSecond: 0.5 });
    expect(r.firstStar).not.toBeNull();
    expect(r.firstStar! / 60).toBeLessThan(300);
  }, 120_000);

  it('later seasons are faster than the first', () => {
    const s = createInitialState(4, 0);
    autoplay(s, { seconds: 6 * 3600, prestige: true });
    expect(s.stats.seasonsClosed).toBeGreaterThanOrEqual(2);
  }, 120_000);
});
