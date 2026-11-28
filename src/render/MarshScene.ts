import { clockAt } from '../sim/clock';
import { busyMarsh } from '../sim/volley';
import { stageFor } from '../data/calendar';
import { CARVINGS, CARVING_ORDER } from '../data/carvings';
import { Container } from 'pixi.js';
import { TextureLibrary } from './assets/TextureLibrary';
import { BlindLayer } from './layers/BlindLayer';
import { DrifterLayer } from './layers/DrifterLayer';
import { CloudLayer } from './layers/CloudLayer';
import { CrewLayer } from './layers/CrewLayer';
import { SkeinLayer } from './layers/SkeinLayer';
import { DuckLayer } from './layers/DuckLayer';
import { HintLayer, chooseHint } from './layers/HintLayer';
import type { Floater } from './layers/DuckLayer';
import { GROUND_CREW, type GroundId, type HuntStage, type OutpostId } from '../data/economy';
import { ground } from '../sim/hunt';
import { SPECIES, type SpeciesId } from '../data/species';
import { eventGround } from './eventGround';
import { EffectsLayer } from './layers/EffectsLayer';
import { FogLayer } from './layers/FogLayer';
import { LandLayer } from './layers/LandLayer';
import { OverlayLayer } from './layers/OverlayLayer';
import { ReedLayer, type ReedClump } from './layers/ReedLayer';
import { ShoreLayer } from './layers/ShoreLayer';
import { PropsLayer } from './layers/PropsLayer';
import { plotCount } from '../data/crops';
import { LodgeLifeLayer } from './layers/LodgeLifeLayer';
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
  /** The tap fished out a drifting decoy. */
  drifter?: boolean;
  at: Point;
}

/**
 * Composes every layer of the marsh in back-to-front order and owns the
 * shared layout. Reads nothing from the DOM; the Renderer feeds it frames.
 */
/** Blend two colors (0 = a, 1 = b). */
function mixColor(a: number, b: number, k: number): number {
  const ch = (sh: number) => Math.round(((a >> sh) & 0xff) * (1 - k) + ((b >> sh) & 0xff) * k);
  return (ch(16) << 16) | (ch(8) << 8) | ch(0);
}

/** Which ground a MarshScene draws: the home marsh or one of the far grounds. */
export type WaterGround = 'marsh' | OutpostId;

export class MarshScene {
  readonly root = new Container();
  readonly tex: TextureLibrary;
  readonly sky: SkyLayer;
  readonly water: WaterLayer;
  readonly ducks: DuckLayer;
  readonly fx: EffectsLayer;
  readonly blind: BlindLayer;
  readonly crew: CrewLayer;
  private readonly skeins: SkeinLayer;
  /** Called with "+N birds" for a visible shot that stands for many. */
  onTally: ((birds: number, at: Point) => void) | null = null;
  readonly weather: WeatherLayer;
  readonly hint: HintLayer;
  /** A stray decoy drifting by, to tap for a gift. */
  readonly drifter: DrifterLayer;
  private readonly shore: ShoreLayer;
  private readonly props: PropsLayer;
  private readonly life: LodgeLifeLayer;
  /** Show words next to the hint ring (new players). */
  hintLabels = true;
  private readonly clouds: CloudLayer;
  private readonly fogs: FogLayer[];
  private readonly plots: PlotsLayer;
  private readonly timber: TimberLayer;
  private readonly land: LandLayer;
  /** Grass and reeds that change color with the season calendar. */
  private readonly seasonal: { tint: number }[];
  private stage = '';
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

