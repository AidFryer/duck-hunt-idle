import { Container, Sprite, Texture } from 'pixi.js';
import { lerpColor } from '../../util/color';
import { clamp, seededRandom } from '../../util/math';
import type { TextureLibrary } from '../assets/TextureLibrary';
import type { FrameContext, Layer, SceneLayout } from '../types';


/**
 * Sky gradient, horizon glow, stars, shooting stars, sun and moon.
 * The gradient is a tiny canvas repainted only when colors change.
 */
export class SkyLayer implements Layer {
  readonly view = new Container();
  private readonly gradCanvas = document.createElement('canvas');
  private readonly gradTex: Texture;
  private readonly gradient: Sprite;
  private readonly horizonGlow: Sprite;
  private readonly stars: { s: Sprite; phase: number; speed: number; base: number; nx: number; ny: number }[] = [];
  private readonly starLayer = new Container();
  private readonly sunHalo: Sprite;
  private readonly sun: Sprite;
  private readonly moonHalo: Sprite;
  private readonly moon: Sprite;
  private readonly shooting: Sprite;
  private shootTimer = 8;
  private shootAge = -1;
  private shootFrom = { x: 0, y: 0, vx: 0, vy: 0 };
  private lastKey = '';
  private l!: SceneLayout;

  constructor(tex: TextureLibrary) {
    this.gradCanvas.width = 2;
    this.gradCanvas.height = 128;
    this.gradTex = Texture.from(this.gradCanvas);
    this.gradient = new Sprite(this.gradTex);
    this.view.addChild(this.gradient);

    this.view.addChild(this.starLayer);
    const rnd = seededRandom(2024);
    for (let i = 0; i < 110; i++) {
      const s = new Sprite(tex.get('star'));
      s.anchor.set(0.5);
      s.blendMode = 'add';
      const base = 0.25 + rnd() * 0.75;
      s.scale.set(0.3 + rnd() * rnd() * 0.9);
      this.starLayer.addChild(s);
      this.stars.push({ s, phase: rnd() * 10, speed: 0.6 + rnd() * 2.2, base, nx: rnd(), ny: Math.pow(rnd(), 1.4) });
    }
    this.shooting = new Sprite(tex.get('shimmer'));
    this.shooting.anchor.set(1, 0.5);
    this.shooting.blendMode = 'add';
    this.shooting.visible = false;
    this.view.addChild(this.shooting);

    this.horizonGlow = new Sprite(tex.get('glow'));
    this.horizonGlow.anchor.set(0.5);
    this.horizonGlow.blendMode = 'add';
    this.view.addChild(this.horizonGlow);

    this.moonHalo = new Sprite(tex.get('glow'));
    this.moonHalo.anchor.set(0.5);
    this.moonHalo.blendMode = 'add';
    this.moon = new Sprite(tex.get('moon'));
    this.moon.anchor.set(0.5);
    this.sunHalo = new Sprite(tex.get('glow'));
    this.sunHalo.anchor.set(0.5);
    this.sunHalo.blendMode = 'add';
    this.sun = new Sprite(tex.get('sun'));
    this.sun.anchor.set(0.5);
    this.view.addChild(this.moonHalo, this.moon, this.sunHalo, this.sun);
  }

  layout(l: SceneLayout): void {
    this.l = l;
    this.gradient.width = l.w;
    this.gradient.height = l.horizon + 4;
    for (const st of this.stars) {
      st.s.position.set(st.nx * l.w, st.ny * l.horizon * 0.88);
    }
    this.lastKey = '';
  }

  /** Sun/moon screen position from progress (0 = rising east/left, 1 = setting). */
  celestialPos(progress: number, altitude: number): { x: number; y: number } {
    const l = this.l;
    const p = clamp(progress, -0.15, 1.15);
    return {
      x: l.w * (0.24 + p * 0.64),
      y: l.horizon - altitude * l.horizon * 0.78 + l.scale * 8,
    };
  }

