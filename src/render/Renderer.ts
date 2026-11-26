import { Application } from 'pixi.js';
import { MAX_RENDER_RESOLUTION, TICK_SECONDS } from '../config';
import { clockAt, duckActivityAt } from '../sim/clock';
import type { BotId } from '../data/economy';
import type { SimEvent } from '../sim/events';
import type { SimRunner } from '../sim/runner';
import type { Point } from './types';
import { MarshScene } from './MarshScene';
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
  private readonly sky = createSkyState();
  private time = 0;
  /** Optional override hour for previews/debugging (null = follow sim). */
  hourOverride: number | null = null;
  options: RendererOptions = { motion: 1 };
  /** Called for each sim event after the scene animates it. */
  onEvent: ((e: SimEvent, at: Point | null) => void) | null = null;
  /** Called when the player taps a stuck bot's "!" bubble. */
  onFix: ((bot: BotId) => void) | null = null;

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
      const old = this.scene;
      old.root.destroy({ children: true });
      old.tex.destroy();
      this.scene = new MarshScene();
      this.scene.crew.onFix = (b) => this.onFix?.(b);
      this.app.stage.addChild(this.scene.root);
      this.lastW = this.lastH = 0;
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
        this.scene.sync(this.runner.state);
        this.app.ticker.start();
      }
    });

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
    this.slowStreak = fps < 45 ? this.slowStreak + 1 : 0;
    if (this.slowStreak >= 2 && this.resolution > 1) {
      this.slowStreak = 0;
      this.resolution = Math.max(1, Math.round((this.resolution - 0.5) * 2) / 2);
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
  }

  private frame(dt: number): void {
    // Keep the sim moving from the render loop too (cheap; it only runs due ticks).
    // Long gaps are left for the offline catch-up path in main.ts.
    if (this.runner.pendingMs() < 60_000) this.runner.update();
    this.time += dt;
    this.watchPerformance(dt);
    if (this.shakeAmt > 0.01) {
      const k = this.shakeAmt * 7;
      this.scene.root.position.set((Math.random() - 0.5) * k, (Math.random() - 0.5) * k);
      this.shakeAmt *= Math.pow(0.02, dt);
    } else if (this.shakeAmt > 0) {
      this.shakeAmt = 0;
      this.scene.root.position.set(0, 0);
    }
    const state = this.runner.state;
    for (const e of this.runner.drain()) {
      const at = this.scene.handle(e);
      this.onEvent?.(e, at);
    }
    this.scene.sync(state);
    const dayTime = state.clock.dayTime + this.runner.alpha * TICK_SECONDS * this.runner.timeScale;
    const hour = this.hourOverride ?? clockAt(dayTime).hour;
    computeSkyState(hour, this.sky);
    // Reduced motion slows ambient animation; it never hides feedback.
    this.scene.update({
      time: this.time,
      dt,
      sky: this.sky,
      wind: state.environment.wind,
      activity: duckActivityAt(hour),
      motion: this.options.motion,
    });
  }
}
