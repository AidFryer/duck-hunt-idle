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
  // Painterly cumulus: overlapping crisp puffs on a flat base, lit from above,
  // painted at full resolution so they stay sharp on 3x phone screens.
  const w = 260;
  const h = 110;
  const t = createPaintTarget(w, h);
  const { ctx } = t;
  const rnd = seededRandom(1000 + variant * 31);
  const flat = variant % 2 === 1;
  const puffs: { x: number; y: number; r: number }[] = [];
  const n = flat ? 9 : 7;
  for (let i = 0; i < n; i++) {
    const p = i / (n - 1);
    const hump = Math.sin(p * Math.PI);
    const r = flat ? 14 + hump * 10 + rnd() * 6 : 16 + hump * 24 + rnd() * 8;
    puffs.push({ x: 26 + p * (w - 52) + (rnd() - 0.5) * 10, y: h - 20 - r * 0.55 - hump * (flat ? 4 : 10), r });
  }
  const base = h - 16;
  const shape = () => {
    ctx.beginPath();
    for (const q of puffs) {
      ctx.moveTo(q.x + q.r, q.y);
      ctx.arc(q.x, q.y, q.r, 0, Math.PI * 2);
    }
    ctx.rect(puffs[0]!.x, base - 14, puffs[n - 1]!.x - puffs[0]!.x, 14);
  };
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, 0, w, base);
  ctx.clip();
  // Body with a cool underside
  shape();
  ctx.fillStyle = linearV(ctx, 10, base, [[0, 0xffffff], [0.6, 0xf3f1ee], [1, 0xc9ccd8]]);
  ctx.fill();
  // Sunlit tops: a lighter copy of each puff nudged up-left
  ctx.globalCompositeOperation = 'source-atop';
  for (const q of puffs) {
    ctx.fillStyle = css(0xffffff, 0.55);
    ctx.beginPath();
    ctx.arc(q.x - q.r * 0.18, q.y - q.r * 0.22, q.r * 0.78, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
  // A soft feathered base so it sits in the sky
  const g = ctx.createLinearGradient(0, base - 6, 0, base);
  g.addColorStop(0, 'rgba(201,204,216,0)');
  g.addColorStop(1, 'rgba(201,204,216,0.5)');
  ctx.fillStyle = g;
  ctx.fillRect(puffs[0]!.x, base - 6, puffs[n - 1]!.x - puffs[0]!.x, 6);
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
  const g = t.ctx.createRadialGradient(128, 150, 90, 128, 140, 200);
  g.addColorStop(0, 'rgba(20,12,6,0)');
  g.addColorStop(0.75, 'rgba(20,12,6,0.06)');
  g.addColorStop(1, 'rgba(20,12,6,0.28)');
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
  if (L.form) return paintGooseFly(L);
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
  if (L.form) return paintGooseWing(L);
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
  if (L.form) return paintGooseSit(L, decoy);
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

// ---------------------------------------------------------------- geese & cranes

/** A goose (or crane) in flight, facing right. Same 64×26 design box as a duck. */
function paintGooseFly(L: DuckLook): Canvas {
  const t = createPaintTarget(64, 26);
  const { ctx } = t;
  const crane = L.form === 'crane';
  const neck = L.neck ?? L.head;
  if (crane) {
    // Long legs trailing behind
    ctx.strokeStyle = css(0x3a3632);
    ctx.lineWidth = 1.1;
    ctx.beginPath();
    ctx.moveTo(12, 15.5);
    ctx.lineTo(0.5, 16.5);
    ctx.moveTo(12, 16.5);
    ctx.lineTo(1, 18);
    ctx.stroke();
  }
  // Tail
  ctx.fillStyle = css(L.tail);
  ctx.beginPath();
  ctx.moveTo(10, 12);
  ctx.lineTo(3, 11);
  ctx.lineTo(3, 16);
  ctx.lineTo(10, 16);
  ctx.fill();
  // Body
  ctx.fillStyle = linearV(ctx, 8, 21, [[0, L.back], [0.5, L.flank], [1, shadeHex(L.breast, 1.05)]]);
  ellipse(ctx, 24, 14, crane ? 14 : 16, crane ? 5.2 : 6.4);
  ctx.fill();
  if (L.belly) {
    ctx.fillStyle = css(L.belly, 0.85);
    for (const x of [22, 26, 30]) {
      ellipse(ctx, x, 18.6, 1.6, 0.9);
      ctx.fill();
    }
  }
  if (L.streaky) streaksIn(ctx, 12, 9, 24, 9, 31, shadeHex(L.back, 0.7));
  // Long neck
  ctx.strokeStyle = css(neck);
  ctx.lineWidth = crane ? 2.4 : 3.6;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(36, 13);
  ctx.lineTo(crane ? 54 : 50, crane ? 11 : 10);
  ctx.stroke();
  // Head
  const hx = crane ? 56 : 52.5;
  const hy = crane ? 10.6 : 9.5;
  ctx.fillStyle = css(L.head);
  ellipse(ctx, hx, hy, crane ? 3 : 3.6, crane ? 2.4 : 3);
  ctx.fill();
  if (L.cheek) {
    ctx.fillStyle = css(L.cheek);
    ellipse(ctx, hx - 0.6, hy + 1, crane ? 1.8 : 2.2, 1.3);
    ctx.fill();
  }
  if (L.crownRed) {
    ctx.fillStyle = css(0xc8402a);
    ellipse(ctx, hx + 0.4, hy - 1.4, 1.6, 0.9);
    ctx.fill();
  }
  // Bill
  ctx.fillStyle = css(L.bill);
  ctx.beginPath();
  ctx.moveTo(hx + 2.6, hy - 0.8);
  ctx.lineTo(hx + (crane ? 8 : 6), hy + 0.2);
  ctx.lineTo(hx + 2.6, hy + 1.2);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = css(palette.ink);
  ctx.beginPath();
  ctx.arc(hx + 0.8, hy - 0.4, 0.7, 0, Math.PI * 2);
  ctx.fill();
  return t.canvas;
}

/** Broad goose wing: plain coverts and darker flight-feather tips. */
function paintGooseWing(L: DuckLook): Canvas {
  const t = createPaintTarget(30, 28);
  const { ctx } = t;
  const base = shadeHex(L.back, 1.1);
  ctx.fillStyle = linearV(ctx, 28, 0, [[0, base], [0.7, shadeHex(L.back, 0.95)], [1, shadeHex(L.back, 0.8)]]);
  ctx.beginPath();
  ctx.moveTo(4, 28);
  ctx.quadraticCurveTo(0, 13, 4, 0.5);
  ctx.quadraticCurveTo(17, 9, 24, 28);
  ctx.closePath();
  ctx.fill();
  ctx.save();
  ctx.clip();
  // Primaries: black on snow geese, darker on everything else
  ctx.fillStyle = css(L.speculum, 0.9);
  ctx.fillRect(0, 0, 30, 8);
  ctx.strokeStyle = css(shadeHex(L.back, 0.7), 0.5);
  ctx.lineWidth = 0.6;
  for (let i = 0; i < 5; i++) {
    ctx.beginPath();
    ctx.moveTo(3 + i * 1.6, 8 + i * 3.4);
    ctx.lineTo(9 + i * 2.6, 10 + i * 3.4);
    ctx.stroke();
  }
  ctx.restore();
  return t.canvas;
}

/** A goose or crane on the ground (or a full-body decoy). Same 60×34 box as a swimmer. */
function paintGooseSit(L: DuckLook, decoy: boolean): Canvas {
  const t = createPaintTarget(60, 34);
  const { ctx } = t;
  const crane = L.form === 'crane';
  const neck = L.neck ?? L.head;
  if (decoy) {
    // Stake under a full-body decoy
    ctx.fillStyle = css(palette.woodDark);
    ctx.fillRect(25, 28, 2, 6);
  }
  // Tail
  ctx.fillStyle = css(L.tail);
  ctx.beginPath();
  ctx.moveTo(10, 24);
  ctx.lineTo(3, 20);
  ctx.lineTo(10, 19);
  ctx.fill();
  // Body
  ctx.fillStyle = linearV(ctx, 15, 31, [[0, L.back], [0.45, L.flank], [1, shadeHex(L.breast, 1.05)]]);
  ellipse(ctx, 24, 24, crane ? 15 : 17, crane ? 7 : 8);
  ctx.fill();
  // Folded wing
  ctx.fillStyle = css(shadeHex(L.back, 0.85), 0.8);
  ellipse(ctx, 20, 21, 12, 4, 0.06);
  ctx.fill();
  ctx.fillStyle = css(L.speculum, 0.85);
  ellipse(ctx, 10, 21, 4, 2.4, 0.1);
  ctx.fill();
  if (L.belly && !decoy) {
    ctx.fillStyle = css(L.belly, 0.85);
    for (const x of [26, 30, 34]) {
      ellipse(ctx, x, 29, 1.6, 0.9);
      ctx.fill();
    }
  }
  if (L.streaky) streaksIn(ctx, 10, 17, 26, 10, 41, shadeHex(L.back, 0.7));
  // Upright neck
  ctx.strokeStyle = css(neck);
  ctx.lineWidth = crane ? 2.6 : 4.2;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(37, 21);
  ctx.quadraticCurveTo(41, crane ? 10 : 13, crane ? 42 : 43, crane ? 3 : 6);
  ctx.stroke();
  const hx = crane ? 43.5 : 45;
  const hy = crane ? 3 : 5.4;
  ctx.fillStyle = css(L.head);
  ellipse(ctx, hx, hy, crane ? 3 : 4, crane ? 2.4 : 3.2);
  ctx.fill();
  if (L.cheek) {
    ctx.fillStyle = css(L.cheek);
    ellipse(ctx, hx - 0.8, hy + 1.2, crane ? 1.8 : 2.4, 1.4);
    ctx.fill();
  }
  if (L.crownRed) {
    ctx.fillStyle = css(0xc8402a);
    ellipse(ctx, hx + 0.4, hy - 1.5, 1.6, 0.9);
    ctx.fill();
  }
  ctx.fillStyle = css(L.bill);
  ctx.beginPath();
  ctx.moveTo(hx + 3, hy - 0.8);
  ctx.lineTo(hx + (crane ? 9 : 7), hy + 0.4);
  ctx.lineTo(hx + 3, hy + 1.4);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = css(palette.ink);
  ctx.beginPath();
  ctx.arc(hx + 1, hy - 0.4, decoy ? 0.9 : 0.75, 0, Math.PI * 2);
  ctx.fill();
  if (decoy) {
    ctx.strokeStyle = css(palette.cream, 0.3);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(11, 18.5);
    ctx.quadraticCurveTo(24, 15, 36, 18);
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

/** Per-level chimney top and lit windows (the shack is smaller). */
export function lodgeAnchors(level: number): { chimneyTop: { x: number; y: number }; windows: { x: number; y: number; w: number; h: number }[] } {
  if (level <= 1) return { chimneyTop: { x: 121, y: 68 }, windows: [{ x: 66, y: 112, w: 14, h: 12 }] };
  const windows: { x: number; y: number; w: number; h: number }[] = [...LODGE_ANCHORS.windows];
  if (level >= 5) windows.push({ x: 12, y: 50, w: 10, h: 11 });
  return { chimneyTop: LODGE_ANCHORS.chimneyTop, windows };
}

const LODGE_SIGN = ['', 'CABIN', 'CABIN', 'LODGE', 'CLUB', 'GRAND LODGE'];

/** A leaky trapper's shack: tin roof, stovepipe, one window. */
function paintShack(): Canvas {
  const { w, h, ground } = LODGE_SIZE;
  const t = createPaintTarget(w, h);
  const { ctx } = t;
  const rnd = seededRandom(77);
  // Short dock
  ctx.fillStyle = css(palette.woodDark);
  for (const x of [176, 198]) ctx.fillRect(x, ground - 6, 3.5, h - ground + 6);
  ctx.fillStyle = css(palette.woodLight);
  ctx.fillRect(166, ground - 8, 40, 5);
  // Block footings
  ctx.fillStyle = css(0x6f6a62);
  for (const x of [54, 96, 134]) ctx.fillRect(x, ground - 6, 8, 6);
  // Weathered board walls
  for (let x = 52; x < 142; x += 6) {
    ctx.fillStyle = css(rnd() > 0.5 ? 0x8a7660 : 0x7a6652);
    ctx.fillRect(x, 100, 5.4, ground - 106);
  }
  ctx.fillStyle = css(0x5e4c3c, 0.5);
  ctx.fillRect(52, 100, 90, 3);
  // Stovepipe
  ctx.fillStyle = css(0x4f4a44);
  ctx.fillRect(117, 70, 7, 22);
  ctx.fillRect(115, 68, 11, 3);
  // Tin roof with ridges and a rust patch
  ctx.fillStyle = css(0x9a9a96);
  ctx.beginPath();
  ctx.moveTo(42, 106);
  ctx.lineTo(146, 86);
  ctx.lineTo(150, 94);
  ctx.lineTo(44, 113);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = css(0x6a6a66, 0.8);
  ctx.lineWidth = 0.8;
  for (let x = 48; x < 148; x += 6) {
    ctx.beginPath();
    ctx.moveTo(x, 106 - (x - 42) * 0.19);
    ctx.lineTo(x + 1.5, 113 - (x - 42) * 0.19);
    ctx.stroke();
  }
  ctx.fillStyle = css(palette.rust, 0.55);
  ellipse(ctx, 92, 99, 9, 3);
  ctx.fill();
  // Window and door
  windowFrame(ctx, { x: 66, y: 112, w: 14, h: 12 });
  ctx.fillStyle = css(palette.woodDark);
  ctx.fillRect(104, 116, 15, ground - 122);
  ctx.fillStyle = css(palette.brass);
  ctx.beginPath();
  ctx.arc(116, 132, 1.2, 0, Math.PI * 2);
  ctx.fill();
  // Hitching post with a lantern
  ctx.fillStyle = css(palette.woodDark);
  ctx.fillRect(LODGE_ANCHORS.lantern.x - 1.5, LODGE_ANCHORS.lantern.y, 3, ground - LODGE_ANCHORS.lantern.y);
  ctx.fillStyle = css(palette.ink);
  ctx.fillRect(LODGE_ANCHORS.lantern.x - 2.5, LODGE_ANCHORS.lantern.y - 4, 5, 8);
  ctx.fillStyle = css(0xf2d08a);
  ctx.fillRect(LODGE_ANCHORS.lantern.x - 1.6, LODGE_ANCHORS.lantern.y - 2.6, 3.2, 5);
  // A few split logs
  for (let c = 0; c < 3; c++) {
    ctx.fillStyle = css(0xb88758);
    ellipse(ctx, 150 + c * 6, ground - 4, 3, 2.8);
    ctx.fill();
  }
  return t.canvas;
}

export function paintLodge(level = 3): Canvas {
  if (level <= 1) return paintShack();
  const { w, h, ground } = LODGE_SIZE;
  const t = createPaintTarget(w, h);
  const { ctx } = t;
  const rnd = seededRandom(555);

  // Grand Lodge: a stone tower wing peeks out behind on the left.
  if (level >= 5) {
    ctx.fillStyle = css(0x7a736a);
    ctx.fillRect(2, 44, 34, ground - 58);
    for (let i = 0; i < 18; i++) {
      ctx.fillStyle = css(i % 2 ? 0x8d877c : 0x655f57);
      ellipse(ctx, 6 + (i % 4) * 8, 50 + Math.floor(i / 4) * 10, 3.4, 2.6);
      ctx.fill();
    }
    ctx.fillStyle = css(0x7c3f24);
    ctx.beginPath();
    ctx.moveTo(-2, 46);
    ctx.lineTo(19, 22);
    ctx.lineTo(40, 46);
    ctx.closePath();
    ctx.fill();
    windowFrame(ctx, { x: 12, y: 50, w: 10, h: 11 });
  }

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
  const sign = LODGE_SIGN[Math.min(level, 5)]!;
  ctx.font = `bold ${sign.length > 6 ? 5 : 6.5}px Georgia, serif`;
  ctx.fillText(sign, 101, 85);

  // Marsh Lodge and up: porch railing and flower boxes.
  if (level >= 3) {
    ctx.fillStyle = css(palette.woodDark);
    ctx.fillRect(6, 118, 38, 2.5);
    for (let x = 10; x < 44; x += 6) ctx.fillRect(x, 118, 1.6, wallBottom - 118);
    for (const r of [LODGE_ANCHORS.windows[0], LODGE_ANCHORS.windows[1]]) {
      ctx.fillStyle = css(0x8a4a2c);
      ctx.fillRect(r.x - 2, r.y + r.h + 2, r.w + 4, 4);
      for (let i = 0; i < 5; i++) {
        ctx.fillStyle = css(i % 2 ? 0xf2c46d : 0xd2693a);
        ctx.beginPath();
        ctx.arc(r.x + 1 + i * (r.w / 4), r.y + r.h + 1.5, 1.4, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
  // Sporting Club and up: a flag on the ridge and string lights on the porch.
  if (level >= 4) {
    ctx.strokeStyle = css(palette.woodDark);
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(96, 18);
    ctx.lineTo(96, 2);
    ctx.stroke();
    ctx.fillStyle = css(palette.rust);
    ctx.beginPath();
    ctx.moveTo(96, 2);
    ctx.lineTo(108, 5);
    ctx.lineTo(96, 8);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = css(0x3e281a, 0.7);
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.moveTo(6, 85);
    ctx.quadraticCurveTo(24, 92, 42, 80);
    ctx.stroke();
    for (let i = 0; i < 6; i++) {
      ctx.fillStyle = css(0xffd98a);
      ctx.beginPath();
      ctx.arc(9 + i * 6, 86 + Math.sin(i / 1.6) * 2.5, 1, 0, Math.PI * 2);
      ctx.fill();
    }
  }

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
export function paintLodgeGlow(level = 3): Canvas {
  const { w, h } = LODGE_SIZE;
  const t = createPaintTarget(w, h);
  const { ctx } = t;
  if (level >= 4) for (let i = 0; i < 6; i++) softBlob(ctx, 9 + i * 6, 86 + Math.sin(i / 1.6) * 2.5, 5, palette.lampGlow, 0.5, 0.1);
  for (const r of lodgeAnchors(level).windows) {
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

export type DecoyBotKind = 'caller' | 'blind' | 'generic' | 'scout' | 'setter' | 'ledger' | 'foreman' | 'tinker' | 'staker' | 'flagger' | 'layout' | 'guide' | 'boatman' | 'tCaller' | 'tBlind' | 'bCaller' | 'bBlind';

/** The far-water crews wear the marsh crew's gear plus their ground's hat. */
const FAR_LOOK: Partial<Record<DecoyBotKind, { base: DecoyBotKind; hat: DecoyBotKind }>> = {
  tCaller: { base: 'caller', hat: 'guide' },
  tBlind: { base: 'blind', hat: 'guide' },
  bCaller: { base: 'caller', hat: 'boatman' },
  bBlind: { base: 'blind', hat: 'boatman' },
};

/**
 * Decoy-bot: an upright carved decoy body on peg legs with a duck head,
 * rivets and a brass gear socket. Design 28×36, feet at y=36.
 */
export function paintDecoyBot(look: DecoyBotKind): Canvas {
  const far = FAR_LOOK[look];
  const kind = far?.base ?? look;
  const hat = far?.hat ?? look;
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
  const henHead = kind === 'blind' || kind === 'setter' || kind === 'foreman' || kind === 'layout';
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
  if (kind === 'flagger') {
    // A black flag on a short pole, held up high
    ctx.strokeStyle = css(palette.woodDark);
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(22, 26);
    ctx.lineTo(25, 2);
    ctx.stroke();
    ctx.fillStyle = css(0x1e1a18);
    ctx.beginPath();
    ctx.moveTo(25, 2);
    ctx.quadraticCurveTo(30, 3, 28, 9);
    ctx.lineTo(24.2, 9);
    ctx.closePath();
    ctx.fill();
  }
  if (kind === 'staker') {
    // A little goose decoy tucked under the wing
    ctx.fillStyle = css(0x6e5e4c);
    ctx.beginPath();
    ctx.ellipse(6, 27, 6, 3, -0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = css(0x1e1a18);
    ctx.fillRect(10, 20, 1.6, 6);
    ctx.beginPath();
    ctx.ellipse(11, 19.5, 2, 1.4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = css(0xf4f2ec);
    ctx.fillRect(10.2, 21, 1.4, 1.2);
  }
  if (kind === 'blind' || kind === 'layout') {
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
  if (hat === 'guide') {
    // Camo cap with a bill, and a lanyard of calls
    ctx.fillStyle = css(0x5a6a3a);
    ctx.beginPath();
    ctx.ellipse(15.5, 4.2, 6.5, 3.4, 0, Math.PI, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = css(0x3e4a28);
    ctx.beginPath();
    ctx.roundRect(15, 3.2, 8.5, 1.8, 0.8);
    ctx.fill();
    ctx.fillStyle = css(0x8a6a3a);
    for (const [x, y] of [[14, 16], [17, 17.5]] as const) {
      ctx.beginPath();
      ctx.roundRect(x, y, 2, 4, 0.8);
      ctx.fill();
    }
  }
  if (hat === 'boatman') {
    // Yellow sou'wester and a life ring
    ctx.fillStyle = css(0xe8b84a);
    ctx.beginPath();
    ctx.ellipse(15.5, 4.6, 7.5, 3.2, 0, Math.PI, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(15.5, 4.6, 9.5, 1.6, 0.1, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = css(0xd85a3a);
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.arc(6, 24, 4, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = css(0xf4f2ec);
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.arc(6, 24, 4, 0.3, 0.9);
    ctx.stroke();
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

/** The real dog's coat (set from the player's chosen breed before painting). */
export const dogCoat = { coat: 0xd9b26f, shade: 0xb88a4a, light: 0xead2a0, leg: 0xc9a060, patches: false };
export function setDogCoat(c: { coat: number; shade: number; light: number; patches?: boolean }): void {
  dogCoat.coat = c.coat;
  dogCoat.shade = c.shade;
  dogCoat.light = c.light;
  dogCoat.leg = c.shade;
  dogCoat.patches = !!c.patches;
}

/** Dog body without legs, facing right. Design 56×30; leg sockets noted in DOG_RIG. */
/** The bay's Pickup Skiff: a little wooden boat with an outboard and a net on a pole. 56×30. */
export function paintSkiff(): Canvas {
  const t = createPaintTarget(56, 30);
  const { ctx } = t;
  // Net pole and net
  ctx.strokeStyle = css(palette.woodDark);
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(30, 18);
  ctx.lineTo(46, 4);
  ctx.stroke();
  ctx.strokeStyle = css(palette.cream, 0.85);
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.ellipse(48, 6, 4.5, 3.2, -0.6, 0, Math.PI * 2);
  ctx.stroke();
  for (const d of [-2, 0, 2]) {
    ctx.beginPath();
    ctx.moveTo(46 + d, 3 + d * 0.4);
    ctx.lineTo(49 + d, 11);
    ctx.stroke();
  }
  // Outboard motor
  ctx.fillStyle = css(0x3a3f45);
  ctx.beginPath();
  ctx.roundRect(4, 11, 7, 7, 1.5);
  ctx.fill();
  ctx.fillRect(6, 18, 2.4, 7);
  ctx.fillStyle = css(0xd85a3a);
  ctx.fillRect(4, 12, 7, 2);
  // Hull
  ctx.fillStyle = linearV(ctx, 16, 28, [
    [0, palette.woodLight],
    [1, palette.wood],
  ]);
  ctx.beginPath();
  ctx.moveTo(9, 17);
  ctx.lineTo(51, 15);
  ctx.quadraticCurveTo(48, 26, 38, 27);
  ctx.lineTo(16, 27);
  ctx.quadraticCurveTo(10, 26, 9, 17);
  ctx.fill();
  // Gunwale and rivets
  ctx.strokeStyle = css(palette.woodDark);
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(9, 17);
  ctx.lineTo(51, 15);
  ctx.stroke();
  ctx.fillStyle = css(palette.brass);
  for (const x of [18, 26, 34, 42]) {
    ctx.beginPath();
    ctx.arc(x, 21.5, 0.9, 0, Math.PI * 2);
    ctx.fill();
  }
  // Water line
  ctx.strokeStyle = css(0x8fb8c8, 0.7);
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(6, 28.5);
  ctx.quadraticCurveTo(28, 26.5, 54, 28.5);
  ctx.stroke();
  return t.canvas;
}

export function paintDogBody(kind: DogKind): Canvas {
  const t = createPaintTarget(56, 30);
  const { ctx } = t;
  const coat = kind === 'lab' ? dogCoat.coat : palette.woodLight;
  const dark = kind === 'lab' ? dogCoat.shade : palette.wood;
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
  if (kind === 'lab' && dogCoat.patches) {
    // Springer patches: white body with liver saddle and head
    ctx.fillStyle = css(dogCoat.shade);
    ctx.beginPath();
    ctx.ellipse(20, 13, 8, 4.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(45, 6.5, 5, 4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = css(palette.ink);
    ctx.beginPath();
    ctx.arc(47.5, 5.8, 1, 0, Math.PI * 2);
    ctx.fill();
  }
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
  ctx.fillStyle = css(kind === 'lab' ? (dogCoat.patches ? dogCoat.coat : dogCoat.leg) : palette.woodDark);
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
    ctx.fillStyle = css(dogCoat.leg);
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
  const coat = kind === 'lab' ? (dogCoat.patches ? dogCoat.shade : dogCoat.coat) : palette.woodLight;
  const dark = kind === 'lab' ? dogCoat.shade : palette.wood;
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

// ---------------------------------------------------------------- lodge folk

export type PersonKind = 'gus' | 'guest0' | 'guest1' | 'guest2' | 'guest3' | 'angler';

const FOLK: Record<Exclude<PersonKind, 'gus'>, { coat: number; hat: number; pants: number }> = {
  guest0: { coat: 0x7a3a22, hat: 0x3e3226, pants: 0x4a4038 },
  guest1: { coat: 0x5e7352, hat: 0xb5562b, pants: 0x3a3632 },
  guest2: { coat: 0x9a8a5a, hat: 0x2a2622, pants: 0x5a4a3a },
  guest3: { coat: 0x4a5a6e, hat: 0x8a5a3b, pants: 0x3a3632 },
  angler: { coat: 0x6b4a2f, hat: 0xd8be82, pants: 0x3a4a38 },
};

/** A little standing person (24×36, feet at the bottom). Ray sits in his rocker. */
export function paintPerson(kind: PersonKind): Canvas {
  const t = createPaintTarget(24, 36);
  const { ctx } = t;
  if (kind === 'gus') {
    // Rocking chair
    ctx.strokeStyle = css(palette.woodDark);
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(3, 35);
    ctx.quadraticCurveTo(12, 37, 21, 33);
    ctx.moveTo(5, 34);
    ctx.lineTo(6, 14);
    ctx.moveTo(17, 34);
    ctx.lineTo(17, 24);
    ctx.stroke();
    ctx.fillStyle = css(palette.wood);
    ctx.fillRect(5, 23, 13, 2);
    // Ray: red flannel, grey beard, brown hat
    ctx.fillStyle = css(0x3a3632);
    ctx.fillRect(11, 25, 3, 8);
    ctx.fillRect(15, 25, 3, 8);
    ctx.fillStyle = css(0xa8402a);
    ctx.beginPath();
    ctx.roundRect(7, 13, 10, 12, 3);
    ctx.fill();
    ctx.fillStyle = css(0xe8c8a0);
    ctx.beginPath();
    ctx.arc(12, 10, 3.6, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = css(0xd8d4cc);
    ctx.beginPath();
    ctx.ellipse(12.5, 13, 3.2, 2.6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = css(0x6b4a2f);
    ctx.beginPath();
    ctx.ellipse(12, 7, 5.6, 1.4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillRect(9, 3.5, 6, 3.5);
    // Mug in hand
    ctx.fillStyle = css(palette.cream);
    ctx.fillRect(16, 17, 3, 3);
    return t.canvas;
  }
  const f = FOLK[kind];
  // Legs
  ctx.fillStyle = css(f.pants);
  ctx.fillRect(9, 24, 2.6, 11);
  ctx.fillRect(12.6, 24, 2.6, 11);
  ctx.fillStyle = css(0x2a2622);
  ctx.fillRect(8.5, 34, 3.5, 2);
  ctx.fillRect(12.4, 34, 3.5, 2);
  // Coat
  ctx.fillStyle = css(f.coat);
  ctx.beginPath();
  ctx.roundRect(7, 12, 10, 14, 3);
  ctx.fill();
  ctx.fillStyle = css(shadeHex(f.coat, 0.8));
  ctx.fillRect(11.6, 13, 0.9, 12);
  // Head and hat
  ctx.fillStyle = css(0xe8c8a0);
  ctx.beginPath();
  ctx.arc(12, 8.5, 3.6, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = css(f.hat);
  ctx.beginPath();
  ctx.ellipse(12, 6, 5.2, 1.3, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.roundRect(9.2, 2.2, 5.6, 4, 1.5);
  ctx.fill();
  if (kind === 'angler') {
    // Fishing rod over the shoulder
    ctx.strokeStyle = css(palette.woodDark);
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(15, 20);
    ctx.lineTo(23.5, 4);
    ctx.stroke();
  }
  return t.canvas;
}

/** A carved decoy for the lodge shelf. Design 56×36, keel at the bottom. */
export function paintCarving(look: { body: number; head: number; accent: number; goose?: boolean }): Canvas {
  const t = createPaintTarget(56, 36);
  const { ctx } = t;
  // Keel shadow
  ctx.fillStyle = css(palette.ink, 0.18);
  ctx.beginPath();
  ctx.ellipse(26, 33, 20, 2.4, 0, 0, Math.PI * 2);
  ctx.fill();
  // Body
  ctx.fillStyle = linearV(ctx, 14, 32, [
    [0, look.body],
    [1, shadeHex(look.body, 0.75)],
  ]);
  ctx.beginPath();
  ctx.moveTo(4, 22);
  ctx.quadraticCurveTo(6, 13, 22, 14);
  ctx.quadraticCurveTo(36, 14, 42, 20);
  ctx.quadraticCurveTo(44, 29, 30, 31);
  ctx.quadraticCurveTo(12, 32, 4, 22);
  ctx.fill();
  // Painted wing panel
  ctx.fillStyle = css(look.accent, 0.85);
  ctx.beginPath();
  ctx.ellipse(22, 21, 9, 3, -0.08, 0, Math.PI * 2);
  ctx.fill();
  // Neck & head
  ctx.fillStyle = css(look.head);
  if (look.goose) {
    ctx.beginPath();
    ctx.roundRect(36, 4, 5.5, 16, 2.6);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(41, 5, 5.5, 3.8, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = css(look.accent);
    ctx.beginPath();
    ctx.ellipse(39.5, 7, 2.4, 1.4, 0.3, 0, Math.PI * 2);
    ctx.fill();
  } else {
    ctx.beginPath();
    ctx.ellipse(40, 12, 6.5, 6, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  // Bill
  ctx.fillStyle = css(look.goose ? palette.ink : 0xd9a62a);
  ctx.beginPath();
  if (look.goose) ctx.roundRect(45, 4, 6, 2.6, 1.2);
  else ctx.roundRect(45, 11, 8, 3, 1.4);
  ctx.fill();
  // Eye and a little wood-grain shine
  ctx.fillStyle = css(palette.ink);
  ctx.beginPath();
  ctx.arc(look.goose ? 42.5 : 42, look.goose ? 4.2 : 10.5, 1, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.35)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(10, 18);
  ctx.quadraticCurveTo(20, 15, 32, 16.5);
  ctx.stroke();
  return t.canvas;
}

/** Crew finery that comes with a bigger lodge. Scarf: design 12×7. */
export function paintTrimScarf(): Canvas {
  const t = createPaintTarget(12, 7);
  const { ctx } = t;
  ctx.fillStyle = css(palette.rust);
  ctx.beginPath();
  ctx.roundRect(0.5, 0.5, 11, 3.4, 1.6);
  ctx.fill();
  ctx.beginPath();
  ctx.roundRect(1.4, 2.4, 3, 4.4, 1.2);
  ctx.fill();
  ctx.fillStyle = css(0xf4e9d4, 0.8);
  for (const x of [3.5, 6.5, 9.5]) ctx.fillRect(x, 0.8, 0.9, 2.8);
  return t.canvas;
}

/** A little tweed cap. Design 14×7, brim to the right. */
export function paintTrimCap(): Canvas {
  const t = createPaintTarget(14, 7);
  const { ctx } = t;
  ctx.fillStyle = css(0x6f5a3e);
  ctx.beginPath();
  ctx.ellipse(6.5, 5, 6, 4.2, 0, Math.PI, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = css(0x5a4630);
  ctx.beginPath();
  ctx.roundRect(6, 4.2, 7.5, 2.2, 1.1);
  ctx.fill();
  ctx.fillStyle = css(palette.brass);
  ctx.beginPath();
  ctx.arc(6.5, 1.3, 0.9, 0, Math.PI * 2);
  ctx.fill();
  return t.canvas;
}

/** A brass medal on a ribbon. Design 6×9. */
export function paintTrimMedal(): Canvas {
  const t = createPaintTarget(6, 9);
  const { ctx } = t;
  ctx.fillStyle = css(0x3a5e8c);
  ctx.fillRect(1.6, 0, 2.8, 4);
  ctx.fillStyle = css(0xe8b84a);
  ctx.beginPath();
  ctx.arc(3, 6, 2.6, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = css(0xfff1c4, 0.8);
  ctx.beginPath();
  ctx.arc(2.4, 5.4, 0.8, 0, Math.PI * 2);
  ctx.fill();
  return t.canvas;
}

/**
 * A distant skein of ducks: little "m"-shaped silhouettes in a loose V,
 * painted white (tinted to the sky at draw time). Two frames for a wingbeat.
 * `variant` changes the count and spacing so skeins don't all look alike.
 */
export function paintSkein(variant: number, wingsUp: boolean): Canvas {
  const W = 230;
  const H = 80;
  const t = createPaintTarget(W, H);
  const { ctx } = t;
  const counts = [9, 14, 22, 32];
  const n = counts[variant % counts.length]!;
  const rnd = seeded(17 + variant * 31);
  ctx.strokeStyle = '#ffffff';
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  for (let i = 0; i < n; i++) {
    // Alternate arms of the V, with a little jitter so it looks alive.
    const arm = i === 0 ? 0 : i % 2 === 0 ? 1 : -1;
    const k = Math.ceil(i / 2);
    const x = W - 14 - k * (variant === 3 ? 12.5 : 9 + variant * 1.5) + (rnd() - 0.5) * 3;
    const y = H / 2 + arm * k * (variant === 3 ? 2.2 : 3.4 + variant * 0.4) + (rnd() - 0.5) * 3;
    const s = 0.85 + rnd() * 0.3;
    const lift = (wingsUp ? -2.6 : 1.4) * s + (rnd() - 0.5) * 0.8;
    ctx.lineWidth = 1.5 * s;
    ctx.beginPath();
    ctx.moveTo(x - 4 * s, y + lift);
    ctx.quadraticCurveTo(x - 2 * s, y - 0.4, x, y + 0.6);
    ctx.quadraticCurveTo(x + 2 * s, y - 0.4, x + 4 * s, y + lift);
    ctx.stroke();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.ellipse(x + 0.6, y + 0.9, 1.6 * s, 0.9 * s, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  return t.canvas;
}

function seeded(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
