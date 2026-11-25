import { Container, Sprite } from 'pixi.js';
import { lerpColor, shadeColor } from '../../util/color';
import { clamp, lerp, seededRandom, smoothstep } from '../../util/math';
import type { TextureLibrary } from '../assets/TextureLibrary';
import type { EffectsLayer } from './EffectsLayer';
import type { FrameContext, Layer, SceneLayout } from '../types';
import { waterDepthScale } from '../types';

type DuckMode = 'off' | 'fly' | 'glide' | 'swim' | 'takeoff';

interface Duck {
  root: Container;
  flyer: Container;
  body: Sprite;
  wingNear: Sprite;
  wingFar: Sprite;
  swim: Sprite;
  drake: boolean;
  mode: DuckMode;
  x: number;
  y: number;
  /** Flight depth multiplier (0.3 far … 1.1 near). */
  depth: number;
  facing: number;
  targetFacing: number;
  flap: number;
  flapRate: number;
  seed: number;
  // glide
  gx0: number; gy0: number; gx1: number; gy1: number; gs0: number; gt: number; gdur: number;
  // swim
  swimT: number; swimDur: number; vx: number; rippleT: number;
  // takeoff
  vy: number;
  commitAt: number;
  flock: Flock | null;
  index: number;
}

interface Sample { x: number; y: number; d: number; t: number }

interface Flock {
  kind: 'flyover' | 'lander';
  ducks: Duck[];
  dir: number;
  // flyover
  lx: number; ly: number; speed: number; depth: number; spacing: number;
  // lander
  state: 'approach' | 'circle' | 'commit';
  age: number;
  theta: number;
  thetaTravel: number;
  radius: number;
  cx: number; cy: number;
  history: Sample[];
}

const MAX_DUCKS = 28;
const FOLLOW_LAG = 0.24;

/**
 * Flocks of mallards. Flyovers cross the sky in loose V formations at
 * different depths; landers circle the decoy spread, cup their wings,
 * splash down, paddle around, and eventually take off again.
 *
 * Phase 1: an ambient director spawns flocks from the time-of-day activity
 * curve. Later phases drive spawns from the sim's flock queue.
 */
export class DuckLayer implements Layer {
  readonly view = new Container();
  private readonly skyView = new Container();
  private readonly waterView = new Container();
  private readonly ducks: Duck[] = [];
  private readonly flocks: Flock[] = [];
  private l!: SceneLayout;
  private time = 0;
  private flyoverTimer = 2;
  private landerTimer = 6;
  private readonly rnd = seededRandom(2718);
  ambient = true;

  constructor(tex: TextureLibrary, private readonly fx: EffectsLayer) {
    this.view.addChild(this.skyView, this.waterView);
    for (let i = 0; i < MAX_DUCKS; i++) {
      const drake = i % 5 < 3;
      const kind = drake ? 'drake' : 'hen';
      const root = new Container();
      const flyer = new Container();
      const body = new Sprite(tex.get(`duck.fly.${kind}`));
      body.anchor.set(0.5);
      const wingFar = new Sprite(tex.get(`duck.wing.${kind}`));
      wingFar.anchor.set(12 / 30, 1);
      wingFar.position.set(1.5, -4);
      wingFar.tint = 0x9a9aa0;
      const wingNear = new Sprite(tex.get(`duck.wing.${kind}`));
      wingNear.anchor.set(12 / 30, 1);
      wingNear.position.set(-2, -2.5);
      flyer.addChild(wingFar, body, wingNear);
      const swim = new Sprite(tex.get(`duck.swim.${kind}`));
      swim.anchor.set(0.45, 30 / 34);
      root.addChild(flyer, swim);
      root.visible = false;
      this.skyView.addChild(root);
      this.ducks.push({
        root, flyer, body, wingNear, wingFar, swim, drake, mode: 'off',
        x: 0, y: 0, depth: 1, facing: 1, targetFacing: 1, flap: 0, flapRate: 9,
        seed: this.rnd(), gx0: 0, gy0: 0, gx1: 0, gy1: 0, gs0: 1, gt: 0, gdur: 2,
        swimT: 0, swimDur: 30, vx: 0, rippleT: 0, vy: 0, commitAt: 0, flock: null, index: 0,
      });
    }
  }

  layout(l: SceneLayout): void {
    this.l = l;
  }

  get activeFlocks(): number {
    return this.flocks.length;
  }

  // ------------------------------------------------------------------ spawn

  private take(n: number): Duck[] {
    const out: Duck[] = [];
    for (const d of this.ducks) {
      if (d.mode === 'off') out.push(d);
      if (out.length === n) break;
    }
    return out;
  }

