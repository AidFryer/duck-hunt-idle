import { Container } from 'pixi.js';
import { TextureLibrary } from './assets/TextureLibrary';
import { BlindLayer } from './layers/BlindLayer';
import { CloudLayer } from './layers/CloudLayer';
import { CrewLayer } from './layers/CrewLayer';
import { DuckLayer } from './layers/DuckLayer';
import { HintLayer, chooseHint } from './layers/HintLayer';
import type { Floater } from './layers/DuckLayer';
import { FIELD_BOTS, type GroundId, type HuntStage } from '../data/economy';
import { EffectsLayer } from './layers/EffectsLayer';
import { FogLayer } from './layers/FogLayer';
import { LandLayer } from './layers/LandLayer';
import { OverlayLayer } from './layers/OverlayLayer';
import { ReedLayer, type ReedClump } from './layers/ReedLayer';
import { ShoreLayer } from './layers/ShoreLayer';
import { PropsLayer } from './layers/PropsLayer';
import { SkyLayer } from './layers/SkyLayer';
import { WaterLayer } from './layers/WaterLayer';
import { WeatherLayer } from './layers/WeatherLayer';
import { PlotsLayer, TimberLayer } from './layers/MarshUpgradeLayer';
import { WEATHER } from '../data/weather';
import { FLYWAYS, type FlywayId } from '../data/flyways';
import { lerpColor } from '../util/color';
import type { SimEvent } from '../sim/events';
import type { GameState } from '../sim/state';
import type { FrameContext, Layer, Point, SceneLayout } from './types';

