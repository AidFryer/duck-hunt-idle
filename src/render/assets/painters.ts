/**
 * Procedural texture painters. Each painter returns a canvas; the
 * TextureLibrary turns it into a GPU texture on first use.
 *
 * To replace any of these with hand-drawn art later, register a texture
 * under the same key in TextureLibrary — game code never calls painters
 * directly.
 */
import { palette, plumage } from '../../data/palette';
import { SPECIES, type DuckLook } from '../../data/species';
import { seededRandom } from '../../util/math';
import { createPaintTarget, css, ellipse, linearV, softBlob } from './canvas';

type Canvas = HTMLCanvasElement;

// ---------------------------------------------------------------- light & fx

export function paintGlow(): Canvas {
  const t = createPaintTarget(128, 128, 1);
  const g = t.ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.2, 'rgba(255,255,255,0.55)');
  g.addColorStop(0.5, 'rgba(255,255,255,0.18)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  t.ctx.fillStyle = g;
  t.ctx.fillRect(0, 0, 128, 128);
  return t.canvas;
}

export function paintSoftDot(): Canvas {
  const t = createPaintTarget(32, 32, 1);
  softBlob(t.ctx, 16, 16, 16, palette.white, 1, 0.25);
  return t.canvas;
}

export function paintStar(): Canvas {
  const t = createPaintTarget(16, 16, 2);
  const { ctx } = t;
  softBlob(ctx, 8, 8, 8, palette.white, 0.5, 0.1);
  ctx.fillStyle = 'rgba(255,255,255,0.95)';
  ctx.beginPath();
  ctx.moveTo(8, 1.5);
  ctx.quadraticCurveTo(8.6, 7.4, 14.5, 8);
  ctx.quadraticCurveTo(8.6, 8.6, 8, 14.5);
  ctx.quadraticCurveTo(7.4, 8.6, 1.5, 8);
  ctx.quadraticCurveTo(7.4, 7.4, 8, 1.5);
  ctx.fill();
  return t.canvas;
}

export function paintRipple(): Canvas {
  const t = createPaintTarget(128, 36, 1);
  const { ctx } = t;
  ctx.strokeStyle = 'rgba(255,255,255,0.9)';
  ctx.lineWidth = 2.2;
  ellipse(ctx, 64, 18, 60, 15);
  ctx.stroke();
  ctx.strokeStyle = 'rgba(255,255,255,0.35)';
  ctx.lineWidth = 1.2;
  ellipse(ctx, 64, 18, 52, 11.5);
  ctx.stroke();
  return t.canvas;
}

