import type { Container } from 'pixi.js';
import type { SkyState } from './skyState';

/** Screen-space layout of the scene, recomputed on resize. */
export interface SceneLayout {
  w: number;
  h: number;
  /** y of the far shoreline / horizon. */
  horizon: number;
  /** Overall size multiplier for scene art (1 ≈ a 520px tall scene). */
  scale: number;
  /** y just below the HUD's top bar: flocks you can tap stay below this. */
  skyTop?: number;
  /** Named anchor points layers share (chimney top, decoy spread, …). */
  anchors: SceneAnchors;
}

export interface Point {
  x: number;
  y: number;
}

export interface SceneAnchors {
  chimney: Point;
  mug: Point;
  decoyCenter: Point;
  decoySpread: number;
  blind: Point;
  lodge: Point;
  /** Middle of the crew's dock (for celebrations). */
  crew: Point;
  /** In front of the lodge porch (Ledger Bots work here). */
  porch: Point;
  /** Beside the woodpile (Tinker Bots work here). */
  woodpile: Point;
  /** Scale the lodge is drawn at (shore bots match it). */
  lodgeScale: number;
}

/** Everything a layer needs to draw one frame. */
export interface FrameContext {
  /** Continuous render time in seconds (keeps running while sim is paused). */
  time: number;
  /** Seconds since the last frame (clamped). */
  dt: number;
  sky: SkyState;
  /** Wind 0–1 from the sim. */
  wind: number;
  /** Duck activity 0–1 for the current hour. */
  activity: number;
  /** 0–1 animation intensity (reduced-motion lowers this). */
  motion: number;
  layout: SceneLayout;
}

export interface Layer {
  readonly view: Container;
  layout(l: SceneLayout): void;
  update(f: FrameContext): void;
}

/** Perspective scale for an object sitting on the water at screen y. */
export function waterDepthScale(l: SceneLayout, y: number): number {
  const t = Math.max(0, Math.min(1, (y - l.horizon) / (l.h - l.horizon)));
  return l.scale * (0.42 + t * 0.85);
}
