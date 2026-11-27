import { Container, Graphics, Sprite } from 'pixi.js';
import { FIELD_BOTS, type BotId } from '../data/economy';
import { WEATHER } from '../data/weather';
import type { SimEvent } from '../sim/events';
import type { GameState } from '../sim/state';
import { lerpColor, shadeColor } from '../util/color';
import { clamp, seededRandom } from '../util/math';
import type { TextureLibrary } from './assets/TextureLibrary';
import { CloudLayer } from './layers/CloudLayer';
import { DuckLayer, type Floater } from './layers/DuckLayer';
import { EffectsLayer } from './layers/EffectsLayer';
import { FogLayer } from './layers/FogLayer';
import { HintLayer, chooseHint } from './layers/HintLayer';
import { LandLayer } from './layers/LandLayer';
import { OverlayLayer } from './layers/OverlayLayer';
import { SkyLayer } from './layers/SkyLayer';
import { WeatherLayer } from './layers/WeatherLayer';
import type { TapTarget } from './MarshScene';
import type { FrameContext, Layer, Point, SceneLayout } from './types';
import { waterDepthScale } from './types';

// ---------------------------------------------------------------- the stubble field

/** A harvested cornfield: golden stubble rows running to the horizon, a fence, hay bales. */
class FieldGroundLayer implements Layer {
  readonly view = new Container();
  private readonly g = new Graphics();
  private readonly far = new Graphics();

  constructor() {
    this.view.addChild(this.g, this.far);
  }

  layout(l: SceneLayout): void {
    const { w, h, horizon: hz, scale: s } = l;
    const rnd = seededRandom(909);
    const g = this.g.clear();
    // Bands of stubble, lighter toward the horizon.
    const bands = 14;
    for (let i = 0; i < bands; i++) {
      const t0 = i / bands;
      const t1 = (i + 1) / bands;
      const y0 = hz + (h - hz) * t0 * t0;
      const y1 = hz + (h - hz) * t1 * t1 + 1;
      g.rect(0, y0, w, y1 - y0).fill(lerpColor(0xe2c88e, 0x9a7444, t0));
    }
    // Rows converging on a vanishing point above the horizon.
    const vx = w * 0.55;
    const vy = hz - (h - hz) * 0.6;
    for (let i = -18; i <= 18; i++) {
      const bx = vx + i * w * 0.09;
      const t = (hz - vy) / (h - vy);
      g.moveTo(vx + (bx - vx) * t, hz).lineTo(bx, h).stroke({ width: Math.max(1, 1.2 * s), color: 0x7a5a32, alpha: 0.28 });
    }
    // Stubble stalks, denser and taller near the viewer.
    for (let i = 0; i < 900; i++) {
      const t = rnd();
      const y = hz + (h - hz) * t * t;
      const x = rnd() * w;
      const k = waterDepthScale(l, y);
      const len = (2 + rnd() * 3) * k;
      g.moveTo(x, y).lineTo(x + (rnd() - 0.5) * 1.5 * k, y - len).stroke({ width: Math.max(0.6, 0.9 * k), color: rnd() > 0.5 ? 0xf0dca8 : 0xb89458, alpha: 0.9 });
    }
    // Far fence line and round bales.
    const far = this.far.clear();
    for (let x = 6 * s; x < w; x += 26 * s) far.rect(x, hz - 7 * s, 1.6 * s, 8 * s).fill(0x6a5640);
    far.moveTo(0, hz - 5 * s).lineTo(w, hz - 5 * s).stroke({ width: 0.8 * s, color: 0x6a5640, alpha: 0.8 });
    for (const fx of [0.12, 0.2, 0.78, 0.9]) {
      const x = w * fx;
      far.ellipse(x, hz - 3 * s, 7 * s, 5 * s).fill(0xc8a45e);
      far.ellipse(x - 2 * s, hz - 3 * s, 3.5 * s, 3.5 * s).stroke({ width: 0.8 * s, color: 0x9a7a3e });
    }
  }

  update(f: FrameContext): void {
    const lit = lerpColor(f.sky.light, f.sky.nearLand, 0.2);
    this.g.tint = lit;
    this.far.tint = lerpColor(f.sky.light, f.sky.farLand, 0.4);
  }
}