  constructor(readonly variant: WaterGround = 'marsh', shared?: TextureLibrary) {
    const tex = (this.tex = shared ?? new TextureLibrary());
    this.sky = new SkyLayer(tex);
    const clouds = (this.clouds = new CloudLayer(tex));
    const farFog = new FogLayer(tex, [{ at: -0.02, speed: 6, alpha: 0.6, height: 0.5 }]);
    const land = (this.land = new LandLayer());
    this.water = new WaterLayer(tex);
    this.fx = new EffectsLayer(tex);
    const shore = (this.shore = new ShoreLayer(tex));
    this.props = new PropsLayer(tex);
    this.life = new LodgeLifeLayer(tex);
    const blind = (this.blind = new BlindLayer(tex, this.fx));
    const midReeds = new ReedLayer(tex, 21, midReedClumps, 0.9);
    this.drifter = new DrifterLayer(tex, this.fx);
    this.ducks = new DuckLayer(tex, this.fx);
    this.crew = new CrewLayer(tex, this.fx, this.ducks);
    const nearFog = new FogLayer(tex, [
      { at: 0.16, speed: 10, alpha: 0.4, height: 0.5 },
      { at: 0.55, speed: 16, alpha: 0.2, height: 0.6 },
    ]);
    const fgReeds = new ReedLayer(tex, 77, foregroundClumps, 0.62);
    this.seasonal = [land.view, midReeds.view, fgReeds.view];
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
    this.skeins = new SkeinLayer(tex);
    this.layers = [
      this.sky, clouds, this.skeins, farFog, land, this.water, this.plots, shore, this.life, this.timber, this.props, midReeds, blind,
      this.drifter, this.ducks, this.crew, nearFog, this.fx, fgReeds, this.weather, this.hint, overlay,
    ];
    for (const layer of this.layers) this.root.addChild(layer.view);
    if (variant !== 'marsh') {
      // Far grounds: no lodge, porch or plots, just water, blind and birds.
      for (const v of [shore.view, shore.reflection, this.props.view, this.props.reflection, this.life.view, this.plots.view]) v.visible = false;
      this.crew.outpost = true;
      // Its own crew stands in for the marsh's caller, shooter and retriever.
      const [caller, blindBot, pup] = GROUND_CREW[variant];
      this.crew.crewMap = { caller, blind: blindBot, retriever: pup };
      this.crew.dressFor(tex, variant);
      this.timber.stand = variant === 'timber';
      // The bay is always salt water and open coast.
      if (variant === 'bay') this.flyway = 'atlantic';
      this.ducks.flyoverSpecies = flyoversFor(variant);
      blind.setLooks(variant === 'bay'
        ? ['decoy.species.surfScoter', 'decoy.species.commonEider', 'decoy.species.blackScoter', 'decoy.species.longtail']
        : ['decoy.species.woodDuck', 'decoy.drake', 'decoy.hen']);
    }
    // Anchors flow forward: shore & blind publish positions the reeds use.
    this.layoutOrder = [
      this.sky, clouds, this.skeins, farFog, land, this.water, this.plots, shore, this.timber, blind, this.drifter, this.crew, this.props, this.life, midReeds,
      this.ducks, nearFog, this.fx, fgReeds, this.weather, this.hint, overlay,
    ];
  }

  /** Turn a tap at screen (x, y) into a hunt action on this scene's ground. */
  pick(x: number, y: number): TapTarget {
    const t = this.pickHere(x, y);
    if (this.variant !== 'marsh') t.ground = this.variant;
    return t;
  }

