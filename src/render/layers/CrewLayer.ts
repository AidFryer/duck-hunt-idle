import { Circle, Container, Graphics, Sprite } from 'pixi.js';
import type { BotId } from '../../data/economy';
import type { ActionSource } from '../../sim/events';
import type { GameState } from '../../sim/state';
import { lerpColor, shadeColor } from '../../util/color';
import { clamp, lerp, seededRandom } from '../../util/math';
import { BLIND_SIZE } from '../assets/painters';
import type { TextureLibrary } from '../assets/TextureLibrary';
import type { DuckLayer, Floater } from './DuckLayer';
import type { EffectsLayer } from './EffectsLayer';
import type { FrameContext, Layer, Point, SceneLayout } from '../types';
import { waterDepthScale } from '../types';

/** How many of each bot type are drawn in the scene (the rest work off-screen). */
const VISIBLE: Record<BotId, number> = {
  scout: 2, setter: 2, caller: 3, blind: 3, retriever: 2, ledger: 2, foreman: 1, tinker: 1,
};

type BotKind = Exclude<BotId, 'retriever'>;

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
  /** Stuck with a problem: stays home, wobbling. */
  stuck = false;
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
    return this.stuck || (this.state !== 'home' && this.state !== 'toHome');
  }

  /** World position of the top of the head (for "!" bubbles). */
  get headPoint(): Point {
    return { x: this.x, y: this.y - 34 * this.scaleHint };
  }
  scaleHint = 1;

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
    this.scaleHint = a * 0.62;
    const home = this.kind === 'lab' ? c.labHome : c.roboHomes[(this.seed - 1) % 2]!;
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
    this.root.rotation = this.stuck && this.state === 'home' ? Math.sin(time * 14) * 0.12 : 0;
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

/**
 * A carved decoy-bot. Every type shares the rig (body, gear, peg legs) but
 * has its own paint, accessory and idle animation.
 */
class DecoyBot {
  readonly root = new Container();
  private readonly body: Sprite;
  private readonly gear: Sprite;
  private readonly legs: Sprite[];
  /** Seconds left on the current "work" animation. */
  work = 0;
  hop = 0;
  appear = 1;
  stuck = false;
  facing = -1;
  private readonly seed: number;

  constructor(tex: TextureLibrary, readonly kind: BotKind, seed: number) {
    this.seed = seed;
    this.legs = [0, 1].map((i) => {
      const s = new Sprite(tex.get('pegLeg'));
      s.anchor.set(0.5, 0);
      s.position.set(i ? 4 : -4, -4);
      return s;
    });
    this.body = new Sprite(tex.get(`bot.${kind}`));
    this.body.anchor.set(0.5, 1);
    this.body.position.set(0, -3);
    this.gear = new Sprite(tex.get('gear'));
    this.gear.anchor.set(0.5);
    this.gear.scale.set(0.7);
    this.gear.position.set(-6, -13);
    if (kind === 'setter') {
      // Wading: no legs, the body sits on the waterline.
      this.body.anchor.set(0.5, 27 / 36);
      this.body.position.set(0, 0);
      this.gear.visible = false;
      this.root.addChild(this.body);
    } else {
      this.root.addChild(this.legs[0]!, this.legs[1]!, this.body, this.gear);
    }
  }

  /** World-space height of the bot (for bubble placement). */
  height(a: number): number {
    return 36 * 0.62 * a;
  }