/** Short horizontal glint used for water shimmer and reflections. */
export function paintShimmer(): Canvas {
  const t = createPaintTarget(48, 6, 1);
  const g = t.ctx.createLinearGradient(0, 0, 48, 0);
  g.addColorStop(0, 'rgba(255,255,255,0)');
  g.addColorStop(0.5, 'rgba(255,255,255,1)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  t.ctx.fillStyle = g;
  ellipse(t.ctx, 24, 3, 24, 2.2);
  t.ctx.fill();
  return t.canvas;
}

export function paintDroplet(): Canvas {
  const t = createPaintTarget(10, 14, 2);
  const { ctx } = t;
  ctx.fillStyle = 'rgba(255,255,255,0.95)';
  ctx.beginPath();
  ctx.moveTo(5, 1);
  ctx.quadraticCurveTo(9.5, 8, 5, 13);
  ctx.quadraticCurveTo(0.5, 8, 5, 1);
  ctx.fill();
  return t.canvas;
}

export function paintSun(): Canvas {
  const t = createPaintTarget(64, 64, 2);
  const { ctx } = t;
  const g = ctx.createRadialGradient(30, 28, 2, 32, 32, 30);
  g.addColorStop(0, 'rgba(255,253,240,1)');
  g.addColorStop(0.75, 'rgba(255,240,200,1)');
  g.addColorStop(0.92, 'rgba(255,224,170,0.85)');
  g.addColorStop(1, 'rgba(255,224,170,0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(32, 32, 30, 0, Math.PI * 2);
  ctx.fill();
  return t.canvas;
}

export function paintMoon(): Canvas {
  const t = createPaintTarget(64, 64, 2);
  const { ctx } = t;
  const g = ctx.createRadialGradient(26, 26, 4, 32, 32, 26);
  g.addColorStop(0, css(0xfbf6e8));
  g.addColorStop(1, css(0xe2d8c0));
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(32, 32, 24, 0, Math.PI * 2);
  ctx.fill();
  const rnd = seededRandom(77);
  for (let i = 0; i < 9; i++) {
    const a = rnd() * Math.PI * 2;
    const d = rnd() * 17;
    const r = 1.5 + rnd() * 4;
    ctx.fillStyle = css(0xcfc3a6, 0.45);
    ctx.beginPath();
    ctx.arc(32 + Math.cos(a) * d, 32 + Math.sin(a) * d, r, 0, Math.PI * 2);
    ctx.fill();
  }
  // Soft terminator for a gibbous look.
  ctx.globalCompositeOperation = 'source-atop';
  const s = ctx.createLinearGradient(8, 0, 56, 0);
  s.addColorStop(0, 'rgba(60,70,110,0.0)');
  s.addColorStop(0.7, 'rgba(60,70,110,0.0)');
  s.addColorStop(1, 'rgba(60,70,110,0.45)');
  ctx.fillStyle = s;
  ctx.fillRect(0, 0, 64, 64);
  ctx.globalCompositeOperation = 'source-over';
  return t.canvas;
}

// ---------------------------------------------------------------- atmosphere

export function paintCloud(variant: number): Canvas {
  const w = 260;
  const h = 110;
  const t = createPaintTarget(w, h, 1);
  const { ctx } = t;
  const rnd = seededRandom(1000 + variant * 31);
  const flat = variant % 2 === 1; // alternate puffy cumulus / long stratus
  const puffs = flat ? 14 : 10;
  for (let i = 0; i < puffs; i++) {
    const p = i / (puffs - 1);
    const x = 30 + p * (w - 60) + (rnd() - 0.5) * 16;
    const hump = Math.sin(p * Math.PI);
    const r = flat ? 18 + rnd() * 14 : 20 + hump * 26 + rnd() * 12;
    const y = h - 26 - hump * (flat ? 10 : 28) - rnd() * 8;
    softBlob(ctx, x, y, r, palette.white, 0.75, 0.45);
  }
  // Base shading: cooler underside.
  ctx.globalCompositeOperation = 'source-atop';
  ctx.fillStyle = linearV(ctx, 20, h, [
    [0, 0xffffff, 0],
    [0.65, 0xb9bccb, 0.15],
    [1, 0x8d93a8, 0.45],
  ]);
  ctx.fillRect(0, 0, w, h);
  ctx.globalCompositeOperation = 'source-over';
  return t.canvas;
}

/** Horizontally seamless fog band. */
export function paintFog(): Canvas {
  const w = 512;
  const h = 128;
  const t = createPaintTarget(w, h, 1);
  const { ctx } = t;
  const rnd = seededRandom(4242);
  for (let i = 0; i < 46; i++) {
    const x = rnd() * w;
    const y = h * 0.5 + (rnd() - 0.5) * h * 0.45;
    const r = 26 + rnd() * 46;
    const a = 0.12 + rnd() * 0.16;
    for (const dx of [-w, 0, w]) softBlob(ctx, x + dx, y, r, palette.white, a, 0.2);
  }
  return t.canvas;
}

/** Film-grain / paper texture overlay (tileable). */
export function paintGrain(): Canvas {
  const size = 192;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const img = ctx.createImageData(size, size);
  const rnd = seededRandom(9);
  for (let i = 0; i < size * size; i++) {
    const v = rnd();
    const light = v > 0.5;
    img.data[i * 4 + 0] = light ? 255 : 60;
    img.data[i * 4 + 1] = light ? 244 : 40;
    img.data[i * 4 + 2] = light ? 220 : 25;
    img.data[i * 4 + 3] = Math.floor(Math.abs(v - 0.5) * 2 * 40);
  }
  ctx.putImageData(img, 0, 0);
  return canvas;
}

export function paintVignette(): Canvas {
  const t = createPaintTarget(256, 256, 1);
  const g = t.ctx.createRadialGradient(128, 118, 60, 128, 128, 182);
  g.addColorStop(0, 'rgba(20,12,6,0)');
  g.addColorStop(0.7, 'rgba(20,12,6,0.12)');
  g.addColorStop(1, 'rgba(20,12,6,0.5)');
  t.ctx.fillStyle = g;
  t.ctx.fillRect(0, 0, 256, 256);
  return t.canvas;
}

// ---------------------------------------------------------------- plants

/** A tapered, slightly curved reed blade. Anchor bottom-center. */
export function paintReedBlade(variant: number): Canvas {
  const w = 16;
  const h = 128;
  const t = createPaintTarget(w, h);
  const { ctx } = t;
  const colors = [
    [palette.sageDark, palette.sage],
    [palette.cattail, palette.reedDry],
    [palette.moss, palette.reed],
  ][variant % 3]!;
  const bend = [3, -2.5, 4.5][variant % 3]!;
  ctx.fillStyle = linearV(ctx, h, 0, [
    [0, colors[0]!],
    [1, colors[1]!],
  ]);
  ctx.beginPath();
  ctx.moveTo(w / 2 - 2.6, h);
  ctx.quadraticCurveTo(w / 2 - 1.5 + bend * 0.3, h * 0.45, w / 2 + bend, 1);
  ctx.quadraticCurveTo(w / 2 + 1 + bend * 0.3, h * 0.5, w / 2 + 2.6, h);
  ctx.closePath();
  ctx.fill();
  // Center vein highlight
  ctx.strokeStyle = css(palette.cream, 0.18);
  ctx.lineWidth = 0.6;
  ctx.beginPath();
  ctx.moveTo(w / 2, h - 2);
  ctx.quadraticCurveTo(w / 2 + bend * 0.3, h * 0.45, w / 2 + bend * 0.9, 6);
  ctx.stroke();
  return t.canvas;
}

/** Cattail: thin stalk, velvety brown head, little spike. Anchor bottom. */
export function paintCattail(): Canvas {
  const w = 16;
  const h = 140;
  const t = createPaintTarget(w, h);
  const { ctx } = t;
  ctx.strokeStyle = css(palette.moss);
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(8, h);
  ctx.quadraticCurveTo(7.5, h * 0.5, 8, 6);
  ctx.stroke();
  // Head
  const hy = 18;
  const hh = 30;
  const g = ctx.createLinearGradient(4, 0, 12, 0);
  g.addColorStop(0, css(palette.cattailDark));
  g.addColorStop(0.45, css(0x8a5e3a));
  g.addColorStop(1, css(palette.cattailDark));
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.roundRect(4.2, hy, 7.6, hh, 3.8);
  ctx.fill();
  ctx.strokeStyle = css(palette.reedDry, 0.8);
  ctx.lineWidth = 0.9;
  ctx.beginPath();
  ctx.moveTo(8, hy);
  ctx.lineTo(8, 4);
  ctx.stroke();
  return t.canvas;
}

export function paintLeaf(variant: number): Canvas {
  const t = createPaintTarget(22, 16);
  const { ctx } = t;
  const color = [palette.amber, palette.rust, palette.gold][variant % 3]!;
  ctx.fillStyle = css(color);
  ctx.beginPath();
  ctx.moveTo(2, 8);
  ctx.quadraticCurveTo(10, -1, 20, 8);
  ctx.quadraticCurveTo(10, 17, 2, 8);
  ctx.fill();
  ctx.strokeStyle = css(palette.cattailDark, 0.5);
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.moveTo(1, 8);
  ctx.lineTo(19, 8);
  ctx.stroke();
  return t.canvas;
}

// ---------------------------------------------------------------- ducks

/** Default looks (mallard) for callers that just want "a duck". */
const MALLARD = SPECIES.mallard;
function lookFor(arg: { drake: boolean } | DuckLook): DuckLook {
  if ('drake' in arg) return arg.drake ? MALLARD.drake : MALLARD.hen;
  return arg;
}

/** Flying body, facing right. Design 64×26. Shoulder at (30, 10). */
export function paintDuckFlyBody(arg: { drake: boolean } | DuckLook): Canvas {
  const L = lookFor(arg);
  const t = createPaintTarget(64, 26);
  const { ctx } = t;
  // Tail
  ctx.fillStyle = css(L.tail);
  ctx.beginPath();
  if (L.longTail) {
    ctx.moveTo(9, 12.5);
    ctx.lineTo(-0.5, 12.5);
    ctx.lineTo(9, 15.5);
  } else {
    ctx.moveTo(9, 12);
    ctx.lineTo(0.5, 10);
    ctx.lineTo(2, 14);
    ctx.lineTo(0.5, 17.5);
    ctx.lineTo(9, 16);
  }
  ctx.fill();
  // Body: back on top, flank below
  ctx.fillStyle = linearV(ctx, 7, 21, [[0, L.back], [0.45, L.flank], [1, shadeHex(L.flank, 1.12)]]);
  ellipse(ctx, 26, 14, 19, 6.8);
  ctx.fill();
  if (L.sidePatch) {
    ctx.fillStyle = css(L.sidePatch);
    ellipse(ctx, 22, 16.5, 7, 2.6);
    ctx.fill();
  }
  if (L.streaky) streaksIn(ctx, 12, 9, 28, 10, 22, L.back);
  // Breast
  ctx.fillStyle = css(L.breast);
  ellipse(ctx, 40, 15, 7.5, 5.6, -0.2);
  ctx.fill();
  // Neck + head
  ctx.fillStyle = css(L.head);
  ellipse(ctx, 47, 11.5, 6.5, 3.4, -0.25);
  ctx.fill();
  ellipse(ctx, 54, 9, 5.2, 4.2);
  ctx.fill();
  paintHeadDetails(ctx, L, 54, 9, 1);
  if (L.neckMark === 'ring') {
    ctx.strokeStyle = css(palette.white, 0.95);
    ctx.lineWidth = 1.1;
    ctx.beginPath();
    ctx.moveTo(44.2, 9.6);
    ctx.lineTo(43.6, 14.2);
    ctx.stroke();
  } else if (L.neckMark === 'stripe') {
    ctx.strokeStyle = css(palette.white, 0.95);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(43, 14);
    ctx.quadraticCurveTo(47, 11, 51, 8.5);
    ctx.stroke();
  }
  paintBill(ctx, L, 58, 7.6, 1);
  ctx.fillStyle = css(L.bill === 0xd8483a ? 0xd8483a : palette.ink);
  ctx.beginPath();
  ctx.arc(55.2, 7.9, 0.9, 0, Math.PI * 2);
  ctx.fill();
  return t.canvas;
}

/** Wing, drawn pointing up from the shoulder. Design 30×28, shoulder at (12, 28). */
export function paintDuckWing(arg: { drake: boolean } | DuckLook): Canvas {
  const L = lookFor(arg);
  const t = createPaintTarget(30, 28);
  const { ctx } = t;
  const base = shadeHex(L.back, 1.15);
  const dark = shadeHex(L.back, 0.75);
  ctx.fillStyle = linearV(ctx, 28, 0, [[0, base], [0.6, base], [1, dark]]);
  ctx.beginPath();
  ctx.moveTo(5, 28);
  ctx.quadraticCurveTo(1, 14, 3, 0.5);
  ctx.quadraticCurveTo(14, 10, 21, 28);
  ctx.closePath();
  ctx.fill();
  ctx.save();
  ctx.clip();
  ctx.fillStyle = css(palette.white, 0.9);
  ctx.fillRect(0, 17.5, 30, 1.2);
  ctx.fillStyle = css(L.speculum);
  ctx.fillRect(0, 18.7, 30, 3.6);
  ctx.fillStyle = css(palette.white, 0.9);
  ctx.fillRect(0, 22.3, 30, 1.1);
  ctx.strokeStyle = css(dark, 0.6);
  ctx.lineWidth = 0.6;
  for (let i = 0; i < 5; i++) {
    ctx.beginPath();
    ctx.moveTo(3 + i * 1.2, 3 + i * 3);
    ctx.lineTo(7 + i * 2.4, 6 + i * 3.2);
    ctx.stroke();
  }
  ctx.restore();
  return t.canvas;
}

/** Swimming duck (or wooden decoy), facing right. Design 60×34, waterline y=30. */
export function paintDuckSwim(arg: { drake: boolean } | DuckLook, decoy = false): Canvas {
  const L = lookFor(arg);
  const t = createPaintTarget(60, 34);
  const { ctx } = t;
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, 0, 60, 30);
  ctx.clip();
  // Tail
  ctx.fillStyle = css(L.tail);
  ctx.beginPath();
  if (L.longTail) {
    ctx.moveTo(10, 23);
    ctx.lineTo(-1, 13);
    ctx.lineTo(12, 20);
  } else {
    ctx.moveTo(10, 24);
    ctx.lineTo(1, 17);
    ctx.lineTo(12, 19);
  }
  ctx.fill();
  // Body
  ctx.fillStyle = linearV(ctx, 16, 32, [[0, L.back], [0.35, L.flank], [1, shadeHex(L.flank, 1.1)]]);
  ellipse(ctx, 26, 25, 19.5, 8.8);
  ctx.fill();
  if (L.sidePatch) {
    ctx.fillStyle = css(L.sidePatch);
    ellipse(ctx, 24, 26.5, 8, 3);
    ctx.fill();
  }
  if (L.streaky && !decoy) streaksIn(ctx, 10, 18, 32, 10, 26, L.back);
  // Folded wing with speculum flash
  ctx.fillStyle = css(shadeHex(L.back, 0.8), 0.75);
  ellipse(ctx, 22, 21, 12, 3.6, 0.08);
  ctx.fill();
  ctx.fillStyle = css(L.speculum, 0.9);
  ctx.fillRect(13, 21.6, 6, 1.6);
  // Breast
  ctx.fillStyle = css(L.breast);
  ellipse(ctx, 40.5, 24.5, 7, 7.2);
  ctx.fill();
  ctx.restore();
  // Neck
  ctx.strokeStyle = css(L.head);
  ctx.lineWidth = decoy ? 7 : 6;
  ctx.beginPath();
  ctx.moveTo(41.5, 21);
  ctx.quadraticCurveTo(44, 15, 46, 11);
  ctx.stroke();
  // Head
  ctx.fillStyle = css(L.head);
  ellipse(ctx, 47.5, 9, decoy ? 6.6 : 6, decoy ? 5.4 : 5);
  ctx.fill();
  paintHeadDetails(ctx, L, 47.5, 9, decoy ? 1.1 : 1.05);
  if (L.neckMark === 'ring') {
    ctx.strokeStyle = css(palette.white);
    ctx.lineWidth = 1.3;
    ctx.beginPath();
    ctx.moveTo(41.2, 16.2);
    ctx.lineTo(45.2, 17);
    ctx.stroke();
  } else if (L.neckMark === 'stripe') {
    ctx.strokeStyle = css(palette.white);
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(42, 20);
    ctx.quadraticCurveTo(44.5, 14, 45.6, 9);
    ctx.stroke();
  }
  paintBill(ctx, L, 52.5, 7.8, 1);
  ctx.fillStyle = css(L.bill === 0xd8483a ? 0xd8483a : palette.ink);
  ctx.beginPath();
  ctx.arc(49.3, 7.6, decoy ? 1.2 : 1, 0, Math.PI * 2);
  ctx.fill();
  if (decoy) {
    ctx.strokeStyle = css(palette.cream, 0.35);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(12, 19.5);
    ctx.quadraticCurveTo(26, 15.5, 38, 18.5);
    ctx.stroke();
    ctx.strokeStyle = css(palette.woodDark, 0.5);
    ctx.lineWidth = 0.7;
    ctx.beginPath();
    ctx.moveTo(39, 20.5);
    ctx.quadraticCurveTo(42, 22, 44.5, 20.5);
    ctx.stroke();
  }
  return t.canvas;
}

/** Crest, sheen, eye patch, crown stripe and face lines on a head at (hx, hy). */
function paintHeadDetails(ctx: CanvasRenderingContext2D, L: DuckLook, hx: number, hy: number, k: number): void {
  if (L.crest) {
    ctx.fillStyle = css(L.head);
    ctx.beginPath();
    ctx.moveTo(hx + 1 * k, hy - 4 * k);
    ctx.quadraticCurveTo(hx - 6 * k, hy - 4.5 * k, hx - 9 * k, hy + 1 * k);
    ctx.quadraticCurveTo(hx - 5 * k, hy - 0.5 * k, hx - 1 * k, hy - 1 * k);
    ctx.fill();
  }
  if (L.headSheen) {
    ctx.fillStyle = css(L.headSheen, 0.7);
    ellipse(ctx, hx - 0.5 * k, hy - 1.6 * k, 3 * k, 1.6 * k, -0.2);
    ctx.fill();
  }
  if (L.eyePatch) {
    ctx.fillStyle = css(L.eyePatch, 0.95);
    ctx.beginPath();
    ctx.moveTo(hx + 2.5 * k, hy - 1.5 * k);
    ctx.quadraticCurveTo(hx - 2 * k, hy - 2.5 * k, hx - 5 * k, hy + 1 * k);
    ctx.quadraticCurveTo(hx - 1 * k, hy + 0.5 * k, hx + 2.5 * k, hy + 0.2 * k);
    ctx.fill();
  }
  if (L.crown) {
    ctx.strokeStyle = css(L.crown);
    ctx.lineWidth = 1.4 * k;
    ctx.beginPath();
    ctx.moveTo(hx - 3 * k, hy - 3.4 * k);
    ctx.quadraticCurveTo(hx + 1 * k, hy - 4.6 * k, hx + 4 * k, hy - 2.6 * k);
    ctx.stroke();
  }
  if (L.faceLines) {
    ctx.strokeStyle = css(palette.white, 0.95);
    ctx.lineWidth = 0.7 * k;
    ctx.beginPath();
    ctx.moveTo(hx + 4 * k, hy - 2.6 * k);
    ctx.quadraticCurveTo(hx - 2 * k, hy - 3.6 * k, hx - 8 * k, hy + 0.5 * k);
    ctx.moveTo(hx + 1 * k, hy + 1.5 * k);
    ctx.quadraticCurveTo(hx - 2 * k, hy + 0.6 * k, hx - 6 * k, hy + 1.2 * k);
    ctx.moveTo(hx + 1 * k, hy + 3 * k);
    ctx.lineTo(hx - 1 * k, hy + 6 * k);
    ctx.stroke();
  }
}

function paintBill(ctx: CanvasRenderingContext2D, L: DuckLook, x: number, y: number, k: number): void {
  if (L.billShield) {
    ctx.fillStyle = css(L.bill);
    ellipse(ctx, x - 0.5 * k, y + 0.4 * k, 2.4 * k, 2.2 * k);
    ctx.fill();
  }
  ctx.fillStyle = css(L.bill);
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.quadraticCurveTo(x + 6 * k, y + 1 * k, x + 6 * k, y + 2.6 * k);
  ctx.quadraticCurveTo(x + 3 * k, y + 3.6 * k, x, y + 3.4 * k);
  ctx.fill();
}

function streaksIn(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, seed: number, color: number): void {
  const rnd = seededRandom(seed);
  ctx.strokeStyle = css(shadeHex(color, 0.75), 0.55);
  ctx.lineWidth = 0.7;
  for (let i = 0; i < 26; i++) {
    const sx = x + rnd() * w;
    const sy = y + rnd() * h;
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.lineTo(sx + 2 + rnd() * 1.5, sy + 0.6);
    ctx.stroke();
  }
}

function shadeHex(c: number, f: number): number {
  const ch = (v: number) => Math.max(0, Math.min(255, Math.round(v * f)));
  return (ch((c >> 16) & 0xff) << 16) | (ch((c >> 8) & 0xff) << 8) | ch(c & 0xff);
}

/** Field Guide portrait: the swimming drake on a little water ring. Design 64×40. */
export function paintSpeciesPortrait(L: DuckLook): Canvas {
  const t = createPaintTarget(64, 40);
  const { ctx } = t;
  ctx.strokeStyle = css(0x4e6e7e, 0.35);
  ctx.lineWidth = 1.2;
  ellipse(ctx, 30, 33.5, 26, 3.6);
  ctx.stroke();
  ctx.drawImage(paintDuckSwim(L), 2, 2, 60, 34);
  return t.canvas;
}

// ---------------------------------------------------------------- buildings

export const LODGE_SIZE = { w: 230, h: 160, ground: 146 } as const;
/** Positions inside the lodge texture (design units) other systems hook into. */
export const LODGE_ANCHORS = {
  chimneyTop: { x: 146, y: 22 },
  lantern: { x: 34, y: 92 },
  windows: [
    { x: 64, y: 96, w: 20, h: 18 },
    { x: 128, y: 96, w: 20, h: 18 },
    { x: 93, y: 46, w: 14, h: 12 },
  ],
} as const;

export function paintLodge(): Canvas {
  const { w, h, ground } = LODGE_SIZE;
  const t = createPaintTarget(w, h);
  const { ctx } = t;
  const rnd = seededRandom(555);

  // Dock posts reaching into the water (drawn first, behind).
  ctx.fillStyle = css(palette.woodDark);
  for (const x of [176, 198, 220]) ctx.fillRect(x, ground - 6, 3.5, h - ground + 6);
  // Dock planks
  ctx.fillStyle = css(palette.woodLight);
  ctx.fillRect(166, ground - 8, 62, 5);
  ctx.strokeStyle = css(palette.woodDark, 0.6);
  ctx.lineWidth = 0.6;
  for (let x = 170; x < 228; x += 5) {
    ctx.beginPath();
    ctx.moveTo(x, ground - 8);
    ctx.lineTo(x, ground - 3);
    ctx.stroke();
  }

  // Stone foundation
  ctx.fillStyle = css(0x6f6a62);
  ctx.fillRect(18, ground - 14, 156, 14);
  for (let i = 0; i < 26; i++) {
    ctx.fillStyle = css(rnd() > 0.5 ? 0x8a847a : 0x5f5a52);
    ellipse(ctx, 22 + i * 6 + rnd() * 2, ground - 7 + (i % 2) * 3 - 2, 3.4, 2.6);
    ctx.fill();
  }

  // Log walls
  const wallTop = 66;
  const wallBottom = ground - 14;
  for (let y = wallTop, i = 0; y < wallBottom; y += 7, i++) {
    ctx.fillStyle = linearV(ctx, y, y + 7, [
      [0, i % 2 ? palette.woodLight : 0xa8744a],
      [0.6, palette.wood],
      [1, palette.woodDark],
    ]);
    ctx.beginPath();
    ctx.roundRect(22, y, 148, 7, 3.5);
    ctx.fill();
    // Log ends
    ctx.fillStyle = css(0xc99a68);
    ellipse(ctx, 22, y + 3.5, 3.2, 3.2);
    ctx.fill();
    ellipse(ctx, 170, y + 3.5, 3.2, 3.2);
    ctx.fill();
  }

  // Chimney (stone)
  ctx.fillStyle = css(0x7a736a);
  ctx.fillRect(138, 22, 17, 52);
  for (let i = 0; i < 12; i++) {
    ctx.fillStyle = css(i % 2 ? 0x8d877c : 0x655f57);
    ellipse(ctx, 141 + (i % 3) * 5.5, 26 + Math.floor(i / 3) * 11, 3, 2.4);
    ctx.fill();
  }
  ctx.fillStyle = css(0x4f4a44);
  ctx.fillRect(136, 20, 21, 4);

  // Roof
  ctx.fillStyle = css(0x7c3f24);
  ctx.beginPath();
  ctx.moveTo(8, 70);
  ctx.lineTo(96, 18);
  ctx.lineTo(184, 70);
  ctx.closePath();
  ctx.fill();
  ctx.save();
  ctx.clip();
  for (let row = 0; row < 9; row++) {
    const y = 22 + row * 6;
    for (let x = 0; x < 200; x += 7) {
      ctx.fillStyle = css(rnd() > 0.5 ? palette.rust : 0x9a4a2a, 0.9);
      ctx.fillRect(x + (row % 2) * 3.5, y, 6.2, 5);
    }
  }
  ctx.restore();
  ctx.strokeStyle = css(palette.cream, 0.9);
  ctx.lineWidth = 2.2;
  ctx.beginPath();
  ctx.moveTo(8, 70);
  ctx.lineTo(96, 18);
  ctx.lineTo(184, 70);
  ctx.stroke();

  // Gable window (attic)
  windowFrame(ctx, LODGE_ANCHORS.windows[2]);

  // Porch roof + posts on the left
  ctx.fillStyle = css(palette.woodDark);
  ctx.fillRect(8, 78, 3, ground - 92);
  ctx.fillStyle = css(0x8a4a2c);
  ctx.beginPath();
  ctx.moveTo(4, 80);
  ctx.lineTo(42, 72);
  ctx.lineTo(42, 78);
  ctx.lineTo(6, 84);
  ctx.closePath();
  ctx.fill();

  // Door
  ctx.fillStyle = css(palette.woodDark);
  ctx.beginPath();
  ctx.roundRect(92, 92, 18, wallBottom - 92, [8, 8, 0, 0]);
  ctx.fill();
  ctx.strokeStyle = css(0x3e281a);
  ctx.lineWidth = 0.8;
  for (const x of [97, 101, 105]) {
    ctx.beginPath();
    ctx.moveTo(x, 95);
    ctx.lineTo(x, wallBottom);
    ctx.stroke();
  }
  ctx.fillStyle = css(palette.brass);
  ctx.beginPath();
  ctx.arc(106, 114, 1.3, 0, Math.PI * 2);
  ctx.fill();

  // Sign above door
  ctx.fillStyle = css(palette.woodLight);
  ctx.beginPath();
  ctx.roundRect(80, 80, 42, 9, 2);
  ctx.fill();
  ctx.fillStyle = css(palette.ink);
  ctx.font = 'bold 6.5px Georgia, serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('LODGE', 101, 85);

  // Windows
  windowFrame(ctx, LODGE_ANCHORS.windows[0]);
  windowFrame(ctx, LODGE_ANCHORS.windows[1]);

  // Lantern on porch post
  ctx.fillStyle = css(palette.ink);
  ctx.fillRect(LODGE_ANCHORS.lantern.x - 2.5, LODGE_ANCHORS.lantern.y - 4, 5, 8);
  ctx.fillStyle = css(0xf2d08a);
  ctx.fillRect(LODGE_ANCHORS.lantern.x - 1.6, LODGE_ANCHORS.lantern.y - 2.6, 3.2, 5);

  // Woodpile lean-to on the right
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 4 - r; c++) {
      const x = 156 + c * 6 + r * 3;
      const y = ground - 18 - r * 5.5;
      ctx.fillStyle = css(0xb88758);
      ellipse(ctx, x, y, 3, 2.8);
      ctx.fill();
      ctx.strokeStyle = css(0x7a5636);
      ctx.lineWidth = 0.6;
      ellipse(ctx, x, y, 1.4, 1.3);
      ctx.stroke();
    }
  }
  return t.canvas;
}

