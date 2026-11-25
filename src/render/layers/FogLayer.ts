import { Container, TilingSprite } from 'pixi.js';
import { lerpColor } from '../../util/color';
import type { TextureLibrary } from '../assets/TextureLibrary';
import type { FrameContext, Layer, SceneLayout } from '../types';

interface Band {
  s: TilingSprite;
  /** Vertical center as a fraction of the water/sky band. */
  at: number;
  speed: number;
  alpha: number;
  height: number;
}

/** Drifting fog banks at a few depths; thickest at dawn. */
export class FogLayer implements Layer {
  readonly view = new Container();
  private readonly bands: Band[];
  /** Extra fog from weather (Phase 4); 0 = time-of-day only. */
  weatherFog = 0;

  constructor(tex: TextureLibrary, specs: { at: number; speed: number; alpha: number; height: number }[]) {
    this.bands = specs.map((sp) => {
      const s = new TilingSprite({ texture: tex.get('fog'), width: 100, height: 100 });
      s.anchor.set(0, 0.5);
      this.view.addChild(s);
      return { s, ...sp };
    });
  }

  layout(l: SceneLayout): void {
    for (const b of this.bands) {
      const h = b.height * l.scale * 128;
      b.s.width = l.w;
      b.s.height = h;
      b.s.tileScale.set((h / 128) * 1.4, h / 128);
      b.s.y = l.horizon + b.at * (l.h - l.horizon);
    }
  }

  update(f: FrameContext): void {
    const strength = Math.min(1, f.sky.fog + this.weatherFog);
    const color = lerpColor(f.sky.skyLow, 0xffffff, 0.35);
    for (const b of this.bands) {
      b.s.tilePosition.x += (b.speed * (0.4 + f.wind) * f.layout.scale * f.dt) * f.motion;
      b.s.alpha = strength * b.alpha;
      b.s.tint = color;
      b.s.visible = b.s.alpha > 0.01;
    }
  }
}
