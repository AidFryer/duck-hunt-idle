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

  constructor() {
    this.view.addChild(this.far, this.near, this.shore);
    this.farRefl = new Graphics(this.far.context);
    this.nearRefl = new Graphics(this.near.context);
    this.reflection.addChild(this.farRefl, this.nearRefl);
  }

  layout(l: SceneLayout): void {
    const { w, horizon: hz, scale: s } = l;
    const rnd = seededRandom(7);

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

  update(f: FrameContext): void {
    const { sky } = f;
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
