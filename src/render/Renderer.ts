import { Application } from 'pixi.js';
import { MAX_RENDER_RESOLUTION, TICK_SECONDS } from '../config';
import { clockAt, duckActivityAt } from '../sim/clock';
import type { BotId } from '../data/economy';
import type { SimEvent } from '../sim/events';
import type { SimRunner } from '../sim/runner';
import type { Point } from './types';
import { MarshScene, type TapTarget } from './MarshScene';
import { FieldScene } from './FieldScene';
import type { GroundId } from '../data/economy';
import { eventGround } from './eventGround';
import { computeSkyState, createSkyState } from './skyState';

export interface RendererOptions {
  /** 0–1: scales ambient motion (reduced-motion → low). */
  motion: number;
}

/**
 * Owns the Pixi application. Each animation frame it reads (never writes)
 * the sim state, interpolates the clock between ticks, and updates the
 * scene. Rendering pauses while the tab is hidden; the sim keeps running.
 */
export class Renderer {
  readonly app = new Application();
  scene!: MarshScene;
  /** The other grounds (each built on first visit; they share the marsh's textures). */
  private readonly others = new Map<GroundId, MarshScene | FieldScene>();
  /** Which ground is on screen. */
  ground: GroundId = 'marsh';

  /** The scene being drawn right now. */
  get view(): MarshScene | FieldScene {
    return this.others.get(this.ground) ?? this.scene;
  }

  private sceneFor(g: GroundId): MarshScene | FieldScene | null {
    return g === 'marsh' ? this.scene : this.others.get(g) ?? null;
  }
  private readonly sky = createSkyState();
  private time = 0;
  /** Optional override hour for previews/debugging (null = follow sim). */
  hourOverride: number | null = null;
  options: RendererOptions = { motion: 1 };
  /** Called for each sim event after the scene animates it. */
  onEvent: ((e: SimEvent, at: Point | null) => void) | null = null;
  /** Called when the player taps a stuck bot's "!" bubble. */
  onFix: ((bot: BotId) => void) | null = null;
  /** Called when the player taps the marsh itself. */
  onTap: ((t: TapTarget) => void) | null = null;
  /** DOM label that follows the hint ring. */
  private hintEl: HTMLDivElement | null = null;
  private hintText = '';

  /** True while frames are being drawn (tab visible, initialised). */
  get active(): boolean {
    return this.ready && !document.hidden;
  }
  private ready = false;

  constructor(private readonly host: HTMLElement, private runner: SimRunner) {}

  /** Swap in a new sim (after import / reset) and rebuild the visuals. */
  setRunner(runner: SimRunner): void {
    this.runner = runner;
    if (this.ready) {
      this.app.stage.removeChild(this.scene.root);
      for (const sc of this.others.values()) {
        this.app.stage.removeChild(sc.root);
        sc.root.destroy({ children: true });
      }
      this.others.clear();
      const old = this.scene;
      old.root.destroy({ children: true });
      old.tex.destroy();
      this.scene = new MarshScene();
      this.scene.crew.onFix = (b) => this.onFix?.(b);
      this.app.stage.addChild(this.scene.root);
      this.lastW = this.lastH = 0;
      // Lay the new scene out before anything draws into it.
      this.handleResize();
      this.setGround('marsh');
    }
  }

  async init(): Promise<void> {
    await this.app.init({
      resizeTo: this.host,
      antialias: true,
      backgroundColor: 0x1b2438,
      resolution: Math.min(window.devicePixelRatio || 1, MAX_RENDER_RESOLUTION),
      autoDensity: true,
      preference: 'webgl',
      powerPreference: 'high-performance',
    });
    this.resolution = this.app.renderer.resolution;
    this.app.canvas.classList.add('scene-canvas');
    this.host.appendChild(this.app.canvas);

    this.scene = new MarshScene();
    this.scene.crew.onFix = (b) => this.onFix?.(b);
    this.app.stage.addChild(this.scene.root);
    this.handleResize();
    this.scene.sync(this.runner.state);

    // ResizeObserver catches layout changes (panel resizes, orientation)
    // that don't fire a window resize.
    const ro = new ResizeObserver(() => {
      this.app.resize();
      this.handleResize();
    });
    ro.observe(this.host);

    document.addEventListener('visibilitychange', () => {
      if (document.hidden) this.app.ticker.stop();
      else {
        this.view.sync(this.runner.state);
        this.app.ticker.start();
      }
    });

    // Tap the marsh: flocks, floating birds and the water are all buttons.
    const stage = this.app.stage;
    stage.eventMode = 'static';
    stage.hitArea = this.app.screen;
    // Act on touch-down: it feels immediate, like pulling a trigger.
    stage.on('pointerdown', (e) => {
      if (e.button > 0) return;
      const p = e.global;
      this.onTap?.(this.view.pick(p.x, p.y));
    });
    this.hintEl = document.createElement('div');
    this.hintEl.className = 'scene-hint';
    this.hintEl.setAttribute('aria-hidden', 'true');
    this.host.appendChild(this.hintEl);

    this.app.ticker.add((ticker) => this.frame(Math.min(ticker.deltaMS / 1000, 0.1)));
    this.ready = true;
    // Fonts settle the top bar's height a moment later; re-measure once.
    setTimeout(() => this.handleResize(), 1500);
  }

  // ---- screen shake
  private shakeAmt = 0;

  /** A gentle shake for big moments (0–1 strength). */
  shake(strength: number): void {
    this.shakeAmt = Math.max(this.shakeAmt, strength);
  }