// ---------------------------------------------------------------- full-body spread

interface Slot {
  s: Sprite;
  x: number;
  y: number;
  pop: number;
}

/** Full-body goose decoys staked in family groups. */
class FieldSpreadLayer implements Layer {
  readonly view = new Container();
  private slots: Slot[] = [];
  private shown = 0;
  private l!: SceneLayout;

  constructor(private readonly tex: TextureLibrary) {}

  layout(l: SceneLayout): void {
    this.l = l;
    for (const sl of this.slots) sl.s.destroy();
    this.slots = [];
    this.view.removeChildren();
    const rnd = seededRandom(31);
    const a = l.anchors;
    const waterH = l.h - l.horizon;
    for (let i = 0; i < 40; i++) {
      const group = i % 5;
      const gx = a.decoyCenter.x + (group - 2) * a.decoySpread * 0.42;
      const gy = a.decoyCenter.y + ((group % 2) - 0.5) * waterH * 0.12;
      const x = gx + (rnd() - 0.5) * a.decoySpread * 0.35;
      const y = gy + (rnd() - 0.5) * waterH * 0.12;
      const key = i % 4 === 3 ? 'decoy.species.snowGoose' : 'decoy.species.canadaGoose';
      const s = new Sprite(this.tex.get(key));
      s.anchor.set(0.45, 30 / 34);
      const k = waterDepthScale(l, y) * 0.75;
      s.scale.set(k * (rnd() > 0.4 ? 1 : -1), k);
      s.position.set(x, y);
      s.visible = false;
      this.slots.push({ s, x, y, pop: 1 });
    }
    for (const sl of [...this.slots].sort((p, q) => p.y - q.y)) this.view.addChild(sl.s);
    const n = this.shown;
    this.shown = 0;
    this.reconcile(n, false);
  }

  reconcile(n: number, animate = true): void {
    if (!this.l) return;
    const want = Math.min(n, this.slots.length);
    for (let i = 0; i < this.slots.length; i++) {
      const sl = this.slots[i]!;
      const on = i < want;
      if (on && !sl.s.visible) sl.pop = animate ? 0 : 1;
      sl.s.visible = on;
    }
    this.shown = want;
  }

  /** Where the next decoy goes (for little dust puffs). */
  slotPoint(i: number): Point | null {
    const sl = this.slots[Math.max(0, Math.min(this.slots.length - 1, i))];
    return sl ? { x: sl.x, y: sl.y } : null;
  }

  update(f: FrameContext): void {
    const tint = lerpColor(f.sky.light, 0xffffff, 0.1);
    for (const sl of this.slots) {
      if (!sl.s.visible) continue;
      sl.s.tint = tint;
      if (sl.pop < 1) {
        sl.pop = Math.min(1, sl.pop + f.dt * 3);
        const b = 1 - Math.pow(1 - sl.pop, 3);
        sl.s.position.set(sl.x, sl.y - Math.sin(sl.pop * Math.PI) * 10 * this.l.scale);
        sl.s.alpha = b;
      } else {
        sl.s.position.set(sl.x, sl.y);
        sl.s.alpha = 1;
      }
    }
  }
}

// ---------------------------------------------------------------- crew: blinds, flagger, dogs

interface Runner {
  s: Sprite;
  home: Point;
  x: number;
  y: number;
  target: Floater | null;
  state: 'home' | 'out' | 'back';
  speed: number;
}

/** Layout blinds in a row, a flagger waving, and dogs running out for geese. */
class FieldCrewLayer implements Layer {
  readonly view = new Container();
  private readonly blinds = new Graphics();
  private readonly heads: Sprite[] = [];
  private readonly flagger: Sprite;
  private readonly flag = new Graphics();
  private readonly staker: Sprite;
  private readonly lab: Runner;
  private readonly pups: Runner[] = [];
  private l!: SceneLayout;
  private blindPts: Point[] = [];
  private popTimer: number[] = [];
  private wave = 0;
  private owned: Partial<Record<BotId, number>> = {};
  private time = 0;

