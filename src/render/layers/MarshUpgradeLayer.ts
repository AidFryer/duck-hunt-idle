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
  /** Stand details: nest boxes on trunks, and the jon boat once bought. */
  private boxes = 0;
  private jon = false;
  /** Shafts of light through the canopy (redrawn each frame, cheap). */
  private readonly beams = new Graphics();
  /** Things lying on the water (lily pads, stumps, the lodge, the boat): not mirrored. */
  private readonly flat = new Graphics();

  constructor() {
    this.view.addChild(this.beams, this.g, this.flat);
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

  /** The Flooded Timber ground: trees grow with stands, plus nest boxes and the jon boat. */
  setStand(level: number, boxes: number, jon: boolean): void {
    if (this.l && (level !== this.level || boxes !== this.boxes || jon !== this.jon)) {
      this.level = level;
      this.boxes = boxes;
      this.jon = jon;
      this.draw();
    }
  }

  private draw(): void {
    const l = this.l;
    const { w, h, horizon: hz, scale: s } = l;
    const g = this.g.clear();
    const rnd = seededRandom(97);
    const n = this.stand ? Math.min(60, 14 + this.level * 3) : this.level * 2;
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
    this.flat.clear();
    if (this.stand) this.drawStandDetails(g, trees, rnd);
    // Reflection: mirror around the waterline of the nearest tree row (approx).
    this.refl.scale.y = -0.6;
    this.refl.y = (hz + waterH * 0.12) * 1.6;
  }

  /** Nest boxes, lily pads, stumps, a beaver lodge, the jon boat and a woodpecker. */
  private drawStandDetails(g: Graphics, trees: { x: number; y: number; ht: number }[], rnd: () => number): void {
    const l = this.l;
    const { w, h, horizon: hz, scale: s } = l;
    const waterH = h - hz;
    // Nest boxes nailed to the nearer trunks (three per level of Nest Boxes).
    const near = [...trees].sort((a, b) => b.y - a.y);
    for (let i = 0; i < Math.min(near.length, this.boxes * 3); i++) {
      const t = near[i]!;
      const k = 0.5 + ((t.y - hz) / waterH) * 1.2;
      const bx = t.x - 3 * s * k;
      const by = t.y - t.ht * k * 0.45;
      g.rect(bx, by, 6 * s * k, 7 * s * k).fill(0x8a6a48);
      g.poly([bx - 0.8 * s * k, by, bx + 3 * s * k, by - 2.5 * s * k, bx + 6.8 * s * k, by]).fill(0x6a4e34);
      g.circle(bx + 3 * s * k, by + 3 * s * k, 1.2 * s * k).fill(0x2a2018);
    }
    // A woodpecker on one trunk: black and white, red cap.
    const wt = near[Math.min(near.length - 1, 2)];
    if (wt) {
      const k = 0.5 + ((wt.y - hz) / waterH) * 1.2;
      const px = wt.x + 2.4 * s * k;
      const py = wt.y - wt.ht * k * 0.7;
      g.ellipse(px, py, 1.6 * s * k, 3 * s * k).fill(0x1e1a18);
      g.rect(px - 0.4 * s * k, py - 1 * s * k, 1.6 * s * k, 2 * s * k).fill(0xf2ede4);
      g.circle(px + 0.4 * s * k, py - 3 * s * k, 1.2 * s * k).fill(0xb8342a);
    }
    const fg = this.flat;
    // Stumps in the shallows.
    for (let i = 0; i < 4; i++) {
      const x = w * (0.08 + rnd() * 0.84);
      const y = hz + waterH * (0.3 + rnd() * 0.25);
      const k = 0.6 + ((y - hz) / waterH);
      fg.roundRect(x - 4 * s * k, y - 6 * s * k, 8 * s * k, 6 * s * k, 2 * s * k).fill(0x5a4636);
      fg.ellipse(x, y - 6 * s * k, 4 * s * k, 1.6 * s * k).fill(0x9a8060);
      fg.ellipse(x, y, 7 * s * k, 1.6 * s * k).stroke({ width: 0.8 * s, color: 0xffffff, alpha: 0.25 });
    }
    // Lily pads drifting in the near water.
    for (let i = 0; i < 16; i++) {
      const x = w * rnd();
      const y = hz + waterH * (0.45 + rnd() * 0.5);
      const k = 0.6 + ((y - hz) / waterH);
      const r = (4 + rnd() * 4) * s * k;
      const a = rnd() * Math.PI * 2;
      fg.moveTo(x, y).arc(x, y, r, a + 0.35, a + Math.PI * 2 - 0.35).closePath().fill({ color: 0x5f7d45, alpha: 0.9 });
      if (rnd() < 0.25) fg.circle(x + r * 0.3, y - r * 0.2, r * 0.3).fill(0xf3e6ef);
    }
    // A beaver lodge on the far side: a mound of sticks.
    const lx = w * 0.86;
    const ly = hz + waterH * 0.12;
    fg.ellipse(lx, ly, 26 * s, 9 * s).fill(0x5a4632);
    for (let i = 0; i < 12; i++) {
      const a = Math.PI + rnd() * Math.PI;
      const r = 18 * s * rnd();
      const sx = lx + Math.cos(a) * r;
      const sy = ly + Math.sin(a) * r * 0.4;
      fg.moveTo(sx - 6 * s, sy + 1 * s).lineTo(sx + 6 * s, sy - 2 * s).stroke({ width: 1.4 * s, color: 0x3e3024 });
    }
    // The Old Jon Boat, tied to a tree, once you have it.
    if (this.jon && near.length > 4) {
      const t = near[4]!;
      const k = 0.6 + ((t.y - hz) / waterH) * 1.2;
      const bx = t.x + 10 * s * k;
      const by = t.y + 2 * s * k;
      fg.poly([bx - 16 * s * k, by - 4 * s * k, bx + 16 * s * k, by - 4 * s * k, bx + 13 * s * k, by + 1 * s * k, bx - 14 * s * k, by + 1 * s * k]).fill(0x3f5a3a);
      fg.rect(bx - 15 * s * k, by - 5 * s * k, 30 * s * k, 1.4 * s * k).fill(0x6f8a5e);
      fg.moveTo(bx - 14 * s * k, by - 4 * s * k).lineTo(t.x, t.y - 6 * s * k).stroke({ width: 0.8 * s, color: 0xd8c8a8 });
    }
  }

  update(f: FrameContext): void {
    if (this.stand && this.l) {
      // Morning and evening light slanting through the trunks.
      const glow = Math.max(0, 1 - f.sky.darkness) * Math.max(0, 1 - f.sky.sunAltitude) * 0.14;
      const b = this.beams.clear();
      if (glow > 0.01) {
        const { w, horizon: hz, scale: s } = this.l;
        for (let i = 0; i < 5; i++) {
          const x = w * (0.1 + i * 0.2) + Math.sin(f.time * 0.05 + i) * 8 * s;
          b.poly([x, 0, x + 26 * s, 0, x - 40 * s, hz + 40 * s, x - 90 * s, hz + 40 * s]).fill({ color: 0xfff2c8, alpha: glow * (0.6 + 0.4 * ((i * 37) % 5) / 5) });
        }
      }
    }
    this.g.tint = f.sky.light;
    this.flat.tint = f.sky.light;
    this.refl.tint = lerpColor(shadeColor(f.sky.light, 0.45), f.sky.waterTop, 0.5);
    this.refl.alpha = 0.3;
  }
}
