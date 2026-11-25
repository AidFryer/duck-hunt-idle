import { Container } from 'pixi.js';
import { TextureLibrary } from './assets/TextureLibrary';
import { BlindLayer } from './layers/BlindLayer';
import { CloudLayer } from './layers/CloudLayer';
import { CrewLayer } from './layers/CrewLayer';
import { DuckLayer } from './layers/DuckLayer';
import { EffectsLayer } from './layers/EffectsLayer';
import { FogLayer } from './layers/FogLayer';
import { LandLayer } from './layers/LandLayer';
import { OverlayLayer } from './layers/OverlayLayer';
import { ReedLayer, type ReedClump } from './layers/ReedLayer';
import { ShoreLayer } from './layers/ShoreLayer';
import { SkyLayer } from './layers/SkyLayer';
import { WaterLayer } from './layers/WaterLayer';
import type { SimEvent } from '../sim/events';
import type { GameState } from '../sim/state';
import type { FrameContext, Layer, Point, SceneLayout } from './types';

/**
 * Composes every layer of the marsh in back-to-front order and owns the
 * shared layout. Reads nothing from the DOM; the Renderer feeds it frames.
 */
export class MarshScene {
  readonly root = new Container();
  readonly tex = new TextureLibrary();
  readonly sky: SkyLayer;
  readonly water: WaterLayer;
  readonly ducks: DuckLayer;
  readonly fx: EffectsLayer;
  readonly blind: BlindLayer;
  readonly crew: CrewLayer;
  private readonly layers: Layer[];
  private readonly layoutOrder: Layer[];
  layout: SceneLayout = {
    w: 1, h: 1, horizon: 1, scale: 1,
    anchors: {
      chimney: { x: 0, y: 0 }, mug: { x: 0, y: 0 }, decoyCenter: { x: 0, y: 0 },
      decoySpread: 100, blind: { x: 0, y: 0 }, lodge: { x: 0, y: 0 }, crew: { x: 0, y: 0 },
      porch: { x: 0, y: 0 }, woodpile: { x: 0, y: 0 }, lodgeScale: 1,
    },
  };

  constructor() {
    const tex = this.tex;
    this.sky = new SkyLayer(tex);
    const clouds = new CloudLayer(tex);
    const farFog = new FogLayer(tex, [{ at: -0.02, speed: 6, alpha: 0.85, height: 0.6 }]);
    const land = new LandLayer();
    this.water = new WaterLayer(tex);
    this.fx = new EffectsLayer(tex);
    const shore = new ShoreLayer(tex);
    const blind = (this.blind = new BlindLayer(tex, this.fx));
    const midReeds = new ReedLayer(tex, 21, midReedClumps, 0.9);
    this.ducks = new DuckLayer(tex, this.fx);
    this.crew = new CrewLayer(tex, this.fx, this.ducks);
    const nearFog = new FogLayer(tex, [
      { at: 0.16, speed: 10, alpha: 0.6, height: 0.55 },
      { at: 0.55, speed: 16, alpha: 0.32, height: 0.7 },
    ]);
    const fgReeds = new ReedLayer(tex, 77, foregroundClumps, 0.62);
    const overlay = new OverlayLayer(tex);

    // Reflections live inside the water, under shimmer and ripples.
    this.water.reflections.addChild(land.reflection, shore.reflection, blind.reflection, this.crew.reflection);
    this.water.surface.addChild(this.fx.rippleView);

    // Back-to-front draw order.
    this.layers = [
      this.sky, clouds, farFog, land, this.water, shore, midReeds, blind,
      this.ducks, this.crew, nearFog, this.fx, fgReeds, overlay,
    ];
    for (const layer of this.layers) this.root.addChild(layer.view);
    // Anchors flow forward: shore & blind publish positions the reeds use.
    this.layoutOrder = [
      this.sky, clouds, farFog, land, this.water, shore, blind, this.crew, midReeds,
      this.ducks, nearFog, this.fx, fgReeds, overlay,
    ];
  }

  resize(w: number, h: number): void {
    const l = this.layout;
    l.w = w;
    l.h = h;
    l.horizon = Math.round(h * (w / h < 1 ? 0.46 : 0.52));
    l.scale = Math.max(0.45, Math.min(h, w * 0.8) / 520);
    for (const layer of this.layoutOrder) layer.layout(l);
  }

