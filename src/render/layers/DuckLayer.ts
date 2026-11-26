import { Container, Sprite } from 'pixi.js';
import { SPECIES, type SpeciesId } from '../../data/species';
import type { GameState } from '../../sim/state';
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
}

const MAX_DUCKS = 48;
const MAX_VISIBLE_PER_FLOCK = 6;
const MAX_FLOATERS = 12;
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
  private l!: SceneLayout;
  private time = 0;
  private flyoverTimer = 3;
  private readonly rnd = seededRandom(2718);
  ambient = true;

  constructor(private readonly tex: TextureLibrary, private readonly fx: EffectsLayer) {
    this.view.addChild(this.waterView, this.skyView);
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
  arrive(id: number, size: number, species: SpeciesId = 'mallard'): void {
    if (this.findHunt(id)) return;
    const ducks = this.take(Math.min(size, MAX_VISIBLE_PER_FLOCK));
    if (ducks.length === 0) return;
    const l = this.l;
    const f = this.newFlock('hunt', ducks, this.rnd() > 0.5 ? 1 : -1);
    f.id = id;
    f.state = 'approach';
    f.lx = f.dir > 0 ? -60 * l.scale : l.w + 60 * l.scale;
    f.ly = l.horizon * (0.2 + this.rnd() * 0.25);
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

  /** A shot: `downed` birds tumble to the water, the rest flare off. */
  shoot(id: number, downed: number): void {
    const f = this.findHunt(id);
    const l = this.l;
    if (!f) {
      // No visible flock (e.g. pool exhausted): still show birds landing.
      for (let i = 0; i < Math.min(downed, 3); i++) this.addFloater(this.randomWaterPoint(), true);
      return;
    }
    const species = f.species;
    const live = f.ducks.filter((d) => d.flock === f && d.mode === 'fly');
    let toDrop = Math.min(downed, live.length);
    const extra = downed - toDrop;
    for (const d of live) {
      if (toDrop > 0) {
        toDrop--;
        d.mode = 'tumble';
        const prev = this.sampleAt(f, f.age - d.index * FOLLOW_LAG - 0.05);
        d.vx = clamp((d.x - prev.x) * 20, -80 * l.scale, 80 * l.scale) * 0.5;
        d.vy = -25 * l.scale;
        d.spin = (this.rnd() > 0.5 ? 1 : -1) * (3 + this.rnd() * 3);
        const p = this.randomWaterPoint();
        d.landY = Math.max(p.y, Math.min(l.h - 20 * l.scale, d.y + 30 * l.scale));
        this.fx.featherPuff(d.x, d.y, l.scale * d.depth);
      } else {
        this.exit(d, true);
      }
    }
    for (let i = 0; i < Math.min(extra, 3); i++) this.addFloater(this.randomWaterPoint(), true, species);
    f.ducks.length = 0;
  }

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
    const h = state.hunt;
    const live = new Set<number>();
    for (const fl of h.incoming) {
      live.add(fl.id);
      if (!this.findHunt(fl.id)) this.arrive(fl.id, fl.size, fl.species);
    }
    for (const fl of h.committed) {
      live.add(fl.id);
      const f = this.findHunt(fl.id);
      if (!f) {
        this.arrive(fl.id, fl.size, fl.species);
        this.call(fl.id);
      } else if (f.state === 'circle') this.call(fl.id);
    }
    for (const f of this.flocks) if (f.kind === 'hunt' && !live.has(f.id) && f.ducks.length) this.leave(f.id);

    // Floating birds: match the sim count (capped), unless tumbles are in flight.
    const tumbling = this.ducks.some((d) => d.mode === 'tumble');
    const want = Math.min(h.downed.length, MAX_FLOATERS);
    const have = this.floaters.filter((f) => f.fade === 0).length;
    if (!tumbling && have < want) for (let i = have; i < want; i++) this.addFloater(this.randomWaterPoint(), false, h.downed[i]);
    if (have > h.downed.length) {
      let extra = have - h.downed.length;
      for (const f of this.floaters) {
        if (extra <= 0) break;
        if (!f.reserved && f.fade === 0) {
          f.fade = 1;
          extra--;
        }
      }
    }
  }

  spawnFlyover(count = 3 + Math.floor(this.rnd() * 6), depth = 0.3 + this.rnd() * 0.6, high = false, species?: SpeciesId): boolean {
    const ducks = this.take(count);
    if (ducks.length < 2) return false;
    const l = this.l;
    const f = this.newFlock('flyover', ducks, this.rnd() > 0.5 ? 1 : -1);
    const common: SpeciesId[] = ['mallard', 'mallard', 'teal', 'pintail', 'gadwall'];
    f.species = species ?? common[Math.floor(this.rnd() * common.length)]!;
    f.depth = depth;
    f.spacing = 24 * l.scale * depth;
    f.speed = (55 + this.rnd() * 30) * l.scale * (0.5 + depth * 0.6);
    f.ly = l.horizon * (high ? 0.1 + this.rnd() * 0.15 : 0.15 + this.rnd() * 0.45) * (1.1 - depth * 0.3);
    f.lx = f.dir > 0 ? -40 * l.scale : l.w + 40 * l.scale;
    ducks.forEach((d, i) => this.launch(d, f, i));
    this.flocks.push(f);
    return true;
  }

  // ------------------------------------------------------------------ floaters

  /** Oldest unclaimed floating bird, now reserved for a retriever. */
  claimFloater(): Floater | null {
    for (const f of this.floaters) {
      if (!f.reserved && f.fade === 0) {
        f.reserved = true;
        return f;
      }
    }
    return null;
  }

  /** Remove a floater (picked up or retrieved off-screen). */
  removeFloater(f: Floater, ripple = true): void {
    const i = this.floaters.indexOf(f);
    if (i < 0) return;
    this.floaters.splice(i, 1);
    if (ripple) this.fx.ripple(f.x, f.y, 0.6, 1.6);
    f.s.destroy();
  }

  get floaterCount(): number {
    return this.floaters.length;
  }

  private addFloater(p: Point, splash: boolean, species: SpeciesId = 'mallard', drake = this.rnd() < 0.6): void {
    if (this.floaters.length >= MAX_FLOATERS) return;
    const s = new Sprite(this.tex.get(`duck.swim.${species}.${drake ? 'drake' : 'hen'}`));
    s.anchor.set(0.45, 30 / 34);
    this.waterView.addChild(s);
    const f: Floater = { s, x: p.x, y: p.y, phase: this.rnd() * 10, reserved: false, fade: 0 };
    const k = waterDepthScale(this.l, p.y) * 0.5 * SPECIES[species].size;
    s.scale.set(k * (this.rnd() > 0.5 ? 1 : -1), k * 0.8);
    this.floaters.push(f);
    if (splash) this.fx.splash(p.x, p.y, 0.8);
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
      kind, id: -1, ducks, dir, state: 'approach', called: false, age: 0, species: 'mallard',
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
      f.tcy = l.horizon * (0.38 + slot * 0.1);
      f.tradius = Math.min(l.w * 0.34, 300 * l.scale) * (1 - slot * 0.12);
      f.tsquash = 0.22;
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
        d.vy += 340 * l.scale * dt;
        d.x += d.vx * dt;
        d.y += d.vy * dt;
        d.root.rotation += d.spin * dt;
        if (d.y >= d.landY) {
          this.addFloater({ x: d.x, y: d.landY }, true, d.species, d.drake);
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
      d.root.tint = lerpColor(f.sky.light, sil, silK);
      d.root.position.set(d.x, d.y);
    }

    // Floating birds: bob gently, drift a little.
    for (let i = this.floaters.length - 1; i >= 0; i--) {
      const fl = this.floaters[i]!;
      if (fl.fade > 0) {
        fl.fade -= dt * 1.5;
        if (fl.fade <= 0) {
          this.removeFloater(fl, false);
          continue;
        }
      }
      fl.x += f.wind * 1.5 * l.scale * dt;
      fl.s.position.set(fl.x, fl.y + Math.sin(this.time * 1.4 + fl.phase) * 0.8 * l.scale);
      // Harvested birds sit low and tilted, a little darker than live ducks.
      fl.s.rotation = 0.28 + Math.sin(this.time * 0.9 + fl.phase) * 0.06;
      fl.s.tint = shadeColor(f.sky.light, 0.78);
      fl.s.alpha = fl.fade > 0 ? fl.fade : 1;
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
