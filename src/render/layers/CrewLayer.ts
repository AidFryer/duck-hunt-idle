import { Container, Graphics, Sprite } from 'pixi.js';
import type { BotId } from '../../data/economy';
import type { ActionSource } from '../../sim/events';
import { lerpColor, shadeColor } from '../../util/color';
import { clamp, lerp, seededRandom } from '../../util/math';
import { BLIND_SIZE } from '../assets/painters';
import type { TextureLibrary } from '../assets/TextureLibrary';
import type { DuckLayer, Floater } from './DuckLayer';
import type { EffectsLayer } from './EffectsLayer';
import type { FrameContext, Layer, Point, SceneLayout } from '../types';
import { waterDepthScale } from '../types';

const VISIBLE = { caller: 3, blind: 3, retriever: 2 } as const;

// ----------------------------------------------------------------- dogs

type DogState = 'home' | 'toEdge' | 'leap' | 'swimOut' | 'swimBack' | 'climb' | 'shake' | 'toHome';

class Dog {
  readonly root = new Container();
  private readonly rig = new Container();
  private readonly body: Sprite;
  private readonly tail: Sprite;
  private readonly legs: Sprite[];
  private readonly swim: Sprite;
  private readonly carry: Sprite;
  state: DogState = 'home';
  x = 0;
  y = 0;
  facing = -1;
  private t = 0;
  private from: Point = { x: 0, y: 0 };
  private to: Point = { x: 0, y: 0 };
  private target: Floater | null = null;
  private wakeT = 0;
  /** Seconds this dog has been visible (for pop-in). */
  appear = 1;
  hop = 0;
  private readonly seed: number;

  constructor(tex: TextureLibrary, readonly kind: 'lab' | 'robo', seed: number) {
    this.seed = seed;
    const k = kind;
    this.legs = [0, 1, 2, 3].map(() => {
      const s = new Sprite(tex.get(`dog.${k}.leg`));
      s.anchor.set(0.5, 0.05);
      return s;
    });
    // far legs are darker
    this.legs[0]!.tint = 0xb0a090;
    this.legs[1]!.tint = 0xb0a090;
    this.body = new Sprite(tex.get(`dog.${k}.body`));
    this.body.anchor.set(0.5);
    this.tail = new Sprite(tex.get(`dog.${k}.tail`));
    this.tail.anchor.set(1, 0.5);
    this.rig.addChild(this.legs[0]!, this.legs[1]!, this.tail, this.body, this.legs[2]!, this.legs[3]!);
    this.swim = new Sprite(tex.get(`dog.${k}.swim`));
    this.swim.anchor.set(0.5, 14 / 16);
    this.swim.visible = false;
    this.carry = new Sprite(tex.get('duck.swim.hen'));
    this.carry.anchor.set(0.5);
    this.carry.visible = false;
    this.root.addChild(this.rig, this.swim, this.carry);
  }

  get busy(): boolean {
    return this.state !== 'home' && this.state !== 'toHome';
  }

  /** Send this dog to fetch a floating bird. */
  fetch(f: Floater): void {
    this.target = f;
    this.state = 'toEdge';
    this.t = 0;
  }

