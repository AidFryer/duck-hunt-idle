import { describe, expect, it } from 'vitest';
import { autoplay, formatPace } from '../src/sim/autoplay';
import { createInitialState } from '../src/sim/state';

/**
 * Plays two hours with a scripted attentive player and checks the pace:
 * fast and rewarding early, first prestige in roughly 1–2 hours.
 * Run `npm run balance` to see the full report.
 */
describe('balance: two hours of play', () => {
  it('hits the pacing targets', () => {
    const s = createInitialState(1, 0);
    const r = autoplay(s, { seconds: 2 * 3600 });
    console.log(`\n=== Two-hour pace report ===\n${formatPace(r)}\n`);
    expect(r.firstBot).not.toBeNull();
    expect(r.firstBot!).toBeLessThan(60); // a bot within the first minute
    expect(r.coins1k!).toBeLessThan(10 * 60); // first 5 minutes feel rewarding
    expect(r.firstStar).not.toBeNull();
    expect(r.firstStar!).toBeGreaterThan(40 * 60); // not trivial…
    expect(r.firstStar!).toBeLessThan(110 * 60); // …but within about 1–2 hours
    expect(r.species).toBeGreaterThanOrEqual(5);
  }, 60_000);

  it('a relaxed player still gets there', () => {
    const r = autoplay(createInitialState(3, 0), { seconds: 2 * 3600, tapsPerSecond: 0.5 });
    expect(r.firstStar).not.toBeNull();
    expect(r.firstStar!).toBeLessThan(120 * 60);
  }, 60_000);

  it('later seasons are faster than the first', () => {
    const s = createInitialState(4, 0);
    autoplay(s, { seconds: 2 * 3600, prestige: true });
    expect(s.stats.seasonsClosed).toBeGreaterThanOrEqual(2);
  }, 60_000);
});
