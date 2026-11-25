import { Container, Sprite } from 'pixi.js';
import { lerpColor, multiplyColor, shadeColor } from '../../util/color';
import { seededRandom } from '../../util/math';
import type { TextureLibrary } from '../assets/TextureLibrary';
import type { FrameContext, Layer, SceneLayout } from '../types';

interface Reed {
  s: Sprite;
  lean: number;
  phase: number;
  freq: number;
  amp: number;
  /** 0 = backlit/dark … 1 = fully lit. */
  shade: number;
}

export interface ReedClump {
  /** x position in screen px. */
  x: number;
  /** Base y in screen px. */
  y: number;
  /** Horizontal spread of the clump in px. */
  spread: number;
  count: number;
  /** Height of the tallest stalks in px. */
  height: number;
  /** Chance each stalk is a cattail instead of a blade. */
  cattails: number;
}

/**
 * A field of reeds and cattails that sway with the wind. Each stalk is a
 * sprite anchored at its base; a traveling sine (offset by x) makes gusts
 * ripple across the field.
 */
export class ReedLayer implements Layer {
  readonly view = new Container();
  private reeds: Reed[] = [];

  constructor(
    private readonly tex: TextureLibrary,
    private readonly seed: number,
    private readonly clumps: (l: SceneLayout) => ReedClump[],
    /** Base brightness of this layer (foreground is darker for depth). */
    private readonly brightness = 1,
  ) {}

  layout(l: SceneLayout): void {
    this.view.removeChildren().forEach((c) => c.destroy());
    this.reeds = [];
    const rnd = seededRandom(this.seed);
    const all: { x: number; y: number; h: number; cattail: boolean; v: number }[] = [];
    for (const c of this.clumps(l)) {
      for (let i = 0; i < c.count; i++) {
        const x = c.x + (rnd() - 0.5) * c.spread;
        const y = c.y + rnd() * c.height * 0.06;
        const h = c.height * (0.45 + rnd() * 0.55);
        all.push({ x, y, h, cattail: rnd() < c.cattails, v: Math.floor(rnd() * 3) });
      }
    }
    all.sort((a, b) => a.y - b.y);
    for (const r of all) {
      const s = new Sprite(this.tex.get(r.cattail ? 'cattail' : `reed${r.v}`));
      s.anchor.set(0.5, 1);
      const natural = s.texture.height;
      const k = r.h / natural;
      s.scale.set(k * (r.cattail ? 1 : 0.9 + rnd() * 0.6), k);
      s.position.set(r.x, r.y);
      this.view.addChild(s);
      this.reeds.push({
        s,
        lean: (rnd() - 0.5) * 0.25,
        phase: rnd() * Math.PI * 2,
        freq: 0.9 + rnd() * 0.8,
        amp: 0.03 + rnd() * 0.04,
        shade: 0.75 + rnd() * 0.25,
      });
    }
  }

  update(f: FrameContext): void {
    const { time, wind, sky } = f;
    const gustLean = wind * 0.12;
    const swayAmp = 0.4 + wind * 1.4;
    const base = shadeColor(sky.light, this.brightness);
    for (const r of this.reeds) {
      const travel = r.s.x * 0.012;
      const sway = Math.sin(time * r.freq * (0.8 + wind) - travel + r.phase) * r.amp * swayAmp;
      const flutter = Math.sin(time * 3.7 + r.phase * 2) * 0.008 * wind;
      r.s.rotation = (r.lean + gustLean + sway + flutter) * f.motion + r.lean * (1 - f.motion);
      r.s.tint = multiplyColor(lerpColor(0xffffff, sky.nearLand, 0.18), shadeColor(base, r.shade));
    }
  }
}