  update(dt: number, time: number, c: CrewLayout, ducks: DuckLayer, fx: EffectsLayer, motion: number): void {
    this.t += dt;
    this.appear = Math.min(1, this.appear + dt * 2.5);
    this.hop = Math.max(0, this.hop - dt * 2.2);
    const a = c.a;
    const home = this.kind === 'lab' ? c.labHome : c.roboHomes[this.seed % 2]!;
    let pose: 'sit' | 'run' | 'leap' | 'swim' | 'shake' = 'sit';
    switch (this.state) {
      case 'home':
        this.x = home.x;
        this.y = home.y;
        this.facing = -1;
        break;
      case 'toHome':
      case 'toEdge': {
        const dest = this.state === 'toEdge' ? c.edge : home;
        const dir = Math.sign(dest.x - this.x) || -1;
        this.facing = dir;
        this.x += dir * 95 * a * dt;
        this.y = dest.y;
        pose = 'run';
        if ((dir < 0 && this.x <= dest.x) || (dir > 0 && this.x >= dest.x)) {
          this.x = dest.x;
          if (this.state === 'toEdge') {
            this.state = 'leap';
            this.t = 0;
            this.from = { ...c.edge };
            this.to = { ...c.entry };
          } else {
            this.state = 'home';
          }
        }
        break;
      }
      case 'leap': {
        const k = Math.min(1, this.t / 0.55);
        this.x = lerp(this.from.x, this.to.x, k);
        this.y = lerp(this.from.y, this.to.y, k) - Math.sin(k * Math.PI) * 18 * a;
        this.facing = -1;
        pose = 'leap';
        if (k >= 1) {
          fx.splash(this.x, this.to.y, 0.9);
          this.state = 'swimOut';
          this.t = 0;
        }
        break;
      }
      case 'swimOut':
      case 'swimBack': {
        const goal = this.state === 'swimOut' && this.target ? { x: this.target.x, y: this.target.y } : c.entry;
        const dx = goal.x - this.x;
        const dy = goal.y - this.y;
        const dist = Math.hypot(dx, dy);
        const step = 80 * a * dt;
        this.facing = dx < 0 ? -1 : 1;
        pose = 'swim';
        this.wakeT -= dt;
        if (this.wakeT <= 0) {
          this.wakeT = 0.45;
          fx.ripple(this.x, this.y + a, 0.5, 1.5);
        }
        if (dist <= step) {
          this.x = goal.x;
          this.y = goal.y;
          if (this.state === 'swimOut') {
            if (this.target) ducks.removeFloater(this.target);
            this.target = null;
            this.carry.visible = true;
            this.state = 'swimBack';
          } else {
            this.state = 'climb';
            this.t = 0;
            this.from = { ...c.entry };
            this.to = { ...c.edge };
          }
        } else {
          this.x += (dx / dist) * step;
          this.y += (dy / dist) * step;
        }
        break;
      }
      case 'climb': {
        const k = Math.min(1, this.t / 0.5);
        this.x = lerp(this.from.x, this.to.x, k);
        this.y = lerp(this.from.y, this.to.y, k) - Math.sin(k * Math.PI) * 12 * a;
        this.facing = 1;
        pose = 'leap';
        if (k >= 1) {
          this.state = 'shake';
          this.t = 0;
          this.carry.visible = false;
        }
        break;
      }
      case 'shake': {
        pose = 'shake';
        if (Math.random() < dt * 30) fx.splash(this.x + (Math.random() - 0.5) * 10 * a, this.y - 8 * a, 0.25);
        if (this.t > 0.9) {
          this.state = 'toHome';
          this.t = 0;
        }
        break;
      }
    }

    // ---- pose the rig
    const s = a * 0.62 * this.appear;
    const hopY = -Math.sin(this.hop * Math.PI) * 10 * a;
    this.root.position.set(this.x, this.y + hopY);
    this.root.scale.set(s * this.facing, s);
    const swimming = pose === 'swim';
    this.rig.visible = !swimming;
    this.swim.visible = swimming;
    const [lb, lf, nb, nf] = this.legs as [Sprite, Sprite, Sprite, Sprite];
    lb.position.set(-14, -11);
    nb.position.set(-12, -10);
    lf.position.set(8, -11);
    nf.position.set(10, -10);
    this.body.position.set(0, -16);
    this.body.rotation = 0;
    this.tail.position.set(-17, -18);
    for (const l of this.legs) {
      l.rotation = 0;
      l.scale.y = 1;
    }
    const wag = Math.sin(time * (this.kind === 'robo' ? 16 : 11) + this.seed) * 0.45 * motion;
    this.tail.rotation = -0.5 + wag;
    if (pose === 'sit') {
      this.body.rotation = -0.32;
      this.body.position.set(1, -13);
      this.tail.position.set(-14, -6);
      this.tail.rotation = 0.1 + wag * 0.6;
      lb.rotation = nb.rotation = -1.3;
      lb.scale.y = nb.scale.y = 0.6;
      lb.position.set(-10, -6);
      nb.position.set(-8, -5);
      lf.rotation = nf.rotation = -0.12;
      lf.position.set(9, -17);
      nf.position.set(11, -16);
      lf.scale.y = nf.scale.y = 1.45;
      // little head tilt every few seconds
      this.body.rotation += Math.max(0, Math.sin(time * 0.7 + this.seed * 3)) ** 8 * 0.12;
    } else if (pose === 'run') {
      const p = time * 16;
      lb.rotation = Math.sin(p) * 0.7;
      nb.rotation = Math.sin(p + 0.5) * 0.7;
      lf.rotation = Math.sin(p + Math.PI) * 0.7;
      nf.rotation = Math.sin(p + Math.PI + 0.5) * 0.7;
      this.body.y = -16 - Math.abs(Math.sin(p)) * 2;
    } else if (pose === 'leap') {
      lb.rotation = nb.rotation = 0.9;
      lf.rotation = nf.rotation = -0.9;
      this.body.rotation = -0.15;
    } else if (pose === 'shake') {
      this.body.rotation = Math.sin(this.t * 60) * 0.12;
      this.body.x = Math.sin(this.t * 60) * 1.5;
    }
    if (swimming) {
      this.swim.y = Math.sin(time * 5 + this.seed) * 0.8;
      this.carry.position.set(20, -6);
      this.carry.scale.set(0.32);
      this.carry.rotation = 0.5;
    } else {
      this.carry.position.set(28, -18);
      this.carry.scale.set(0.3);
      this.carry.rotation = 0.6;
    }
  }