  constructor(tex: TextureLibrary, private readonly fx: EffectsLayer, private readonly ducks: DuckLayer) {
    for (let i = 0; i < 5; i++) {
      const h = new Sprite(tex.get('bot.layout'));
      h.anchor.set(0.5, 1);
      h.visible = false;
      this.heads.push(h);
    }
    this.flagger = new Sprite(tex.get('bot.flagger'));
    this.flagger.anchor.set(0.5, 1);
    this.staker = new Sprite(tex.get('bot.staker'));
    this.staker.anchor.set(0.5, 1);
    const runner = (key: string, speed: number): Runner => {
      const s = new Sprite(tex.get(key));
      s.anchor.set(0.5, 1);
      return { s, home: { x: 0, y: 0 }, x: 0, y: 0, target: null, state: 'home', speed };
    };
    this.lab = runner('dog.lab.body', 150);
    for (let i = 0; i < 2; i++) this.pups.push(runner('dog.robo.body', 170));
    this.view.addChild(this.flag, this.flagger, this.staker, ...this.heads, this.blinds, this.lab.s, ...this.pups.map((p) => p.s));
  }

  layout(l: SceneLayout): void {
    this.l = l;
    const { w, scale: s } = l;
    const a = l.anchors;
    const y = a.blind.y;
    const k = waterDepthScale(l, y);
    const n = 5;
    this.blindPts = Array.from({ length: n }, (_, i) => ({ x: w * 0.5 + (i - (n - 1) / 2) * 52 * k, y }));
    this.popTimer = this.blindPts.map(() => 0);
    this.lab.home = { x: w * 0.5 - 150 * k, y: y + 6 * s };
    this.pups.forEach((p, i) => (p.home = { x: w * 0.5 + (150 + i * 26) * k, y: y + 6 * s }));
    for (const r of [this.lab, ...this.pups]) {
      r.x = r.home.x;
      r.y = r.home.y;
      r.state = 'home';
      r.target = null;
    }
    this.flagger.position.set(a.decoyCenter.x - a.decoySpread * 1.25, a.decoyCenter.y + 10 * s);
    this.flagger.scale.set(waterDepthScale(l, this.flagger.y) * 1.2);
    this.staker.position.set(a.decoyCenter.x + a.decoySpread * 1.2, a.decoyCenter.y + 6 * s);
    this.staker.scale.set(waterDepthScale(l, this.staker.y) * 1.1);
    this.drawBlinds();
  }

  private blindCount(): number {
    return Math.min(5, 2 + (this.owned.layout ?? 0));
  }

  private drawBlinds(): void {
    if (!this.l) return;
    const g = this.blinds.clear();
    const rnd = seededRandom(12);
    const n = this.blindCount();
    const start = Math.floor((5 - n) / 2);
    for (let i = start; i < start + n; i++) {
      const p = this.blindPts[i]!;
      const k = waterDepthScale(this.l, p.y) * 1.5;
      g.roundRect(p.x - 15 * k, p.y - 7 * k, 30 * k, 9 * k, 4 * k).fill(0x7a6a46);
      g.roundRect(p.x - 6 * k, p.y - 7.5 * k, 12 * k, 3 * k, 1.5 * k).fill(0x3e3424);
      for (let j = 0; j < 18; j++) {
        const x = p.x - 14 * k + rnd() * 28 * k;
        g.moveTo(x, p.y - 4 * k).lineTo(x + (rnd() - 0.5) * 3 * k, p.y - (8 + rnd() * 4) * k).stroke({ width: 0.9 * k, color: rnd() > 0.5 ? 0xe0c890 : 0xb89458 });
      }
    }
  }

  sync(state: GameState): void {
    const before = this.owned.layout ?? 0;
    for (const b of FIELD_BOTS) this.owned[b] = state.bots[b].owned;
    if ((this.owned.layout ?? 0) !== before) this.drawBlinds();
    this.flagger.visible = (this.owned.flagger ?? 0) > 0;
    this.staker.visible = (this.owned.staker ?? 0) > 0;
    this.pups.forEach((p, i) => (p.s.visible = i < Math.min(2, this.owned.fieldDog ?? 0)));
  }