function windowFrame(ctx: CanvasRenderingContext2D, r: { x: number; y: number; w: number; h: number }): void {
  ctx.fillStyle = css(palette.cream);
  ctx.fillRect(r.x - 1.5, r.y - 1.5, r.w + 3, r.h + 3);
  ctx.fillStyle = linearV(ctx, r.y, r.y + r.h, [
    [0, 0x5b6f80],
    [1, 0x2d3640],
  ]);
  ctx.fillRect(r.x, r.y, r.w, r.h);
  ctx.fillStyle = css(palette.cream);
  ctx.fillRect(r.x + r.w / 2 - 0.6, r.y, 1.2, r.h);
  ctx.fillRect(r.x, r.y + r.h / 2 - 0.6, r.w, 1.2);
}

/** Warm window light, drawn additively over the lodge at dusk and night. */
export function paintLodgeGlow(): Canvas {
  const { w, h } = LODGE_SIZE;
  const t = createPaintTarget(w, h);
  const { ctx } = t;
  for (const r of LODGE_ANCHORS.windows) {
    softBlob(ctx, r.x + r.w / 2, r.y + r.h / 2, r.w * 1.6, palette.lampGlow, 0.35, 0.1);
    ctx.fillStyle = css(0xffd98a);
    ctx.fillRect(r.x, r.y, r.w, r.h);
    ctx.fillStyle = css(0xb8743a, 0.9);
    ctx.fillRect(r.x + r.w / 2 - 0.6, r.y, 1.2, r.h);
    ctx.fillRect(r.x, r.y + r.h / 2 - 0.6, r.w, 1.2);
  }
  const l = LODGE_ANCHORS.lantern;
  softBlob(ctx, l.x, l.y, 16, palette.lampGlow, 0.5, 0.1);
  return t.canvas;
}

