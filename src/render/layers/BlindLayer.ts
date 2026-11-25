import { Container, Sprite } from 'pixi.js';
import { lerpColor, shadeColor } from '../../util/color';
import { seededRandom } from '../../util/math';
import { BLIND_ANCHORS, BLIND_SIZE } from '../assets/painters';
import type { TextureLibrary } from '../assets/TextureLibrary';
import type { EffectsLayer } from './EffectsLayer';
import type { FrameContext, Layer, SceneLayout } from '../types';
import { waterDepthScale } from '../types';

type DecoyMode = 'out' | 'tossing' | 'in' | 'drifting';

interface Decoy {
  s: Sprite;
  refl: Sprite;
  nx: number;
  ny: number;
  phase: number;
  facing: number;
  rippleT: number;
  mode: DecoyMode;
  /** Animation clock for toss / drift. */
  t: number;
  driftX: number;
}

const MAX_DECOY_SLOTS = 12;
const TOSS_TIME = 0.7;
const DRIFT_TIME = 3.5;

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
    for (let i = 0; i < MAX_DECOY_SLOTS; i++) {
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
        mode: 'out',
        t: 0,
        driftX: 0,
      });
      s.visible = refl.visible = false;
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

    // Draw nearer (lower) decoys on top; slot order (toss order) is unchanged.
    this.decoyLayer.removeChildren();
    for (const d of [...this.decoys].sort((a, b) => a.ny - b.ny)) this.decoyLayer.addChild(d.s);
  }

  /** Where tossed decoys fly from (the deck beside the blind). */
  private tossOrigin(): { x: number; y: number } {
    const b = this.l.anchors.blind;
    return { x: b.x - 70 * this.l.scale, y: b.y - 30 * this.l.scale };
  }

  /** Toss the next decoy into the spread. */
  tossDecoy(): void {
    const d = this.decoys.find((x) => x.mode === 'out');
    if (!d) return;
    d.mode = 'tossing';
    d.t = 0;
  }

  /** The most recently set decoy drifts loose and floats away. */
  driftDecoy(): void {
    for (let i = this.decoys.length - 1; i >= 0; i--) {
      const d = this.decoys[i]!;
      if (d.mode === 'in' || d.mode === 'tossing') {
        d.mode = 'drifting';
        d.t = 0;
        d.driftX = 0;
        return;
      }
    }
  }

  /** Match the visible spread to the sim's decoy count. */
  reconcile(count: number): void {
    const set = this.decoys.filter((d) => d.mode === 'in' || d.mode === 'tossing').length;
    if (set < count) {
      for (const d of this.decoys) {
        if (d.mode === 'out' && this.decoys.filter((x) => x.mode === 'in' || x.mode === 'tossing').length < count) {
          d.mode = 'in';
        }
      }
    } else if (set > count) {
      for (let i = 0; i < set - count; i++) this.driftDecoy();
    }
  }

  /** Screen position of the decoy spread's slot `i` (resting). */
  private slotPos(d: Decoy): { x: number; y: number; s: number } {
    const l = this.l;
    const a = l.anchors;
    const y = a.decoyCenter.y + (d.ny - 0.5) * (l.h - l.horizon) * 0.32;
    return { x: a.decoyCenter.x + d.nx * a.decoySpread, y, s: waterDepthScale(l, y) * 0.62 };
  }

  update(f: FrameContext): void {
    const { time, sky, wind } = f;
    const l = this.l;
    const a = l.anchors;
    this.blind.tint = sky.light;
    const reflTint = lerpColor(shadeColor(sky.light, 0.5), sky.waterTop, 0.5);
    this.blindRefl.tint = reflTint;
    this.blindRefl.alpha = 0.35;

    void a;
    for (const d of this.decoys) {
      if (d.mode === 'out') {
        d.s.visible = d.refl.visible = false;
        continue;
      }
      const slot = this.slotPos(d);
      const s = slot.s;
      const bob = Math.sin(time * 1.3 + d.phase) * 1.2 * s * f.motion;
      let x = slot.x + Math.sin(time * 0.2 + d.phase) * 3 * s;
      let y = slot.y + bob;
      let alpha = 1;
      let rot = Math.sin(time * 1.1 + d.phase) * 0.04 * (0.5 + wind) * f.motion;
      let showRefl = true;
      if (d.mode === 'tossing') {
        d.t += f.dt;
        const k = Math.min(1, d.t / TOSS_TIME);
        const o = this.tossOrigin();
        x = o.x + (slot.x - o.x) * k;
        y = o.y + (slot.y - o.y) * k - Math.sin(k * Math.PI) * 50 * l.scale;
        rot = (1 - k) * d.facing * 6;
        showRefl = false;
        if (k >= 1) {
          d.mode = 'in';
          this.fx.splash(slot.x, slot.y, 0.6);
        }
      } else if (d.mode === 'drifting') {
        d.t += f.dt;
        d.driftX += (8 + wind * 25) * l.scale * f.dt;
        x += d.driftX;
        alpha = Math.max(0, 1 - d.t / DRIFT_TIME);
        rot += Math.sin(d.t * 2) * 0.15;
        if (d.t >= DRIFT_TIME) {
          d.mode = 'out';
          d.s.visible = d.refl.visible = false;
          continue;
        }
      }
      d.s.visible = true;
      d.refl.visible = showRefl;
      d.s.position.set(x, y);
      d.s.scale.set(s * d.facing, s);
      d.s.rotation = rot;
      d.s.alpha = alpha;
      d.s.tint = sky.light;
      d.refl.position.set(x, y + 1.5 * s);
      d.refl.scale.set(s * d.facing, -s * 0.6);
      d.refl.tint = reflTint;
      d.refl.alpha = 0.3 * alpha;
      if (d.mode === 'in') {
        d.rippleT -= f.dt;
        if (d.rippleT <= 0) {
          d.rippleT = 3 + Math.random() * 3;
          this.fx.ripple(x, slot.y + 1, 0.55, 2.4);
        }
      }
    }
  }
}
