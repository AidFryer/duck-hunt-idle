import { Container, Graphics, Sprite } from 'pixi.js';
import { committedPatience, incomingPatience } from '../../sim/economy';
import { SPECIES, type SpeciesId } from '../../data/species';
import type { GameState, GroundState } from '../../sim/state';
import type { GroundId } from '../../data/economy';
import { lerpColor, shadeColor } from '../../util/color';
import { clamp, lerp, seededRandom } from '../../util/math';
import type { TextureLibrary } from '../assets/TextureLibrary';
import type { EffectsLayer } from './EffectsLayer';
import type { FrameContext, Layer, Point, SceneLayout } from '../types';
import { waterDepthScale } from '../types';

type DuckMode = 'off' | 'fly' | 'tumble' | 'exit';

interface Duck {
  root: Container;
  body: Sprite;
  wingNear: Sprite;
  wingFar: Sprite;
  drake: boolean;
  species: SpeciesId;
  /** Body size multiplier from the species. */
  size: number;
  mode: DuckMode;
  x: number;
  y: number;
  vx: number;
  vy: number;
  /** Flight depth multiplier (0.3 far … 1.2 near). */
  depth: number;
  facing: number;
  targetFacing: number;
  flap: number;
  flapRate: number;
  spin: number;
  /** Water y where a tumbling bird lands. */
  landY: number;
  seed: number;
  flock: Flock | null;
  index: number;
}

interface Sample { x: number; y: number; d: number; t: number }

type FlockState = 'approach' | 'circle' | 'work';

interface Flock {
  kind: 'flyover' | 'hunt';
  /** Sim flock id (hunt flocks only). */
  id: number;
  ducks: Duck[];
  dir: number;
  state: FlockState;
  /** Has the sim called this flock in? */
  called: boolean;
  age: number;
  species: SpeciesId;
  /** A golden flock: shimmers and leaves a sparkle trail. */
  golden: boolean;
  // flyover
  lx: number; ly: number; speed: number; depth: number; spacing: number;
  // hunt circling
  theta: number;
  cx: number; cy: number; radius: number; squash: number; baseDepth: number;
  tcx: number; tcy: number; tradius: number; tsquash: number; tdepth: number;
  history: Sample[];
}

/** A harvested bird resting on the water, waiting for a retriever. */
export interface Floater {
  s: Sprite;
  x: number;
  y: number;
  phase: number;
  reserved: boolean;
  /** >0 while fading out. */
  fade: number;
  /** Seconds since it landed. */
  age: number;
}

/** What a tap on the scene landed on. */
export type DuckPick =
  | { kind: 'flock'; id: number; called: boolean; at: Point }
  | { kind: 'floater'; floater: Floater; at: Point };

const MAX_DUCKS = 48;
const MAX_VISIBLE_PER_FLOCK = 6;
/** When the marsh is busy: fewer, bigger flocks on screen. */
const CALM_FLOCKS = 3;
const CALM_PER_FLOCK = 8;
const MAX_FLOATERS = 14;
/** A bird floats at least this long before the crew picks it up, so every fall is seen to land. */
const FLOAT_REST = 1.1;
/** How many shot birds may land each second, at most (a busy marsh stays readable). */
const LANDINGS_PER_SECOND = 5;
/** Busy marsh: how often a new flock is drawn flying in (the rest hunt unseen). */
const CALM_FLOCKS_PER_SECOND = 0.6;
/** Seconds between pickups the crew makes without a dog (birds collected off-screen). */
const PICKUP_GAP = 0.18;
/** Downward pull on a shot bird (px/s² at scale 1). */
const FALL_G = 340;
const FOLLOW_LAG = 0.22;

/**
 * Mallard flocks driven by the sim's hunt pipeline:
 *  - arrive → circle high over the marsh, waiting to be called
 *  - call → drop low and work the decoys with cupped wings
 *  - shoot → some birds tumble (feather puff, gentle splash) and float;
 *    the rest flare away
 *  - flare / leave → the whole flock climbs away
 * Plus ambient V-formation flyovers for life in the sky.
 */
export class DuckLayer implements Layer {
  readonly view = new Container();
  private readonly skyView = new Container();
  private readonly waterView = new Container();
  private readonly ducks: Duck[] = [];
  private readonly flocks: Flock[] = [];
  private readonly floaters: Floater[] = [];
  /** Countdown rings around hunt flocks. */
  private readonly rings = new Graphics();
  /** Patience left (0–1) per sim flock id, refreshed from the sim each frame. */
  private readonly patience = new Map<number, number>();
  /** Next floater a retriever should take (the one the player tapped). */
  private preferred: Floater | null = null;
  private l!: SceneLayout;
  private time = 0;
  private goldenSparkle = 0;
  private flyoverTimer = 3;
  private readonly rnd = seededRandom(2718);
  ambient = true;
  /** Birds come down on dry ground (the goose field): dust, not splashes; no drifting. */
  onGround = false;
  /** Species for ambient flyovers. */
  /** Busy marsh: draw fewer, bigger flocks. */
  calm = false;
  /** Species of flocks that weren't drawn, so their shot birds look right. */
  private readonly unseen = new Map<number, SpeciesId>();
  flyoverSpecies: SpeciesId[] = ['mallard', 'mallard', 'teal', 'pintail', 'gadwall'];