export const BLIND_SIZE = { w: 120, h: 92, waterline: 82 } as const;
export const BLIND_ANCHORS = { mug: { x: 92, y: 36 } } as const;

/** Duck blind on stilts, wrapped in grass bundles, coffee mug on the ledge. */
export function paintBlind(): Canvas {
  const { w, h, waterline } = BLIND_SIZE;
  const t = createPaintTarget(w, h);
  const { ctx } = t;
  const rnd = seededRandom(31337);
  // Stilts
  ctx.fillStyle = css(palette.woodDark);
  for (const x of [16, 52, 96]) ctx.fillRect(x, 60, 4, waterline - 58);
  // Box
  ctx.fillStyle = linearV(ctx, 26, 66, [
    [0, palette.woodLight],
    [1, palette.wood],
  ]);
  ctx.fillRect(8, 28, 100, 36);
  // Shooting slot (dark)
  ctx.fillStyle = css(0x241a14);
  ctx.beginPath();
  ctx.roundRect(20, 32, 64, 9, 3);
  ctx.fill();
  // Grass bundles over the box
  const grass = [palette.reedDry, palette.reed, palette.cattail, palette.sage, 0xd8be82];
  for (let i = 0; i < 140; i++) {
    const x = 6 + rnd() * 104;
    const yBase = 66 - rnd() * 4;
    const top = 14 + rnd() * 26;
    if (x > 20 && x < 84 && top > 18 && top < 26 && rnd() > 0.2) continue;
    ctx.strokeStyle = css(grass[i % grass.length]!, 0.85);
    ctx.lineWidth = 0.8 + rnd() * 0.9;
    ctx.beginPath();
    const lean = (rnd() - 0.5) * 10;
    ctx.moveTo(x, yBase);
    ctx.quadraticCurveTo(x + lean * 0.4, (yBase + top) / 2, x + lean, top);
    ctx.stroke();
  }
  // Keep the shooting slot readable
  ctx.fillStyle = css(0x241a14, 0.9);
  ctx.beginPath();
  ctx.roundRect(24, 33, 56, 7, 3);
  ctx.fill();
  // Ledge + mug
  ctx.fillStyle = css(palette.woodLight);
  ctx.fillRect(84, 41, 22, 3);
  const m = BLIND_ANCHORS.mug;
  ctx.fillStyle = css(palette.cream);
  ctx.beginPath();
  ctx.roundRect(m.x - 4, m.y, 8, 6, 1.5);
  ctx.fill();
  ctx.strokeStyle = css(palette.cream);
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.arc(m.x + 4.5, m.y + 3, 2, -Math.PI / 2, Math.PI / 2);
  ctx.stroke();
  ctx.fillStyle = css(palette.rust);
  ctx.fillRect(m.x - 4, m.y + 2.4, 8, 1.2);
  return t.canvas;
}