  update(dt: number, time: number, x: number, y: number, a: number, motion: number): void {
    this.work = Math.max(0, this.work - dt);
    this.hop = Math.max(0, this.hop - dt * 2.2);
    this.appear = Math.min(1, this.appear + dt * 2.5);
    const s = a * 0.62 * (0.2 + 0.8 * easeOutBack(this.appear));
    const hopY = -Math.sin(this.hop * Math.PI) * 12 * a;
    const bob = Math.sin(time * 2 + this.seed * 5) * 0.6 * motion;
    const w = this.work > 0 ? Math.sin((this.work / 0.8) * Math.PI) : 0;
    this.gear.rotation += dt * (this.work > 0 ? 9 : 1.2) * (this.stuck ? 0 : 1);
    let lean = 0;
    let squash = 1;
    let dx = 0;
    let facing = this.facing;
    const idle = (period: number) => Math.max(0, Math.sin(time * period + this.seed * 7)) ** 10;
    switch (this.kind) {
      case 'caller':
        lean = -0.12 * idle(0.9) - 0.25 * w;
        squash = 1 - 0.12 * w;
        break;
      case 'scout':
        // Sweeps the sky: turns around now and then, leans into the spyglass.
        facing = Math.sin(time * 0.35 + this.seed) > 0 ? -1 : 1;
        lean = -0.1 - 0.15 * w + Math.sin(time * 0.8 + this.seed) * 0.04;
        break;
      case 'setter':
        // Wading: bobs with the water, ducks to place a decoy.
        squash = 1 - 0.15 * w;
        lean = Math.sin(time * 1.2 + this.seed) * 0.06;
        break;
      case 'ledger':
        // Scribbling: tiny fast wiggle, looks up now and then.
        lean = Math.sin(time * 18) * 0.025 * (0.4 + w) - 0.12 * idle(0.5);
        break;
      case 'foreman':
        // Paces a little and checks the clipboard.
        dx = Math.sin(time * 0.6 + this.seed) * 6;
        facing = Math.cos(time * 0.6 + this.seed) > 0 ? 1 : -1;
        lean = 0.1 * idle(1.1) - 0.2 * w;
        break;
      case 'tinker':
        // Hammering rhythm.
        lean = Math.max(0, Math.sin(time * 5 + this.seed)) ** 4 * 0.25 + 0.2 * w;
        break;
      case 'blind':
        break;
    }
    if (this.work > 0 || this.kind === 'foreman') {
      this.legs[0]!.rotation = Math.sin(time * 14) * 0.3 * (this.work > 0 || dx !== 0 ? 1 : 0);
      this.legs[1]!.rotation = -this.legs[0]!.rotation;
    } else {
      this.legs[0]!.rotation = this.legs[1]!.rotation = 0;
    }
    if (this.stuck) {
      lean = Math.sin(time * 14 + this.seed) * 0.14;
      squash = 1;
      dx = 0;
    }
    this.root.position.set(x + dx * a, y + hopY + bob * a);
    this.root.rotation = lean;
    this.root.scale.set(s * facing, s * squash);
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
  spots: Record<BotKind, Point[]>;
  /** The blind's shooting slot (blind bots show only through it). */
  slotTop: number;
  slotBottom: number;
  slotCenter: Point;
}

interface Bubble {
  s: Sprite;
  bot: BotId;
  phase: number;
}

const KINDS: BotKind[] = ['scout', 'setter', 'caller', 'blind', 'ledger', 'foreman', 'tinker'];

/**
 * The working crew: a dock beside the blind, the lodge Lab and
 * robo-retrievers, and every kind of decoy-bot at its post. Stuck bots
 * wobble under a "!" bubble the player can tap to fix.
 */
export class CrewLayer implements Layer {
  readonly view = new Container();
  private readonly deck: Sprite;
  private readonly deckRefl: Sprite;
  readonly reflection = new Container();
  private readonly lab: Dog;
  private readonly robos: Dog[];
  private readonly bots: Record<BotKind, DecoyBot[]>;
  private readonly blindBots = new Container();
  private readonly blindMask = new Graphics();
  private readonly front = new Container();
  private readonly bubbles: Bubble[] = [];
  private readonly bubbleLayer = new Container();
  private owned: Record<BotId, number> = { scout: 0, setter: 0, caller: 0, blind: 0, retriever: 0, ledger: 0, foreman: 0, tinker: 0 };
  private stuckCount: Record<BotId, number> = { ...this.owned };
  private c!: CrewLayout;
  private l!: SceneLayout;
  private time = 0;
  private readonly rnd = seededRandom(31);
  private peek: number[] = [0, 0, 0];
  /** Called when the player taps a "!" bubble. */
  onFix: ((bot: BotId) => void) | null = null;

