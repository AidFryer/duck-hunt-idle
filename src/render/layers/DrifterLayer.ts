import { Container, Graphics, Sprite } from 'pixi.js';
import type { TextureLibrary } from '../assets/TextureLibrary';
import type { EffectsLayer } from './EffectsLayer';
import { waterDepthScale, type FrameContext, type Layer, type Point, type SceneLayout } from '../types';

/** A stray carved decoy, glinting gold, drifting across the water. Tap to fish it out. */
export class DrifterLayer implements Layer {
  readonly view = new Container();
  private readonly glow = new Graphics();
  private readonly decoy: Sprite;
  private l!: SceneLayout;
  private x = 0;
  private y = 0;
  private dir = 1;
  private speed = 0;
  private t = 0;
  private nextSparkle = 0;
  active = false;

  constructor(tex: TextureLibrary, private readonly fx: EffectsLayer) {
    this.decoy = new Sprite(tex.get('decoy.drake'));
    this.decoy.anchor.set(0.45, 30 / 34);
    this.glow.ellipse(0, 0, 30, 9).fill({ color: 0xf2c46d, alpha: 0.55 });
    this.view.addChild(this.glow, this.decoy);
    this.view.visible = false;
  }

  layout(l: SceneLayout): void {
    this.l = l;
  }

  /** Start one drifting across from a side. */
  spawn(rnd: number): void {
    const l = this.l;
    if (!l || this.active) return;
    this.dir = rnd < 0.5 ? 1 : -1;
    this.x = this.dir > 0 ? -30 * l.scale : l.w + 30 * l.scale;
    this.y = l.horizon + (l.h - l.horizon) * (0.22 + rnd * 0.3);
    this.speed = (l.w + 60 * l.scale) / 30;
    this.active = true;
    this.view.visible = true;
  }

  /** Was this tap on it? */
  hit(x: number, y: number): boolean {
    if (!this.active) return false;
    const r = 46 * this.l.scale;
    return Math.abs(x - this.x) < r && Math.abs(y - (this.y - 8 * this.l.scale)) < r;
  }

  get at(): Point {
    return { x: this.x, y: this.y - 10 * (this.l?.scale ?? 1) };
  }

  /** Fished out: a burst of sparkle and it's gone. */
  collect(): Point {
    const p = this.at;
    if (this.active) this.fx.sparkle(p.x, p.y, this.l.scale, 14);
    this.active = false;
    this.view.visible = false;
    return p;
  }

  update(f: FrameContext): void {
    if (!this.active) return;
    const l = this.l;
    this.t += f.dt;
    this.x += this.dir * this.speed * f.dt;
    if (this.x < -60 * l.scale || this.x > l.w + 60 * l.scale) {
      this.active = false;
      this.view.visible = false;
      return;
    }
    const k = waterDepthScale(l, this.y) * 0.8;
    const bob = Math.sin(this.t * 2.2) * 1.5 * l.scale * f.motion;
    this.decoy.position.set(this.x, this.y + bob);
    this.decoy.scale.set(k * this.dir, k);
    this.decoy.rotation = Math.sin(this.t * 1.7) * 0.05 * f.motion;
    this.decoy.tint = f.sky.light;
    this.glow.position.set(this.x, this.y + bob);
    this.glow.scale.set(k * 1.6 * (1 + 0.08 * Math.sin(this.t * 3)), k * 1.6);
    this.nextSparkle -= f.dt;
    if (this.nextSparkle <= 0) {
      this.nextSparkle = 1.4;
      this.fx.sparkle(this.x, this.y - 10 * l.scale * k, l.scale * 0.5, 3);
    }
  }
}
