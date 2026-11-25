import { Container, Sprite, type Texture } from 'pixi.js';

/** A pooled particle. Fields are reused, never reallocated. */
export interface Particle {
  sprite: Sprite;
  active: boolean;
  age: number;
  life: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  spin: number;
  scale0: number;
  scale1: number;
  alpha0: number;
  seed: number;
  /** Free slot for layer-specific data (e.g. a target y). */
  extra: number;
}

/**
 * Fixed-capacity sprite pool. Sprites live permanently in `view` and are
 * hidden when inactive — no allocation or display-list churn per frame.
 */
export class ParticlePool {
  readonly view = new Container();
  readonly items: Particle[] = [];
  private cursor = 0;

  constructor(texture: Texture, capacity: number, anchorX = 0.5, anchorY = 0.5) {
    for (let i = 0; i < capacity; i++) {
      const sprite = new Sprite(texture);
      sprite.anchor.set(anchorX, anchorY);
      sprite.visible = false;
      this.view.addChild(sprite);
      this.items.push({
        sprite, active: false, age: 0, life: 1, x: 0, y: 0, vx: 0, vy: 0,
        spin: 0, scale0: 1, scale1: 1, alpha0: 1, seed: Math.random(), extra: 0,
      });
    }
  }

  /** Grab a free particle (or recycle the oldest slot when full). */
  spawn(): Particle {
    const n = this.items.length;
    for (let k = 0; k < n; k++) {
      const p = this.items[(this.cursor + k) % n]!;
      if (!p.active) {
        this.cursor = (this.cursor + k + 1) % n;
        return this.activate(p);
      }
    }
    const p = this.items[this.cursor]!;
    this.cursor = (this.cursor + 1) % n;
    return this.activate(p);
  }

  private activate(p: Particle): Particle {
    p.active = true;
    p.age = 0;
    p.vx = p.vy = p.spin = 0;
    p.extra = 0;
    p.seed = Math.random();
    p.sprite.visible = true;
    p.sprite.rotation = 0;
    p.sprite.alpha = 1;
    p.sprite.tint = 0xffffff;
    return p;
  }

  release(p: Particle): void {
    p.active = false;
    p.sprite.visible = false;
  }

  get activeCount(): number {
    let c = 0;
    for (const p of this.items) if (p.active) c++;
    return c;
  }
}