  constructor(tex: TextureLibrary, private readonly fx: EffectsLayer, private readonly ducks: DuckLayer) {
    this.deck = new Sprite(tex.get('deck'));
    this.deck.anchor.set(0, 4 / 22);
    this.deckRefl = new Sprite(tex.get('deck'));
    this.deckRefl.anchor.set(0, 4 / 22);
    this.reflection.addChild(this.deckRefl);
    this.lab = new Dog(tex, 'lab', 0);
    this.robos = [new Dog(tex, 'robo', 1), new Dog(tex, 'robo', 2)];
    let seed = 1;
    this.bots = {} as Record<BotKind, DecoyBot[]>;
    for (const k of KINDS) {
      this.bots[k] = Array.from({ length: VISIBLE[k] }, () => new DecoyBot(tex, k, seed++));
    }
    for (const b of this.bots.blind) this.blindBots.addChild(b.root);
    this.blindBots.mask = this.blindMask;
    // Front container: everything on/near the dock, depth-sorted each frame.
    this.front.addChild(
      this.lab.root, ...this.robos.map((r) => r.root),
      ...this.bots.caller.map((b) => b.root), ...this.bots.foreman.map((b) => b.root),
    );
    this.view.addChild(
      ...this.bots.ledger.map((b) => b.root), ...this.bots.tinker.map((b) => b.root),
      ...this.bots.scout.map((b) => b.root), ...this.bots.setter.map((b) => b.root),
      this.blindBots, this.blindMask, this.deck, this.front, this.bubbleLayer,
    );
    for (const r of this.robos) r.root.visible = false;
    for (const k of KINDS) for (const b of this.bots[k]) b.root.visible = false;

    // One bubble per visible bot slot; shown when that bot is stuck.
    const make = (bot: BotId) => {
      const s = new Sprite(tex.get('alert'));
      s.anchor.set(0.5, 1);
      s.visible = false;
      s.eventMode = 'static';
      s.cursor = 'pointer';
      s.hitArea = new Circle(11, 12, 22);
      s.on('pointertap', () => this.onFix?.(bot));
      this.bubbleLayer.addChild(s);
      this.bubbles.push({ s, bot, phase: this.rnd() * 6 });
    };
    for (const k of [...KINDS, 'retriever'] as BotId[]) for (let i = 0; i < VISIBLE[k]; i++) make(k);
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
    const dc = l.anchors.decoyCenter;
    const ls = l.anchors.lodgeScale;
    this.c = {
      a,
      deckLeft,
      deckTop,
      edge: { x: deckLeft + 6 * a, y: deckTop },
      entry: { x: deckLeft - 14 * a, y: b.y + 10 * a },
      labHome: { x: deckLeft + 70 * a, y: deckTop },
      roboHomes: [{ x: deckLeft + 56 * a, y: deckTop }, { x: deckLeft + 45 * a, y: deckTop }],
      spots: {
        caller: [9, 19, 29].map((x) => ({ x: deckLeft + x * a, y: deckTop })),
        foreman: [{ x: deckLeft + 37 * a, y: deckTop }],
        blind: [36, 54, 72].map((x) => slot(x, 46)),
        scout: [slot(38, 24), slot(70, 24)],
        setter: [
          { x: dc.x + l.anchors.decoySpread * 1.25, y: dc.y + (l.h - l.horizon) * 0.06 },
          { x: dc.x - l.anchors.decoySpread * 1.3, y: dc.y + (l.h - l.horizon) * 0.1 },
        ],
        ledger: [
          { x: l.anchors.porch.x, y: l.anchors.porch.y },
          { x: l.anchors.porch.x + 16 * ls, y: l.anchors.porch.y },
        ],
        tinker: [{ x: l.anchors.woodpile.x, y: l.anchors.woodpile.y }],
      },
      slotTop: slot(0, 33).y,
      slotBottom: slot(0, 40.5).y,
      slotCenter: slot(52, 37),
    };
    const m0 = slot(24, 33);
    const m1 = slot(80, 40.5);
    this.blindMask.clear().rect(m0.x, m0.y, m1.x - m0.x, m1.y - m0.y).fill(0xffffff);
    l.anchors.crew = { x: deckLeft + deckW / 2, y: deckTop - 20 * a };
  }

  /** Scale for a bot at a spot: shore bots use the lodge's scale. */
  private scaleFor(kind: BotKind): number {
    if (kind === 'ledger' || kind === 'tinker') return this.l.anchors.lodgeScale * 1.25;
    if (kind === 'setter') return waterDepthScale(this.l, this.c.spots.setter[0]!.y) * 1.25;
    return this.c.a;
  }

  /** Match visible bots and "!" bubbles to the sim. */
  sync(state: GameState): void {
    for (const k of [...KINDS, 'retriever'] as BotId[]) this.owned[k] = state.bots[k].owned;
    for (const k of [...KINDS, 'retriever'] as BotId[]) this.stuckCount[k] = 0;
    for (const p of state.problems.open) this.stuckCount[p.bot] += 1;
    for (const k of KINDS) {
      this.bots[k].forEach((b, i) => {
        b.root.visible = i < Math.min(this.owned[k], VISIBLE[k]);
        b.stuck = b.root.visible && i < this.stuckCount[k];
      });
    }
    this.robos.forEach((r, i) => {
      r.root.visible = i < Math.min(this.owned.retriever, VISIBLE.retriever);
      r.stuck = r.root.visible && i < this.stuckCount.retriever;
    });
  }

