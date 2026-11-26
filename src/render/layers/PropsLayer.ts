import { Container, Graphics, Sprite } from 'pixi.js';
import { palette } from '../../data/palette';
import type { RungId } from '../../data/progression';
import type { UpgradeId } from '../../data/upgrades';
import type { GameState } from '../../sim/state';
import { lerpColor, shadeColor } from '../../util/color';
import { seededRandom } from '../../util/math';
import type { TextureLibrary } from '../assets/TextureLibrary';
import type { FrameContext, Layer, SceneLayout } from '../types';
import { waterDepthScale } from '../types';

/**
 * Things you build that show up on the marsh: nest boxes, celery beds, the
 * deep pool, lantern posts, the boat house, and the automation ladder's
 * spinning-wing decoys, skiffs, twin blind, kennel and lookout tower.
 * Static art is redrawn only when the set changes; a few bits animate.
 */
export class PropsLayer implements Layer {
  readonly view = new Container();
  readonly reflection = new Container();
  private readonly back = new Graphics();
  private readonly front = new Graphics();
  private readonly glow = new Graphics();
  private readonly spinners = new Graphics();
  private readonly twin: Sprite;
  private readonly twinRefl: Sprite;
  private readonly backRefl: Graphics;
  private l!: SceneLayout;
  private key = '';
  private up: Partial<Record<UpgradeId, number>> = {};
  private rungs: Partial<Record<RungId, true>> = {};
  private time = 0;
  private lanternPts: { x: number; y: number }[] = [];

  constructor(tex: TextureLibrary) {
    this.twin = new Sprite(tex.get('blind'));
    this.twin.anchor.set(0.5, 82 / 92);
    this.twin.visible = false;
    this.twinRefl = new Sprite(tex.get('blind'));
    this.twinRefl.anchor.copyFrom(this.twin.anchor);
    this.twinRefl.visible = false;
    this.glow.blendMode = 'add';
    this.view.addChild(this.back, this.twin, this.front, this.spinners, this.glow);
    this.backRefl = new Graphics(this.back.context);
    this.reflection.addChild(this.backRefl, this.twinRefl);
  }

  layout(l: SceneLayout): void {
    this.l = l;
    this.key = '';
  }

  sync(state: GameState): void {
    const u = state.upgrades;
    let key = '';
    for (const id of ['nestBoxes', 'celeryBeds', 'deepPool', 'lanterns', 'boatHouse'] as const) key += `${id}${u[id] ?? 0}`;
    for (const r of Object.keys(state.rungs)) key += r;
    if (key === this.key || !this.l) return;
    this.key = key;
    this.up = { ...u };
    this.rungs = { ...state.rungs };
    this.draw();
  }

