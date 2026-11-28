import Decimal from 'break_infinity.js';
import { describe, expect, it } from 'vitest';
import { TICK_SECONDS } from '../src/config';
import { GROUND_CREW } from '../src/data/economy';
import { ladderFor } from '../src/data/progression';
import { buyBot, incomingPatience } from '../src/sim/economy';
import { jobRate } from '../src/sim/jobs';
import { buyRung, rungReady } from '../src/sim/progression';
import { createInitialState } from '../src/sim/state';
import { advance } from '../src/sim/tick';

describe('far-water crews', () => {
  it('every ground has a caller, a shooter and a retriever, and the far ones have ladders', () => {
    for (const g of ['marsh', 'timber', 'field', 'bay'] as const) expect(GROUND_CREW[g]).toHaveLength(3);
    for (const id of [...GROUND_CREW.timber, ...GROUND_CREW.bay]) expect(ladderFor(id).length).toBeGreaterThanOrEqual(2);
  });

  it('counts timber birds, and a timber rung speeds its crew and holds flocks longer', () => {
    const s = createInitialState(3);
    s.lodge = 3;
    s.currencies.coins = new Decimal(1e9);
    s.currencies.feathers = new Decimal(1e8);
    for (const id of GROUND_CREW.timber) {
      s.plans[id] = true;
      buyBot(s, id, 12);
    }
    advance(s, 600, TICK_SECONDS);
    expect(s.stats.timberBirds).toBeGreaterThan(0);
    s.stats.timberBirds = 1e6;
    expect(rungReady(s, 'woodDuckWhistle')).toBe(true);
    const rate = jobRate(s, 'tCall');
    const wait = incomingPatience(s, 'timber');
    expect(buyRung(s, 'woodDuckWhistle')).toBe(true);
    expect(jobRate(s, 'tCall')).toBeCloseTo(rate * 2, 5);
    expect(incomingPatience(s, 'timber')).toBeCloseTo(wait * 1.4, 5);
  });
});