  spawnFlyover(count = 3 + Math.floor(this.rnd() * 6), depth = 0.35 + this.rnd() * 0.65): boolean {
    const ducks = this.take(count);
    if (ducks.length < 2) return false;
    const l = this.l;
    const dir = this.rnd() > 0.5 ? 1 : -1;
    const spacing = 24 * l.scale * depth;
    const f: Flock = this.newFlock('flyover', ducks, dir);
    f.depth = depth;
    f.spacing = spacing;
    f.speed = (55 + this.rnd() * 30) * l.scale * (0.5 + depth * 0.6);
    f.ly = l.horizon * (0.15 + this.rnd() * 0.5) * (1.1 - depth * 0.3);
    f.lx = dir > 0 ? -40 * l.scale : l.w + 40 * l.scale;
    ducks.forEach((d, i) => this.launch(d, f, i, 'fly'));
    this.flocks.push(f);
    return true;
  }

  spawnLander(count = 3 + Math.floor(this.rnd() * 4)): boolean {
    if (this.flocks.some((f) => f.kind === 'lander')) return false;
    const ducks = this.take(count);
    if (ducks.length < 2) return false;
    const l = this.l;
    const dir = this.rnd() > 0.5 ? 1 : -1;
    const f = this.newFlock('lander', ducks, dir);
    f.cx = l.anchors.decoyCenter.x;
    f.cy = l.horizon - (l.h - l.horizon) * 0.35;
    f.radius = Math.min(l.w * 0.3, 260 * l.scale);
    f.lx = dir > 0 ? -50 * l.scale : l.w + 50 * l.scale;
    f.ly = l.horizon * 0.2;
    f.speed = 110 * l.scale;
    f.depth = 0.7;
    ducks.forEach((d, i) => this.launch(d, f, i, 'fly'));
    this.flocks.push(f);
    return true;
  }

  private newFlock(kind: Flock['kind'], ducks: Duck[], dir: number): Flock {
    return {
      kind, ducks, dir, lx: 0, ly: 0, speed: 0, depth: 1, spacing: 0,
      state: 'approach', age: 0, theta: 0, thetaTravel: 0, radius: 0, cx: 0, cy: 0, history: [],
    };
  }

  private launch(d: Duck, f: Flock, i: number, mode: DuckMode): void {
    d.mode = mode;
    d.flock = f;
    d.index = i;
    d.facing = d.targetFacing = f.dir;
    d.flap = this.rnd() * Math.PI * 2;
    d.flapRate = 10 + this.rnd() * 3;
    d.depth = f.depth;
    d.x = f.lx;
    d.y = f.ly;
    d.root.visible = true;
    d.root.rotation = 0;
    d.flyer.visible = true;
    d.swim.visible = false;
    if (d.root.parent !== this.skyView) this.skyView.addChild(d.root);
  }

  private retire(d: Duck): void {
    d.mode = 'off';
    d.root.visible = false;
    d.flock = null;
  }

  // ------------------------------------------------------------------ update

  update(f: FrameContext): void {
    const dt = f.dt;
    this.time += dt;
    const l = this.l;

    if (this.ambient) this.direct(f);

    for (let i = this.flocks.length - 1; i >= 0; i--) {
      const fl = this.flocks[i]!;
      fl.age += dt;
      if (fl.kind === 'flyover') this.updateFlyover(fl, dt);
      else this.updateLander(fl, dt);
      if (fl.ducks.every((d) => d.mode === 'off' || d.flock !== fl)) this.flocks.splice(i, 1);
    }

    // Visuals for every active duck
    const sil = shadeColor(lerpColor(f.sky.nearLand, f.sky.farLand, 0.3), 0.85);
    const lowSun = f.sky.sunAltitude > -0.1 ? 1 - clamp(f.sky.sunAltitude * 1.6, 0, 1) : 0.4;
    for (const d of this.ducks) {
      if (d.mode === 'off') continue;
      d.facing += (d.targetFacing - d.facing) * Math.min(1, dt * 5);
      const flying = d.mode !== 'swim';
      if (flying) {
        const k = l.scale * d.depth * 0.6;
        d.root.scale.set(k * d.facing, k);
        const glide = d.mode === 'glide';
        if (glide) {
          const flutter = Math.sin(this.time * 18 + d.seed * 10) * 0.05;
          d.wingNear.scale.y = 0.95 + flutter;
          d.wingFar.scale.y = 0.85 + flutter;
          d.wingNear.rotation = d.wingFar.rotation = -0.35;
          d.body.y = 0;
        } else {
          d.flap += d.flapRate * dt * (d.mode === 'takeoff' ? 1.4 : 1);
          const c = Math.cos(d.flap);
          d.wingNear.scale.y = 0.22 + 0.78 * c;
          d.wingFar.scale.y = (0.22 + 0.78 * Math.cos(d.flap - 0.25)) * 0.85;
          d.wingNear.rotation = d.wingFar.rotation = 0;
          d.body.y = Math.sin(d.flap) * 0.8;
        }
        const silK = clamp((1 - d.depth) * 0.8 + lowSun * 0.45 + f.sky.darkness * 0.5, 0, 0.9);
        d.root.tint = lerpColor(f.sky.light, sil, silK);
      } else {
        const k = waterDepthScale(l, d.y) * 0.6;
        d.root.scale.set(k * d.facing, k);
        d.root.tint = f.sky.light;
      }
      d.root.position.set(d.x, d.y);
    }

    // Depth-sort swimmers so nearer ducks overlap farther ones.
    const ch = this.waterView.children;
    if (ch.length > 1) ch.sort((a, b) => a.y - b.y);
  }

