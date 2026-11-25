import { Container, Sprite } from 'pixi.js';
import { lerpColor } from '../../util/color';
import { seededRandom } from '../../util/math';
import type { TextureLibrary } from '../assets/TextureLibrary';
import type { FrameContext, Layer, SceneLayout } from '../types';

interface Cloud {
  s: Sprite;
  depth: number; // 0 far … 1 near
  nx: number;
  ny: number;
  size: number;
}

/** Soft clouds drifting with the wind at two depths (parallax). */
export class CloudLayer implements Layer {
  readonly view = new Container();
  private readonly clouds: Cloud[] = [];
  private l!: SceneLayout;

  constructor(tex: TextureLibrary) {
    const rnd = seededRandom(88);
    for (let i = 0; i < 9; i++) {
      const s = new Sprite(tex.get(`cloud${i % 4}`));
      s.anchor.set(0.5, 1);
      const depth = i < 4 ? 0.2 + rnd() * 0.2 : 0.6 + rnd() * 0.4;
      this.clouds.push({ s, depth, nx: rnd(), ny: 0.1 + rnd() * 0.55, size: 0.6 + rnd() * 0.6 });
    }
    this.clouds.sort((a, b) => a.depth - b.depth);
    for (const c of this.clouds) this.view.addChild(c.s);
  }

  layout(l: SceneLayout): void {
    this.l = l;
    for (const c of this.clouds) {
      c.s.scale.set(l.scale * c.size * (0.55 + c.depth * 0.7));
      c.s.y = l.horizon * (0.18 + c.ny * 0.62) * (1 - c.depth * 0.15);
    }
  }

  update(f: FrameContext): void {
    const l = this.l;
    const span = l.w + 340 * l.scale;
    const speed = (4 + f.wind * 14) * l.scale * f.motion;
    for (const c of this.clouds) {
      c.nx += (speed * (0.35 + c.depth * 0.9) * f.dt) / span;
      if (c.nx > 1) c.nx -= 1;
      c.s.x = c.nx * span - 170 * l.scale;
      // Far clouds take on more horizon haze.
      c.s.tint = lerpColor(f.sky.cloud, f.sky.skyMid, (1 - c.depth) * 0.35);
      c.s.alpha = 0.55 + c.depth * 0.35;
    }
  }
}