// ---------------------------------------------------------------- phase 2: crew & fx

/** A small curved feather (for harvest puffs and confetti). Design 10×22. */
export function paintFeather(): Canvas {
  const t = createPaintTarget(10, 22);
  const { ctx } = t;
  ctx.fillStyle = linearV(ctx, 0, 22, [
    [0, palette.cream],
    [1, plumage.henLight],
  ]);
  ctx.beginPath();
  ctx.moveTo(5, 21);
  ctx.quadraticCurveTo(0, 12, 4, 1);
  ctx.quadraticCurveTo(10, 9, 5, 21);
  ctx.fill();
  ctx.strokeStyle = css(plumage.henDark, 0.6);
  ctx.lineWidth = 0.6;
  ctx.beginPath();
  ctx.moveTo(5, 21.5);
  ctx.quadraticCurveTo(4.6, 11, 4.2, 2);
  ctx.stroke();
  return t.canvas;
}

/** Sound-wave arc for the duck call: ")". Design 14×30. */
export function paintSoundArc(): Canvas {
  const t = createPaintTarget(14, 30);
  const { ctx } = t;
  ctx.strokeStyle = 'rgba(255,255,255,0.95)';
  ctx.lineWidth = 2.4;
  ctx.beginPath();
  ctx.arc(-6, 15, 16, -0.75, 0.75);
  ctx.stroke();
  return t.canvas;
}