  /** Ambient spawner driven by the activity curve. */
  private direct(f: FrameContext): void {
    const act = f.activity;
    this.flyoverTimer -= f.dt * (0.15 + act);
    if (this.flyoverTimer <= 0) {
      this.flyoverTimer = 6 + this.rnd() * 8;
      if (this.rnd() < 0.3 + act * 0.7) this.spawnFlyover();
    }
    this.landerTimer -= f.dt * act;
    if (this.landerTimer <= 0) {
      this.landerTimer = 18 + this.rnd() * 16;
      if (act > 0.3) this.spawnLander();
    }
  }

  private updateFlyover(f: Flock, dt: number): void {
    const l = this.l;
    f.lx += f.dir * f.speed * dt;
    let allGone = true;
    for (const d of f.ducks) {
      if (d.flock !== f) continue;
      const i = d.index;
      const rank = Math.ceil(i / 2);
      const side = i % 2 === 1 ? 1 : -1;
      d.x = f.lx - f.dir * rank * f.spacing;
      d.y = f.ly + side * rank * f.spacing * 0.32 + Math.sin(this.time * 1.7 + d.seed * 6) * 2 * l.scale;
      const off = f.dir > 0 ? d.x > l.w + 60 * l.scale : d.x < -60 * l.scale;
      if (off) this.retire(d);
      else allGone = false;
    }
    if (allGone) for (const d of f.ducks) if (d.flock === f) this.retire(d);
  }

