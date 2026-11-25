import { Container } from 'pixi.js';
import { palette } from '../../data/palette';
import { lerpColor, multiplyColor } from '../../util/color';
import { clamp, seededRandom } from '../../util/math';
import type { TextureLibrary } from '../assets/TextureLibrary';
import { ParticlePool, type Particle } from '../pool';
import type { FrameContext, Layer, SceneLayout } from '../types';
import { waterDepthScale } from '../types';

/**
 * Pooled ambient effects: ripples, splashes, chimney smoke, coffee steam,
 * falling leaves and fireflies. Other layers call the spawn helpers.
 */
export class EffectsLayer implements Layer {
  readonly view = new Container();
  /** Ripples render under ducks — mount this inside the water surface. */
  readonly rippleView: Container;
  private readonly ripples: ParticlePool;
  private readonly drops: ParticlePool;
  private readonly smoke: ParticlePool;
  private readonly steam: ParticlePool;
  private readonly leaves: ParticlePool[];
  private readonly fireflies: ParticlePool;
  private l!: SceneLayout;
  private smokeTimer = 0;
  private steamTimer = 0;
  private leafTimer = 2;
  private fishTimer = 3;
  private readonly rnd = seededRandom(99);

  constructor(tex: TextureLibrary) {
    this.ripples = new ParticlePool(tex.get('ripple'), 48);
    this.rippleView = this.ripples.view;
    this.smoke = new ParticlePool(tex.get('softDot'), 28);
    this.steam = new ParticlePool(tex.get('softDot'), 14);
    this.drops = new ParticlePool(tex.get('droplet'), 60);
    this.leaves = [0, 1, 2].map((i) => new ParticlePool(tex.get(`leaf${i}`), 5));
    this.fireflies = new ParticlePool(tex.get('glow'), 22);
    this.fireflies.view.blendMode = 'add';
    this.view.addChild(this.smoke.view, this.steam.view, ...this.leaves.map((p) => p.view), this.drops.view, this.fireflies.view);
    for (const ff of this.fireflies.items) {
      ff.active = true;
      ff.sprite.visible = true;
      ff.seed = this.rnd();
      ff.extra = this.rnd();
    }
  }

  layout(l: SceneLayout): void {
    this.l = l;
    const r = seededRandom(5);
    for (const ff of this.fireflies.items) {
      ff.x = r() * l.w;
      ff.y = l.horizon + (r() * 0.5 - 0.15) * (l.h - l.horizon);
    }
  }

  // ---------------------------------------------------------------- spawners

  ripple(x: number, y: number, size = 1, life = 2.4): void {
    const p = this.ripples.spawn();
    p.x = x;
    p.y = y;
    p.life = life;
    const s = waterDepthScale(this.l, y) * 0.32 * size;
    p.scale0 = s * 0.25;
    p.scale1 = s;
    p.alpha0 = 0.55;
  }

  splash(x: number, y: number, size = 1): void {
    const s = waterDepthScale(this.l, y) * size;
    for (let i = 0; i < 10; i++) {
      const p = this.drops.spawn();
      const a = -Math.PI / 2 + (this.rnd() - 0.5) * 2.0;
      const v = (40 + this.rnd() * 60) * s;
      p.x = x + (this.rnd() - 0.5) * 8 * s;
      p.y = y;
      p.vx = Math.cos(a) * v;
      p.vy = Math.sin(a) * v;
      p.life = 0.55 + this.rnd() * 0.35;
      p.scale0 = s * (0.35 + this.rnd() * 0.4);
      p.extra = y;
    }
    this.ripple(x, y, size * 1.3, 2.6);
    this.ripple(x, y, size * 0.8, 1.8);
  }

  // ---------------------------------------------------------------- update

