import { Container, Graphics, Sprite } from 'pixi.js';
import { palette } from '../../data/palette';
import { lerpColor, shadeColor } from '../../util/color';
import { clamp, seededRandom } from '../../util/math';
import { LODGE_ANCHORS, LODGE_SIZE } from '../assets/painters';
import type { TextureLibrary } from '../assets/TextureLibrary';
import type { FrameContext, Layer, SceneLayout } from '../types';

/**
 * The lodge's bank on the left: grassy mound, the lodge itself with its
 * dock, warm window light at dusk and a lantern that flickers at night.
 */
export class ShoreLayer implements Layer {
  readonly view = new Container();
  readonly reflection = new Container();
  private readonly lit = new Container();
  private readonly bank = new Graphics();
  private readonly lodge: Sprite;
  private readonly glow: Sprite;
  private readonly lodgeRefl: Sprite;
  private readonly glowRefl: Sprite;
  private readonly bankRefl: Graphics;
  private lodgeScale = 1;

  constructor(tex: TextureLibrary) {
    this.lodge = new Sprite(tex.get('lodge'));
    this.lodge.anchor.set(0, LODGE_SIZE.ground / LODGE_SIZE.h);
    this.glow = new Sprite(tex.get('lodgeGlow'));
    this.glow.anchor.copyFrom(this.lodge.anchor);
    this.glow.blendMode = 'add';
    this.lit.addChild(this.bank, this.lodge);
    this.view.addChild(this.lit, this.glow);

    this.bankRefl = new Graphics(this.bank.context);
    this.lodgeRefl = new Sprite(tex.get('lodge'));
    this.lodgeRefl.anchor.copyFrom(this.lodge.anchor);
    this.glowRefl = new Sprite(tex.get('lodgeGlow'));
    this.glowRefl.anchor.copyFrom(this.lodge.anchor);
    this.glowRefl.blendMode = 'add';
    this.reflection.addChild(this.bankRefl, this.lodgeRefl, this.glowRefl);
  }

  layout(l: SceneLayout): void {
    const { w, h, horizon: hz, scale: s } = l;
    const waterH = h - hz;
    const ground = hz + waterH * 0.13;
    this.lodgeScale = s * (w < 520 ? 0.72 : 0.85);
    const lodgeW = LODGE_SIZE.w * this.lodgeScale;
    const lodgeX = Math.max(6 * s, w * 0.17 - lodgeW * 0.45);

    // Bank mound from the left edge out past the lodge.
    const bankRight = lodgeX + lodgeW * 0.82;
    const g = this.bank.clear();
    g.moveTo(-10, hz - 2 * s)
      .lineTo(lodgeX * 0.4, hz - 6 * s)
      .quadraticCurveTo(lodgeX + lodgeW * 0.3, ground - 10 * s, bankRight - 18 * s, ground - 2 * s)
      .quadraticCurveTo(bankRight + 10 * s, ground + 2 * s, bankRight - 6 * s, ground + 7 * s)
      .quadraticCurveTo(lodgeX, ground + 12 * s, -10, ground + 16 * s)
      .closePath()
      .fill(palette.sageDark);
    // Lighter grass top
    g.moveTo(-10, hz - 2 * s)
      .lineTo(lodgeX * 0.4, hz - 6 * s)
      .quadraticCurveTo(lodgeX + lodgeW * 0.3, ground - 10 * s, bankRight - 18 * s, ground - 2 * s)
      .quadraticCurveTo(lodgeX + lodgeW * 0.3, ground - 4 * s, -10, ground + 2 * s)
      .closePath()
      .fill({ color: palette.sage, alpha: 0.7 });
    // Mud edge
    g.moveTo(bankRight - 6 * s, ground + 7 * s)
      .quadraticCurveTo(lodgeX, ground + 12 * s, -10, ground + 16 * s)
      .stroke({ width: 2.5 * s, color: palette.cattailDark, alpha: 0.8 });
    // Grass tufts
    const rnd = seededRandom(12);
    for (let i = 0; i < 40; i++) {
      const x = rnd() * bankRight;
      const y = hz + (ground - hz) * (0.2 + rnd() * 0.9);
      const len = (3 + rnd() * 5) * s;
      g.moveTo(x, y).lineTo(x + (rnd() - 0.5) * 3 * s, y - len)
        .stroke({ width: 1 * s, color: rnd() > 0.5 ? palette.reedDry : palette.moss });
    }

    this.lodge.position.set(lodgeX, ground);
    this.lodge.scale.set(this.lodgeScale);
    this.glow.position.copyFrom(this.lodge.position);
    this.glow.scale.copyFrom(this.lodge.scale);

    // Mirror around the ground line on the water.
    this.lodgeRefl.position.set(lodgeX, ground + 10 * s);
    this.lodgeRefl.scale.set(this.lodgeScale, -this.lodgeScale * 0.8);
    this.glowRefl.position.copyFrom(this.lodgeRefl.position);
    this.glowRefl.scale.copyFrom(this.lodgeRefl.scale);
    this.bankRefl.scale.y = -0.6;
    this.bankRefl.y = (ground + 14 * s) * 1.6;

    l.anchors.chimney = {
      x: lodgeX + LODGE_ANCHORS.chimneyTop.x * this.lodgeScale,
      y: ground + (LODGE_ANCHORS.chimneyTop.y - LODGE_SIZE.ground) * this.lodgeScale,
    };
    l.anchors.lodge = { x: lodgeX + lodgeW / 2, y: ground };
  }

  update(f: FrameContext): void {
    const { sky, time } = f;
    this.lit.tint = sky.light;
    // Lamps come on as the light fades; a gentle flicker.
    const flicker = 0.92 + 0.08 * Math.sin(time * 7.3) * Math.sin(time * 3.1 + 1);
    this.glow.alpha = clamp(sky.darkness * 1.3 + 0.08, 0, 1) * flicker;
    const reflTint = lerpColor(shadeColor(sky.light, 0.55), sky.waterTop, 0.45);
    this.lodgeRefl.tint = reflTint;
    this.lodgeRefl.alpha = 0.38;
    this.glowRefl.alpha = this.glow.alpha * 0.45;
    this.bankRefl.tint = reflTint;
    this.bankRefl.alpha = 0.35;
  }
}
