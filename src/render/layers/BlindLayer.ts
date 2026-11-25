import { Container, Sprite } from 'pixi.js';
import { lerpColor, shadeColor } from '../../util/color';
import { seededRandom } from '../../util/math';
import { BLIND_ANCHORS, BLIND_SIZE } from '../assets/painters';
import type { TextureLibrary } from '../assets/TextureLibrary';
import type { EffectsLayer } from './EffectsLayer';
import type { FrameContext, Layer, SceneLayout } from '../types';
import { waterDepthScale } from '../types';

interface Decoy {
  s: Sprite;
  refl: Sprite;
  nx: number;
  ny: number;
  phase: number;
  facing: number;
  rippleT: number;
}

/** The duck blind on stilts plus a bobbing spread of wooden decoys. */
export class BlindLayer implements Layer {
  readonly view = new Container();
  readonly reflection = new Container();
  private readonly blind: Sprite;
  private readonly blindRefl: Sprite;
  private readonly decoys: Decoy[] = [];
  private readonly decoyLayer = new Container();
  private l!: SceneLayout;

  constructor(tex: TextureLibrary, private readonly fx: EffectsLayer) {
    this.blind = new Sprite(tex.get('blind'));
    this.blind.anchor.set(0.5, BLIND_SIZE.waterline / BLIND_SIZE.h);
    this.blindRefl = new Sprite(tex.get('blind'));
    this.blindRefl.anchor.copyFrom(this.blind.anchor);
    this.view.addChild(this.decoyLayer, this.blind);
    this.reflection.addChild(this.blindRefl);

    const rnd = seededRandom(404);
    for (let i = 0; i < 7; i++) {
      const s = new Sprite(tex.get(i % 3 === 2 ? 'decoy.hen' : 'decoy.drake'));
      s.anchor.set(0.45, 30 / 34);
      const refl = new Sprite(s.texture);
      refl.anchor.copyFrom(s.anchor);
      this.reflection.addChild(refl);
      this.decoys.push({
        s, refl,
        nx: (rnd() - 0.5) * 2,
        ny: rnd(),
        phase: rnd() * 10,
        facing: rnd() > 0.4 ? 1 : -1,
        rippleT: rnd() * 4,
      });
    }
  }

  layout(l: SceneLayout): void {
    this.l = l;
    const waterH = l.h - l.horizon;
    const bx = l.w * (l.w < 520 ? 0.8 : 0.76);
    const by = l.horizon + waterH * 0.3;
    const bs = waterDepthScale(l, by) * 1.05;
    this.blind.position.set(bx, by);
    this.blind.scale.set(bs);
    this.blindRefl.position.set(bx, by + 2 * l.scale);
    this.blindRefl.scale.set(bs, -bs * 0.7);
    l.anchors.blind = { x: bx, y: by };
    l.anchors.mug = {
      x: bx + (BLIND_ANCHORS.mug.x - BLIND_SIZE.w / 2) * bs,
      y: by + (BLIND_ANCHORS.mug.y - BLIND_SIZE.waterline) * bs,
    };
    l.anchors.decoyCenter = { x: l.w * 0.52, y: l.horizon + waterH * 0.42 };
    l.anchors.decoySpread = Math.min(l.w * 0.22, 220 * l.scale);

    // Sort decoys so nearer (lower) ones draw on top.
    this.decoys.sort((a, b) => a.ny - b.ny);
    this.decoyLayer.removeChildren();
    for (const d of this.decoys) this.decoyLayer.addChild(d.s);
  }

  update(f: FrameContext): void {
    const { time, sky, wind } = f;
    const l = this.l;
    const a = l.anchors;
    this.blind.tint = sky.light;
    const reflTint = lerpColor(shadeColor(sky.light, 0.5), sky.waterTop, 0.5);
    this.blindRefl.tint = reflTint;
    this.blindRefl.alpha = 0.35;

    for (const d of this.decoys) {
      const y0 = a.decoyCenter.y + (d.ny - 0.5) * (l.h - l.horizon) * 0.32;
      const s = waterDepthScale(l, y0) * 0.62;
      const bob = Math.sin(time * 1.3 + d.phase) * 1.2 * s * f.motion;
      const x = a.decoyCenter.x + d.nx * a.decoySpread + Math.sin(time * 0.2 + d.phase) * 3 * s;
      d.s.position.set(x, y0 + bob);
      d.s.scale.set(s * d.facing, s);
      d.s.rotation = Math.sin(time * 1.1 + d.phase) * 0.04 * (0.5 + wind) * f.motion;
      d.s.tint = sky.light;
      d.refl.position.set(x, y0 + bob + 1.5 * s);
      d.refl.scale.set(s * d.facing, -s * 0.6);
      d.refl.tint = reflTint;
      d.refl.alpha = 0.3;
      d.rippleT -= f.dt;
      if (d.rippleT <= 0) {
        d.rippleT = 3 + Math.random() * 3;
        this.fx.ripple(x, y0 + 1, 0.55, 2.4);
      }
    }
  }
}
