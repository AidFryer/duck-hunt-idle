import { describe, expect, it } from 'vitest';
import { autoplay, formatPace } from '../src/sim/autoplay';
import { createInitialState } from '../src/sim/state';

/**
 * Plays two hours with a scripted attentive player and checks the pace:
 * fast and rewarding early, stages opening steadily, first prestige in
 * roughly 2–2.5 hours of attentive play.
 * Run `npm run balance` to see the full report.
 */
describe('balance: hours of play', () => {
  it('hits the pacing targets', () => {
    const s = createInitialState(1, 0);
    const r = autoplay(s, { seconds: 3 * 3600 });
    console.log(`\n=== Pace report ===\n${formatPace(r)}\n`);
    expect(r.firstBot).not.toBeNull();
    expect(r.firstBot!).toBeLessThan(2 * 60); // a bot within the first couple of minutes
    expect(r.coins1k!).toBeLessThan(12 * 60); // early progress still feels rewarding
    // Stages open one after another, not all at once.
    const u = s.unlocks;
    expect(u.upgrades! - u.bots!).toBeGreaterThan(60);
    expect(u.jobs! - u.guide!).toBeGreaterThan(60);
    expect(u.workflows!).toBeGreaterThan(30 * 60);
    expect(u.legacy!).toBeGreaterThan(70 * 60);
    expect(r.firstStar).not.toBeNull();
    expect(r.firstStar!).toBeGreaterThan(90 * 60); // takes a while…
    expect(r.firstStar!).toBeLessThan(170 * 60); // …but well within an evening
    expect(r.species).toBeGreaterThanOrEqual(5);
  }, 60_000);

  it('a relaxed player still gets there', () => {
    const r = autoplay(createInitialState(3, 0), { seconds: 4 * 3600, tapsPerSecond: 0.5 });
    expect(r.firstStar).not.toBeNull();
    expect(r.firstStar!).toBeLessThan(200 * 60);
  }, 60_000);

  it('later seasons are faster than the first', () => {
    const s = createInitialState(4, 0);
    autoplay(s, { seconds: 4 * 3600, prestige: true });
    expect(s.stats.seasonsClosed).toBeGreaterThanOrEqual(3);
  }, 60_000);
});