  tint(light: number): void {
    this.root.tint = light;
  }
}

// ----------------------------------------------------------------- decoy-bots

class DecoyBot {
  readonly root = new Container();
  private readonly body: Sprite;
  private readonly gear: Sprite;
  private readonly legs: Sprite[];
  /** Seconds left on the current "work" animation. */
  work = 0;
  hop = 0;
  appear = 0;
  private readonly seed: number;

  constructor(tex: TextureLibrary, readonly type: 'caller' | 'blind', seed: number) {
    this.seed = seed;
    this.legs = [0, 1].map((i) => {
      const s = new Sprite(tex.get('pegLeg'));
      s.anchor.set(0.5, 0);
      s.position.set(i ? 4 : -4, -4);
      return s;
    });
    this.body = new Sprite(tex.get(type === 'caller' ? 'bot.caller' : 'bot.blind'));
    this.body.anchor.set(0.5, 1);
    this.body.position.set(0, -3);
    this.gear = new Sprite(tex.get('gear'));
    this.gear.anchor.set(0.5);
    this.gear.scale.set(0.7);
    this.gear.position.set(-6, -13);
    this.root.addChild(this.legs[0]!, this.legs[1]!, this.body, this.gear);
  }

  update(dt: number, time: number, x: number, y: number, a: number, motion: number): void {
    this.work = Math.max(0, this.work - dt);
    this.hop = Math.max(0, this.hop - dt * 2.2);
    this.appear = Math.min(1, this.appear + dt * 2.5);
    const s = a * 0.62 * (0.2 + 0.8 * easeOutBack(this.appear));
    const hopY = -Math.sin(this.hop * Math.PI) * 12 * a;
    const bob = Math.sin(time * 2 + this.seed * 5) * 0.6 * motion;
    this.gear.rotation += dt * (this.work > 0 ? 9 : 1.2);
    let lean = 0;
    let squash = 1;
    if (this.type === 'caller') {
      // Idle: occasional practice call (head back). Working: big call, squash.
      const practice = Math.max(0, Math.sin(time * 0.9 + this.seed * 7)) ** 12;
      const w = this.work > 0 ? Math.sin((this.work / 0.8) * Math.PI) : 0;
      lean = -0.12 * practice - 0.25 * w;
      squash = 1 - 0.12 * w;
      this.legs[0]!.rotation = this.work > 0 ? Math.sin(time * 20) * 0.3 : 0;
      this.legs[1]!.rotation = this.work > 0 ? -Math.sin(time * 20) * 0.3 : 0;
    }
    this.root.position.set(x, y + hopY + bob * a);
    this.root.rotation = lean;
    this.root.scale.set(-s, s * squash); // face left, toward the decoys
  }
}

