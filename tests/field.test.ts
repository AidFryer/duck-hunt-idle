import { describe, expect, it } from 'vitest';
import { TICK_SECONDS } from '../src/config';
import { FIELD } from '../src/data/economy';
import { SPECIES } from '../src/data/species';
import type { SimEvent } from '../src/sim/events';
import { canDo, doAction } from '../src/sim/hunt';
import { speciesWeights } from '../src/sim/species';
import { createInitialState } from '../src/sim/state';
import { advance } from '../src/sim/tick';
import { jumpToPhase } from '../src/sim/actions';
import { opened } from './helpers';

describe('the goose field', () => {
  it('stays closed until the Sporting Club', () => {
    const s = createInitialState(2);
    jumpToPhase(s, 'sunrise');
    s.field.decoys = FIELD.baseSpreadSize;
    const ev: SimEvent[] = [];
    advance(s, 120, TICK_SECONDS, ev);
    expect(ev.some((e) => 'ground' in e && e.ground === 'field')).toBe(false);
    expect(canDo(s, 'fDecoys')).toBe(false);
  });

  it('geese come to the field, ducks to the marsh', () => {
    const s = opened(createInitialState(3));
    jumpToPhase(s, 'sunrise');
    s.field.decoys = FIELD.baseSpreadSize;
    s.hunt.decoys = 6;
    const ev: SimEvent[] = [];
    advance(s, 600, 0.5, ev);
    const arrivals = ev.filter((e) => e.type === 'flockArrived') as Extract<SimEvent, { type: 'flockArrived' }>[];
    const field = arrivals.filter((e) => e.ground === 'field');
    const marsh = arrivals.filter((e) => e.ground !== 'field');
    expect(field.length).toBeGreaterThan(3);
    expect(field.every((e) => SPECIES[e.species].ground === 'field')).toBe(true);
    expect(marsh.every((e) => SPECIES[e.species].ground === undefined)).toBe(true);
  });

  it('the field pipeline works by hand and logs geese at the lodge', () => {
    const s = opened(createInitialState(4));
    const ev: SimEvent[] = [];
    for (let i = 0; i < 3; i++) expect(doAction(s, 'fDecoys', 'manual', ev)).toBe(true);
    s.field.incoming.push({ id: 900, species: 'canadaGoose', size: 10, age: 0 });
    expect(doAction(s, 'flag', 'manual', ev)).toBe(true);
    expect(doAction(s, 'fShoot', 'manual', ev)).toBe(true);
    const down = s.field.downed.length;
    expect(down).toBeGreaterThan(0);
    for (let i = 0; i < down; i++) doAction(s, 'fRetrieve', 'manual', ev);
    expect(s.stats.geese).toBe(down);
    expect(s.hunt.ledger.filter((sp) => sp === 'canadaGoose')).toHaveLength(down);
    expect(s.stats.manualByJob.flag).toBe(1);
    expect(s.stats.flocksCalled).toBe(0); // marsh counters stay separate
  });

  it('rarer geese need their upgrades and rungs', () => {
    const s = opened(createInitialState(5));
    const w = speciesWeights(s, 8, 'field');
    expect(w.canadaGoose).toBeGreaterThan(0);
    expect(w.snowGoose).toBe(0);
    expect(w.sandhillCrane).toBe(0);
    expect(w.mallard).toBe(0);
    s.upgrades.winterWheat = 1;
    expect(speciesWeights(s, 8, 'field').snowGoose).toBeGreaterThan(0);
    s.upgrades.roostPond = 1;
    expect(speciesWeights(s, 8, 'field').sandhillCrane).toBe(0);
    s.rungs.stubbleBlinds = true;
    expect(speciesWeights(s, 8, 'field').sandhillCrane).toBeGreaterThan(0);
    expect(speciesWeights(s, 8, 'marsh').canadaGoose).toBe(0);
  });
});