  private pickHere(x: number, y: number): TapTarget {
    if (this.drifter.hit(x, y)) return { job: null, drifter: true, at: this.drifter.at };
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
    // Each scene only plays its own ground's events.
    const g = eventGround(e);
    if (g && g !== this.variant) return null;
    if (this.variant !== 'marsh' && 'bot' in e) {
      // The far crews aren't drawn on the blind; cheer at the blind instead.
      const a = this.layout.anchors.blind;
      if (e.type === 'botBought' || e.type === 'botLevel' || e.type === 'botMilestone') this.fx.sparkle(a.x, a.y - 20 * this.layout.scale, this.layout.scale, 12);
      if (e.type === 'botMoved' || e.type === 'problemRetry') return null;
      return { x: a.x, y: a.y - 40 * this.layout.scale };
    }
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
        return this.crew.call(this.crew.local(e.source));
      case 'flockLeft':
        return this.ducks.leave(e.flockId);
      case 'flockFlared':
        return this.ducks.flare(e.flockId);
      case 'shot': {
        const p = this.crew.shoot(this.crew.local(e.source));
        const tally = this.ducks.shoot(e.flockId, e.downed);
        // Busy marsh: one shot you can see stands for many; say how many.
        if (tally && this.ducks.calm && tally.birds > e.downed) this.onTally?.(tally.birds, tally.at);
        return p;
      }
      case 'retrieved':
        return this.crew.retrieve(this.crew.local(e.source), e.count);
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
      case 'standFlooded':
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
      case 'dailyBonus':
      case 'planEarned':
      case 'goldenShot':
      case 'volleyUnlocked':
      case 'stageChanged':
      case 'guestBooked':
      case 'guestServed':
      case 'trainingLearned':
      case 'dogLevel':
      case 'specialDay':
      case 'handBonus':
        return null;
      case 'volley': {
        this.ducks.volley();
        for (let i = 0; i < 4; i++) this.crew.shoot('blind');
        const a = this.layout.anchors.decoyCenter;
        this.fx.confetti(a.x, a.y - 60 * this.layout.scale, this.layout.scale, 30);
        return a;
      }
      case 'drifterClaimed':
        return this.drifter.collect();
      case 'carvingBought': {
        const a = this.layout.anchors.decoyCenter;
        this.fx.sparkle(a.x, a.y, this.layout.scale, 14);
        return a;
      }
      case 'decoysBought': {
        const a = this.layout.anchors.decoyCenter;
        this.fx.sparkle(a.x, a.y, this.layout.scale, 10);
        return a;
      }
      case 'cropPlanted': {
        const at = { x: this.layout.w * (0.3 + e.plot * 0.19), y: this.layout.horizon };
        this.fx.confetti(at.x, at.y, this.layout.scale * 0.8, 20);
        return at;
      }
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
      case 'flywayMastered':
      case 'seasonClosed':
        this.fx.confetti(this.layout.w / 2, this.layout.h * 0.4, this.layout.scale * 1.3, 60);
        return { x: this.layout.w / 2, y: this.layout.h * 0.4 };
      case 'upgradeBought': {
        const a = this.layout.anchors;
        const at = e.upgrade === 'timber' ? { x: a.lodge.x + 80 * this.layout.scale, y: a.decoyCenter.y - 40 * this.layout.scale }
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
    const g = this.variant;
    const h = ground(state, g);
    this.blind.reconcile(h.decoys);
    this.blind.setCarvings(g === 'marsh' ? CARVING_ORDER.filter((id) => state.carvings[id] && !CARVINGS[id].look.goose) : []);
    // A busy marsh draws fewer, bigger flocks (the rest hunt unseen).
    this.ducks.calm = busyMarsh(state);
    // Far-off skeins show how busy the hunt is (a far ground shows a share of it).
    this.skeins.rate = state.volley.birdsRate * 60 * (g === 'marsh' ? 1 : 0.35);
    this.ducks.reconcileGround(h, state, g);
    if (g !== 'bay' && state.flyway !== this.flyway) {
      this.flyway = state.flyway;
      this.resize(this.layout.w, this.layout.h);
    }
    this.crew.sync(state);
    const st = stageFor(state.clock.day);
    if (st.id !== this.stage) {
      this.stage = st.id;
      const t = mixColor(0xffffff, st.tint, st.tintAmount);
      for (const v of this.seasonal) v.tint = t;
    }
    this.shore.setLevel(state.lodge);
    this.life.setLevel(state.lodge);
    this.props.sync(state);
    this.hint.target = chooseHint(state, g, this.ducks, this.hintLabels);
    const w = state.environment.weather;
    this.weather.weather = w;
    for (const f of this.fogs) f.weatherFog = WEATHER[w].fog;
    this.plots.setPlots(state.plots, plotCount(state.lodge));
    // The Pin Oak Stand grows the flooded timber, not the home marsh.
    if (g === 'timber') {
      this.timber.setStand((state.upgrades.timber ?? 0) + state.stands - 1, state.upgrades.nestBoxes ?? 0, (state.upgrades.jonBoat ?? 0) > 0);
      // Low mist between the trunks in the early morning.
      const hour = clockAt(state.clock.dayTime).hour;
      const dawn = hour >= 5 && hour < 9 ? 0.45 * (1 - Math.abs(hour - 6.5) / 2.5) : 0;
      for (const f of this.fogs) f.weatherFog = Math.max(WEATHER[w].fog, dawn);
    } else {
      this.timber.setLevel(0);
    }
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

/** Birds that fly over each far ground just for scenery. */
function flyoversFor(g: OutpostId): SpeciesId[] {
  const local = (Object.keys(SPECIES) as SpeciesId[]).filter((id) => SPECIES[id].ground === g || SPECIES[id].alsoAt?.includes(g));
  return local.length ? local : ['mallard'];
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