  constructor(private readonly tex: TextureLibrary, private readonly fx: EffectsLayer) {
    this.view.addChild(this.waterView, this.skyView, this.rings);
    for (let i = 0; i < MAX_DUCKS; i++) {
      const drake = i % 5 < 3;
      const kind = drake ? 'drake' : 'hen';
      const root = new Container();
      const body = new Sprite(tex.get(`duck.fly.${kind}`));
      body.anchor.set(0.5);
      const wingFar = new Sprite(tex.get(`duck.wing.${kind}`));
      wingFar.anchor.set(12 / 30, 1);
      wingFar.position.set(1.5, -4);
      wingFar.tint = 0x9a9aa0;
      const wingNear = new Sprite(tex.get(`duck.wing.${kind}`));
      wingNear.anchor.set(12 / 30, 1);
      wingNear.position.set(-2, -2.5);
      root.addChild(wingFar, body, wingNear);
      root.visible = false;
      this.skyView.addChild(root);
      this.ducks.push({
        root, body, wingNear, wingFar, drake, species: 'mallard', size: 1, mode: 'off',
        x: 0, y: 0, vx: 0, vy: 0, depth: 1, facing: 1, targetFacing: 1, flap: 0, flapRate: 9,
        spin: 0, landY: 0, seed: this.rnd(), flock: null, index: 0,
      });
    }
  }

  layout(l: SceneLayout): void {
    this.l = l;
    for (const f of this.flocks) if (f.kind === 'hunt') this.setTargets(f);
  }

  // ------------------------------------------------------------------ sim hooks

  /** Paint a pooled duck as a given species. */
  private setLook(d: Duck, species: SpeciesId): void {
    if (d.species === species && d.body.texture === this.tex.get(`duck.fly.${species}.${d.drake ? 'drake' : 'hen'}`)) return;
    d.species = species;
    d.size = SPECIES[species].size;
    const sex = d.drake ? 'drake' : 'hen';
    d.body.texture = this.tex.get(`duck.fly.${species}.${sex}`);
    d.wingNear.texture = d.wingFar.texture = this.tex.get(`duck.wing.${species}.${sex}`);
  }

  /** A sim flock arrived: fly in and circle high, waiting for a call. */
  arrive(id: number, size: number, species: SpeciesId = 'mallard', golden = false): void {
    if (this.findHunt(id)) return;
    // Busy marsh: only a few flocks are drawn; the rest still hunt, unseen,
    // and their birds drop out of the sky over the decoys when shot.
    // A new drawn flock at most every so often, so each one can be watched in.
    if (this.calm && !golden && (this.flocks.filter((f) => f.kind === 'hunt' && f.ducks.length > 0).length >= CALM_FLOCKS || this.flockSlots < 1)) {
      this.unseen.set(id, species);
      if (this.unseen.size > 200) this.unseen.delete(this.unseen.keys().next().value!);
      return;
    }
    const ducks = this.take(Math.min(size, this.calm ? CALM_PER_FLOCK : MAX_VISIBLE_PER_FLOCK));
    if (ducks.length === 0) return;
    if (this.calm && !golden) this.flockSlots -= 1;
    const l = this.l;
    const f = this.newFlock('hunt', ducks, this.rnd() > 0.5 ? 1 : -1);
    f.id = id;
    f.golden = golden;
    f.state = 'approach';
    f.lx = f.dir > 0 ? -60 * l.scale : l.w + 60 * l.scale;
    const top = l.skyTop ?? 0;
    f.ly = top + (l.horizon - top) * (0.5 + this.rnd() * 0.25);
    f.speed = 120 * l.scale * (species === 'teal' ? 1.25 : 1);
    f.species = species;
    this.setTargets(f);
    f.cx = f.tcx;
    f.cy = f.tcy;
    f.radius = f.tradius;
    f.squash = f.tsquash;
    f.baseDepth = f.tdepth;
    ducks.forEach((d, i) => this.launch(d, f, i));
    this.flocks.push(f);
  }

  /** Called in: drop low over the decoys and work the spread. */
  call(id: number): void {
    const f = this.findHunt(id);
    if (!f) return;
    f.called = true;
    if (f.state === 'circle') f.state = 'work';
    this.setTargets(f);
  }

  /** The Big Volley: every hunt flock on screen comes down at once. */
  volley(): number {
    let n = 0;
    for (const f of [...this.flocks]) {
      if (f.kind !== 'hunt' || f.ducks.length === 0 || f.golden) continue;
      n += f.ducks.length;
      this.shoot(f.id, f.ducks.length);
    }
    // A few extra birds splash down so it always looks like a big moment.
    for (let i = 0; i < Math.max(0, 6 - n); i++) this.addFloater(this.randomWaterPoint(), true);
    return n;
  }

