import { Container, Graphics } from 'pixi.js';
import { lerpColor } from '../../util/color';
import { seededRandom, valueNoise1D } from '../../util/math';
import type { FrameContext, Layer, SceneLayout } from '../types';

/**
 * Distant land: a hazy far treeline and a nearer bayou line of cypress
 * trees draped in moss. Drawn white and tinted each frame from the sky
 * palette, so the day cycle recolors them for free.
 *
 * `reflection` is meant to be placed inside the water layer.
 */
export class LandLayer implements Layer {
  readonly view = new Container();
  readonly reflection = new Container();
  private readonly far = new Graphics();
  private readonly near = new Graphics();
  private readonly shore = new Graphics();
  private readonly farRefl: Graphics;
  private readonly nearRefl: Graphics;
  /** Windmill wheel (prairie only), spun by the wind. */
  private readonly wheel = new Graphics();
  private readonly wheelRefl: Graphics;
  /** Which kind of country this flyway is. */
  land: 'bayou' | 'prairie' | 'coast' | 'saltmarsh' = 'bayou';
  private spin = 0;

  constructor() {
    this.view.addChild(this.far, this.near, this.wheel, this.shore);
    this.farRefl = new Graphics(this.far.context);
    this.nearRefl = new Graphics(this.near.context);
    this.wheelRefl = new Graphics(this.wheel.context);
    this.reflection.addChild(this.farRefl, this.nearRefl, this.wheelRefl);
  }

  layout(l: SceneLayout): void {
    const { w, horizon: hz, scale: s } = l;
    const rnd = seededRandom(7);
    this.wheel.visible = this.wheelRefl.visible = this.land === 'prairie';
    if (this.land === 'prairie') {
      this.layoutPrairie(l);
      return;
    }
    if (this.land === 'coast') {
      this.layoutCoast(l);
      return;
    }
    if (this.land === 'saltmarsh') {
      this.layoutSaltmarsh(l);
      return;
    }

    // Far treeline: soft rounded crowns.
    const far = this.far.clear();
    far.rect(0, hz - 6 * s, w, 8 * s).fill(0xffffff);
    for (let x = -20; x < w + 20; x += 9 * s) {
      const n = valueNoise1D(x / (90 * s), 3);
      const r = (8 + n * 16 + rnd() * 5) * s;
      far.circle(x, hz - r * 0.8 - n * 14 * s, r).fill(0xffffff);
    }

    // Near treeline: bald cypress silhouettes with moss, plus scrub.
    const near = this.near.clear();
    near.rect(0, hz - 4 * s, w, 5 * s).fill(0xffffff);
    for (let x = -10; x < w + 10; x += 6 * s) {
      const r = (4 + rnd() * 6) * s;
      near.circle(x, hz - r * 0.5, r).fill(0xffffff);
    }
    let x = rnd() * 30 * s;
    while (x < w + 40) {
      const height = (46 + rnd() * 60) * s * (0.7 + valueNoise1D(x / (120 * s), 11) * 0.6);
      drawCypress(near, x, hz, height, s, rnd);
      x += (26 + rnd() * 46) * s;
    }

    // Shoreline lip.
    const shore = this.shore.clear();
    shore.rect(0, hz - 1, w, 3 * s).fill({ color: 0xffffff, alpha: 0.9 });

    this.farRefl.scale.y = -0.65;
    this.farRefl.y = hz * (1 + 0.65);
    this.nearRefl.scale.y = -0.7;
    this.nearRefl.y = hz * (1 + 0.7);
  }

