import { Application } from 'pixi.js';
import { MAX_RENDER_RESOLUTION, TICK_SECONDS } from '../config';
import { clockAt, duckActivityAt } from '../sim/clock';
import type { BotId } from '../data/economy';
import type { SimEvent } from '../sim/events';
import type { SimRunner } from '../sim/runner';
import type { Point } from './types';
import { MarshScene, type TapTarget } from './MarshScene';
import { FieldScene } from './FieldScene';
import { FIELD_BOTS, type GroundId } from '../data/economy';
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
  /** The goose field (built on first use; shares the marsh's textures). */
  field: FieldScene | null = null;
  /** Which ground is on screen. */
  ground: GroundId = 'marsh';

  /** The scene being drawn right now. */
  get view(): MarshScene | FieldScene {
    return this.ground === 'field' && this.field ? this.field : this.scene;
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
      if (this.field) {
        this.app.stage.removeChild(this.field.root);
        this.field.root.destroy({ children: true });
        this.field = null;
      }
      const old = this.scene;
      old.root.destroy({ children: true });
      old.tex.destroy();
      this.scene = new MarshScene();
      this.scene.crew.onFix = (b) => this.onFix?.(b);
      this.app.stage.addChild(this.scene.root);
      this.lastW = this.lastH = 0;
      this.setGround('marsh');
      this.handleResize();
      this.scene.sync(runner.state);
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
  private handleResize(): void {
    const w = this.app.screen.width;
    const h = this.app.screen.height;
    if (w === this.lastW && h === this.lastH) return;
    this.lastW = w;
    this.lastH = h;
    this.scene.resize(w, h);
    this.field?.resize(w, h);
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
      // Each event animates in its own ground's scene, if that's on screen.
      const forField = ('ground' in e && e.ground === 'field') || ('bot' in e && FIELD_BOTS.includes(e.bot));
      const sc = forField ? this.field : this.scene;
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

  /** Switch between the marsh and the goose field. */
  setGround(g: GroundId): void {
    if (g === 'field' && !this.field && this.ready) {
      this.field = new FieldScene(this.scene.tex);
      this.field.resize(this.app.screen.width, this.app.screen.height);
      this.app.stage.addChildAt(this.field.root, 0);
    }
    this.ground = g === 'field' && this.field ? 'field' : 'marsh';
    this.scene.root.visible = this.ground === 'marsh';
    if (this.field) this.field.root.visible = this.ground === 'field';
    this.scene.root.position.set(0, 0);
    this.field?.root.position.set(0, 0);
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