  /** A bot was bought: pop it in with a hop and sparkle. */
  botBought(bot: BotId, ownedNow: number, count: number): void {
    const before = ownedNow - count;
    if (before >= VISIBLE[bot]) {
      this.celebrate(bot, false);
      return;
    }
    const idx = Math.min(before, VISIBLE[bot] - 1);
    if (bot === 'retriever') {
      const r = this.robos[idx]!;
      r.appear = 0;
      this.sparkleAt(this.c.roboHomes[idx]!);
    } else {
      const b = this.bots[bot][idx]!;
      b.appear = 0;
      b.hop = 1;
      if (bot === 'blind') this.peek[idx] = 1.5;
      this.sparkleAt(this.botPoint(bot, idx));
    }
  }

  private botPoint(bot: BotId, i: number): Point {
    if (bot === 'retriever') return this.robos[i]?.headPoint ?? this.c.roboHomes[0]!;
    const spots = this.c.spots[bot];
    const p = spots[i % spots.length]!;
    if (bot === 'blind') return { x: p.x, y: this.c.slotCenter.y };
    return p;
  }

  /** Level-up (or milestone): everyone of that type does a happy hop. */
  celebrate(bot: BotId, confetti: boolean): void {
    if (bot === 'retriever') for (const r of this.robos) r.hop = 1;
    else for (const b of this.bots[bot]) b.hop = 1;
    if (bot === 'blind') this.peek = this.peek.map(() => 1.2);
    const p = this.botPoint(bot, 0);
    this.sparkleAt(p);
    if (confetti) this.fx.confetti(p.x, p.y - 20 * this.c.a, this.c.a);
  }

  private sparkleAt(p: Point): void {
    this.fx.sparkle(p.x, p.y - 14 * this.c.a, this.c.a * 0.8, 10);
  }

  /** A problem was fixed: spark-and-twinkle on that bot, and a hop. */
  fixed(bot: BotId): Point {
    const i = Math.min(this.stuckCount[bot], VISIBLE[bot] - 1);
    const p = this.botPoint(bot, Math.max(0, i));
    this.fx.sparkle(p.x, p.y - 16 * this.c.a, this.c.a, 14);
    this.fx.steamPuff(p.x, p.y - 10 * this.c.a, this.c.a);
    if (bot === 'retriever') {
      const r = this.robos[Math.max(0, i)];
      if (r) r.hop = 1;
    } else {
      const b = this.bots[bot][Math.max(0, i)];
      if (b) b.hop = 1;
    }
    return { x: p.x, y: p.y - 30 * this.c.a };
  }

  /** A foreman retry: the foreman hurries, a spark flies at the stuck bot. */
  retry(bot: BotId): void {
    const f = this.bots.foreman[0];
    if (f) f.work = 0.8;
    const p = this.botPoint(bot, 0);
    this.fx.sparkle(p.x, p.y - 12 * this.c.a, this.c.a * 0.6, 4);
  }

  /** A problem appeared: the bot jolts. Returns where, for feedback. */
  problem(bot: BotId): Point {
    const i = Math.min(this.stuckCount[bot], VISIBLE[bot] - 1);
    const p = this.botPoint(bot, Math.max(0, i));
    return { x: p.x, y: p.y - 40 * this.c.a };
  }

  /** Duck call: from the blind (manual) or a caller bot. */
  call(source: ActionSource): Point {
    const c = this.c;
    if (source !== 'manual' && source !== 'retriever' && this.owned[source] > 0) {
      const list = this.bots[source as BotKind];
      const n = Math.min(this.owned[source], list.length);
      const i = Math.floor(this.rnd() * n);
      const b = list[i]!;
      b.work = 0.8;
      const p = this.botPoint(source, i);
      const h = b.height(this.scaleFor(source as BotKind) / (0.62 * 36) * 36 * 0.62);
      this.fx.callRings(p.x - 8 * c.a, p.y - h * 0.8, c.a, -1);
      this.fx.steamPuff(p.x, p.y - h, c.a);
      return p;
    }
    this.fx.callRings(c.slotCenter.x - 20 * c.a, c.slotCenter.y, c.a, -1);
    return c.slotCenter;
  }

  /** A soft pop from the blind (manual) or the bot that took the shot. */
  shoot(source: ActionSource): Point {
    const c = this.c;
    if (source === 'blind' && this.owned.blind > 0) {
      const i = Math.floor(this.rnd() * Math.min(this.owned.blind, VISIBLE.blind));
      this.peek[i] = 1.3;
      const p = c.spots.blind[i]!;
      this.fx.shotPuff(p.x - 10 * c.a, c.slotCenter.y - 2 * c.a, c.a, -1);
      return p;
    }
    if (source !== 'manual' && source !== 'retriever' && source !== 'blind' && this.owned[source] > 0) {
      const b = this.bots[source as BotKind][0]!;
      b.work = 0.8;
    }
    this.fx.shotPuff(c.slotCenter.x - 24 * c.a, c.slotCenter.y, c.a, -1);
    return c.slotCenter;
  }

