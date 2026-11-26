import { Container, Sprite, Texture } from 'pixi.js';
import type { WeatherId } from '../../data/weather';
import { lerpColor } from '../../util/color';
import { seededRandom } from '../../util/math';
import type { TextureLibrary } from '../assets/TextureLibrary';
import type { EffectsLayer } from './EffectsLayer';
import type { FrameContext, Layer, SceneLayout } from '../types';

interface Drop {
  s: Sprite;
  x: number;
  y: number;
  speed: number;
  phase: number;
}

/** Visual strengths per weather: rain, snow, tint color & alpha. */
const LOOK: Record<WeatherId, { rain: number; snow: number; tint: number; tintAlpha: number }> = {
  clear: { rain: 0, snow: 0, tint: 0xffffff, tintAlpha: 0 },
  fog: { rain: 0, snow: 0, tint: 0xdfe6ea, tintAlpha: 0.12 },
  drizzle: { rain: 1, snow: 0, tint: 0x8a98a8, tintAlpha: 0.16 },
  coldFront: { rain: 0, snow: 0.8, tint: 0xc8daf0, tintAlpha: 0.14 },
  wind: { rain: 0, snow: 0, tint: 0xffffff, tintAlpha: 0 },
};

/** Rain, snow and a weather tint. Weather fades in and out over a few seconds. */
export class WeatherLayer implements Layer {
  readonly view = new Container();
  private readonly tint: Sprite;
  private readonly rain: Drop[] = [];
  private readonly snow: Drop[] = [];
  private l!: SceneLayout;
  weather: WeatherId = 'clear';
  private cur = { rain: 0, snow: 0, tint: 0xffffff, tintAlpha: 0 };
  private rippleT = 0;
  private readonly rnd = seededRandom(808);

  constructor(tex: TextureLibrary, private readonly fx: EffectsLayer) {
    this.tint = new Sprite(Texture.WHITE);
    this.tint.alpha = 0;
    const rainLayer = new Container();
    const snowLayer = new Container();
    for (let i = 0; i < 140; i++) {
      const s = new Sprite(tex.get('rain'));
      s.anchor.set(0.5, 1);
      rainLayer.addChild(s);
      this.rain.push({ s, x: this.rnd(), y: this.rnd(), speed: 0.8 + this.rnd() * 0.4, phase: this.rnd() * 10 });
    }
    for (let i = 0; i < 90; i++) {
      const s = new Sprite(tex.get('softDot'));
      s.anchor.set(0.5);
      snowLayer.addChild(s);
      this.snow.push({ s, x: this.rnd(), y: this.rnd(), speed: 0.5 + this.rnd() * 0.8, phase: this.rnd() * 10 });
    }
    this.view.addChild(this.tint, rainLayer, snowLayer);
    this.view.eventMode = 'none';
  }

  layout(l: SceneLayout): void {
    this.l = l;
    this.tint.width = l.w;
    this.tint.height = l.h;
  }

  update(f: FrameContext): void {
    const l = this.l;
    const target = LOOK[this.weather];
    const k = Math.min(1, f.dt * 0.8);
    this.cur.rain += (target.rain - this.cur.rain) * k;
    this.cur.snow += (target.snow - this.cur.snow) * k;
    this.cur.tintAlpha += (target.tintAlpha - this.cur.tintAlpha) * k;
    this.cur.tint = lerpColor(this.cur.tint, target.tint, k);
    this.tint.tint = this.cur.tint;
    this.tint.alpha = this.cur.tintAlpha;

    const wind = f.wind;
    const rainA = this.cur.rain;
    for (const d of this.rain) {
      d.s.visible = rainA > 0.02;
      if (!d.s.visible) continue;
      d.y += d.speed * 1.4 * f.dt;
      d.x += wind * 0.15 * f.dt;
      if (d.y > 1) {
        d.y -= 1;
        d.x = this.rnd();
      }
      if (d.x > 1) d.x -= 1;
      d.s.position.set(d.x * l.w, d.y * l.h * 1.05);
      d.s.rotation = -0.15 - wind * 0.35;
      d.s.scale.set(l.scale * 1.2, l.scale * (0.8 + d.speed * 0.5));
      d.s.alpha = rainA * 0.55;
      d.s.tint = lerpColor(f.sky.skyMid, 0xffffff, 0.6);
    }
    // Rain dimples the water.
    if (rainA > 0.1) {
      this.rippleT -= f.dt * rainA * 10;
      while (this.rippleT <= 0) {
        this.rippleT += 1;
        const y = l.horizon + (0.05 + this.rnd() * 0.9) * (l.h - l.horizon);
        this.fx.ripple(this.rnd() * l.w, y, 0.3, 1.2);
      }
    }

    const snowA = this.cur.snow;
    for (const d of this.snow) {
      d.s.visible = snowA > 0.02;
      if (!d.s.visible) continue;
      d.y += d.speed * 0.12 * f.dt;
      d.x += (wind * 0.04 + Math.sin(f.time * 0.8 + d.phase) * 0.01) * f.dt;
      if (d.y > 1) {
        d.y -= 1;
        d.x = this.rnd();
      }
      if (d.x > 1) d.x -= 1;
      if (d.x < 0) d.x += 1;
      d.s.position.set(d.x * l.w, d.y * l.h);
      d.s.scale.set(l.scale * (0.12 + d.speed * 0.1));
      d.s.alpha = snowA;
      d.s.tint = lerpColor(f.sky.light, 0xffffff, 0.5);
    }
  }

  /** Extra cloud cover for this weather (0–1). */
  get overcast(): number {
    return Math.max(this.cur.rain, this.cur.snow * 0.8, this.cur.tintAlpha * 3);
  }
}
