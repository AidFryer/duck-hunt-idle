import { Container, Graphics } from 'pixi.js';
import { CROPS, type CropId } from '../../data/crops';
import { lerpColor, shadeColor } from '../../util/color';
import { seededRandom } from '../../util/math';
import type { FrameContext, Layer, SceneLayout } from '../types';

/**
 * Marsh upgrades you can see: food plots along the far bank and
 * flooded timber standing in the water. Redrawn only when levels change.
 */
export class PlotsLayer implements Layer {
  readonly view = new Container();
  private readonly g = new Graphics();
  private l!: SceneLayout;
  private key = '';
  private plots: { crop: CropId | null; growth: number }[] = [];

  constructor() {
    this.view.addChild(this.g);
  }

  layout(l: SceneLayout): void {
    this.l = l;
    this.key = '';
  }

  /** Food plots along the far bank; redrawn as they grow. */
  setPlots(plots: { crop: CropId | null; growth: number }[], open: number): void {
    const shown = plots.slice(0, open).map((p) => ({ crop: p.crop, growth: Math.round(p.growth * 10) / 10 }));
    const key = JSON.stringify(shown);
    if (!this.l || key === this.key) return;
    this.key = key;
    this.plots = shown;
    this.draw();
  }

  private draw(): void {
    const { w, horizon: hz, scale: s } = this.l;
    const g = this.g.clear();
    this.plots.forEach((p, i) => {
      if (!p.crop) return;
      const look = CROPS[p.crop].look;
      const x0 = w * (0.22 + i * 0.19);
      const x1 = x0 + w * 0.16;
      const grow = 0.25 + p.growth * 0.75;
      const rnd = seededRandom(61 + i);
      const n = Math.round(((x1 - x0) / (3.2 * s)) * grow);
      for (let k = 0; k < n; k++) {
        const x = x0 + rnd() * (x1 - x0);
        const base = hz + 1 * s;
        const lean = (rnd() - 0.5) * 3 * s;
        if (look.style === 'ribbon') {
          // Eelgrass: ribbons lying on the water just off the bank.
          const y = hz + (2 + rnd() * 6) * s;
          g.moveTo(x, y).quadraticCurveTo(x + 3 * s, y - 1 * s, x + 7 * s * grow, y + 0.5 * s).stroke({ width: 1.1 * s, color: k % 2 ? look.stalk : look.head });
          continue;
        }
        if (look.style === 'bush') {
          g.ellipse(x, base - 2.5 * s * grow, 3 * s * grow, 2.2 * s * grow).fill(k % 3 ? look.stalk : look.head);
          continue;
        }
        const h = (look.style === 'tall' ? 12 + rnd() * 6 : 5 + rnd() * 5) * s * grow;
        g.moveTo(x, base).quadraticCurveTo(x + lean * 0.3, base - h * 0.6, x + lean, base - h).stroke({ width: (look.style === 'tall' ? 1.4 : 0.9) * s, color: look.stalk });
        if (p.growth < 0.4) continue;
        if (look.style === 'droop') g.moveTo(x + lean, base - h).quadraticCurveTo(x + lean + 2 * s, base - h - 1 * s, x + lean + 3 * s, base - h + 2.5 * s).stroke({ width: 1.4 * s, color: look.head });
        else if (look.style === 'tall') g.ellipse(x + lean + 1 * s, base - h * 0.6, 1.2 * s, 2.6 * s).fill(look.head);
        else g.ellipse(x + lean, base - h, 1.1 * s, 2 * s).fill(look.head);
      }
    });
  }

  update(f: FrameContext): void {
    this.g.tint = lerpColor(f.sky.light, f.sky.nearLand, 0.2);
  }
}

export class TimberLayer implements Layer {
  readonly view = new Container();
  readonly reflection = new Container();
  private readonly g = new Graphics();
  private readonly refl: Graphics;
  private l!: SceneLayout;
  private level = -1;
  /** A whole flooded stand across the water (the Flooded Timber ground). */
  stand = false;

  constructor() {
    this.view.addChild(this.g);
    this.refl = new Graphics(this.g.context);
    this.reflection.addChild(this.refl);
  }

  layout(l: SceneLayout): void {
    this.l = l;
    this.level = -1;
  }

  setLevel(level: number): void {
    if (this.l && level !== this.level) {
      this.level = level;
      this.draw();
    }
  }

  private draw(): void {
    const l = this.l;
    const { w, h, horizon: hz, scale: s } = l;
    const g = this.g.clear();
    const rnd = seededRandom(97);
    const n = this.stand ? 14 + this.level * 3 : this.level * 2;
    const waterH = h - hz;
    const x0 = this.stand ? -w * 0.02 : Math.max(l.anchors.lodge.x + 40 * s, w * 0.28);
    const x1 = this.stand ? w * 1.02 : w * 0.44;
    const trees: { x: number; y: number; ht: number }[] = [];
    for (let i = 0; i < n; i++) {
      let x = x0 + rnd() * (x1 - x0);
      // Keep the open hole around the decoys clear.
      const dc = l.anchors.decoyCenter;
      const gap = l.anchors.decoySpread * 0.35;
      if (this.stand && Math.abs(x - dc.x) < gap) x = x < dc.x ? x - gap : x + gap;
      trees.push({ x, y: hz + waterH * (0.03 + rnd() * (this.stand ? 0.22 : 0.16)), ht: (40 + rnd() * (this.stand ? 70 : 50)) * s });
    }
    trees.sort((a, b) => a.y - b.y);
    for (const t of trees) {
      const k = 0.5 + ((t.y - hz) / waterH) * 1.2;
      const ht = t.ht * k;
      const tw = 2.4 * s * k;
      // Trunk with a lighter sunward side, flared at the waterline
      g.moveTo(t.x - tw * 1.8, t.y)
        .quadraticCurveTo(t.x - tw * 0.5, t.y - ht * 0.08, t.x - tw * 0.5, t.y - ht * 0.3)
        .lineTo(t.x - tw * 0.25, t.y - ht)
        .lineTo(t.x + tw * 0.25, t.y - ht)
        .lineTo(t.x + tw * 0.5, t.y - ht * 0.3)
        .quadraticCurveTo(t.x + tw * 0.5, t.y - ht * 0.08, t.x + tw * 1.8, t.y)
        .closePath()
        .fill(0x4a3c30);
      g.rect(t.x + tw * 0.05, t.y - ht * 0.95, tw * 0.3, ht * 0.9).fill({ color: 0x7a6a58, alpha: 0.6 });
      // Bare branches
      for (let b = 0; b < 3; b++) {
        const by = t.y - ht * (0.55 + b * 0.14);
        const dir = b % 2 ? 1 : -1;
        g.moveTo(t.x, by).quadraticCurveTo(t.x + dir * 6 * s * k, by - 4 * s * k, t.x + dir * (9 + rnd() * 6) * s * k, by - (8 + rnd() * 6) * s * k)
          .stroke({ width: 1.2 * s * k, color: 0x4a3c30 });
      }
      // Water ring
      g.ellipse(t.x, t.y, tw * 3, tw * 0.7).stroke({ width: 0.8 * s, color: 0xffffff, alpha: 0.35 });
    }
    // Reflection: mirror around the waterline of the nearest tree row (approx).
    this.refl.scale.y = -0.6;
    this.refl.y = (hz + waterH * 0.12) * 1.6;
  }

  update(f: FrameContext): void {
    this.g.tint = f.sky.light;
    this.refl.tint = lerpColor(shadeColor(f.sky.light, 0.45), f.sky.waterTop, 0.5);
    this.refl.alpha = 0.3;
  }
}