  /**
   * Play the animation for one sim event. Returns a screen point where the
   * HUD can show feedback (e.g. "+5 coins"), or null.
   */
  handle(e: SimEvent): Point | null {
    switch (e.type) {
      case 'decoySet':
        this.blind.tossDecoy(this.crew.decoyFrom(e.source));
        return null;
      case 'decoyDrift':
        this.blind.driftDecoy();
        return null;
      case 'flockArrived':
        this.ducks.arrive(e.flockId, e.size);
        return null;
      case 'flockPassed':
        this.ducks.spawnFlyover(Math.min(e.size, 6), 0.35, true);
        return null;
      case 'flockCalled':
        this.ducks.call(e.flockId);
        return this.crew.call(e.source);
      case 'flockLeft':
        return this.ducks.leave(e.flockId);
      case 'flockFlared':
        return this.ducks.flare(e.flockId);
      case 'shot': {
        const p = this.crew.shoot(e.source);
        this.ducks.shoot(e.flockId, e.downed);
        return p;
      }
      case 'retrieved':
        return this.crew.retrieve(e.source);
      case 'logged':
        return this.crew.logged(e.source);
      case 'scouted':
        this.crew.scouted(e.source);
        return null;
      case 'problem':
        return this.crew.problem(e.bot);
      case 'problemRetry':
        this.crew.retry(e.bot);
        return null;
      case 'problemFixed':
        return this.crew.fixed(e.bot);
      case 'problemEscalated':
        return this.crew.problem(e.bot);
      case 'botMoved':
        return null;
      case 'botBought':
        this.crew.botBought(e.bot, e.owned, e.count);
        return this.layout.anchors.crew;
      case 'botLevel':
        this.crew.celebrate(e.bot, false);
        return this.layout.anchors.crew;
      case 'botMilestone':
        this.crew.celebrate(e.bot, true);
        return this.layout.anchors.crew;
      case 'acreRestored':
        this.fx.confetti(this.layout.anchors.decoyCenter.x, this.layout.anchors.decoyCenter.y, this.layout.scale);
        return this.layout.anchors.decoyCenter;
      case 'dayEnded':
        return null;
    }
  }

  /** Bring visuals in line with the sim (on load and every frame, cheaply). */
  sync(state: GameState): void {
    this.blind.reconcile(state.hunt.decoys);
    this.ducks.reconcile(state);
    this.crew.sync(state);
  }

  update(f: Omit<FrameContext, 'layout'>): void {
    const frame = f as FrameContext;
    frame.layout = this.layout;
    // Sun/moon x feed the water's light path.
    this.water.sunX = this.sky.celestialPos(f.sky.sunProgress, 0).x;
    this.water.moonX = this.sky.celestialPos(f.sky.moonProgress, 0).x;
    for (const layer of this.layers) layer.update(frame);
  }
}

/** Reeds along the far bank, around the blind and beside the lodge bank. */
function midReedClumps(l: SceneLayout): ReedClump[] {
  const { w, h, horizon: hz, scale: s } = l;
  const waterH = h - hz;
  const b = l.anchors.blind;
  const clumps: ReedClump[] = [
    { x: b.x - 40 * s, y: b.y + 4 * s, spread: 50 * s, count: 16, height: 46 * s, cattails: 0.3 },
    { x: b.x + 46 * s, y: b.y + 2 * s, spread: 40 * s, count: 12, height: 40 * s, cattails: 0.25 },
    { x: l.anchors.lodge.x + 60 * s, y: hz + waterH * 0.16, spread: 60 * s, count: 14, height: 34 * s, cattails: 0.3 },
  ];
  for (let x = w * 0.45; x < w; x += 90 * s) {
    clumps.push({ x, y: hz + 2 * s, spread: 40 * s, count: 7, height: 20 * s, cattails: 0.2 });
  }
  return clumps;
}

/** Big, dark reeds framing the bottom corners of the scene. */
function foregroundClumps(l: SceneLayout): ReedClump[] {
  const { w, h, scale: s } = l;
  const tall = Math.min(h * 0.42, 230 * s);
  return [
    { x: 0, y: h + 6, spread: 110 * s, count: 22, height: tall, cattails: 0.25 },
    { x: 70 * s, y: h + 6, spread: 70 * s, count: 10, height: tall * 0.7, cattails: 0.2 },
    { x: w, y: h + 6, spread: 120 * s, count: 22, height: tall * 1.05, cattails: 0.3 },
    { x: w - 80 * s, y: h + 6, spread: 60 * s, count: 9, height: tall * 0.6, cattails: 0.2 },
  ];
}