  private updateLander(f: Flock, dt: number): void {
    const l = this.l;
    // ----- leader path
    if (f.state === 'approach') {
      const tx = f.cx - f.dir * f.radius;
      const ty = f.cy;
      const dx = tx - f.lx;
      const dy = ty - f.ly;
      const dist = Math.hypot(dx, dy);
      if (dist < f.speed * dt * 1.5) {
        f.state = 'circle';
        f.theta = f.dir > 0 ? Math.PI : 0;
        f.thetaTravel = 0;
      } else {
        f.lx += (dx / dist) * f.speed * dt;
        f.ly += (dy / dist) * f.speed * dt;
      }
    }
    let leaderDepth = 0.75;
    if (f.state === 'circle' || f.state === 'commit') {
      // Clockwise for leftward entry so the flock sweeps toward the camera.
      const omega = (f.speed / f.radius) * 1.25;
      const sign = f.dir > 0 ? -1 : 1;
      f.theta += sign * omega * dt;
      f.thetaTravel += omega * dt;
      const r = f.radius * lerp(1, 0.65, clamp(f.thetaTravel / (Math.PI * 2), 0, 1));
      f.lx = f.cx + Math.cos(f.theta) * r;
      f.ly = f.cy + Math.sin(f.theta) * r * 0.22 + f.thetaTravel * 4 * l.scale;
      leaderDepth = 0.78 + Math.sin(f.theta) * 0.2;
      if (f.state === 'circle' && f.thetaTravel > Math.PI * 1.2) {
        f.state = 'commit';
        f.ducks.forEach((d, i) => (d.commitAt = f.age + i * 0.32 + this.rnd() * 0.2));
      }
    }
    f.history.push({ x: f.lx, y: f.ly, d: leaderDepth, t: f.age });
    while (f.history.length > 2 && f.history[0]!.t < f.age - (f.ducks.length + 1) * FOLLOW_LAG - 0.5) f.history.shift();

    // ----- ducks
    let active = 0;
    for (const d of f.ducks) {
      if (d.flock !== f) continue;
      active++;
      switch (d.mode) {
        case 'fly': {
          const s = this.sampleAt(f, f.age - d.index * FOLLOW_LAG);
          const prevX = d.x;
          d.x = s.x + Math.sin(d.seed * 20) * 6 * l.scale;
          d.y = s.y + Math.cos(d.seed * 20) * 4 * l.scale;
          d.depth = s.d;
          if (Math.abs(d.x - prevX) > 0.05) d.targetFacing = d.x > prevX ? 1 : -1;
          if (f.state === 'commit' && f.age >= d.commitAt) this.beginGlide(d);
          break;
        }
        case 'glide': {
          d.gt += dt;
          const t = clamp(d.gt / d.gdur, 0, 1);
          const e = smoothstep(t);
          // Quadratic swoop: dip under the straight line, flare at the end.
          const cxp = lerp(d.gx0, d.gx1, 0.65);
          const cyp = lerp(d.gy0, d.gy1, 0.85);
          const u = 1 - e;
          d.x = u * u * d.gx0 + 2 * u * e * cxp + e * e * d.gx1;
          d.y = u * u * d.gy0 + 2 * u * e * cyp + e * e * d.gy1;
          const swimDepth = waterDepthScale(l, d.gy1) / l.scale;
          d.depth = lerp(d.gs0, swimDepth, e);
          d.root.rotation = d.targetFacing * lerp(0.1, -0.25, e);
          if (t >= 1) this.touchdown(d);
          break;
        }
        case 'swim': {
          d.swimT += dt;
          d.x += d.vx * dt;
          // Stay loosely within the decoy spread.
          const dx = d.x - l.anchors.decoyCenter.x;
          if (Math.abs(dx) > l.anchors.decoySpread * 1.4 && Math.sign(dx) === Math.sign(d.vx)) {
            d.vx = -d.vx;
            d.targetFacing = d.vx > 0 ? 1 : -1;
          }
          d.y = d.gy1 + Math.sin(this.time * 1.6 + d.seed * 8) * 0.8 * l.scale;
          if (this.rnd() < dt * 0.08) {
            d.vx = (this.rnd() - 0.5) * 10 * l.scale;
            if (Math.abs(d.vx) > 1) d.targetFacing = d.vx > 0 ? 1 : -1;
          }
          d.root.rotation = Math.sin(this.time * 1.2 + d.seed * 5) * 0.03;
          d.rippleT -= dt;
          if (d.rippleT <= 0) {
            d.rippleT = 1.2 + this.rnd() * 1.4;
            this.fx.ripple(d.x, d.gy1 + 1, 0.6, 2.2);
          }
          if (d.swimT > d.swimDur) this.beginTakeoff(d);
          break;
        }
        case 'takeoff': {
          d.vy -= 90 * l.scale * dt;
          d.x += d.vx * dt;
          d.y += d.vy * dt;
          d.depth = Math.min(1.2, d.depth + dt * 0.15);
          d.root.rotation = d.targetFacing * -0.2;
          if (d.y < -40 * l.scale || d.x < -80 * l.scale || d.x > l.w + 80 * l.scale) this.retire(d);
          break;
        }
        default:
          break;
      }
    }
    if (active === 0) f.ducks.length = 0;
  }

  private sampleAt(f: Flock, t: number): Sample {
    const h = f.history;
    if (h.length === 0) return { x: f.lx, y: f.ly, d: 0.75, t };
    if (t <= h[0]!.t) {
      // Before the path began: trail in from off-screen along the entry line.
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

  private beginGlide(d: Duck): void {
    const l = this.l;
    const a = l.anchors;
    d.mode = 'glide';
    d.gt = 0;
    d.gdur = 1.9 + this.rnd() * 0.6;
    d.gx0 = d.x;
    d.gy0 = d.y;
    d.gs0 = d.depth;
    const waterH = l.h - l.horizon;
    d.gx1 = a.decoyCenter.x + (this.rnd() - 0.5) * a.decoySpread * 2.2;
    d.gy1 = a.decoyCenter.y + (this.rnd() - 0.5) * waterH * 0.3;
    d.targetFacing = d.gx1 > d.gx0 ? 1 : -1;
  }

  private touchdown(d: Duck): void {
    d.mode = 'swim';
    d.flyer.visible = false;
    d.swim.visible = true;
    d.root.rotation = 0;
    d.swimT = 0;
    d.swimDur = 22 + this.rnd() * 26;
    d.vx = d.targetFacing * 4 * this.l.scale;
    d.rippleT = 0.6;
    this.waterView.addChild(d.root);
    this.fx.splash(d.x, d.gy1, 0.9);
  }

  private beginTakeoff(d: Duck): void {
    const l = this.l;
    d.mode = 'takeoff';
    d.flyer.visible = true;
    d.swim.visible = false;
    d.depth = waterDepthScale(l, d.y) / l.scale;
    d.targetFacing = d.x < l.w / 2 ? -1 : 1;
    d.facing = d.targetFacing;
    d.vx = d.targetFacing * (70 + this.rnd() * 30) * l.scale;
    d.vy = -30 * l.scale;
    this.skyView.addChild(d.root);
    this.fx.splash(d.x, d.y, 0.7);
  }
}