function easeOutBack(t: number): number {
  const c = 1.7;
  return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2);
}

// ----------------------------------------------------------------- layer

interface CrewLayout {
  a: number;
  deckLeft: number;
  deckTop: number;
  edge: Point;
  entry: Point;
  labHome: Point;
  roboHomes: Point[];
  callerSpots: Point[];
  blindSpots: Point[];
  /** The blind's shooting slot (blind bots show only through it). */
  slotTop: number;
  slotBottom: number;
  slotCenter: Point;
}

/**
 * The working crew: a little dock beside the blind, the lodge Lab and
 * robo-retrievers (who swim out for harvested birds), caller bots on the
 * dock and blind bots peeking from the shooting slot.
 */
export class CrewLayer implements Layer {
  readonly view = new Container();
  private readonly deck: Sprite;
  private readonly deckRefl: Sprite;
  readonly reflection = new Container();
  private readonly lab: Dog;
  private readonly robos: Dog[];
  private readonly callers: DecoyBot[];
  private readonly blinds: DecoyBot[];
  private readonly blindBots = new Container();
  private readonly blindMask = new Graphics();
  private readonly dogs = new Container();
  private owned: Record<BotId, number> = { caller: 0, blind: 0, retriever: 0 };
  private c!: CrewLayout;
  private l!: SceneLayout;
  private time = 0;
  private readonly rnd = seededRandom(31);
  private peek: number[] = [0, 0, 0];

  constructor(tex: TextureLibrary, private readonly fx: EffectsLayer, private readonly ducks: DuckLayer) {
    this.deck = new Sprite(tex.get('deck'));
    this.deck.anchor.set(0, 4 / 22);
    this.deckRefl = new Sprite(tex.get('deck'));
    this.deckRefl.anchor.set(0, 4 / 22);
    this.reflection.addChild(this.deckRefl);
    this.lab = new Dog(tex, 'lab', 0);
    this.robos = [new Dog(tex, 'robo', 1), new Dog(tex, 'robo', 2)];
    this.callers = [0, 1, 2].map((i) => new DecoyBot(tex, 'caller', i + 1));
    this.blinds = [0, 1, 2].map((i) => new DecoyBot(tex, 'blind', i + 7));
    for (const b of this.blinds) this.blindBots.addChild(b.root);
    this.blindBots.mask = this.blindMask;
    this.dogs.addChild(this.lab.root, ...this.robos.map((r) => r.root));
    this.view.addChild(this.blindBots, this.blindMask, this.deck, ...this.callers.map((b) => b.root), this.dogs);
    for (const r of this.robos) r.root.visible = false;
    for (const b of [...this.callers, ...this.blinds]) b.root.visible = false;
  }