  /** A shot: `downed` birds tumble to the water, the rest flare off. */
  /**
   * A shot. Returns, for a flock you can see, how many birds it and the
   * unseen shots since the last one took (for a "+N" over it); null otherwise.
   */
  shoot(id: number, downed: number): { birds: number; at: Point } | null {
    const f = this.findHunt(id);
    const l = this.l;
    if (!f) {
      // A flock that wasn't drawn: nothing falls out of an empty sky; its
      // birds are added to the next shot you can see.
      this.unseenDowned += downed;
      this.unseen.delete(id);
      return null;
    }
    // Shown where the birds come down: over the decoys, on the water.
    const a = l.anchors.decoyCenter;
    const tally = { birds: downed + this.unseenDowned, at: { x: a.x + (this.rnd() - 0.5) * l.w * 0.3, y: a.y - 26 * l.scale } };
    this.unseenDowned = 0;
    const live = f.ducks.filter((d) => d.flock === f && d.mode === 'fly');
    // Every shot drops at least one bird; past that, only as many as the
    // crew can be seen picking up (the rest are counted, unseen).
    let toDrop = Math.min(downed, live.length, Math.max(1, Math.floor(this.skyDrops)));
    this.skyDrops -= toDrop;
    for (const d of live) {
      if (toDrop > 0) {
        toDrop--;
        d.mode = 'tumble';
        d.vy = -25 * l.scale;
        d.spin = (this.rnd() > 0.5 ? 1 : -1) * (3 + this.rnd() * 3);
        // Carried by its momentum toward the decoys, it lands on the water
        // near the spread (not straight down wherever the flock was).
        const p = this.randomWaterPoint();
        d.landY = Math.max(p.y, Math.min(l.h - 20 * l.scale, d.y + 30 * l.scale));
        const g = FALL_G * l.scale;
        const t = (-d.vy + Math.sqrt(d.vy * d.vy + 2 * g * Math.max(0, d.landY - d.y))) / g;
        const landX = lerp(d.x, p.x, 0.7);
        d.vx = clamp((landX - d.x) / Math.max(0.3, t), -260 * l.scale, 260 * l.scale);
        this.fx.featherPuff(d.x, d.y, l.scale * d.depth);
      } else {
        this.exit(d, true);
      }
    }
    f.ducks.length = 0;
    return tally;
  }

  /** Birds shot from flocks that weren't drawn, since the last shot you could see. */
  private unseenDowned = 0;

  /** The called flock waited too long: flare off. Returns where it was. */
  flare(id: number): Point | null {
    const f = this.findHunt(id);
    if (!f) return null;
    const at = { x: f.lx, y: f.ly };
    for (const d of f.ducks) if (d.flock === f && d.mode === 'fly') this.exit(d, true);
    f.ducks.length = 0;
    return at;
  }

  /** A circling flock gave up waiting and moves on. Returns where it was. */
  leave(id: number): Point | null {
    const f = this.findHunt(id);
    if (!f) return null;
    const at = { x: f.lx, y: f.ly };
    for (const d of f.ducks) if (d.flock === f && d.mode === 'fly') this.exit(d, false);
    f.ducks.length = 0;
    return at;
  }

  /**
   * Keep visuals consistent with the sim (after loading a save, or when
   * events were skipped while the tab was hidden).
   */
  reconcile(state: GameState): void {
    this.reconcileGround(state.hunt, state);
  }

  /** Match flocks and floaters to one ground's sim state. */
  reconcileGround(h: GroundState, state: GameState, g: GroundId = h === state.field ? 'field' : 'marsh'): void {
    this.patience.clear();
    const wait = incomingPatience(state, g);
    for (const fl of h.incoming) this.patience.set(fl.id, clamp(1 - fl.age / wait, 0, 1));
    const hold = committedPatience(state, g);
    for (const fl of h.committed) this.patience.set(fl.id, clamp(1 - fl.age / hold, 0, 1));
    const live = new Set<number>();
    for (const fl of h.incoming) {
      live.add(fl.id);
      if (!this.findHunt(fl.id)) this.arrive(fl.id, fl.size, fl.species, !!fl.golden);
    }
    for (const fl of h.committed) {
      live.add(fl.id);
      const f = this.findHunt(fl.id);
      if (!f) {
        this.arrive(fl.id, fl.size, fl.species, !!fl.golden);
        this.call(fl.id);
      } else if (f.state === 'circle') this.call(fl.id);
    }
    for (const f of this.flocks) if (f.kind === 'hunt' && !live.has(f.id) && f.ducks.length) this.leave(f.id);

    // Floating birds: match the sim count (capped), unless tumbles are in flight.
    // Birds the sim already fetched are picked up by the crew at a watchable
    // pace (see servePickups), so they aren't faded here.
    // Only top up birds with no fall (after loading, or coming back to the tab):
    // while the hunt is running, every bird on the water fell there.
    const tumbling = this.ducks.filter((d) => d.mode === 'tumble').length;
    const want = Math.min(h.downed.length, MAX_FLOATERS);
    const free = this.floaters.filter((f) => f.fade === 0 && !f.reserved);
    const quiet = this.time - this.lastLand > 6;
    if (tumbling === 0 && quiet && free.length + this.floaters.filter((f) => f.reserved && f.fade === 0).length < want) {
      for (let i = free.length; i < want; i++) this.addFloater(this.randomWaterPoint(), false, h.downed[i]);
      this.lastLand = this.time;
    }
    // Never owe more pickups than there are birds to show.
    this.owed = Math.min(this.owed, free.length + tumbling);
    // Safety net (e.g. after the tab was hidden): long-stale birds the sim no longer has.
    let extra = free.length - Math.min(h.downed.length, MAX_FLOATERS) - this.owed;
    for (const f of free) {
      if (extra <= 0) break;
      if (f.age > 8) {
        f.fade = 1;
        extra--;
      }
    }
  }

