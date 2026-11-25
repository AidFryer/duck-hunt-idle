import { Container, Sprite, Texture } from 'pixi.js';
import { lerpColor } from '../../util/color';
import { clamp, seededRandom } from '../../util/math';
import type { TextureLibrary } from '../assets/TextureLibrary';
import type { FrameContext, Layer, SceneLayout } from '../types';

interface Glint {
  s: Sprite;
  nx: number;
  ny: number;
  phase: number;
  speed: number;
  len: number;
}

/**
 * The marsh water: sky-tinted gradient, reflections (filled in by other
 * layers), gentle shimmer strokes, and a broken sun/moon path.
 */
export class WaterLayer implements Layer {
  readonly view = new Container();
  /** Other layers add mirrored copies of themselves here. */
  readonly reflections = new Container();
  /** Ripple rings live here so they sit under ducks and decoys. */
  readonly surface = new Container();
  private readonly gradCanvas = document.createElement('canvas');
  private readonly gradTex: Texture;
  private readonly base: Sprite;
  private readonly glints: Glint[] = [];
  private readonly path: Glint[] = [];
  private readonly glintLayer = new Container();
  private readonly pathLayer = new Container();
  private lastKey = '';
  sunX = 0;
  moonX = 0;

  constructor(tex: TextureLibrary) {
    this.gradCanvas.width = 2;
    this.gradCanvas.height = 64;
    this.gradTex = Texture.from(this.gradCanvas);
    this.base = new Sprite(this.gradTex);
    this.reflections.alpha = 1;
    this.pathLayer.blendMode = 'add';
    this.view.addChild(this.base, this.reflections, this.glintLayer, this.pathLayer, this.surface);

    const rnd = seededRandom(51);
    for (let i = 0; i < 70; i++) {
      const s = new Sprite(tex.get('shimmer'));
      s.anchor.set(0.5);
      this.glintLayer.addChild(s);
      this.glints.push({ s, nx: rnd(), ny: Math.pow(rnd(), 1.6), phase: rnd() * 10, speed: 0.4 + rnd() * 0.8, len: 0.5 + rnd() });
    }
    for (let i = 0; i < 26; i++) {
      const s = new Sprite(tex.get('shimmer'));
      s.anchor.set(0.5);
      this.pathLayer.addChild(s);
      this.path.push({ s, nx: rnd() - 0.5, ny: Math.pow(i / 26, 1.3), phase: rnd() * 10, speed: 1 + rnd() * 1.5, len: 0.6 + rnd() });
    }
  }

  layout(l: SceneLayout): void {
    this.base.position.set(0, l.horizon);
    this.base.width = l.w;
    this.base.height = l.h - l.horizon;
    this.lastKey = '';
  }

  update(f: FrameContext): void {
    const { sky, time, layout: l } = f;
    const key = `${sky.waterTop}|${sky.waterLow}|${sky.skyLow}`;
    if (key !== this.lastKey) {
      this.lastKey = key;
      const ctx = this.gradCanvas.getContext('2d')!;
      const g = ctx.createLinearGradient(0, 0, 0, 64);
      g.addColorStop(0, hex(lerpColor(sky.waterTop, sky.skyLow, 0.35)));
      g.addColorStop(0.25, hex(sky.waterTop));
      g.addColorStop(1, hex(sky.waterLow));
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, 2, 64);
      this.gradTex.source.update();
    }

    const waterH = l.h - l.horizon;
    const glintColor = lerpColor(sky.skyMid, 0xffffff, 0.35);
    const drift = time * 6 * l.scale * f.motion;
    for (const gl of this.glints) {
      const depth = gl.ny; // 0 at horizon … 1 foreground
      const y = l.horizon + 3 * l.scale + depth * (waterH - 6 * l.scale);
      const x = (((gl.nx * l.w + drift * (0.3 + depth)) % (l.w + 40)) + l.w + 40) % (l.w + 40) - 20;
      gl.s.position.set(x, y + Math.sin(time * gl.speed + gl.phase) * 1.2 * l.scale);
      const sc = l.scale * (0.35 + depth * 1.2) * gl.len;
      gl.s.scale.set(sc, sc * 0.7);
      gl.s.tint = glintColor;
      gl.s.alpha = (0.08 + 0.22 * Math.max(0, Math.sin(time * gl.speed * 1.3 + gl.phase))) * (0.5 + depth * 0.5);
    }

    // Sun path (or moon path at night) — broken, shimmering streaks.
    const sunLow = sky.sunAltitude > -0.05 ? 1 - clamp(sky.sunAltitude, 0, 1) * 0.6 : 0;
    const moonOn = sky.moonAltitude > 0 ? sky.darkness : 0;
    const useSun = sunLow > 0.05;
    const strength = useSun ? sunLow : moonOn * 0.6;
    const cx = useSun ? this.sunX : this.moonX;
    const color = useSun ? lerpColor(sky.glow, 0xffffff, 0.2) : 0xdfe6ff;
    this.pathLayer.visible = strength > 0.02;
    if (this.pathLayer.visible) {
      for (const p of this.path) {
        const y = l.horizon + 2 * l.scale + p.ny * waterH * 0.75;
        const spread = (8 + p.ny * 60) * l.scale;
        p.s.position.set(cx + p.nx * spread + Math.sin(time * p.speed + p.phase) * 3 * l.scale, y);
        const sc = l.scale * (0.5 + p.ny * 1.6) * p.len;
        p.s.scale.set(sc, sc * 0.8);
        p.s.tint = color;
        p.s.alpha = strength * (0.25 + 0.55 * Math.max(0, Math.sin(time * p.speed * 1.7 + p.phase))) * (1 - p.ny * 0.6);
      }
    }
  }
}

function hex(c: number): string {
  return `#${c.toString(16).padStart(6, '0')}`;
}