  /** Geese flagged in: the flag waves (a bot's, or a flag from the blind). */
  flagged(): Point {
    this.wave = 1.6;
    return this.flagger.visible ? { x: this.flagger.x, y: this.flagger.y - 30 * this.l.scale } : this.blindPts[2]!;
  }

  /** Everyone sits up from the blinds for the shot. */
  shot(): Point {
    const n = this.blindCount();
    const start = Math.floor((5 - n) / 2);
    for (let i = start; i < start + n; i++) this.popTimer[i] = 0.9;
    const p = this.blindPts[2]!;
    this.fx.steamPuff(p.x, p.y - 16 * this.l.scale, this.l.scale);
    return { x: p.x, y: p.y - 24 * this.l.scale };
  }

  /** Send a dog for a goose: Biscuit for you, pups for the crew. */
  retrieve(manual: boolean): Point {
    const f = this.ducks.claimFloater();
    const home = this.lab.home;
    if (!f) return { x: home.x, y: home.y - 20 * this.l.scale };
    const pool = manual ? [this.lab, ...this.pups] : [...this.pups.filter((p) => p.s.visible), this.lab];
    const dog = pool.find((d) => d.state === 'home' && d.s.visible !== false);
    if (dog) {
      dog.target = f;
      dog.state = 'out';
    } else {
      this.ducks.removeFloater(f, false);
      this.fx.sparkle(f.x, f.y - 4 * this.l.scale, this.l.scale * 0.7, 6);
    }
    return { x: f.x, y: f.y - 10 * this.l.scale };
  }

  update(f: FrameContext): void {
    const dt = f.dt;
    this.time += dt;
    const lit = f.sky.light;
    const s = this.l.scale;
    this.blinds.tint = lerpColor(lit, f.sky.nearLand, 0.15);
    // Heads popping up out of the blinds
    for (let i = 0; i < this.heads.length; i++) {
      const hd = this.heads[i]!;
      const t = this.popTimer[i] ?? 0;
      if (t > 0) this.popTimer[i] = t - dt;
      const up = clamp(t > 0.6 ? (0.9 - t) / 0.3 : t / 0.6, 0, 1);
      const p = this.blindPts[i]!;
      const k = waterDepthScale(this.l, p.y) * 1.5;
      hd.visible = up > 0.02;
      hd.position.set(p.x, p.y - 4 * k - up * 10 * k);
      hd.scale.set(k * 0.9);
      hd.tint = lit;
    }
    // Flag waving
    this.wave = Math.max(0, this.wave - dt);
    const wav = this.wave > 0 ? Math.sin(this.time * 14) * 0.35 : Math.sin(this.time * 1.5) * 0.04;
    this.flagger.rotation = wav * 0.4;
    this.flagger.tint = lit;
    this.staker.tint = lit;
    const fg = this.flag.clear();
    if (!this.flagger.visible && this.wave > 0) {
      // No Flagger Bot yet: a flag pops up from the middle blind.
      const p = this.blindPts[2]!;
      const k = waterDepthScale(this.l, p.y);
      const tipX = p.x + Math.sin(this.time * 14) * 10 * k;
      fg.moveTo(p.x, p.y - 6 * k).lineTo(tipX, p.y - 30 * k).stroke({ width: 1.4 * k, color: 0x5a4632 });
      fg.poly([tipX, p.y - 30 * k, tipX + 10 * k, p.y - 27 * k, tipX + 1 * k, p.y - 23 * k]).fill(0x1e1a18);
    }
    // Dogs
    for (const d of [this.lab, ...this.pups]) {
      if (!d.s.visible && d !== this.lab) continue;
      const tgt = d.state === 'out' && d.target ? { x: d.target.x, y: d.target.y } : d.home;
      const dx = tgt.x - d.x;
      const dy = tgt.y - d.y;
      const dist = Math.hypot(dx, dy);
      const step = d.speed * s * dt;
      if (d.state !== 'home') {
        if (dist <= step) {
          d.x = tgt.x;
          d.y = tgt.y;
          if (d.state === 'out') {
            if (d.target) this.ducks.removeFloater(d.target, false);
            this.fx.featherPuff(d.x, d.y, s * 0.5, 3);
            d.target = null;
            d.state = 'back';
          } else d.state = 'home';
        } else {
          d.x += (dx / dist) * step;
          d.y += (dy / dist) * step;
        }
      }
      const k = waterDepthScale(this.l, d.y) * 0.75;
      const face = d.state === 'home' ? 1 : dx >= 0 ? 1 : -1;
      d.s.scale.set(k * face, k);
      const bob = d.state === 'home' ? 0 : Math.abs(Math.sin(this.time * 14)) * 2 * s;
      d.s.position.set(d.x, d.y - bob);
      d.s.tint = shadeColor(lit, 1);
    }
  }
}

