import { Container, Sprite, TilingSprite } from 'pixi.js';
import type { TextureLibrary } from '../assets/TextureLibrary';
import type { FrameContext, Layer, SceneLayout } from '../types';

/** Painterly finish: subtle paper grain and a warm vignette. */
export class OverlayLayer implements Layer {
  readonly view = new Container();
  private readonly grain: TilingSprite;
  private readonly vignette: Sprite;

  constructor(tex: TextureLibrary) {
    this.grain = new TilingSprite({ texture: tex.get('grain'), width: 100, height: 100 });
    this.grain.alpha = 0.26;
    this.vignette = new Sprite(tex.get('vignette'));
    this.view.addChild(this.grain, this.vignette);
    this.view.eventMode = 'none';
  }

  layout(l: SceneLayout): void {
    this.grain.width = l.w;
    this.grain.height = l.h;
    this.vignette.width = l.w;
    this.vignette.height = l.h;
  }

  update(_f: FrameContext): void {
    // Static on purpose — a moving grain reads as video noise, not paper.
  }
}
