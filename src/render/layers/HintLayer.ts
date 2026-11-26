import { Graphics } from 'pixi.js';
import { GROUND_JOBS, type GroundId } from '../../data/economy';
import { LAB_NAME } from '../../data/goals';
import { incomingPatience, maxCommitted } from '../../sim/economy';
import { ground } from '../../sim/hunt';
import type { GameState } from '../../sim/state';
import type { FrameContext, Layer, Point, SceneLayout } from '../types';
import type { DuckLayer } from './DuckLayer';

/** What the hint ring should point at. */
export type HintTarget =
  | { kind: 'flock'; id: number; label: string }
  | { kind: 'floater'; label: string }
  | { kind: 'water'; label: string };

/**
 * A soft, pulsing ring around the thing worth tapping next, so the marsh
 * itself tells you what to do. The label is drawn by the DOM (crisp text);
 * this layer just publishes where it should sit.
 */
export class HintLayer implements Layer {
  readonly view = new Graphics();
  target: HintTarget | null = null;
  /** Where the label should sit this frame (null = hidden). */
  labelAt: Point | null = null;
  /** Fallback spot under the ring, when there's no room above. */
  labelBelow: Point | null = null;
  private l!: SceneLayout;
  private time = 0;

  constructor(private readonly ducks: DuckLayer) {}

  layout(l: SceneLayout): void {
    this.l = l;
  }

  update(f: FrameContext): void {
    this.time += f.dt;
    const g = this.view;
    g.clear();
    this.labelAt = null;
    const t = this.target;
    if (!t) return;
    const s = this.l.scale;
    let at: Point | null = null;
    let r = 30 * s;
    if (t.kind === 'flock') {
      const b = this.ducks.flockBounds(t.id);
      if (b) {
        at = b;
        r = b.r + 9 * s;
      }
    } else if (t.kind === 'floater') {
      const fl = this.ducks.firstFreeFloater();
      if (fl) {
        at = { x: fl.x, y: fl.y - 3 * s };
        r = 24 * s;
      }
    } else {
      const a = this.l.anchors;
      at = { x: a.decoyCenter.x, y: a.decoyCenter.y };
      r = a.decoySpread * 0.55;
    }
    if (!at) return;
    const pulse = (Math.sin(this.time * 4) + 1) / 2;
    const squash = t.kind === 'water' ? 0.32 : 1;
    const rr = r * (1 + pulse * 0.12);
    g.ellipse(at.x, at.y, rr, rr * squash).stroke({ width: Math.max(2, 2.5 * s), color: 0xfff3c8, alpha: 0.45 + pulse * 0.45 });
    g.ellipse(at.x, at.y, rr + 6 * s, (rr + 6 * s) * squash).stroke({ width: Math.max(1, 1.5 * s), color: 0xfff3c8, alpha: 0.25 * (1 - pulse) });
    this.labelAt = { x: at.x, y: at.y - rr * squash - 8 * s };
    this.labelBelow = { x: at.x, y: at.y + rr * squash + 8 * s };
  }
}

/** How many times each kind of tap is hinted before the hints stop. */
const HINT_TAPS = 2;

/** What the hint ring should point at next on a ground (null once the player knows the ropes). */
export function chooseHint(state: GameState, g: GroundId, ducks: DuckLayer, words: boolean): HintTarget | null {
  // A golden flock is always worth pointing out.
  const gh = ground(state, g);
  const goldLow = gh.committed.find((f) => f.golden);
  if (goldLow) return { kind: 'flock', id: goldLow.id, label: 'Shoot the golden flock!' };
  const goldHigh = gh.incoming.find((f) => f.golden);
  if (goldHigh) return { kind: 'flock', id: goldHigh.id, label: 'Golden flock! Tap to call it in' };
  const jobs = GROUND_JOBS[g];
  const done = state.stats.manualByJob;
  const fresh = (j: string) => (done[j] ?? 0) < HINT_TAPS;
  if (!fresh(jobs.call) && !fresh(jobs.shoot) && !fresh(jobs.retrieve)) return null;
  const h = ground(state, g);
  const field = g === 'field';
  const label = (t: string) => (words ? t : '');
  let pick: HintTarget | null = null;
  let job = '';
  const canCall = h.incoming.length > 0 && h.committed.length < maxCommitted(state, g);
  const callFlock = { kind: 'flock' as const, id: h.incoming[0]?.id ?? -1, label: label(field ? 'Tap the geese to flag them in' : 'Tap the flock to call it in') };
  if (h.committed.length > 0) {
    pick = { kind: 'flock', id: h.committed[0]!.id, label: label(field ? 'Sit up and shoot!' : 'Tap to shoot!') };
    job = jobs.shoot;
  } else if (canCall && h.incoming[0]!.age > incomingPatience(state, g) * 0.5) {
    pick = callFlock;
    job = jobs.call;
  } else if (h.downed.length > 0 && ducks.firstFreeFloater()) {
    pick = { kind: 'floater', label: label(field ? 'Tap the goose to pick it up' : `Tap the bird for ${LAB_NAME}`) };
    job = jobs.retrieve;
  } else if (canCall) {
    pick = callFlock;
    job = jobs.call;
  }
  return pick && fresh(job) ? pick : null;
}