// ---------------------------------------------------------------- the scene

const GEESE_FLYOVER = ['canadaGoose', 'canadaGoose', 'cacklingGoose', 'snowGoose'] as const;

/**
 * The goose field: a second hunting ground with its own spread, blinds and
 * crew. Shares textures with the marsh; only drawn while it's the active view.
 */
export class FieldScene {
  readonly root = new Container();
  readonly ducks: DuckLayer;
  readonly fx: EffectsLayer;
  readonly hint: HintLayer;
  hintLabels = true;
  private readonly sky: SkyLayer;
  private readonly clouds: CloudLayer;
  private readonly land: LandLayer;
  private readonly fieldGround = new FieldGroundLayer();
  private readonly spread: FieldSpreadLayer;
  private readonly crew: FieldCrewLayer;
  private readonly weather: WeatherLayer;
  private readonly fogs: FogLayer[];
  private readonly layers: Layer[];
  layout: SceneLayout = {
    w: 1, h: 1, horizon: 1, scale: 1,
    anchors: {
      chimney: { x: 0, y: 0 }, mug: { x: 0, y: 0 }, decoyCenter: { x: 0, y: 0 },
      decoySpread: 100, blind: { x: 0, y: 0 }, lodge: { x: 0, y: 0 }, crew: { x: 0, y: 0 },
      porch: { x: 0, y: 0 }, woodpile: { x: 0, y: 0 }, lodgeScale: 1,
    },
  };

  constructor(readonly tex: TextureLibrary) {
    this.sky = new SkyLayer(tex);
    this.clouds = new CloudLayer(tex);
    const farFog = new FogLayer(tex, [{ at: -0.02, speed: 6, alpha: 0.5, height: 0.5 }]);
    this.land = new LandLayer();
    this.land.land = 'prairie';
    this.fx = new EffectsLayer(tex);
    this.spread = new FieldSpreadLayer(tex);
    this.ducks = new DuckLayer(tex, this.fx);
    this.ducks.onGround = true;
    this.ducks.flyoverSpecies = [...GEESE_FLYOVER];
    this.crew = new FieldCrewLayer(tex, this.fx, this.ducks);
    const nearFog = new FogLayer(tex, [{ at: 0.2, speed: 12, alpha: 0.3, height: 0.5 }]);
    this.weather = new WeatherLayer(tex, this.fx);
    this.hint = new HintLayer(this.ducks);
    this.fogs = [farFog, nearFog];
    const overlay = new OverlayLayer(tex);
    this.layers = [this.sky, this.clouds, farFog, this.land, this.fieldGround, this.spread, this.crew, this.ducks, nearFog, this.fx, this.weather, this.hint, overlay];
    for (const layer of this.layers) this.root.addChild(layer.view);
  }

  resize(w: number, h: number): void {
    const l = this.layout;
    l.w = w;
    l.h = h;
    l.horizon = Math.round(h * (w / h < 1 ? 0.46 : 0.5));
    l.scale = Math.max(0.45, Math.min(h, w * 0.8) / 520);
    const fieldH = h - l.horizon;
    l.anchors.decoyCenter = { x: w * 0.52, y: l.horizon + fieldH * 0.36 };
    l.anchors.decoySpread = Math.min(w * 0.26, 240 * l.scale);
    l.anchors.blind = { x: w * 0.5, y: l.horizon + fieldH * 0.74 };
    l.anchors.crew = l.anchors.blind;
    l.anchors.lodge = { x: w * 0.2, y: l.horizon };
    for (const layer of this.layers) layer.layout(l);
  }