  // ---- adaptive resolution: step down if the device can't keep ~45 fps
  private fpsTime = 0;
  private fpsFrames = 0;
  private slowStreak = 0;
  /** Current render resolution. */
  resolution = 1;

  private watchPerformance(dt: number): void {
    this.fpsTime += dt;
    this.fpsFrames++;
    if (this.fpsTime < 3) return;
    const fps = this.fpsFrames / this.fpsTime;
    this.fpsTime = 0;
    this.fpsFrames = 0;
    // Only step down when the device is really struggling. Phones in
    // low-power mode run at a steady 30 fps; that's fine, keep them sharp.
    this.slowStreak = fps < 24 ? this.slowStreak + 1 : 0;
    const floor = Math.min(2, window.devicePixelRatio || 1);
    if (this.slowStreak >= 3 && this.resolution > floor) {
      this.slowStreak = 0;
      this.resolution = Math.max(floor, Math.round((this.resolution - 0.5) * 2) / 2);
      this.app.renderer.resize(this.app.screen.width, this.app.screen.height, this.resolution);
    }
  }

  private lastW = 0;
  private lastH = 0;
  /** Where the HUD's top bar ends, in canvas pixels (flocks stay below it). */
  private measureSkyTop(): number {
    const bar = document.querySelector('.topbar');
    if (!bar) return 0;
    const top = this.app.canvas.getBoundingClientRect().top;
    return Math.max(0, bar.getBoundingClientRect().bottom - top + 8);
  }

  private handleResize(): void {
    const w = this.app.screen.width;
    const h = this.app.screen.height;
    const skyTop = this.measureSkyTop();
    const topMoved = Math.abs((this.scene.layout.skyTop ?? 0) - skyTop) > 1;
    this.scene.layout.skyTop = skyTop;
    for (const sc of this.others.values()) sc.layout.skyTop = skyTop;
    if (w === this.lastW && h === this.lastH && !topMoved) return;
    this.lastW = w;
    this.lastH = h;
    this.scene.resize(w, h);
    for (const sc of this.others.values()) sc.resize(w, h);
  }

  private frame(dt: number): void {
    // Keep the sim moving from the render loop too (cheap; it only runs due ticks).
    // Long gaps are left for the offline catch-up path in main.ts.
    if (this.runner.pendingMs() < 60_000) this.runner.update();
    this.time += dt;
    this.watchPerformance(dt);
    if (this.shakeAmt > 0.01) {
      const k = this.shakeAmt * 7;
      this.view.root.position.set((Math.random() - 0.5) * k, (Math.random() - 0.5) * k);
      this.shakeAmt *= Math.pow(0.02, dt);
    } else if (this.shakeAmt > 0) {
      this.shakeAmt = 0;
      this.view.root.position.set(0, 0);
    }
    const state = this.runner.state;
    for (const e of this.runner.drain()) {
      // Each event animates in its own ground's scene, if that's on screen;
      // events tied to no ground (the volley, a new lodge) play wherever you're looking.
      const g = eventGround(e);
      const sc = g ? this.sceneFor(g) : this.view;
      const at = sc && sc === this.view ? sc.handle(e) : null;
      this.onEvent?.(e, at);
    }
    this.view.sync(state);
    const dayTime = state.clock.dayTime + this.runner.alpha * TICK_SECONDS * this.runner.timeScale;
    const hour = this.hourOverride ?? clockAt(dayTime).hour;
    computeSkyState(hour, this.sky);
    // Reduced motion slows ambient animation; it never hides feedback.
    this.view.update({
      time: this.time,
      dt,
      sky: this.sky,
      wind: state.environment.wind,
      activity: duckActivityAt(hour),
      motion: this.options.motion,
    });
    this.placeHint();
  }

  /** Switch which hunting ground is on screen. */
  setGround(g: GroundId): void {
    if (g !== 'marsh' && !this.others.has(g) && this.ready) {
      const sc = g === 'field' ? new FieldScene(this.scene.tex) : new MarshScene(g, this.scene.tex);
      sc.layout.skyTop = this.scene.layout.skyTop;
      sc.resize(this.app.screen.width, this.app.screen.height);
      this.app.stage.addChildAt(sc.root, 0);
      this.others.set(g, sc);
    }
    this.ground = g === 'marsh' || this.others.has(g) ? g : 'marsh';
    this.scene.root.visible = this.ground === 'marsh';
    this.scene.root.position.set(0, 0);
    for (const [k, sc] of this.others) {
      sc.root.visible = k === this.ground;
      sc.root.position.set(0, 0);
    }
    this.view.sync(this.runner.state);
  }

  private placeHint(): void {
    const el = this.hintEl;
    if (!el) return;
    const at = this.view.hint.labelAt;
    const text = at ? this.view.hint.target?.label ?? '' : '';
    if (text !== this.hintText) {
      this.hintText = text;
      el.textContent = text;
      el.classList.toggle('is-on', text !== '');
    }
    if (at && text) {
      const w = this.app.screen.width;
      const half = el.offsetWidth / 2 + 8;
      const x = Math.max(half, Math.min(w - half, at.x));
      // Too close to the top bar: put the label under the ring instead.
      const below = this.view.hint.labelBelow;
      const flip = at.y - el.offsetHeight < 56 && below;
      const y = flip ? below.y : at.y;
      el.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) translate(-50%, ${flip ? '0' : '-100%'})`;
    }
  }
}