  spawnFlyover(count = 3 + Math.floor(this.rnd() * 6), depth = 0.3 + this.rnd() * 0.6, high = false, species?: SpeciesId): boolean {
    const ducks = this.take(count);
    if (ducks.length < 2) return false;
    const l = this.l;
    const f = this.newFlock('flyover', ducks, this.rnd() > 0.5 ? 1 : -1);
    const common = this.flyoverSpecies;
    f.species = species ?? common[Math.floor(this.rnd() * common.length)]!;
    f.depth = depth;
    f.spacing = 24 * l.scale * depth;
    f.speed = (55 + this.rnd() * 30) * l.scale * (0.5 + depth * 0.6);
    // Below the top bar, in the lower part of the sky.
    const top = l.skyTop ?? 0;
    f.ly = top + (l.horizon - top) * (high ? 0.25 + this.rnd() * 0.2 : 0.35 + this.rnd() * 0.4);
    f.lx = f.dir > 0 ? -40 * l.scale : l.w + 40 * l.scale;
    ducks.forEach((d, i) => this.launch(d, f, i));
    this.flocks.push(f);
    return true;
  }

  // ------------------------------------------------------------------ floaters

  /** Send the next retriever for this particular bird. */
  prefer(f: Floater): void {
    this.preferred = f;
  }

  /**
   * Oldest unclaimed floating bird that has rested a moment, now reserved for a
   * retriever. A bird the player tapped is taken straight away.
   */
  claimFloater(): Floater | null {
    const p = this.preferred;
    this.preferred = null;
    if (p && !p.reserved && p.fade === 0 && this.floaters.includes(p)) {
      p.reserved = true;
      return p;
    }
    for (const f of this.floaters) {
      if (!f.reserved && f.fade === 0 && f.age >= FLOAT_REST) {
        f.reserved = true;
        return f;
      }
    }
    return null;
  }

  /**
   * Birds the sim has retrieved that the scene still owes a pickup for. The
   * crew works these off at a watchable pace as birds land and rest.
   */
  owed = 0;
  private pickupWait = 0;
  /** When a bird last landed (scene time). */
  private lastLand = -100;
  /** Shot birds allowed to land right now (refills each second). */
  private skyDrops = 8;
  /** Busy marsh: new flocks allowed to be drawn right now (refills slowly). */
  private flockSlots = 2;

  /** The sim retrieved a bird: pick one up here once one has landed and rested. */
  owe(n = 1): void {
    this.owed = Math.min(this.owed + n, MAX_FLOATERS * 2);
  }

  /**
   * Work off owed pickups. `send` tries to dispatch a dog for the bird and
   * returns false when none is free; then the bird is collected with a soft
   * fade, one at a time.
   */
  servePickups(dt: number, send: (f: Floater) => boolean): void {
    this.pickupWait = Math.max(0, this.pickupWait - dt);
    while (this.owed > 0) {
      const f = this.peekRested();
      if (!f) return;
      f.reserved = true;
      if (send(f)) {
        this.owed--;
        continue;
      }
      if (this.pickupWait > 0) {
        f.reserved = false;
        return;
      }
      this.owed--;
      this.collect(f);
      // Quicker when the water is getting full.
      this.pickupWait = this.floaters.length > MAX_FLOATERS * 0.7 ? PICKUP_GAP * 0.5 : PICKUP_GAP;
    }
  }

  private peekRested(): Floater | null {
    for (const f of this.floaters) if (!f.reserved && f.fade === 0 && f.age >= FLOAT_REST) return f;
    return null;
  }

  /** Picked up by the crew off-screen: a little sparkle and a gentle fade. */
  collect(f: Floater): void {
    f.reserved = true;
    f.fade = 1;
    if (!this.onGround) this.fx.ripple(f.x, f.y, 0.5, 1.4);
    this.fx.sparkle(f.x, f.y - 4 * this.l.scale, this.l.scale * 0.6, 5);
  }

  /** Remove a floater (picked up or retrieved off-screen). */
  removeFloater(f: Floater, ripple = true): void {
    const i = this.floaters.indexOf(f);
    if (i < 0) return;
    this.floaters.splice(i, 1);
    if (ripple && !this.onGround) this.fx.ripple(f.x, f.y, 0.6, 1.6);
    f.s.destroy();
  }