  update(f: FrameContext): void {
    const { sky, time, layout: l } = f;
    const key = `${sky.skyTop}|${sky.skyMid}|${sky.skyLow}`;
    if (key !== this.lastKey) {
      this.lastKey = key;
      const ctx = this.gradCanvas.getContext('2d')!;
      const g = ctx.createLinearGradient(0, 0, 0, 128);
      g.addColorStop(0, hex(sky.skyTop));
      g.addColorStop(0.55, hex(sky.skyMid));
      g.addColorStop(1, hex(sky.skyLow));
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, 2, 128);
      this.gradTex.source.update();
    }

    // Stars
    const starA = sky.stars;
    this.starLayer.visible = starA > 0.01;
    if (this.starLayer.visible) {
      for (const st of this.stars) {
        const tw = 0.6 + 0.4 * Math.sin(time * st.speed * f.motion + st.phase);
        st.s.alpha = starA * st.base * tw;
      }
    }

    // Occasional shooting star at night
    if (starA > 0.7 && f.motion > 0.2) {
      this.shootTimer -= f.dt;
      if (this.shootTimer <= 0 && this.shootAge < 0) {
        this.shootAge = 0;
        this.shootTimer = 18 + Math.random() * 30;
        this.shootFrom = {
          x: l.w * (0.2 + Math.random() * 0.7),
          y: l.horizon * (0.08 + Math.random() * 0.3),
          vx: -l.w * 0.45,
          vy: l.horizon * 0.22,
        };
      }
    }
    if (this.shootAge >= 0) {
      this.shootAge += f.dt;
      const a = this.shootAge;
      const life = 0.9;
      this.shooting.visible = true;
      this.shooting.position.set(this.shootFrom.x + this.shootFrom.vx * a, this.shootFrom.y + this.shootFrom.vy * a);
      this.shooting.rotation = Math.atan2(this.shootFrom.vy, this.shootFrom.vx) + Math.PI;
      this.shooting.scale.set(2.4 * l.scale, 0.5);
      this.shooting.alpha = Math.sin((a / life) * Math.PI) * starA;
      if (a > life) {
        this.shootAge = -1;
        this.shooting.visible = false;
      }
    }

    // Sun
    const sunUp = sky.sunAltitude > -0.25;
    this.sun.visible = this.sunHalo.visible = sunUp;
    if (sunUp) {
      const p = this.celestialPos(sky.sunProgress, sky.sunAltitude);
      const low = 1 - clamp(sky.sunAltitude, 0, 1);
      this.sun.position.set(p.x, p.y);
      this.sun.scale.set(l.scale * (0.62 + low * 0.18));
      this.sun.tint = lerpColor(0xffffff, 0xffc890, low * 0.8);
      this.sun.alpha = clamp((sky.sunAltitude + 0.2) * 4, 0, 1);
      this.sunHalo.position.set(p.x, p.y);
      this.sunHalo.scale.set(l.scale * (2.2 + low * 1.4));
      this.sunHalo.tint = sky.glow;
      this.sunHalo.alpha = 0.55 * this.sun.alpha;
    }

    // Moon
    const moonUp = sky.moonAltitude > -0.2;
    this.moon.visible = this.moonHalo.visible = moonUp;
    if (moonUp) {
      const p = this.celestialPos(sky.moonProgress, sky.moonAltitude * 0.85);
      this.moon.position.set(p.x, p.y);
      this.moon.scale.set(l.scale * 0.5);
      this.moon.alpha = clamp(sky.darkness * 1.4, 0, 1) * clamp((sky.moonAltitude + 0.15) * 5, 0, 1);
      this.moonHalo.position.set(p.x, p.y);
      this.moonHalo.scale.set(l.scale * 1.6);
      this.moonHalo.tint = 0xc8d4ff;
      this.moonHalo.alpha = 0.28 * this.moon.alpha;
    }

    // Broad horizon glow under the sun (strongest at sunrise/sunset)
    const sunX = this.celestialPos(sky.sunProgress, 0).x;
    const near = 1 - clamp(Math.abs(sky.sunAltitude) * 2.2, 0, 1);
    this.horizonGlow.position.set(clamp(sunX, 0, l.w), l.horizon);
    this.horizonGlow.scale.set((l.w / 128) * 1.3, (l.horizon / 128) * 1.1);
    this.horizonGlow.tint = sky.glow;
    this.horizonGlow.alpha = 0.15 + near * 0.55;
  }
}

function hex(c: number): string {
  return `#${c.toString(16).padStart(6, '0')}`;
}