  /** Animate a field event. Returns where HUD feedback should appear. */
  handle(e: SimEvent): Point | null {
    const a = this.layout.anchors;
    switch (e.type) {
      case 'volley':
        this.ducks.volley();
        this.fx.confetti(a.decoyCenter.x, a.decoyCenter.y - 60 * this.layout.scale, this.layout.scale, 30);
        return a.decoyCenter;
      case 'decoySet':
      case 'decoyDrift':
        this.spread.reconcile(e.decoys);
        if (e.type === 'decoySet') {
          const p = this.spread.slotPoint(e.decoys - 1);
          if (p) this.fx.featherPuff(p.x, p.y, this.layout.scale * 0.4, 3);
        }
        return null;
      case 'flockArrived':
        this.ducks.arrive(e.flockId, e.size, e.species, !!e.golden);
        return null;
      case 'flockPassed':
        this.ducks.spawnFlyover(Math.min(e.size, 8), 0.35, true, 'canadaGoose');
        return null;
      case 'flockCalled':
        this.ducks.call(e.flockId);
        return this.crew.flagged();
      case 'flockLeft':
        return this.ducks.leave(e.flockId);
      case 'flockFlared':
        return this.ducks.flare(e.flockId);
      case 'shot': {
        const p = this.crew.shot();
        this.ducks.shoot(e.flockId, e.downed);
        return p;
      }
      case 'retrieved':
        return this.crew.retrieve(e.source === 'manual');
      case 'botBought':
      case 'botLevel':
      case 'botMilestone':
        this.fx.sparkle(a.blind.x, a.blind.y - 20 * this.layout.scale, this.layout.scale, 10);
        return a.blind;
      case 'problem':
      case 'problemEscalated':
      case 'problemFixed':
        return a.blind;
      default:
        return null;
    }
  }

  /** Bring visuals in line with the sim. */
  sync(state: GameState): void {
    this.spread.reconcile(state.field.decoys, false);
    this.ducks.reconcileGround(state.field, state);
    this.crew.sync(state);
    this.hint.target = chooseHint(state, 'field', this.ducks, this.hintLabels);
    const w = state.environment.weather;
    this.weather.weather = w;
    for (const f of this.fogs) f.weatherFog = WEATHER[w].fog;
  }

  /** Turn a tap into a field action. */
  pick(x: number, y: number): TapTarget {
    const p = this.ducks.pick(x, y);
    if (p?.kind === 'flock') return { job: p.called ? 'shoot' : 'call', ground: 'field', flockId: p.id, at: p.at };
    if (p?.kind === 'floater') return { job: 'retrieve', ground: 'field', floater: p.floater, at: p.at };
    if (y < this.layout.horizon) {
      const n = this.ducks.nearestFlock(x, y, 70 * this.layout.scale);
      if (n?.kind === 'flock') return { job: n.called ? 'shoot' : 'call', ground: 'field', flockId: n.id, at: n.at };
      return { job: null, ground: 'field', at: { x, y } };
    }
    const s = this.layout.scale;
    const low = this.ducks.nearestFlock(x, y, 60 * s);
    if (low?.kind === 'flock' && low.called) return { job: 'shoot', ground: 'field', flockId: low.id, at: low.at };
    const bird = this.ducks.nearestFloater(x, y, 70 * s);
    if (bird) return { job: 'retrieve', ground: 'field', floater: bird, at: { x: bird.x, y: bird.y } };
    return { job: 'decoys', ground: 'field', at: { x, y } };
  }

  update(f: Omit<FrameContext, 'layout'>): void {
    const frame = f as FrameContext;
    frame.layout = this.layout;
    this.clouds.overcast = this.weather.overcast;
    // Prairie light: a warmer, drier land tint.
    f.sky.farLand = lerpColor(f.sky.farLand, 0xc0a070, 0.35 * (1 - f.sky.darkness * 0.7));
    f.sky.nearLand = lerpColor(f.sky.nearLand, 0x6a6440, 0.35 * (1 - f.sky.darkness * 0.7));
    for (const layer of this.layers) layer.update(frame);
  }
}