  get floaterCount(): number {
    return this.floaters.length;
  }

  /** The oldest bird still waiting on the water (for hints). */
  firstFreeFloater(): Floater | null {
    return this.floaters.find((f) => !f.reserved && f.fade === 0) ?? null;
  }

  /** Centre and rough radius of a visible hunt flock. */
  flockBounds(id: number): { x: number; y: number; r: number } | null {
    const f = this.findHunt(id);
    return f ? this.bounds(f) : null;
  }

  private bounds(f: Flock): { x: number; y: number; r: number } | null {
    let n = 0;
    let x = 0;
    let y = 0;
    for (const d of f.ducks) {
      if (d.flock !== f || d.mode !== 'fly') continue;
      x += d.x;
      y += d.y;
      n++;
    }
    if (n === 0) return null;
    x /= n;
    y /= n;
    let r = 0;
    for (const d of f.ducks) if (d.flock === f && d.mode === 'fly') r = Math.max(r, Math.hypot(d.x - x, d.y - y));
    const s = this.l.scale;
    return { x, y, r: clamp(r + 16 * s, 26 * s, 84 * s) };
  }

  /**
   * What's under a tap: a hunt flock (generous radius, called flocks first)
   * or a floating bird. Null when the tap hit open sky or water.
   */
  pick(x: number, y: number): DuckPick | null {
    const s = this.l.scale;
    const slop = Math.max(14, 14 * s);
    let best: DuckPick | null = null;
    let bestScore = Infinity;
    for (const f of this.flocks) {
      if (f.kind !== 'hunt' || f.ducks.length === 0) continue;
      const b = this.bounds(f);
      if (!b) continue;
      const d = Math.hypot(x - b.x, y - b.y);
      const reach = (Math.max(b.r, 30) + slop) * (f.golden ? 1.5 : 1);
      if (d > reach) continue;
      // Golden flocks win any close call, then flocks already over the decoys.
      const score = d / reach - (f.called ? 0.3 : 0) - (f.golden ? 0.8 : 0);
      if (score < bestScore) {
        bestScore = score;
        best = { kind: 'flock', id: f.id, called: f.called, at: { x: b.x, y: b.y } };
      }
    }
    if (best) return best;
    const reach = Math.max(28, 30 * s);
    let fbest: Floater | null = null;
    let fd = reach;
    for (const f of this.floaters) {
      if (f.reserved || f.fade > 0) continue;
      const d = Math.hypot(x - f.x, y - f.y);
      if (d < fd) {
        fd = d;
        fbest = f;
      }
    }
    return fbest ? { kind: 'floater', floater: fbest, at: { x: fbest.x, y: fbest.y } } : null;
  }

  /** Nearest unclaimed floating bird within `reach`. */
  nearestFloater(x: number, y: number, reach: number): Floater | null {
    let best: Floater | null = null;
    let bd = reach;
    for (const f of this.floaters) {
      if (f.reserved || f.fade > 0) continue;
      const d = Math.hypot(x - f.x, y - f.y);
      if (d < bd) {
        bd = d;
        best = f;
      }
    }
    return best;
  }

  /** Nearest hunt flock within `reach` (for sky taps that just miss). */
  nearestFlock(x: number, y: number, reach: number): DuckPick | null {
    let best: DuckPick | null = null;
    let bd = reach;
    for (const f of this.flocks) {
      if (f.kind !== 'hunt' || f.ducks.length === 0) continue;
      const b = this.bounds(f);
      if (!b) continue;
      const d = Math.hypot(x - b.x, y - b.y) - b.r - (f.golden ? 40 : 0);
      if (d < bd) {
        bd = d;
        best = { kind: 'flock', id: f.id, called: f.called, at: { x: b.x, y: b.y } };
      }
    }
    return best;
  }

  private drawRings(): void {
    const g = this.rings;
    g.clear();
    const s = this.l.scale;
    const w = Math.max(2.5, 3 * s);
    for (const f of this.flocks) {
      if (f.kind !== 'hunt' || f.ducks.length === 0) continue;
      const frac = this.patience.get(f.id);
      if (frac === undefined) continue;
      const b = this.bounds(f);
      if (!b) continue;
      const r = b.r;
      if (f.golden) g.circle(b.x, b.y, r + 4 * s).stroke({ width: w * 0.8, color: 0xf2c46d, alpha: 0.6 });
      g.circle(b.x, b.y, r).stroke({ width: w, color: 0x2d2520, alpha: 0.28 });
      if (frac > 0.005) {
        const a0 = -Math.PI / 2;
        const a1 = a0 + Math.PI * 2 * frac;
        g.moveTo(b.x + Math.cos(a0) * r, b.y + Math.sin(a0) * r)
          .arc(b.x, b.y, r, a0, a1)
          .stroke({ width: w, color: f.golden ? 0xf2c46d : frac < 0.3 ? 0xd2693a : f.called ? 0xf6c56e : 0xf4e9d4, alpha: 0.9, cap: 'round' });
      }
    }
  }