  private draw(): void {
    const l = this.l;
    const { w, h, horizon: hz, scale: s } = l;
    const waterH = h - hz;
    const b = this.back.clear();
    const f = this.front.clear();
    const rnd = seededRandom(404);
    const up = (id: UpgradeId) => this.up[id] ?? 0;

    // Deep pool: a darker, still stretch of open water.
    if (up('deepPool') > 0) {
      const cx = w * 0.7;
      const cy = hz + waterH * 0.56;
      for (let i = 0; i < 4; i++) {
        const k = 1 - i * 0.22;
        b.ellipse(cx, cy, Math.min(w * 0.2, 130 * s) * k, 9 * s * k).fill({ color: 0x2c4a5e, alpha: 0.05 + up('deepPool') * 0.012 });
      }
    }
    // Wild celery: ribbons of green in the shallows.
    for (let i = 0; i < up('celeryBeds') * 4; i++) {
      const x = w * (0.15 + rnd() * 0.75);
      const y = hz + waterH * (0.12 + rnd() * 0.18);
      const k = waterDepthScale(l, y);
      for (let j = 0; j < 4; j++) {
        const dx = (j - 1.5) * 3 * k * s;
        b.moveTo(x + dx, y).quadraticCurveTo(x + dx + 4 * k * s, y - 1.5 * k * s, x + dx + 8 * k * s, y + 0.5 * k * s)
          .stroke({ width: 1.3 * k * s, color: j % 2 ? palette.moss : palette.sage, alpha: 0.85 });
      }
    }
    // Nest boxes on posts along the far bank.
    for (let i = 0; i < up('nestBoxes'); i++) {
      const x = w * (0.6 + i * 0.06);
      const y = hz + 3 * s;
      const k = 0.8 * s;
      f.rect(x - 0.8 * k, y - 16 * k, 1.6 * k, 16 * k).fill(palette.woodDark);
      f.rect(x - 4 * k, y - 24 * k, 8 * k, 9 * k).fill(palette.wood);
      f.poly([x - 5 * k, y - 23.5 * k, x, y - 27 * k, x + 5 * k, y - 23.5 * k]).fill(palette.woodDark);
      f.circle(x, y - 20.5 * k, 1.4 * k).fill(0x2a1e14);
    }
    // Lantern posts along the far bank.
    this.lanternPts = [];
    for (let i = 0; i < up('lanterns'); i++) {
      const x = w * (0.28 + i * 0.16);
      const y = hz + 4 * s;
      const k = 0.8 * s;
      f.rect(x - 0.9 * k, y - 18 * k, 1.8 * k, 18 * k).fill(palette.woodDark);
      f.rect(x - 2.5 * k, y - 23 * k, 5 * k, 5.5 * k).fill(palette.ink);
      f.rect(x - 1.6 * k, y - 22 * k, 3.2 * k, 3.5 * k).fill(0xf2d08a);
      this.lanternPts.push({ x, y: y - 20 * k });
    }
    // Boat house at the far right of the bank.
    if (up('boatHouse') > 0) {
      const x = w * 0.9;
      const y = hz + waterH * 0.05;
      const k = waterDepthScale(l, y) * 0.9;
      f.rect(x - 18 * k, y - 16 * k, 36 * k, 16 * k).fill(palette.wood);
      f.poly([x - 21 * k, y - 15 * k, x, y - 26 * k, x + 21 * k, y - 15 * k]).fill(palette.rust);
      f.rect(x - 9 * k, y - 11 * k, 18 * k, 11 * k).fill(0x3e281a);
      f.poly([x - 9 * k, y, x + 9 * k, y, x + 12 * k, y + 5 * k, x - 12 * k, y + 5 * k]).fill(palette.woodLight);
    }
    const a = l.anchors;
    // Kennel by the lodge bank.
    if (this.rungs.kennelPack) {
      const x = a.lodge.x + 60 * a.lodgeScale;
      const y = a.lodge.y + 2 * s;
      const k = a.lodgeScale;
      f.rect(x - 9 * k, y - 10 * k, 18 * k, 10 * k).fill(palette.wood);
      f.poly([x - 11 * k, y - 9 * k, x, y - 17 * k, x + 11 * k, y - 9 * k]).fill(palette.rust);
      f.ellipse(x, y - 3 * k, 3.4 * k, 4 * k).fill(0x2a1e14);
    }
    // Decoy skiff and retriever boats on the water.
    const boat = (x: number, y: number, color: number, cabin: boolean) => {
      const k = waterDepthScale(l, y);
      f.poly([x - 16 * k, y - 4 * k, x + 16 * k, y - 4 * k, x + 12 * k, y + 1 * k, x - 13 * k, y + 1 * k]).fill(color);
      f.rect(x - 14 * k, y - 5 * k, 28 * k, 1.5 * k).fill(palette.cream);
      if (cabin) {
        f.rect(x - 4 * k, y - 11 * k, 9 * k, 7 * k).fill(palette.cream);
        f.rect(x - 2.5 * k, y - 9.5 * k, 3 * k, 3 * k).fill(0x5b6f80);
      }
    };
    if (this.rungs.decoySkiff) boat(a.decoyCenter.x - a.decoySpread * 1.05, a.decoyCenter.y + waterH * 0.06, palette.sageDark, false);
    if (this.rungs.retrieverSkiff) boat(a.lodge.x + 110 * a.lodgeScale, a.lodge.y + waterH * 0.1, palette.wood, false);
    if (this.rungs.retrieverBoat) boat(a.lodge.x + 150 * a.lodgeScale, a.lodge.y + waterH * 0.18, palette.rust, true);
    // Floating rig: a long line of sea-duck decoys.
    if (this.rungs.floatingRig) {
      const y = hz + waterH * 0.2;
      for (let i = 0; i < 14; i++) {
        const x = w * 0.2 + i * (w * 0.035);
        const k = waterDepthScale(l, y) * 0.8;
        f.ellipse(x, y, 4 * k, 1.6 * k).fill(i % 3 ? 0x1e1a18 : 0xf0ece4);
        f.circle(x + 3 * k, y - 2 * k, 1.3 * k).fill(i % 3 ? 0xa8c0d8 : 0x1e1a18);
      }
      f.moveTo(w * 0.2, hz + waterH * 0.2 + 1 * s).lineTo(w * 0.2 + 13 * w * 0.035, hz + waterH * 0.2 + 1 * s)
        .stroke({ width: 0.6 * s, color: palette.ink, alpha: 0.4 });
    }
    // Lookout tower behind the blind.
    if (this.rungs.lookoutTower) {
      const x = a.blind.x + 46 * s;
      const y = a.blind.y - 2 * s;
      const k = s * 0.9;
      b.rect(x - 7 * k, y - 60 * k, 2 * k, 60 * k).fill(palette.woodDark);
      b.rect(x + 5 * k, y - 60 * k, 2 * k, 60 * k).fill(palette.woodDark);
      for (let yy = 10; yy < 60; yy += 12) b.moveTo(x - 6 * k, y - yy * k).lineTo(x + 6 * k, y - (yy + 10) * k).stroke({ width: 1 * k, color: palette.woodDark });
      b.rect(x - 10 * k, y - 70 * k, 20 * k, 10 * k).fill(palette.wood);
      b.poly([x - 12 * k, y - 69 * k, x, y - 78 * k, x + 12 * k, y - 69 * k]).fill(palette.rust);
    }
    // Twin blind across the spread.
    this.twin.visible = this.twinRefl.visible = !!this.rungs.twinBlinds;
    if (this.twin.visible) {
      const x = w * (w < 520 ? 0.2 : 0.26);
      const y = hz + waterH * 0.34;
      const k = waterDepthScale(l, y) * 0.9;
      this.twin.position.set(x, y);
      this.twin.scale.set(-k, k);
      this.twinRefl.position.set(x, y + 2 * s);
      this.twinRefl.scale.set(-k, -k * 0.7);
    }
  }