  /** Central Flyway: rolling prairie, cottonwoods and a windmill on the rise. */
  private layoutPrairie(l: SceneLayout): void {
    const { w, horizon: hz, scale: s } = l;
    const rnd = seededRandom(21);
    // Far: long, low rolling hills
    const far = this.far.clear();
    far.moveTo(0, hz);
    for (let x = 0; x <= w + 10; x += 8) {
      const y = hz - (16 + Math.sin(x / (170 * s)) * 11 + Math.sin(x / (61 * s) + 1) * 5 + valueNoise1D(x / (40 * s), 5) * 6) * s;
      far.lineTo(x, y);
    }
    far.lineTo(w + 10, hz).closePath().fill(0xffffff);
    // Near: a grassy rise with tufts
    const near = this.near.clear();
    near.moveTo(0, hz + 1);
    for (let x = 0; x <= w + 10; x += 6) {
      const y = hz - (5 + Math.sin(x / (120 * s) + 2) * 4 + valueNoise1D(x / (25 * s), 9) * 3) * s;
      near.lineTo(x, y);
    }
    near.lineTo(w + 10, hz + 1).closePath().fill(0xffffff);
    for (let x = 0; x < w; x += 3 * s) {
      const h = (2 + rnd() * 5) * s;
      const base = hz - (5 + Math.sin(x / (120 * s) + 2) * 4) * s;
      near.moveTo(x, base).lineTo(x + (rnd() - 0.4) * 2 * s, base - h).stroke({ width: 0.9 * s, color: 0xffffff });
    }
    // Cottonwoods: round, billowy crowns on short trunks
    for (const fx of [0.1, 0.16, 0.42, 0.86, 0.93]) {
      const x = w * fx + (rnd() - 0.5) * 20 * s;
      const th = (26 + rnd() * 18) * s;
      const base = hz - 4 * s;
      near.moveTo(x - 2 * s, base).lineTo(x - 1 * s, base - th).lineTo(x + 1 * s, base - th).lineTo(x + 2.5 * s, base).closePath().fill(0xffffff);
      for (let k = 0; k < 6; k++) {
        const r = (8 + rnd() * 7) * s;
        near.circle(x + (rnd() - 0.5) * 22 * s, base - th - (rnd() * 10 - 2) * s, r).fill(0xffffff);
      }
    }
    // Windmill: a lattice tower with a tail vane
    const mx = w * 0.68;
    const mBase = hz - 6 * s;
    const mh = 62 * s;
    const top = mBase - mh;
    const leg = 8 * s;
    near.moveTo(mx - leg, mBase).lineTo(mx - 1.4 * s, top).stroke({ width: 1.6 * s, color: 0xffffff });
    near.moveTo(mx + leg, mBase).lineTo(mx + 1.4 * s, top).stroke({ width: 1.6 * s, color: 0xffffff });
    for (let i = 1; i < 6; i++) {
      const t = i / 6;
      const y = mBase - mh * t;
      const half = leg * (1 - t) + 1.4 * s * t;
      near.moveTo(mx - half, y).lineTo(mx + half, y).stroke({ width: 0.9 * s, color: 0xffffff });
      if (i < 5) {
        const y2 = mBase - mh * ((i + 1) / 6);
        const half2 = leg * (1 - (i + 1) / 6) + 1.4 * s * ((i + 1) / 6);
        near.moveTo(mx - half, y).lineTo(mx + half2, y2).stroke({ width: 0.7 * s, color: 0xffffff });
      }
    }
    near.rect(mx - 2 * s, top - 3 * s, 4 * s, 4 * s).fill(0xffffff);
    near.moveTo(mx, top - 1 * s).lineTo(mx + 18 * s, top - 2 * s).stroke({ width: 1.2 * s, color: 0xffffff });
    near.poly([mx + 14 * s, top - 7 * s, mx + 22 * s, top - 6 * s, mx + 22 * s, top + 2 * s, mx + 14 * s, top + 1 * s]).fill(0xffffff);
    // Wheel: many thin blades around a hub, drawn at the origin and rotated each frame
    const wheel = this.wheel.clear();
    const R = 13 * s;
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2;
      const a2 = a + 0.13;
      wheel.poly([
        Math.cos(a) * R * 0.25, Math.sin(a) * R * 0.25,
        Math.cos(a) * R, Math.sin(a) * R,
        Math.cos(a2) * R, Math.sin(a2) * R,
        Math.cos(a2) * R * 0.25, Math.sin(a2) * R * 0.25,
      ]).fill(0xffffff);
    }
    wheel.circle(0, 0, R).stroke({ width: 0.8 * s, color: 0xffffff });
    wheel.circle(0, 0, 2.2 * s).fill(0xffffff);
    this.wheel.position.set(mx - 3 * s, top - 1 * s);
    this.wheelRefl.position.set(mx - 3 * s, hz + (hz - (top - 1 * s)) * 0.7);
    this.wheelRefl.scale.y = -0.7;

