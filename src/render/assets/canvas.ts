/** Small helpers for painting procedural textures with Canvas 2D. */

/** Textures are painted at this multiple of their design size for crispness. */
export const PAINT_SCALE = 2;

export interface PaintTarget {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  /** Design-unit width/height (canvas is PAINT_SCALE× larger). */
  w: number;
  h: number;
}

export function createPaintTarget(w: number, h: number, scale = PAINT_SCALE): PaintTarget {
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.ceil(w * scale));
  canvas.height = Math.max(1, Math.ceil(h * scale));
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D context unavailable');
  ctx.scale(scale, scale);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  return { canvas, ctx, w, h };
}

export function css(hex: number, alpha = 1): string {
  return `rgba(${(hex >> 16) & 0xff}, ${(hex >> 8) & 0xff}, ${hex & 0xff}, ${alpha})`;
}

/** Soft radial blob: solid center fading to transparent. */
export function softBlob(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  color: number,
  alpha = 1,
  hardness = 0.35,
): void {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, css(color, alpha));
  g.addColorStop(hardness, css(color, alpha * 0.85));
  g.addColorStop(1, css(color, 0));
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
}

export function ellipse(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  rx: number,
  ry: number,
  rotation = 0,
): void {
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, rotation, 0, Math.PI * 2);
}

export function linearV(
  ctx: CanvasRenderingContext2D,
  y0: number,
  y1: number,
  stops: [number, number, number?][],
): CanvasGradient {
  const g = ctx.createLinearGradient(0, y0, 0, y1);
  for (const [t, c, a] of stops) g.addColorStop(t, css(c, a ?? 1));
  return g;
}