  private addFloater(p: Point, splash: boolean, species: SpeciesId = 'mallard', drake = this.rnd() < 0.6): void {
    // Full water: the oldest free bird fades away so the new one can land
    // right where it fell (it never just vanishes or pops in elsewhere).
    if (this.floaters.filter((f) => f.fade === 0).length >= MAX_FLOATERS) {
      const old = this.floaters.find((f) => !f.reserved && f.fade === 0);
      if (!old) return;
      old.fade = 1;
    }
    if (this.floaters.length >= MAX_FLOATERS + 8) return;
    const s = new Sprite(this.tex.get(`duck.swim.${species}.${drake ? 'drake' : 'hen'}`));
    s.anchor.set(0.45, 30 / 34);
    this.waterView.addChild(s);
    const f: Floater = { s, x: p.x, y: p.y, phase: this.rnd() * 10, reserved: false, fade: 0, age: 0 };
    const k = waterDepthScale(this.l, p.y) * 0.5 * SPECIES[species].size;
    s.scale.set(k * (this.rnd() > 0.5 ? 1 : -1), k * 0.8);
    this.floaters.push(f);
    if (splash) {
      if (this.onGround) this.fx.featherPuff(p.x, p.y, this.l.scale * 0.6, 4);
      else this.fx.splash(p.x, p.y, 0.8);
    }
  }

  private randomWaterPoint(): Point {
    const l = this.l;
    const a = l.anchors;
    const waterH = l.h - l.horizon;
    return {
      x: a.decoyCenter.x + (this.rnd() - 0.5) * a.decoySpread * 2.4,
      y: a.decoyCenter.y + (this.rnd() - 0.3) * waterH * 0.3,
    };
  }



  // ------------------------------------------------------------------ internals

  private findHunt(id: number): Flock | undefined {
    return this.flocks.find((f) => f.kind === 'hunt' && f.id === id && f.ducks.length > 0);
  }

  private take(n: number): Duck[] {
    const out: Duck[] = [];
    for (const d of this.ducks) {
      if (out.length >= n) break;
      if (d.mode === 'off') out.push(d);
    }
    return out;
  }

  private newFlock(kind: Flock['kind'], ducks: Duck[], dir: number): Flock {
    return {
      kind, id: -1, ducks, dir, state: 'approach', called: false, age: 0, species: 'mallard', golden: false,
      lx: 0, ly: 0, speed: 0, depth: 1, spacing: 0,
      theta: 0, cx: 0, cy: 0, radius: 0, squash: 0.25, baseDepth: 0.7,
      tcx: 0, tcy: 0, tradius: 0, tsquash: 0.25, tdepth: 0.7, history: [],
    };
  }

  /** Where this flock should circle, depending on whether it's been called. */
  private setTargets(f: Flock, working = f.called): void {
    const l = this.l;
    const a = l.anchors;
    const slot = f.id % 3;
    f.tcx = a.decoyCenter.x + (working ? 0 : (slot - 1) * l.w * 0.08);
    if (working) {
      f.tcy = l.horizon - (l.h - l.horizon) * 0.02;
      f.tradius = Math.min(l.w * 0.2, 170 * l.scale);
      f.tsquash = 0.3;
      f.tdepth = 1.0;
    } else {
      // Circle in the band between the HUD and the horizon, so every flock
      // stays in sight and tappable.
      const top = l.skyTop ?? 0;
      const band = Math.max(60, l.horizon - top);
      // Low over the treeline, close to the water where the action is.
      f.tcy = Math.min(l.horizon - 34 * l.scale, top + band * (0.64 + slot * 0.1));
      f.tradius = Math.min(l.w * 0.34, 300 * l.scale) * (1 - slot * 0.12);
      f.tsquash = Math.min(0.2, (band * 0.24) / Math.max(1, f.tradius));
      f.tdepth = 0.62 - slot * 0.08;
    }
  }

  private launch(d: Duck, f: Flock, i: number): void {
    this.setLook(d, f.species);
    d.mode = 'fly';
    d.flock = f;
    d.index = i;
    d.facing = d.targetFacing = f.dir;
    d.flap = this.rnd() * Math.PI * 2;
    d.flapRate = 10 + this.rnd() * 3;
    d.depth = f.kind === 'hunt' ? f.baseDepth : f.depth;
    d.x = f.lx;
    d.y = f.ly;
    d.root.visible = true;
    d.root.rotation = 0;
  }

  /** Climb away and off-screen. `alarmed` = fast flare, else a calm departure. */
  private exit(d: Duck, alarmed: boolean): void {
    const l = this.l;
    d.mode = 'exit';
    d.flock = null;
    const dir = d.x < l.w / 2 ? -1 : 1;
    d.targetFacing = dir;
    d.vx = dir * (alarmed ? 120 + this.rnd() * 60 : 90) * l.scale;
    d.vy = (alarmed ? -90 - this.rnd() * 50 : -25) * l.scale;
    d.flapRate = alarmed ? 16 : 11;
  }

