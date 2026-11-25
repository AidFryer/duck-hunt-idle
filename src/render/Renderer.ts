import { Application } from 'pixi.js';
import { MAX_RENDER_RESOLUTION, TICK_SECONDS } from '../config';
import { clockAt, duckActivityAt } from '../sim/clock';
import type { SimRunner } from '../sim/runner';
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

  constructor(private readonly host: HTMLElement, private readonly runner: SimRunner) {}

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
    this.app.canvas.classList.add('scene-canvas');
    this.host.appendChild(this.app.canvas);

    this.scene = new MarshScene();
    this.app.stage.addChild(this.scene.root);
    this.handleResize();

    // ResizeObserver catches layout changes (panel resizes, orientation)
    // that don't fire a window resize.
    const ro = new ResizeObserver(() => {
      this.app.resize();
      this.handleResize();
    });
    ro.observe(this.host);

    document.addEventListener('visibilitychange', () => {
      if (document.hidden) this.app.ticker.stop();
      else this.app.ticker.start();
    });

    this.app.ticker.add((ticker) => this.frame(Math.min(ticker.deltaMS / 1000, 0.1)));
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
    this.runner.update();
    this.time += dt;
    const state = this.runner.state;
    const dayTime = state.clock.dayTime + this.runner.alpha * TICK_SECONDS * this.runner.timeScale;
    const hour = this.hourOverride ?? clockAt(dayTime).hour;
    computeSkyState(hour, this.sky);
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