    const shore = this.shore.clear();
    shore.rect(0, hz - 1, w, 3 * s).fill({ color: 0xffffff, alpha: 0.9 });
    this.farRefl.scale.y = -0.65;
    this.farRefl.y = hz * 1.65;
    this.nearRefl.scale.y = -0.7;
    this.nearRefl.y = hz * 1.7;
  }

  /** Pacific Flyway: snowy peaks over flat rice country, levees and tall poplars. */
  private layoutCoast(l: SceneLayout): void {
    const { w, horizon: hz, scale: s } = l;
    const rnd = seededRandom(33);
    const far = this.far.clear();
    // Jagged mountain range with snowy tops (snow drawn slightly lighter via alpha).
    far.moveTo(0, hz);
    const peaks: [number, number][] = [];
    for (let x = 0; x <= w + 20; x += 18 * s) {
      const n = valueNoise1D(x / (140 * s), 4);
      const y = hz - (30 + n * 70 + rnd() * 10) * s;
      peaks.push([x, y]);
      far.lineTo(x, y);
    }
    far.lineTo(w + 20, hz).closePath().fill(0xffffff);
    for (const [x, y] of peaks) {
      if (y > hz - 70 * s) continue;
      far.poly([x - 7 * s, y + 9 * s, x, y, x + 7 * s, y + 9 * s]).fill({ color: 0xffffff, alpha: 0.55 });
    }
    // Near: flat rice checks with levee lines and rows of poplars.
    const near = this.near.clear();
    near.rect(0, hz - 4 * s, w, 5 * s).fill(0xffffff);
    for (let x = 0; x < w; x += 70 * s) near.rect(x, hz - 6 * s, 30 * s, 2 * s).fill(0xffffff);
    for (const fx of [0.08, 0.11, 0.14, 0.62, 0.65, 0.68, 0.71, 0.9]) {
      const x = w * fx + (rnd() - 0.5) * 6 * s;
      const h = (34 + rnd() * 16) * s;
      near.ellipse(x, hz - 4 * s - h * 0.55, 4.5 * s, h * 0.5).fill(0xffffff);
      near.rect(x - 0.8 * s, hz - 6 * s, 1.6 * s, 4 * s).fill(0xffffff);
    }
    // A barn
    const bx = w * 0.4;
    near.rect(bx, hz - 18 * s, 22 * s, 14 * s).fill(0xffffff);
    near.poly([bx - 2 * s, hz - 17 * s, bx + 11 * s, hz - 27 * s, bx + 24 * s, hz - 17 * s]).fill(0xffffff);
    const shore = this.shore.clear();
    shore.rect(0, hz - 1, w, 3 * s).fill({ color: 0xffffff, alpha: 0.9 });
    this.farRefl.scale.y = -0.5;
    this.farRefl.y = hz * 1.5;
    this.nearRefl.scale.y = -0.7;
    this.nearRefl.y = hz * 1.7;
  }

  /** Atlantic Flyway: flat salt marsh, cedar hammocks, a shack on stilts and a lighthouse. */
  private layoutSaltmarsh(l: SceneLayout): void {
    const { w, horizon: hz, scale: s } = l;
    const rnd = seededRandom(55);
    const far = this.far.clear();
    // Low dune line far off
    far.moveTo(0, hz);
    for (let x = 0; x <= w + 10; x += 8) far.lineTo(x, hz - (4 + valueNoise1D(x / (60 * s), 2) * 6) * s);
    far.lineTo(w + 10, hz).closePath().fill(0xffffff);
    // Lighthouse on the point
    const lx = w * 0.82;
    const base = hz - 4 * s;
    const lh = 58 * s;
    far.poly([lx - 6 * s, base, lx - 3.5 * s, base - lh, lx + 3.5 * s, base - lh, lx + 6 * s, base]).fill(0xffffff);
    far.rect(lx - 5 * s, base - lh - 7 * s, 10 * s, 7 * s).fill(0xffffff);
    far.poly([lx - 6 * s, base - lh - 7 * s, lx, base - lh - 13 * s, lx + 6 * s, base - lh - 7 * s]).fill(0xffffff);
    far.rect(lx - 9 * s, base - 7 * s, 6 * s, 7 * s).fill(0xffffff);
    // Near: spartina flats, cedar hammocks, a shack on stilts
    const near = this.near.clear();
    near.rect(0, hz - 3 * s, w, 4 * s).fill(0xffffff);
    for (let x = 0; x < w; x += 2.5 * s) {
      const h = (2 + rnd() * 4) * s;
      near.moveTo(x, hz - 3 * s).lineTo(x + (rnd() - 0.5) * 2 * s, hz - 3 * s - h).stroke({ width: 0.8 * s, color: 0xffffff });
    }
    for (const fx of [0.05, 0.22, 0.5, 0.58]) {
      const cx = w * fx;
      for (let k = 0; k < 4; k++) {
        const x = cx + (k - 1.5) * 7 * s;
        const h = (14 + rnd() * 12) * s;
        near.poly([x - 5 * s, hz - 3 * s, x, hz - 3 * s - h, x + 5 * s, hz - 3 * s]).fill(0xffffff);
      }
    }
    const sx = w * 0.36;
    for (const dx of [0, 16]) near.rect(sx + dx * s, hz - 10 * s, 1.5 * s, 8 * s).fill(0xffffff);
    near.rect(sx - 2 * s, hz - 20 * s, 21 * s, 10 * s).fill(0xffffff);
    near.poly([sx - 4 * s, hz - 19 * s, sx + 8.5 * s, hz - 27 * s, sx + 21 * s, hz - 19 * s]).fill(0xffffff);
    const shore = this.shore.clear();
    shore.rect(0, hz - 1, w, 3 * s).fill({ color: 0xffffff, alpha: 0.9 });
    this.farRefl.scale.y = -0.6;
    this.farRefl.y = hz * 1.6;
    this.nearRefl.scale.y = -0.7;
    this.nearRefl.y = hz * 1.7;
  }

  update(f: FrameContext): void {
    const { sky } = f;
    if (this.wheel.visible) {
      this.spin += f.dt * (0.6 + f.wind * 4) * f.motion;
      this.wheel.rotation = this.spin;
      this.wheelRefl.rotation = -this.spin;
      this.wheel.tint = sky.nearLand;
      this.wheelRefl.tint = lerpColor(sky.nearLand, sky.waterTop, 0.35);
      this.wheelRefl.alpha = 0.6;
    }
    this.far.tint = sky.farLand;
    this.near.tint = sky.nearLand;
    this.shore.tint = lerpColor(sky.nearLand, sky.waterTop, 0.25);
    this.farRefl.tint = lerpColor(sky.farLand, sky.waterTop, 0.5);
    this.nearRefl.tint = lerpColor(sky.nearLand, sky.waterTop, 0.35);
    this.farRefl.alpha = 0.5;
    this.nearRefl.alpha = 0.6;
  }
}