  update(f: FrameContext): void {
    this.time += f.dt;
    const lit = lerpColor(f.sky.light, f.sky.nearLand, 0.15);
    this.back.tint = lit;
    this.front.tint = lit;
    this.twin.tint = f.sky.light;
    const reflTint = lerpColor(shadeColor(f.sky.light, 0.55), f.sky.waterTop, 0.45);
    this.backRefl.tint = reflTint;
    this.backRefl.alpha = 0.3;
    this.twinRefl.tint = reflTint;
    this.twinRefl.alpha = 0.35;

    // Spinning-wing decoys flicker in the spread.
    const g = this.spinners.clear();
    if (this.rungs.spinningWing && this.l) {
      const a = this.l.anchors;
      const k = waterDepthScale(this.l, a.decoyCenter.y);
      const spin = this.time * 9 * (0.4 + f.motion * 0.6);
      for (const dx of [-0.45, 0.35]) {
        const x = a.decoyCenter.x + a.decoySpread * dx;
        const y = a.decoyCenter.y - 4 * k;
        g.rect(x - 0.9 * k, y - 14 * k, 1.8 * k, 15 * k).fill(palette.ink);
        g.ellipse(x, y - 14 * k, 4 * k, 2.2 * k).fill(0x2f6b4a);
        for (const side of [0, Math.PI]) {
          const len = Math.cos(spin + side) * 11 * k;
          g.rect(Math.min(x, x + len), y - 16 * k, Math.abs(len), 3.4 * k).fill(side ? 0xf4efe4 : 0x2a2622);
        }
      }
      g.tint = f.sky.light;
    }

    // Lantern glow after dark.
    const gl = this.glow.clear();
    if (this.lanternPts.length && f.sky.darkness > 0.15) {
      const alpha = Math.min(0.55, f.sky.darkness * 0.7);
      for (const p of this.lanternPts) gl.circle(p.x, p.y, 9 * this.l.scale).fill({ color: palette.lampGlow, alpha: alpha * 0.5 });
    }
  }
}