  /** Where a decoy is tossed from (a setter if it was one, else the dock). */
  decoyFrom(source: ActionSource): Point {
    if (source !== 'manual' && source !== 'retriever' && this.owned[source] > 0) {
      const n = Math.min(this.owned[source], VISIBLE[source]);
      const i = Math.floor(this.rnd() * n);
      const b = this.bots[source as BotKind][i]!;
      b.work = 0.8;
      const p = this.botPoint(source, i);
      return { x: p.x, y: p.y - 12 * this.c.a };
    }
    return { x: this.c.deckLeft + 20 * this.c.a, y: this.c.deckTop - 10 * this.c.a };
  }

  /** A scout spotted a flock. */
  scouted(source: ActionSource): void {
    if (source === 'manual' || source === 'retriever' || this.owned[source] === 0) return;
    const b = this.bots[source as BotKind][Math.floor(this.rnd() * Math.min(this.owned[source], VISIBLE[source]))];
    if (b) b.work = 0.8;
  }

  /** A bird was logged at the lodge. Returns where, for "+coins". */
  logged(source: ActionSource | 'keeper'): Point {
    const p = this.c.spots.ledger[0]!;
    if (source !== 'keeper' && source !== 'manual' && source !== 'retriever' && this.owned[source] > 0) {
      const b = this.bots[source as BotKind][0];
      if (b) b.work = 0.8;
    }
    return { x: p.x, y: p.y - 30 * this.l.anchors.lodgeScale };
  }

  /**
   * A bird was retrieved in the sim. Send a free dog for a floating bird,
   * or (when everyone's busy) collect it with a sparkle. Returns where the
   * bird was, for floating feedback.
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

    for (const k of KINDS) {
      const scale = this.scaleFor(k);
      this.bots[k].forEach((b, i) => {
        if (!b.root.visible) return;
        const p = c.spots[k][i % c.spots[k].length]!;
        if (k === 'blind') {
          // Peek: mostly hidden below the slot, popping up to look or shoot.
          this.peek[i] = Math.max(0, this.peek[i]! - dt);
          const idlePeek = Math.max(0, Math.sin(this.time * 0.5 + i * 2.1)) ** 6;
          const up = b.stuck ? 1 : clamp(Math.max(this.peek[i]! > 0 ? 1 : 0, idlePeek), 0, 1);
          const botH = 36 * 0.62 * scale;
          b.update(dt, this.time, p.x, c.slotTop + botH * (1.02 + (1 - up) * 0.2), scale, f.motion);
        } else {
          b.update(dt, this.time, p.x, p.y, scale, f.motion);
        }
        b.root.tint = lit;
      });
    }
    // Things on the dock: nearer (lower) draws on top.
    this.front.children.sort((p, q) => p.y - q.y);

    // "!" bubbles over stuck bots, bobbing for attention.
    const counters: Partial<Record<BotId, number>> = {};
    for (const bub of this.bubbles) {
      const i = counters[bub.bot] ?? 0;
      counters[bub.bot] = i + 1;
      let show = false;
      let top: Point = { x: 0, y: 0 };
      let s = c.a;
      if (bub.bot === 'retriever') {
        const r = this.robos[i];
        show = !!r && r.root.visible && r.stuck;
        if (r) top = r.headPoint;
      } else {
        const b = this.bots[bub.bot as BotKind][i];
        show = !!b && b.root.visible && b.stuck;
        if (b) {
          s = this.scaleFor(bub.bot as BotKind);
          const h = b.height(s);
          top = bub.bot === 'blind' ? { x: b.root.x, y: c.slotTop - 2 * s } : { x: b.root.x, y: b.root.y - h - 2 * s };
        }
      }
      bub.s.visible = show;
      if (!show) continue;
      const k = Math.max(0.55 * s, 0.75);
      bub.s.scale.set(k * (1 + Math.sin(this.time * 6 + bub.phase) * 0.06));
      bub.s.position.set(top.x, top.y + Math.sin(this.time * 3 + bub.phase) * 2);
      bub.s.rotation = Math.sin(this.time * 4 + bub.phase) * 0.08;
    }
    void lerp;
  }
}
