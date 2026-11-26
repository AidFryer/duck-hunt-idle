import { Container, Graphics } from 'pixi.js';
import { palette } from '../../data/palette';
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
  private levels = { rice: -1, millet: -1 };

  constructor() {
    this.view.addChild(this.g);
  }

  layout(l: SceneLayout): void {
    this.l = l;
    this.levels = { rice: -1, millet: -1 };
  }

  setLevels(rice: number, millet: number): void {
    if (this.l && (rice !== this.levels.rice || millet !== this.levels.millet)) {
      this.levels = { rice, millet };
      this.draw();
    }
  }

  private draw(): void {
    const { w, horizon: hz, scale: s } = this.l;
    const g = this.g.clear();
    const rnd = seededRandom(61);
    const plot = (x0: number, x1: number, level: number, stalk: number, head: number, droop: boolean) => {
      const n = Math.round((x1 - x0) / (3.2 * s) * Math.min(1, level / 3));
      for (let i = 0; i < n; i++) {
        const x = x0 + rnd() * (x1 - x0);
        const h = (5 + rnd() * 5) * s * (0.8 + level * 0.08);
        const base = hz + 1 * s;
        const lean = (rnd() - 0.5) * 3 * s;
        g.moveTo(x, base).quadraticCurveTo(x + lean * 0.3, base - h * 0.6, x + lean, base - h).stroke({ width: 0.9 * s, color: stalk });
        if (droop) g.moveTo(x + lean, base - h).quadraticCurveTo(x + lean + 2 * s, base - h - 1 * s, x + lean + 3 * s, base - h + 2.5 * s).stroke({ width: 1.4 * s, color: head });
        else g.ellipse(x + lean, base - h, 1.1 * s, 2 * s).fill(head);
      }
    };
    if (this.levels.millet > 0) plot(w * 0.22, w * 0.48, this.levels.millet, palette.moss, palette.cattail, false);
    if (this.levels.rice > 0) plot(w * 0.55, w * 0.96, this.levels.rice, palette.reed, 0xe2c26a, true);
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
    const n = this.level * 2;
    const waterH = h - hz;
    const x0 = Math.max(l.anchors.lodge.x + 40 * s, w * 0.28);
    const x1 = w * 0.44;
    const trees: { x: number; y: number; ht: number }[] = [];
    for (let i = 0; i < n; i++) trees.push({ x: x0 + rnd() * (x1 - x0), y: hz + waterH * (0.04 + rnd() * 0.16), ht: (40 + rnd() * 50) * s });
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