  update(f: FrameContext): void {
    const { dt, layout: l, sky, wind, time } = f;
    const a = l.anchors;
    const lightTint = sky.light;

    // Chimney smoke
    this.smokeTimer -= dt;
    if (this.smokeTimer <= 0) {
      this.smokeTimer = 0.45 + this.rnd() * 0.3;
      const p = this.smoke.spawn();
      p.x = a.chimney.x + (this.rnd() - 0.5) * 3 * l.scale;
      p.y = a.chimney.y;
      p.vx = (4 + wind * 22) * l.scale;
      p.vy = -(10 + this.rnd() * 6) * l.scale;
      p.life = 4 + this.rnd() * 2;
      p.scale0 = 0.18 * l.scale;
      p.scale1 = (0.9 + this.rnd() * 0.5) * l.scale;
      p.alpha0 = 0.32;
    }
    const smokeColor = multiplyColor(lerpColor(palette.cream, 0xb8b4ae, 0.4), lightTint);
    for (const p of this.smoke.items) {
      if (!p.active) continue;
      if (this.age(p, dt)) { this.smoke.release(p); continue; }
      const t = p.age / p.life;
      p.vx += wind * 6 * l.scale * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.sprite.position.set(p.x + Math.sin(time * 0.9 + p.seed * 6) * 3 * l.scale, p.y);
      p.sprite.scale.set(p.scale0 + (p.scale1 - p.scale0) * t);
      p.sprite.alpha = p.alpha0 * Math.sin(Math.min(1, t * 3) * Math.PI * 0.5) * (1 - t);
      p.sprite.tint = smokeColor;
    }

    // Coffee steam from the mug in the blind
    this.steamTimer -= dt;
    if (this.steamTimer <= 0) {
      this.steamTimer = 0.5 + this.rnd() * 0.4;
      const p = this.steam.spawn();
      p.x = a.mug.x;
      p.y = a.mug.y;
      p.vy = -7 * l.scale;
      p.life = 2.2;
      p.scale0 = 0.06 * l.scale;
      p.scale1 = 0.22 * l.scale;
      p.alpha0 = 0.45;
    }
    for (const p of this.steam.items) {
      if (!p.active) continue;
      if (this.age(p, dt)) { this.steam.release(p); continue; }
      const t = p.age / p.life;
      p.y += p.vy * dt;
      p.sprite.position.set(p.x + Math.sin(t * 7 + p.seed * 9) * 2.2 * l.scale + wind * t * 6 * l.scale, p.y);
      p.sprite.scale.set(p.scale0 + (p.scale1 - p.scale0) * t, (p.scale0 + (p.scale1 - p.scale0) * t) * 1.4);
      p.sprite.alpha = p.alpha0 * (1 - t) * Math.min(1, t * 5);
      p.sprite.tint = multiplyColor(0xffffff, lightTint);
    }

    // Droplets (ballistic, little ripple where they land)
    for (const p of this.drops.items) {
      if (!p.active) continue;
      p.age += dt;
      p.vy += 260 * l.scale * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.sprite.position.set(p.x, p.y);
      p.sprite.rotation = Math.atan2(p.vy, p.vx) - Math.PI / 2;
      p.sprite.scale.set(p.scale0);
      p.sprite.alpha = 0.85;
      p.sprite.tint = lerpColor(sky.skyMid, 0xffffff, 0.5);
      if (p.y > p.extra && p.vy > 0) {
        if (p.seed > 0.6) this.ripple(p.x, p.extra, 0.35, 1.2);
        this.drops.release(p);
      }
    }

    // Ripples
    for (const p of this.ripples.items) {
      if (!p.active) continue;
      if (this.age(p, dt)) { this.ripples.release(p); continue; }
      const t = p.age / p.life;
      const e = 1 - Math.pow(1 - t, 2);
      p.sprite.position.set(p.x, p.y);
      p.sprite.scale.set(p.scale0 + (p.scale1 - p.scale0) * e);
      p.sprite.alpha = p.alpha0 * (1 - t);
      p.sprite.tint = lerpColor(sky.skyMid, 0xffffff, 0.4);
    }

    // Occasional fish rings in open water
    this.fishTimer -= dt * f.motion;
    if (this.fishTimer <= 0) {
      this.fishTimer = 3 + this.rnd() * 6;
      const y = l.horizon + (0.15 + this.rnd() * 0.7) * (l.h - l.horizon);
      this.ripple(this.rnd() * l.w, y, 0.7, 3);
    }

    // Falling leaves
    this.leafTimer -= dt * f.motion;
    if (this.leafTimer <= 0) {
      this.leafTimer = 2.5 + this.rnd() * 4;
      const pool = this.leaves[Math.floor(this.rnd() * 3)]!;
      const p = pool.spawn();
      p.x = this.rnd() * l.w * 0.9;
      p.y = -10;
      p.vy = (14 + this.rnd() * 10) * l.scale;
      p.vx = (6 + wind * 30) * l.scale;
      p.life = 99;
      p.spin = (this.rnd() - 0.5) * 3;
      p.scale0 = l.scale * (0.6 + this.rnd() * 0.5);
      p.extra = l.horizon + (0.2 + this.rnd() * 0.75) * (l.h - l.horizon); // landing y
    }
    for (const pool of this.leaves) {
      for (const p of pool.items) {
        if (!p.active) continue;
        p.age += dt;
        const landed = p.y >= p.extra;
        if (!landed) {
          p.x += (p.vx + Math.sin(p.age * 1.8 + p.seed * 10) * 18 * l.scale) * dt;
          p.y += p.vy * dt;
          p.sprite.rotation += p.spin * dt;
          p.sprite.scale.set(p.scale0 * Math.cos(p.age * 2.4 + p.seed * 5), p.scale0);
          if (p.y >= p.extra) {
            this.ripple(p.x, p.y, 0.4, 1.6);
            p.life = p.age + 6; // float for a while, then fade
          }
          p.sprite.alpha = 1;
        } else {
          p.x += wind * 4 * l.scale * dt;
          p.sprite.scale.set(p.scale0, p.scale0 * 0.45);
          p.sprite.alpha = clamp((p.life - p.age) / 2, 0, 1);
          if (p.age >= p.life) pool.release(p);
        }
        p.sprite.position.set(p.x, p.y);
        p.sprite.tint = sky.light;
        if (p.x > l.w + 20) pool.release(p);
      }
    }

    // Fireflies: dusk & night, drifting above the reeds
    const ffStrength = clamp((sky.darkness - 0.2) * 1.6, 0, 1) * (sky.hour > 17 || sky.hour < 2 ? 1 : 0.3);
    this.fireflies.view.visible = ffStrength > 0.01;
    if (this.fireflies.view.visible) {
      for (const p of this.fireflies.items) {
        const s = p.seed * 100;
        p.x += Math.sin(time * 0.35 + s) * 8 * l.scale * dt;
        p.y += Math.cos(time * 0.5 + s * 1.3) * 5 * l.scale * dt;
        if (p.x < 0) p.x += l.w;
        if (p.x > l.w) p.x -= l.w;
        const pulse = Math.max(0, Math.sin(time * (0.8 + p.extra * 1.4) + s));
        p.sprite.position.set(p.x, p.y);
        p.sprite.scale.set(l.scale * (0.05 + pulse * 0.07));
        p.sprite.tint = palette.firefly;
        p.sprite.alpha = ffStrength * pulse * 0.9;
      }
    }
  }

  /** Age a particle; returns true when it has expired. */
  private age(p: Particle, dt: number): boolean {
    p.age += dt;
    return p.age >= p.life;
  }
}