  private retire(d: Duck): void {
    d.mode = 'off';
    d.root.visible = false;
    d.flock = null;
  }

  update(f: FrameContext): void {
    this.skyDrops = Math.min(8, this.skyDrops + f.dt * LANDINGS_PER_SECOND);
    this.flockSlots = Math.min(2, this.flockSlots + f.dt * CALM_FLOCKS_PER_SECOND);
    const dt = f.dt;
    this.time += dt;
    const l = this.l;

    if (this.ambient) {
      this.flyoverTimer -= dt * (0.1 + f.activity * 0.6);
      if (this.flyoverTimer <= 0) {
        this.flyoverTimer = 8 + this.rnd() * 10;
        this.spawnFlyover();
      }
    }

    for (let i = this.flocks.length - 1; i >= 0; i--) {
      const fl = this.flocks[i]!;
      fl.age += dt;
      if (fl.kind === 'flyover') this.updateFlyover(fl, dt);
      else this.updateHunt(fl, dt);
      if (!fl.ducks.some((d) => d.flock === fl && d.mode !== 'off')) this.flocks.splice(i, 1);
    }

    // Free-flying ducks (tumbling or exiting)
    for (const d of this.ducks) {
      if (d.mode === 'tumble') {
        d.vy += FALL_G * l.scale * dt;
        d.x += d.vx * dt;
        d.y += d.vy * dt;
        d.root.rotation += d.spin * dt;
        if (d.y >= d.landY) {
          this.addFloater({ x: d.x, y: d.landY }, true, d.species, d.drake);
          this.lastLand = this.time;
          this.retire(d);
        }
      } else if (d.mode === 'exit') {
        d.vy -= 30 * l.scale * dt;
        d.x += d.vx * dt;
        d.y += d.vy * dt;
        d.depth = Math.max(0.35, d.depth - dt * 0.12);
        d.root.rotation = lerp(d.root.rotation, d.targetFacing * -0.25, Math.min(1, dt * 4));
        if (d.y < -50 * l.scale || d.x < -80 * l.scale || d.x > l.w + 80 * l.scale) this.retire(d);
      }
    }

    // Visuals
    const sil = shadeColor(lerpColor(f.sky.nearLand, f.sky.farLand, 0.3), 0.85);
    const lowSun = f.sky.sunAltitude > -0.1 ? 1 - clamp(f.sky.sunAltitude * 1.6, 0, 1) : 0.4;
    for (const d of this.ducks) {
      if (d.mode === 'off') continue;
      d.facing += (d.targetFacing - d.facing) * Math.min(1, dt * 5);
      const k = l.scale * d.depth * 0.6 * d.size;
      d.root.scale.set(k * d.facing, k);
      const working = d.mode === 'fly' && d.flock?.state === 'work';
      if (d.mode === 'tumble') {
        d.wingNear.scale.y = 0.3;
        d.wingFar.scale.y = 0.25;
        d.wingNear.rotation = d.wingFar.rotation = 0.6;
        d.body.y = 0;
      } else if (working) {
        const flutter = Math.sin(this.time * 18 + d.seed * 10) * 0.05;
        d.wingNear.scale.y = 0.95 + flutter;
        d.wingFar.scale.y = 0.85 + flutter;
        d.wingNear.rotation = d.wingFar.rotation = -0.35;
        d.body.y = 0;
        d.root.rotation = lerp(d.root.rotation, 0, Math.min(1, dt * 4));
      } else {
        d.flap += d.flapRate * dt;
        const c = Math.cos(d.flap);
        d.wingNear.scale.y = 0.22 + 0.78 * c;
        d.wingFar.scale.y = (0.22 + 0.78 * Math.cos(d.flap - 0.25)) * 0.85;
        d.wingNear.rotation = d.wingFar.rotation = 0;
        d.body.y = Math.sin(d.flap) * 0.8;
        if (d.mode === 'fly') d.root.rotation = lerp(d.root.rotation, 0, Math.min(1, dt * 4));
      }
      const silK = clamp((1 - d.depth) * 0.8 + lowSun * 0.45 + f.sky.darkness * 0.5, 0, 0.9);
      d.root.tint = d.flock?.golden ? lerpColor(0xffd36a, 0xfff3c8, (Math.sin(this.time * 6 + d.seed * 9) + 1) / 2) : lerpColor(f.sky.light, sil, silK);
      d.root.position.set(d.x, d.y);
    }

    // Floating birds: bob gently, drift a little.
    for (let i = this.floaters.length - 1; i >= 0; i--) {
      const fl = this.floaters[i]!;
      fl.age += dt;
      if (fl.fade > 0) {
        fl.fade -= dt * 1.5;
        if (fl.fade <= 0) {
          this.removeFloater(fl, false);
          continue;
        }
      }
      if (!this.onGround) fl.x += f.wind * 1.5 * l.scale * dt;
      fl.s.position.set(fl.x, fl.y + Math.sin(this.time * 1.4 + fl.phase) * 0.8 * l.scale);
      // Harvested birds sit low and tilted, a little darker than live ducks.
      fl.s.rotation = 0.28 + Math.sin(this.time * 0.9 + fl.phase) * 0.06;
      fl.s.tint = shadeColor(f.sky.light, 0.78);
      fl.s.alpha = fl.fade > 0 ? fl.fade : 1;
    }
    this.drawRings();
    this.goldenSparkle -= dt;
    if (this.goldenSparkle <= 0) {
      this.goldenSparkle = 0.14;
      for (const fl of this.flocks) {
        if (!fl.golden || fl.kind !== 'hunt') continue;
        const live = fl.ducks.filter((d) => d.flock === fl && d.mode === 'fly');
        const d = live[Math.floor(this.rnd() * live.length)];
        if (d) this.fx.sparkle(d.x, d.y, l.scale * 0.45, 2);
      }
    }
    const ch = this.waterView.children;
    if (ch.length > 1) ch.sort((a, b) => a.y - b.y);
  }

