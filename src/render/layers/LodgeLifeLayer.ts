import { Container, Graphics, Sprite } from 'pixi.js';
import { lerpColor } from '../../util/color';
import { clamp, seededRandom } from '../../util/math';
import type { TextureLibrary } from '../assets/TextureLibrary';
import type { FrameContext, Layer, SceneLayout } from '../types';

interface Walker {
  s: Sprite;
  x: number;
  dir: number;
  speed: number;
  pause: number;
  phase: number;
  min: number;
  max: number;
}

/**
 * Cozy life around the lodge: Gus rocking on the porch with his coffee,
 * guests strolling the bank (more as the lodge grows), and an angler on
 * the dock at the bigger lodges. Guests head inside after dark.
 */
export class LodgeLifeLayer implements Layer {
  readonly view = new Container();
  private readonly gus: Sprite;
  private readonly walkers: Walker[] = [];
  private readonly angler: Sprite;
  private readonly line = new Graphics();
  private l!: SceneLayout;
  private level = 1;
  private time = 0;
  private y = 0;
  private k = 1;
  private readonly rnd = seededRandom(4242);

  constructor(tex: TextureLibrary) {
    this.gus = new Sprite(tex.get('person.gus'));
    this.gus.anchor.set(0.5, 1);
    for (let i = 0; i < 4; i++) {
      const s = new Sprite(tex.get(`person.guest${i}`));
      s.anchor.set(0.5, 1);
      s.visible = false;
      this.walkers.push({ s, x: 0, dir: i % 2 ? 1 : -1, speed: 8 + this.rnd() * 6, pause: this.rnd() * 3, phase: this.rnd() * 6, min: 0, max: 1 });
    }
    this.angler = new Sprite(tex.get('person.angler'));
    this.angler.anchor.set(0.5, 1);
    this.angler.visible = false;
    this.view.addChild(this.gus, ...this.walkers.map((w) => w.s), this.angler, this.line);
  }

  layout(l: SceneLayout): void {
    this.l = l;
    const a = l.anchors;
    const ls = a.lodgeScale;
    this.k = ls * 0.95;
    this.y = a.lodge.y + 2 * ls;
    // Gus in his rocker on the porch, under the lantern.
    this.gus.position.set(a.porch.x - 12 * ls, a.porch.y - 1 * ls);
    this.gus.scale.set(this.k);
    // Guests stroll the bank in front of the lodge.
    const left = a.porch.x + 4 * ls;
    const right = a.lodge.x + 55 * ls;
    this.walkers.forEach((w, i) => {
      w.min = left;
      w.max = right;
      w.x = left + ((i + 0.5) / this.walkers.length) * (right - left);
      w.s.scale.set(this.k * w.dir, this.k);
    });
    this.angler.position.set(a.lodge.x + 108 * ls, this.y - 8 * ls);
    this.angler.scale.set(this.k);
  }

  setLevel(level: number): void {
    this.level = level;
  }

  update(f: FrameContext): void {
    const dt = f.dt;
    this.time += dt;
    const lit = lerpColor(f.sky.light, 0xffffff, 0.05);
    // Gus rocks gently.
    this.gus.rotation = Math.sin(this.time * 1.6) * 0.06 * (0.4 + f.motion * 0.6);
    this.gus.tint = lit;
    // Guests: one per lodge level above the shack; inside after dark.
    const night = f.sky.darkness > 0.55;
    const want = night ? 0 : clamp(this.level - 1, 0, this.walkers.length);
    this.walkers.forEach((w, i) => {
      const on = i < want;
      const a = on ? 1 : 0;
      w.s.alpha += (a - w.s.alpha) * Math.min(1, dt * 2);
      w.s.visible = w.s.alpha > 0.02;
      if (!w.s.visible) return;
      if (w.pause > 0) {
        w.pause -= dt;
      } else {
        w.x += w.dir * w.speed * this.k * dt * (0.5 + f.motion * 0.5);
        if (w.x < w.min || w.x > w.max) {
          w.x = clamp(w.x, w.min, w.max);
          w.dir = -w.dir;
          w.pause = 2 + this.rnd() * 5;
        } else if (this.rnd() < dt * 0.05) w.pause = 1.5 + this.rnd() * 3;
      }
      const step = w.pause > 0 ? 0 : Math.abs(Math.sin(this.time * 6 + w.phase)) * 1.2 * this.k;
      w.s.position.set(w.x, this.y - step);
      w.s.scale.set(this.k * w.dir, this.k);
      w.s.tint = lit;
    });
    // An angler on the dock from the Marsh Lodge on, line bobbing.
    const fishing = this.level >= 3 && !night;
    this.angler.visible = fishing;
    const g = this.line.clear();
    if (fishing && this.l) {
      this.angler.tint = lit;
      const s = this.k;
      const tipX = this.angler.x + 11 * s;
      const tipY = this.angler.y - 32 * s;
      const bobX = tipX + 18 * s;
      const bobY = this.angler.y + 10 * s + Math.sin(this.time * 2.1) * 0.8 * s;
      g.moveTo(tipX, tipY).quadraticCurveTo(bobX, tipY, bobX, bobY).stroke({ width: Math.max(0.5, 0.5 * s), color: 0xf4e9d4, alpha: 0.6 });
      g.circle(bobX, bobY, 1.4 * s).fill(0xd2693a);
    }
  }
}