/** Brass gear with 8 teeth. Design 14×14, centered. */
export function paintGear(): Canvas {
  const t = createPaintTarget(14, 14);
  const { ctx } = t;
  ctx.fillStyle = css(palette.brass);
  ctx.beginPath();
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2;
    const r = i % 2 === 0 ? 6.8 : 5.2;
    ctx.lineTo(7 + Math.cos(a) * r, 7 + Math.sin(a) * r);
  }
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = css(0x8a6a2a);
  ctx.beginPath();
  ctx.arc(7, 7, 2.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = css(0xf0d690, 0.7);
  ctx.beginPath();
  ctx.arc(5.6, 5.4, 1.2, 0, Math.PI * 2);
  ctx.fill();
  return t.canvas;
}

/** Wooden peg leg with a brass foot. Design 6×12, anchor top-center. */
export function paintPegLeg(): Canvas {
  const t = createPaintTarget(6, 12);
  const { ctx } = t;
  ctx.fillStyle = css(palette.woodDark);
  ctx.beginPath();
  ctx.roundRect(1.8, 0, 2.4, 10, 1.2);
  ctx.fill();
  ctx.fillStyle = css(palette.brass);
  ctx.beginPath();
  ctx.ellipse(3.6, 10.6, 2.6, 1.3, 0, 0, Math.PI * 2);
  ctx.fill();
  return t.canvas;
}

export type DecoyBotKind = 'caller' | 'blind' | 'generic' | 'scout' | 'setter' | 'ledger' | 'foreman' | 'tinker';

/**
 * Decoy-bot: an upright carved decoy body on peg legs with a duck head,
 * rivets and a brass gear socket. Design 28×36, feet at y=36.
 */