  private updateFlyover(f: Flock, dt: number): void {
    const l = this.l;
    f.lx += f.dir * f.speed * dt;
    for (const d of f.ducks) {
      if (d.flock !== f) continue;
      const i = d.index;
      const rank = Math.ceil(i / 2);
      const side = i % 2 === 1 ? 1 : -1;
      d.x = f.lx - f.dir * rank * f.spacing;
      d.y = f.ly + side * rank * f.spacing * 0.32 + Math.sin(this.time * 1.7 + d.seed * 6) * 2 * l.scale;
      const off = f.dir > 0 ? d.x > l.w + 60 * l.scale : d.x < -60 * l.scale;
      if (off) this.retire(d);
    }
  }

  private updateHunt(f: Flock, dt: number): void {
    const l = this.l;
    // Ease the circle toward its targets (smooth drop when called).
    const k = Math.min(1, dt * 0.9);
    f.cx = lerp(f.cx, f.tcx, k);
    f.cy = lerp(f.cy, f.tcy, k);
    f.radius = lerp(f.radius, f.tradius, k);
    f.squash = lerp(f.squash, f.tsquash, k);
    f.baseDepth = lerp(f.baseDepth, f.tdepth, k);

    const sign = f.dir > 0 ? -1 : 1;
    let depth = f.baseDepth;
    if (f.state === 'approach') {
      // Head for the near edge of the circle, then join it.
      const entry = f.dir > 0 ? Math.PI : 0;
      const tx = f.cx + Math.cos(entry) * f.radius;
      const ty = f.cy + Math.sin(entry) * f.radius * f.squash;
      const dx = tx - f.lx;
      const dy = ty - f.ly;
      const dist = Math.hypot(dx, dy);
      if (dist < f.speed * dt * 1.5) {
        f.theta = entry;
        f.state = f.called ? 'work' : 'circle';
      } else {
        f.lx += (dx / dist) * f.speed * dt;
        f.ly += (dy / dist) * f.speed * dt;
      }
    } else {
      const omega = (f.speed / Math.max(40, f.radius)) * (f.state === 'work' ? 0.75 : 0.6);
      f.theta += sign * omega * dt;
      f.lx = f.cx + Math.cos(f.theta) * f.radius;
      f.ly = f.cy + Math.sin(f.theta) * f.radius * f.squash;
      depth = f.baseDepth + Math.sin(f.theta) * 0.18;
    }
    f.history.push({ x: f.lx, y: f.ly, d: depth, t: f.age });
    while (f.history.length > 2 && f.history[0]!.t < f.age - (MAX_VISIBLE_PER_FLOCK + 1) * FOLLOW_LAG - 0.5) f.history.shift();

    for (const d of f.ducks) {
      if (d.flock !== f || d.mode !== 'fly') continue;
      const s = this.sampleAt(f, f.age - d.index * FOLLOW_LAG);
      const prevX = d.x;
      d.x = s.x + Math.sin(d.seed * 20) * 7 * l.scale;
      d.y = s.y + Math.cos(d.seed * 20) * 5 * l.scale;
      d.depth = s.d;
      if (Math.abs(d.x - prevX) > 0.05) d.targetFacing = d.x > prevX ? 1 : -1;
    }
  }

  private sampleAt(f: Flock, t: number): Sample {
    const h = f.history;
    if (h.length === 0) return { x: f.lx, y: f.ly, d: f.baseDepth, t };
    if (t <= h[0]!.t) {
      const first = h[0]!;
      return { x: first.x - f.dir * (first.t - t) * f.speed, y: first.y, d: first.d, t };
    }
    for (let i = h.length - 1; i > 0; i--) {
      const a = h[i - 1]!;
      const b = h[i]!;
      if (t >= a.t) {
        const k = b.t === a.t ? 0 : (t - a.t) / (b.t - a.t);
        return { x: lerp(a.x, b.x, k), y: lerp(a.y, b.y, k), d: lerp(a.d, b.d, k), t };
      }
    }
    return h[h.length - 1]!;
  }
}