/** What a tap on the marsh means. */
export interface TapTarget {
  /** Which hunt step, on which ground (the marsh unless it says field). */
  job: Exclude<HuntStage, 'log'> | null;
  ground?: GroundId;
  flockId?: number;
  floater?: Floater;
  at: Point;
}

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
  readonly weather: WeatherLayer;
  readonly hint: HintLayer;
  private readonly shore: ShoreLayer;
  private readonly props: PropsLayer;
  /** Show words next to the hint ring (new players). */
  hintLabels = true;
  private readonly clouds: CloudLayer;
  private readonly fogs: FogLayer[];
  private readonly plots: PlotsLayer;
  private readonly timber: TimberLayer;
  private readonly land: LandLayer;
  /** Current flyway; changing it re-lays out the scene. */
  flyway: FlywayId = 'mississippi';
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
    const clouds = (this.clouds = new CloudLayer(tex));
    const farFog = new FogLayer(tex, [{ at: -0.02, speed: 6, alpha: 0.6, height: 0.5 }]);
    const land = (this.land = new LandLayer());
    this.water = new WaterLayer(tex);
    this.fx = new EffectsLayer(tex);
    const shore = (this.shore = new ShoreLayer(tex));
    this.props = new PropsLayer(tex);
    const blind = (this.blind = new BlindLayer(tex, this.fx));
    const midReeds = new ReedLayer(tex, 21, midReedClumps, 0.9);
    this.ducks = new DuckLayer(tex, this.fx);
    this.crew = new CrewLayer(tex, this.fx, this.ducks);
    const nearFog = new FogLayer(tex, [
      { at: 0.16, speed: 10, alpha: 0.4, height: 0.5 },
      { at: 0.55, speed: 16, alpha: 0.2, height: 0.6 },
    ]);
    const fgReeds = new ReedLayer(tex, 77, foregroundClumps, 0.62);
    this.weather = new WeatherLayer(tex, this.fx);
    this.plots = new PlotsLayer();
    this.timber = new TimberLayer();
    this.fogs = [farFog, nearFog];
    const overlay = new OverlayLayer(tex);

    // Reflections live inside the water, under shimmer and ripples.
    this.water.reflections.addChild(land.reflection, this.timber.reflection, shore.reflection, this.props.reflection, blind.reflection, this.crew.reflection);
    this.water.surface.addChild(this.fx.rippleView);

    // Back-to-front draw order.
    this.hint = new HintLayer(this.ducks);
    this.layers = [
      this.sky, clouds, farFog, land, this.water, this.plots, shore, this.timber, this.props, midReeds, blind,
      this.ducks, this.crew, nearFog, this.fx, fgReeds, this.weather, this.hint, overlay,
    ];
    for (const layer of this.layers) this.root.addChild(layer.view);
    // Anchors flow forward: shore & blind publish positions the reeds use.
    this.layoutOrder = [
      this.sky, clouds, farFog, land, this.water, this.plots, shore, this.timber, blind, this.crew, this.props, midReeds,
      this.ducks, nearFog, this.fx, fgReeds, this.weather, this.hint, overlay,
    ];
  }

  /** Turn a tap at screen (x, y) into a hunt action. */
  pick(x: number, y: number): TapTarget {
    const p = this.ducks.pick(x, y);
    if (p?.kind === 'flock') return { job: p.called ? 'shoot' : 'call', flockId: p.id, at: p.at };
    if (p?.kind === 'floater') return { job: 'retrieve', floater: p.floater, at: p.at };
    if (y < this.layout.horizon) {
      const n = this.ducks.nearestFlock(x, y, 70 * this.layout.scale);
      if (n?.kind === 'flock') return { job: n.called ? 'shoot' : 'call', flockId: n.id, at: n.at };
      return { job: null, at: { x, y } };
    }
    const s = this.layout.scale;
    const low = this.ducks.nearestFlock(x, y, 60 * s);
    if (low?.kind === 'flock' && low.called) return { job: 'shoot', flockId: low.id, at: low.at };
    const bird = this.ducks.nearestFloater(x, y, 70 * s);
    if (bird) return { job: 'retrieve', floater: bird, at: { x: bird.x, y: bird.y } };
    return { job: 'decoys', at: { x, y } };
  }

  resize(w: number, h: number): void {
    const l = this.layout;
    l.w = w;
    l.h = h;
    const fh = FLYWAYS[this.flyway].horizon;
    l.horizon = Math.round(h * (w / h < 1 ? fh - 0.06 : fh));
    this.land.land = FLYWAYS[this.flyway].land;
    l.scale = Math.max(0.45, Math.min(h, w * 0.8) / 520);
    for (const layer of this.layoutOrder) layer.layout(l);
  }

  /**
   * Play the animation for one sim event. Returns a screen point where the
   * HUD can show feedback (e.g. "+5 coins"), or null.
   */
  handle(e: SimEvent): Point | null {
    // Field crew live in the goose field scene; the marsh ignores them.
    if ('bot' in e && FIELD_BOTS.includes(e.bot)) return null;
    if ('ground' in e && e.ground === 'field') return null;
    switch (e.type) {
      case 'decoySet':
        this.blind.tossDecoy(this.crew.decoyFrom(e.source));
        return null;
      case 'decoyDrift':
        this.blind.driftDecoy();
        return null;
      case 'flockArrived':
        this.ducks.arrive(e.flockId, e.size, e.species, !!e.golden);
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
      case 'weatherChanged':
      case 'newSpecies':
      case 'achievement':
      case 'workflowChanged':
      case 'featureUnlocked':
      case 'perkBought':
      case 'flockReturned':
      case 'streak':
      case 'dailyBonus':
      case 'planEarned':
      case 'goldenShot':
        return null;
      case 'lodgeBuilt': {
        const a = this.layout.anchors.lodge;
        this.fx.confetti(a.x, a.y - 30 * this.layout.scale, this.layout.scale * 1.3, 60);
        return { x: a.x, y: a.y - 40 * this.layout.scale };
      }
      case 'rungBuilt': {
        const a = this.layout.anchors.blind;
        this.fx.confetti(a.x, a.y - 20 * this.layout.scale, this.layout.scale);
        return a;
      }
      case 'seasonClosed':
        this.fx.confetti(this.layout.w / 2, this.layout.h * 0.4, this.layout.scale * 1.3, 60);
        return { x: this.layout.w / 2, y: this.layout.h * 0.4 };
      case 'upgradeBought': {
        const a = this.layout.anchors;
        const at = e.upgrade === 'timber' ? { x: a.lodge.x + 80 * this.layout.scale, y: a.decoyCenter.y - 40 * this.layout.scale }
          : e.upgrade === 'rice' || e.upgrade === 'millet' ? { x: this.layout.w * (e.upgrade === 'rice' ? 0.75 : 0.35), y: this.layout.horizon }
          : e.upgrade === 'lodgeRooms' || e.upgrade === 'cot' ? a.lodge
          : e.upgrade === 'coffee' || e.upgrade === 'blinds' ? a.blind
          : a.decoyCenter;
        this.fx.confetti(at.x, at.y, this.layout.scale);
        return at;
      }
    }
  }

  /** Bring visuals in line with the sim (on load and every frame, cheaply). */
  sync(state: GameState): void {
    this.blind.reconcile(state.hunt.decoys);
    this.ducks.reconcile(state);
    if (state.flyway !== this.flyway) {
      this.flyway = state.flyway;
      this.resize(this.layout.w, this.layout.h);
    }
    this.crew.sync(state);
    this.shore.setLevel(state.lodge);
    this.props.sync(state);
    this.hint.target = chooseHint(state, 'marsh', this.ducks, this.hintLabels);
    const w = state.environment.weather;
    this.weather.weather = w;
    for (const f of this.fogs) f.weatherFog = WEATHER[w].fog;
    this.plots.setLevels(state.upgrades.rice ?? 0, state.upgrades.millet ?? 0);
    this.timber.setLevel(state.upgrades.timber ?? 0);
    this.fx.steamBoost = 1 + (state.upgrades.coffee ?? 0) * 0.35;
  }

  update(f: Omit<FrameContext, 'layout'>): void {
    const frame = f as FrameContext;
    frame.layout = this.layout;
    // Sun/moon x feed the water's light path.
    this.water.sunX = this.sky.celestialPos(f.sky.sunProgress, 0).x;
    this.water.moonX = this.sky.celestialPos(f.sky.moonProgress, 0).x;
    this.clouds.overcast = this.weather.overcast;
    const fw = FLYWAYS[this.flyway];
    if (fw.tintAmount > 0) {
      f.sky.farLand = lerpColor(f.sky.farLand, fw.farLandTint, fw.tintAmount * (1 - f.sky.darkness * 0.7));
      f.sky.nearLand = lerpColor(f.sky.nearLand, fw.nearLandTint, fw.tintAmount * (1 - f.sky.darkness * 0.7));
    }
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