export function paintDecoyBot(kind: DecoyBotKind): Canvas {
  const t = createPaintTarget(28, 36);
  const { ctx } = t;
  if (kind === 'setter') {
    // Waist-deep in the marsh: clip the body at the waterline.
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, -4, 28, 31);
    ctx.clip();
  }
  // Body (painted like a drake: chestnut chest, gray flank, dark tail cap)
  ctx.fillStyle = linearV(ctx, 12, 34, [
    [0, plumage.drakeFlank],
    [1, 0xa8a094],
  ]);
  ctx.beginPath();
  ctx.ellipse(13, 24, 10, 10.5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = css(plumage.drakeBreast);
  ctx.beginPath();
  ctx.ellipse(17, 21.5, 6, 6.5, 0.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = css(plumage.drakeTail);
  ctx.beginPath();
  ctx.ellipse(5, 28, 3.5, 4.5, 0.4, 0, Math.PI * 2);
  ctx.fill();
  // Carved seam & rivets
  ctx.strokeStyle = css(palette.woodDark, 0.55);
  ctx.lineWidth = 0.7;
  ctx.beginPath();
  ctx.moveTo(4, 25);
  ctx.quadraticCurveTo(13, 28, 22.5, 24);
  ctx.stroke();
  ctx.fillStyle = css(palette.brass);
  for (const [x, y] of [[7, 22], [12, 31], [20, 28]] as const) {
    ctx.beginPath();
    ctx.arc(x, y, 0.8, 0, Math.PI * 2);
    ctx.fill();
  }
  // Neck + head
  const henHead = kind === 'blind' || kind === 'setter' || kind === 'foreman';
  const headColor = henHead ? plumage.henBody : plumage.drakeHead;
  ctx.fillStyle = css(headColor);
  ctx.beginPath();
  ctx.ellipse(15, 12, 4, 4.5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(16, 8, 6, 5.2, 0, 0, Math.PI * 2);
  ctx.fill();
  if (!henHead) {
    ctx.strokeStyle = css(palette.white);
    ctx.lineWidth = 1.1;
    ctx.beginPath();
    ctx.moveTo(11.5, 14.2);
    ctx.lineTo(18.5, 14.6);
    ctx.stroke();
    ctx.fillStyle = css(plumage.drakeHeadSheen, 0.6);
    ctx.beginPath();
    ctx.ellipse(15, 6.3, 3, 1.5, -0.2, 0, Math.PI * 2);
    ctx.fill();
  }
  // Bill
  ctx.fillStyle = css(henHead ? plumage.henBill : plumage.bill);
  ctx.beginPath();
  ctx.moveTo(21, 7.5);
  ctx.quadraticCurveTo(27, 8.6, 27, 10.2);
  ctx.quadraticCurveTo(24, 11.2, 21, 10.8);
  ctx.fill();
  // Button eye with a brass rim
  ctx.fillStyle = css(palette.brass);
  ctx.beginPath();
  ctx.arc(18, 6.8, 1.7, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = css(palette.ink);
  ctx.beginPath();
  ctx.arc(18.2, 6.8, 1, 0, Math.PI * 2);
  ctx.fill();
  if (kind === 'caller') {
    // Wooden duck call held in the bill, brass band
    ctx.fillStyle = css(palette.woodLight);
    ctx.beginPath();
    ctx.roundRect(22.5, 10.4, 5.2, 2.6, 1);
    ctx.fill();
    ctx.fillStyle = css(palette.brass);
    ctx.fillRect(24.6, 10.4, 1, 2.6);
  }
  if (kind === 'blind') {
    // Grass hat for staying hidden
    const grass = [palette.reedDry, palette.reed, 0xd8be82, palette.sage];
    for (let i = 0; i < 18; i++) {
      const x = 9 + (i / 17) * 14;
      ctx.strokeStyle = css(grass[i % grass.length]!);
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x, 5);
      ctx.lineTo(x + (i % 3 - 1) * 2.2, -0.5 + (i % 4));
      ctx.stroke();
    }
    ctx.fillStyle = css(0x9a8a5a);
    ctx.beginPath();
    ctx.ellipse(16, 4.4, 8, 2, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  if (kind === 'scout') {
    // Brass spyglass held up to the eye
    ctx.save();
    ctx.translate(19, 6.5);
    ctx.rotate(-0.12);
    ctx.fillStyle = css(palette.brass);
    ctx.beginPath();
    ctx.roundRect(0, -1.6, 9, 3.2, 1);
    ctx.fill();
    ctx.fillStyle = css(0x8a6a2a);
    ctx.fillRect(3.2, -1.8, 1, 3.6);
    ctx.fillStyle = css(0xbfe0ff, 0.9);
    ctx.fillRect(8.4, -1.2, 0.8, 2.4);
    ctx.restore();
  }
  if (kind === 'ledger') {
    // Round spectacles and a little notebook
    ctx.strokeStyle = css(palette.brass);
    ctx.lineWidth = 0.7;
    ctx.beginPath();
    ctx.arc(18, 6.8, 2.4, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = css(palette.cream);
    ctx.beginPath();
    ctx.roundRect(15, 20, 9, 7, 1);
    ctx.fill();
    ctx.strokeStyle = css(palette.rust);
    ctx.lineWidth = 0.6;
    for (const y of [22, 23.6, 25.2]) {
      ctx.beginPath();
      ctx.moveTo(16.5, y);
      ctx.lineTo(22.5, y);
      ctx.stroke();
    }
    ctx.strokeStyle = css(palette.woodDark);
    ctx.lineWidth = 0.9;
    ctx.beginPath();
    ctx.moveTo(23.5, 17.5);
    ctx.lineTo(20.5, 23);
    ctx.stroke();
  }
  if (kind === 'foreman') {
    // Yellow hard hat and a clipboard
    ctx.fillStyle = css(0xf2c43a);
    ctx.beginPath();
    ctx.ellipse(16, 4.2, 6.5, 4.5, 0, Math.PI, Math.PI * 2);
    ctx.fill();
    ctx.fillRect(8.5, 3.6, 15, 1.6);
    ctx.fillStyle = css(palette.woodLight);
    ctx.beginPath();
    ctx.roundRect(16, 19, 8, 10, 1);
    ctx.fill();
    ctx.fillStyle = css(palette.cream);
    ctx.fillRect(17, 20.5, 6, 7.5);
    ctx.fillStyle = css(palette.brass);
    ctx.fillRect(18.5, 18.4, 3, 1.4);
  }
  if (kind === 'tinker') {
    // Goggles pushed up and a wrench
    ctx.fillStyle = css(palette.woodDark);
    ctx.fillRect(10, 3.4, 12, 1.6);
    ctx.fillStyle = css(palette.brass);
    for (const x of [13, 18.5]) {
      ctx.beginPath();
      ctx.arc(x, 4.2, 2.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = css(0x9fd0e0);
      ctx.beginPath();
      ctx.arc(x, 4.2, 1.3, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = css(palette.brass);
    }
    ctx.save();
    ctx.translate(22, 22);
    ctx.rotate(-0.6);
    ctx.fillStyle = css(0x9aa0a6);
    ctx.fillRect(-1, 0, 2, 9);
    ctx.beginPath();
    ctx.arc(0, 0, 2.6, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = css(palette.cream, 0);
    ctx.restore();
  }
  if (kind === 'setter') {
    ctx.restore();
    // Decoy tucked under a wing, and a ring of water at the waist
    ctx.fillStyle = css(plumage.drakeHead);
    ctx.beginPath();
    ctx.ellipse(5, 20, 4.5, 3, -0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = css(plumage.drakeFlank);
    ctx.beginPath();
    ctx.ellipse(4, 22.5, 5, 2.6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = css(palette.white, 0.7);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.ellipse(13, 27, 11, 2.2, 0, 0, Math.PI * 2);
    ctx.stroke();
  }
  return t.canvas;
}

/** "!" speech bubble shown over a stuck bot. Design 22×26, tail at bottom. */
export function paintAlertBubble(): Canvas {
  const t = createPaintTarget(22, 26);
  const { ctx } = t;
  ctx.fillStyle = css(palette.cream);
  ctx.strokeStyle = css(palette.woodDark);
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.roundRect(1.5, 1.5, 19, 17, 7);
  ctx.moveTo(8, 18.2);
  ctx.lineTo(11, 24);
  ctx.lineTo(14, 18.2);
  ctx.fill();
  ctx.beginPath();
  ctx.roundRect(1.5, 1.5, 19, 17, 7);
  ctx.stroke();
  ctx.fillStyle = css(palette.white);
  ctx.beginPath();
  ctx.moveTo(8, 17.6);
  ctx.lineTo(11, 23);
  ctx.lineTo(14, 17.6);
  ctx.fill();
  ctx.fillStyle = css(palette.rust);
  ctx.beginPath();
  ctx.roundRect(9.6, 4.5, 2.8, 8, 1.4);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(11, 15, 1.6, 0, Math.PI * 2);
  ctx.fill();
  return t.canvas;
}

export type DogKind = 'lab' | 'robo';

/** Dog body without legs, facing right. Design 56×30; leg sockets noted in DOG_RIG. */
export function paintDogBody(kind: DogKind): Canvas {
  const t = createPaintTarget(56, 30);
  const { ctx } = t;
  const coat = kind === 'lab' ? 0xd9b26f : palette.woodLight;
  const dark = kind === 'lab' ? 0xb88a4a : palette.wood;
  // Body
  ctx.fillStyle = linearV(ctx, 8, 26, [
    [0, coat],
    [1, dark],
  ]);
  ctx.beginPath();
  ctx.ellipse(24, 17, 16, 7.5, 0, 0, Math.PI * 2);
  ctx.fill();
  // Chest
  ctx.beginPath();
  ctx.ellipse(36, 17, 7, 7.5, 0.3, 0, Math.PI * 2);
  ctx.fill();
  // Neck & head
  ctx.fillStyle = css(coat);
  ctx.beginPath();
  ctx.ellipse(41, 11, 5, 6, 0.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(45, 7.5, 6.5, 5.5, 0, 0, Math.PI * 2);
  ctx.fill();
  // Snout
  ctx.beginPath();
  ctx.roundRect(46, 6.5, 9, 5.5, 2.6);
  ctx.fill();
  ctx.fillStyle = css(palette.ink);
  ctx.beginPath();
  ctx.ellipse(54.3, 8, 1.6, 1.3, 0, 0, Math.PI * 2);
  ctx.fill();
  // Ear
  ctx.fillStyle = css(dark);
  ctx.beginPath();
  ctx.ellipse(42.5, 8.5, 2.6, 4.8, 0.25, 0, Math.PI * 2);
  ctx.fill();
  // Eye
  ctx.fillStyle = css(palette.ink);
  ctx.beginPath();
  ctx.arc(47.5, 5.8, 1, 0, Math.PI * 2);
  ctx.fill();
  if (kind === 'lab') {
    // Red collar
    ctx.strokeStyle = css(palette.rust);
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(38.6, 8.5);
    ctx.lineTo(41.2, 15.5);
    ctx.stroke();
  } else {
    // Wood grain, brass rivets and a gear socket
    ctx.strokeStyle = css(palette.woodDark, 0.45);
    ctx.lineWidth = 0.6;
    for (const y of [13, 17, 21]) {
      ctx.beginPath();
      ctx.moveTo(11, y);
      ctx.quadraticCurveTo(24, y - 1.5, 34, y + 0.5);
      ctx.stroke();
    }
    ctx.fillStyle = css(palette.brass);
    for (const [x, y] of [[14, 12], [30, 12], [38, 19]] as const) {
      ctx.beginPath();
      ctx.arc(x, y, 0.9, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = css(palette.brass);
    ctx.beginPath();
    ctx.arc(47.5, 5.8, 1.8, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = css(palette.ink);
    ctx.beginPath();
    ctx.arc(47.7, 5.8, 1, 0, Math.PI * 2);
    ctx.fill();
  }
  return t.canvas;
}

/** Dog leg. Design 6×12, anchor top-center. */
export function paintDogLeg(kind: DogKind): Canvas {
  const t = createPaintTarget(6, 12);
  const { ctx } = t;
  ctx.fillStyle = css(kind === 'lab' ? 0xc9a060 : palette.woodDark);
  ctx.beginPath();
  ctx.roundRect(1.4, 0, 3.2, 11, 1.6);
  ctx.fill();
  if (kind === 'robo') {
    ctx.fillStyle = css(palette.brass);
    ctx.beginPath();
    ctx.arc(3, 5, 1.1, 0, Math.PI * 2);
    ctx.fill();
  }
  return t.canvas;
}

/** Tail: Lab otter tail or a brass spring. Design 14×8, anchor right-center. */
export function paintDogTail(kind: DogKind): Canvas {
  const t = createPaintTarget(14, 8);
  const { ctx } = t;
  if (kind === 'lab') {
    ctx.fillStyle = css(0xc9a060);
    ctx.beginPath();
    ctx.moveTo(14, 3);
    ctx.quadraticCurveTo(6, 1, 0, 3.6);
    ctx.quadraticCurveTo(6, 4, 14, 6);
    ctx.fill();
  } else {
    ctx.strokeStyle = css(palette.brass);
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    for (let x = 14; x >= 1; x -= 0.5) {
      const y = 4 + Math.sin(x * 1.6) * 2.2;
      if (x === 14) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
  return t.canvas;
}

/** Swimming dog: head and a sliver of back above the waterline. Design 40×16, waterline y=14. */
export function paintDogSwim(kind: DogKind): Canvas {
  const t = createPaintTarget(40, 16);
  const { ctx } = t;
  const coat = kind === 'lab' ? 0xd9b26f : palette.woodLight;
  const dark = kind === 'lab' ? 0xb88a4a : palette.wood;
  ctx.fillStyle = css(dark);
  ctx.beginPath();
  ctx.ellipse(14, 14, 13, 2.6, 0, Math.PI, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = css(coat);
  ctx.beginPath();
  ctx.ellipse(29, 8.5, 6, 5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.roundRect(30, 7.5, 9, 5, 2.4);
  ctx.fill();
  ctx.fillRect(25, 9, 7, 5);
  ctx.fillStyle = css(dark);
  ctx.beginPath();
  ctx.ellipse(26.5, 9.5, 2.4, 4.2, 0.25, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = css(palette.ink);
  ctx.beginPath();
  ctx.ellipse(38.4, 9, 1.5, 1.2, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(31.5, 6.8, kind === 'robo' ? 1.2 : 0.9, 0, Math.PI * 2);
  ctx.fill();
  return t.canvas;
}

/** A weathered plank deck beside the blind. Design 80×22, deck top at y=4. */
export function paintDeck(): Canvas {
  const t = createPaintTarget(80, 22);
  const { ctx } = t;
  ctx.fillStyle = css(palette.woodDark);
  for (const x of [4, 38, 72]) ctx.fillRect(x, 6, 3.4, 16);
  ctx.fillStyle = linearV(ctx, 2, 8, [
    [0, palette.woodLight],
    [1, palette.wood],
  ]);
  ctx.beginPath();
  ctx.roundRect(0, 2, 80, 6, 1.5);
  ctx.fill();
  ctx.strokeStyle = css(palette.woodDark, 0.6);
  ctx.lineWidth = 0.6;
  for (let x = 9; x < 80; x += 9) {
    ctx.beginPath();
    ctx.moveTo(x, 2.4);
    ctx.lineTo(x, 7.6);
    ctx.stroke();
  }
  return t.canvas;
}

/** A thin rain streak. Design 2×26. */
export function paintRainStreak(): Canvas {
  const t = createPaintTarget(2, 26, 2);
  const g = t.ctx.createLinearGradient(0, 0, 0, 26);
  g.addColorStop(0, 'rgba(255,255,255,0)');
  g.addColorStop(1, 'rgba(255,255,255,0.9)');
  t.ctx.fillStyle = g;
  t.ctx.fillRect(0.4, 0, 1.2, 26);
  return t.canvas;
}
