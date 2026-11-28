import { Container, Sprite } from 'pixi.js';
import { lerpColor, shadeColor } from '../../util/color';
import { seededRandom } from '../../util/math';
import type { TextureLibrary } from '../assets/TextureLibrary';
import type { FrameContext, Layer, SceneLayout } from '../types';

interface Skein {
  s: Sprite;
  variant: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  depth: number;
  flap: number;
  life: number;
  fade: number;
}

/** Most skeins on screen at once (each is a single sprite, so this stays cheap). */
const MAX_SKEINS = 9;

/**
 * Far-off skeins of ducks streaming toward the marsh. The busier the hunt,
 * the more of them: a way to show a huge haul without drawing every bird.
 * Each skein is one pre-painted picture with a two-frame wingbeat.
 */
export class SkeinLayer implements Layer {
  readonly view = new Container();
  private readonly pool: Skein[] = [];
  private l!: SceneLayout;
  private readonly rnd = seededRandom(404);
  private wait = 2;
  /** Birds a minute the lodge is bringing in (sets how many skeins fly). */
  rate = 0;

  constructor(private readonly tex: TextureLibrary) {
    for (let i = 0; i < MAX_SKEINS; i++) {
      const variant = i % 3;
      const s = new Sprite(tex.get(`skein.${variant}.up`));
      s.anchor.set(0.5);
      s.visible = false;
      this.view.addChild(s);
      this.pool.push({ s, variant, x: 0, y: 0, vx: 0, vy: 0, depth: 0, flap: 0, life: 0, fade: 0 });
    }
  }

  layout(l: SceneLayout): void {
    this.l = l;
  }

  /** How many skeins should be in the sky for this many birds a minute (0 when quiet). */
  private target(): number {
    if (this.rate < 300) return 0;
    return Math.min(MAX_SKEINS, Math.round(Math.log10(this.rate / 100) * 2.6));
  }

  update(f: FrameContext): void {
    const l = this.l;
    if (!l) return;
    const live = this.pool.filter((k) => k.s.visible);
    const want = Math.round(this.target() * Math.max(0.6, f.activity));
    this.wait -= f.dt;
    if (live.length < want && this.wait <= 0) {
      const k = this.pool.find((p) => !p.s.visible);
      if (k) this.launch(k);
      this.wait = 0.6 + this.rnd() * 1.4;
    }
    const sil = shadeColor(lerpColor(f.sky.farLand, f.sky.skyMid, 0.35), 0.8);
    for (const k of this.pool) {
      if (!k.s.visible) continue;
      k.life += f.dt;
      k.x += k.vx * f.dt;
      k.y += k.vy * f.dt;
      k.flap += f.dt * (5 + k.depth * 3) * Math.max(0.4, f.motion);
      k.s.texture = this.tex.get(`skein.${k.variant}.${Math.floor(k.flap) % 2 === 0 ? 'up' : 'down'}`);
      // Ease in, then fade as they settle toward the far marsh.
      const out = k.vx > 0 ? k.x > l.w * 0.9 : k.x < l.w * 0.1;
      k.fade = Math.min(1, k.fade + f.dt * (out ? -0.6 : 0.8));
      if (out && k.fade <= 0) {
        k.s.visible = false;
        continue;
      }
      k.s.position.set(k.x, k.y);
      k.s.alpha = Math.max(0, k.fade) * (0.6 + k.depth * 0.3);
      k.s.tint = sil;
    }
  }

  private launch(k: Skein): void {
    const l = this.l;
    const top = l.skyTop ?? 0;
    const fromLeft = this.rnd() < 0.5;
    k.depth = this.rnd();
    const scale = l.scale * (0.6 + k.depth * 0.5);
    k.s.scale.set(fromLeft ? scale : -scale, scale);
    k.x = fromLeft ? -60 * l.scale : l.w + 60 * l.scale;
    k.y = top + (l.horizon - top) * (0.12 + this.rnd() * 0.45);
    const speed = (20 + k.depth * 16) * l.scale;
    k.vx = fromLeft ? speed : -speed;
    // Drift down toward the marsh as they come in.
    k.vy = speed * (0.05 + this.rnd() * 0.08);
    k.flap = this.rnd() * 2;
    k.life = 0;
    k.fade = 0;
    k.s.visible = true;
  }
}