  layout(l: SceneLayout): void {
    this.l = l;
    const b = l.anchors.blind;
    const bs = waterDepthScale(l, b.y) * 1.05;
    const a = waterDepthScale(l, b.y) * (l.w < 520 ? 1.9 : 1.4);
    const blindLeft = b.x - (BLIND_SIZE.w / 2 - 10) * bs;
    const deckW = 80 * a;
    const deckLeft = blindLeft - deckW;
    const deckTop = b.y - 6 * a;
    this.deck.position.set(deckLeft, deckTop);
    this.deck.scale.set(a);
    this.deckRefl.position.set(deckLeft, b.y + 4 * a);
    this.deckRefl.scale.set(a, -a * 0.7);
    const slot = (x: number, y: number): Point => ({ x: b.x + (x - BLIND_SIZE.w / 2) * bs, y: b.y + (y - BLIND_SIZE.waterline) * bs });
    this.c = {
      a,
      deckLeft,
      deckTop,
      edge: { x: deckLeft + 6 * a, y: deckTop },
      entry: { x: deckLeft - 14 * a, y: b.y + 10 * a },
      labHome: { x: deckLeft + 68 * a, y: deckTop },
      roboHomes: [{ x: deckLeft + 52 * a, y: deckTop }, { x: deckLeft + 40 * a, y: deckTop }],
      callerSpots: [10, 22, 33].map((x) => ({ x: deckLeft + x * a, y: deckTop })),
      blindSpots: [36, 54, 72].map((x) => slot(x, 46)),
      slotTop: slot(0, 33).y,
      slotBottom: slot(0, 40.5).y,
      slotCenter: slot(52, 37),
    };
    const m0 = slot(24, 33);
    const m1 = slot(80, 40.5);
    this.blindMask.clear().rect(m0.x, m0.y, m1.x - m0.x, m1.y - m0.y).fill(0xffffff);
    l.anchors.crew = { x: deckLeft + deckW / 2, y: deckTop - 20 * a };
  }

  /** Show the right number of each bot (with a pop-in for new ones). */
  setOwned(owned: Record<BotId, number>): void {
    this.owned = { ...owned };
    this.callers.forEach((b, i) => (b.root.visible = i < Math.min(owned.caller, VISIBLE.caller)));
    this.blinds.forEach((b, i) => (b.root.visible = i < Math.min(owned.blind, VISIBLE.blind)));
    this.robos.forEach((r, i) => (r.root.visible = i < Math.min(owned.retriever, VISIBLE.retriever)));
  }

  /** A bot was bought: pop it in with a hop and sparkle. */
  botBought(bot: BotId, owned: number): void {
    const before = this.owned[bot];
    this.setOwned({ ...this.owned, [bot]: owned });
    const idx = Math.min(before, VISIBLE[bot] - 1);
    if (bot === 'retriever') {
      const r = this.robos[idx];
      if (r && before < VISIBLE.retriever) r.appear = 0;
      this.sparkleAt(this.c.roboHomes[idx % 2]!);
    } else {
      const list = bot === 'caller' ? this.callers : this.blinds;
      const b = list[idx]!;
      if (before < VISIBLE[bot]) b.appear = 0;
      b.hop = 1;
      if (bot === 'blind') this.peek[idx] = 1.5;
      this.sparkleAt(bot === 'caller' ? this.c.callerSpots[idx]! : this.c.blindSpots[idx]!);
    }
  }

  /** Level-up: everyone of that type does a happy hop. */
  celebrate(bot: BotId, confetti: boolean): void {
    if (bot === 'retriever') for (const r of this.robos) r.hop = 1;
    else for (const b of bot === 'caller' ? this.callers : this.blinds) b.hop = 1;
    if (bot === 'blind') this.peek = this.peek.map(() => 1.2);
    this.sparkleAt(this.l.anchors.crew);
    if (confetti) this.fx.confetti(this.l.anchors.crew.x, this.l.anchors.crew.y, this.c.a);
  }

  private sparkleAt(p: Point): void {
    this.fx.sparkle(p.x, p.y - 14 * this.c.a, this.c.a * 0.8, 10);
  }

  /** Duck call: from the blind (manual) or a caller bot. */
  call(source: ActionSource): Point {
    const c = this.c;
    if (source === 'caller' && this.owned.caller > 0) {
      const i = Math.floor(this.rnd() * Math.min(this.owned.caller, VISIBLE.caller));
      const b = this.callers[i]!;
      b.work = 0.8;
      const p = c.callerSpots[i]!;
      this.fx.callRings(p.x - 8 * c.a, p.y - 26 * c.a, c.a, -1);
      this.fx.steamPuff(p.x, p.y - 30 * c.a, c.a);
      return p;
    }
    this.fx.callRings(c.slotCenter.x - 20 * c.a, c.slotCenter.y, c.a, -1);
    return c.slotCenter;
  }