function drawCypress(g: Graphics, x: number, base: number, h: number, s: number, rnd: () => number): void {
  const trunkW = (2.2 + rnd() * 1.6) * s;
  // Flared buttress trunk
  g.moveTo(x - trunkW * 2.6, base)
    .quadraticCurveTo(x - trunkW * 0.6, base - h * 0.12, x - trunkW * 0.5, base - h * 0.35)
    .lineTo(x - trunkW * 0.3, base - h * 0.92)
    .lineTo(x + trunkW * 0.3, base - h * 0.92)
    .lineTo(x + trunkW * 0.5, base - h * 0.35)
    .quadraticCurveTo(x + trunkW * 0.6, base - h * 0.12, x + trunkW * 2.6, base)
    .closePath()
    .fill(0xffffff);
  // Flat-topped layered canopy
  const tiers = 2 + Math.floor(rnd() * 3);
  for (let i = 0; i < tiers; i++) {
    const ty = base - h * (0.62 + (i / tiers) * 0.38);
    const tw = (14 + rnd() * 14) * s * (1 - i * 0.12);
    const ox = (rnd() - 0.5) * 8 * s;
    const th = (3.5 + rnd() * 2.5) * s;
    g.ellipse(x + ox, ty, tw * 0.8, th).fill(0xffffff);
    const puffs = 3 + Math.floor(rnd() * 3);
    for (let p = 0; p < puffs; p++) {
      const px = x + ox + (rnd() - 0.5) * tw * 1.5;
      const pr = (0.25 + rnd() * 0.25) * tw;
      g.ellipse(px, ty - th * (0.2 + rnd() * 0.6), pr, pr * (0.35 + rnd() * 0.25)).fill(0xffffff);
    }
    // Branch reaching out to the tier
    g.moveTo(x, ty + th * 2).lineTo(x + ox, ty).stroke({ width: 1.1 * s, color: 0xffffff });
    // Spanish moss drapes
    const drapes = 2 + Math.floor(rnd() * 4);
    for (let d = 0; d < drapes; d++) {
      const dx = x + ox + (rnd() - 0.5) * tw * 1.6;
      const len = (6 + rnd() * 14) * s;
      const dw = (1.2 + rnd() * 1.6) * s;
      g.moveTo(dx - dw, ty)
        .quadraticCurveTo(dx - dw * 0.3, ty + len * 0.6, dx, ty + len)
        .quadraticCurveTo(dx + dw * 0.3, ty + len * 0.6, dx + dw, ty)
        .closePath()
        .fill(0xffffff);
    }
  }
  // A couple of branch stubs
  g.moveTo(x, base - h * 0.7).lineTo(x + 10 * s, base - h * 0.78)
    .stroke({ width: 1.2 * s, color: 0xffffff });
  g.moveTo(x, base - h * 0.6).lineTo(x - 9 * s, base - h * 0.67)
    .stroke({ width: 1.2 * s, color: 0xffffff });
}