  /** A soft pop from the blind (manual) or a blind bot. */
  shoot(source: ActionSource): Point {
    const c = this.c;
    if (source === 'blind' && this.owned.blind > 0) {
      const i = Math.floor(this.rnd() * Math.min(this.owned.blind, VISIBLE.blind));
      this.peek[i] = 1.3;
      const p = c.blindSpots[i]!;
      this.fx.shotPuff(p.x - 10 * c.a, c.slotCenter.y - 2 * c.a, c.a, -1);
      return p;
    }
    this.fx.shotPuff(c.slotCenter.x - 24 * c.a, c.slotCenter.y, c.a, -1);
    return c.slotCenter;
  }

  /** Set a decoy: little puff on the dock. Returns where it was thrown from. */
  decoyFrom(): Point {
    return { x: this.c.deckLeft + 20 * this.c.a, y: this.c.deckTop - 10 * this.c.a };
  }

  /**
   * A bird was retrieved in the sim. Send a free dog for a floating bird,
   * or (when everyone's busy) collect it with a sparkle. Returns where the
   * bird was, for floating "+coins" text.
   */
  retrieve(source: ActionSource): Point {
    const c = this.c;
    const dogs = source === 'manual' ? [this.lab, ...this.visibleRobos()] : [...this.visibleRobos(), this.lab];
    const free = dogs.find((d) => !d.busy);
    const f = this.ducks.claimFloater();
    if (!f) return { x: c.labHome.x, y: c.labHome.y - 20 * c.a };
    const where = { x: f.x, y: f.y - 10 * c.a };
    if (free) free.fetch(f);
    else {
      this.ducks.removeFloater(f);
      this.fx.sparkle(f.x, f.y - 4 * c.a, c.a * 0.7, 6);
    }
    return where;
  }

  private visibleRobos(): Dog[] {
    return this.robos.filter((r) => r.root.visible);
  }

  update(f: FrameContext): void {
    const dt = f.dt;
    this.time += dt;
    const c = this.c;
    const lit = f.sky.light;
    this.deck.tint = lit;
    this.deckRefl.tint = lerpColor(shadeColor(lit, 0.5), f.sky.waterTop, 0.5);
    this.deckRefl.alpha = 0.35;

    this.lab.update(dt, this.time, c, this.ducks, this.fx, f.motion);
    this.lab.tint(lit);
    for (const r of this.robos) {
      if (!r.root.visible) continue;
      r.update(dt, this.time, c, this.ducks, this.fx, f.motion);
      r.tint(lit);
    }
    // Dogs nearer the camera (lower on screen) draw on top.
    this.dogs.children.sort((p, q) => p.y - q.y);

    this.callers.forEach((b, i) => {
      if (!b.root.visible) return;
      const p = c.callerSpots[i]!;
      b.update(dt, this.time, p.x, p.y, c.a, f.motion);
      b.root.tint = lit;
    });
    this.blinds.forEach((b, i) => {
      if (!b.root.visible) return;
      // Peek: mostly hidden below the slot, popping up to look or shoot.
      this.peek[i] = Math.max(0, this.peek[i]! - dt);
      const idlePeek = Math.max(0, Math.sin(this.time * 0.5 + i * 2.1)) ** 6;
      const up = clamp(Math.max(this.peek[i]! > 0 ? 1 : 0, idlePeek), 0, 1);
      const p = c.blindSpots[i]!;
      const botH = 36 * 0.62 * c.a;
      b.update(dt, this.time, p.x, c.slotTop + botH * (1.02 + (1 - up) * 0.2), c.a, f.motion);
      b.root.rotation = Math.sin(this.time * 1.3 + i) * 0.08 * up;
      b.root.tint = lit;
    });
  }
}
