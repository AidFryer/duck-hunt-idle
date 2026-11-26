import type { AchievementDef, PatchIcon } from '../../data/achievements';
import { hexToCss } from '../../data/palette';

/** Simple embroidered-looking glyphs for patches (stroked in thread color). */
const GLYPH: Record<PatchIcon, string> = {
  duck: 'M14 34c0 6 6 10 16 10s16-4 16-12c-4 2-8 2-12 0 2-2 3-4 3-7a7 7 0 0 0-14 0c0 2 .6 4 2 5.6C20 31 14 30 14 34zM35 24l6-1',
  feather: 'M44 14C30 15 19 25 17 42c12-2 23-11 27-28zM14 46l18-18M24 35h8M28 30h8',
  star: 'M30 13l5 10.6 11.6 1.4-8.6 8 2.2 11.4L30 38.8l-10.2 5.6L22 33l-8.6-8 11.6-1.4z',
  snow: 'M30 12v36M14.4 21l31.2 18M14.4 39l31.2-18M25 15l5 5 5-5M25 45l5-5 5 5',
  moon: 'M42 34A14 14 0 0 1 24 16a14 14 0 1 0 18 18z',
  coin: 'M30 14a16 16 0 1 0 .01 0zM30 21v18M25 25c0-2 2-3.6 5-3.6s5 1.4 5 3.6-2.4 3.2-5 3.8-5 1.8-5 4 2 3.6 5 3.6 5-1.6 5-3.6',
  gear: 'M30 24a6 6 0 1 0 .01 0zM30 13v6M30 41v6M13 30h6M41 30h6M18 18l4 4M38 38l4 4M18 42l4-4M38 22l4-4',
  book: 'M14 18c6-2 11-2 16 2 5-4 10-4 16-2v24c-6-2-11-2-16 2-5-4-10-4-16-2zM30 20v24',
  sun: 'M30 22a8 8 0 1 0 .01 0zM30 12v5M30 43v5M12 30h5M43 30h5M17 17l3.5 3.5M39.5 39.5 43 43M17 43l3.5-3.5M39.5 20.5 43 17',
  fog: 'M14 22h24M18 29h28M12 36h24M20 43h20',
  drop: 'M30 13c6 8 11 14 11 20a11 11 0 0 1-22 0c0-6 5-12 11-20z',
  bot: 'M19 24h22a5 5 0 0 1 5 5v9a5 5 0 0 1-5 5H19a5 5 0 0 1-5-5v-9a5 5 0 0 1 5-5zM25 33h.01M35 33h.01M30 24v-6M27 16h6',
};

const SHAPE = {
  round: 'M30 4a26 26 0 1 0 .01 0z',
  shield: 'M30 4l22 7v17c0 14-10 23-22 28C18 51 8 42 8 28V11z',
  diamond: 'M30 3l27 27-27 27L3 30z',
  banner: 'M6 10h48v34l-24 12L6 44z',
};

export function Patch({ def, unlocked, size = 64 }: { def: AchievementDef; unlocked: boolean; size?: number }) {
  const [fabric, thread] = def.colors;
  return (
    <svg class={`patch ${unlocked ? 'is-unlocked' : ''}`} width={size} height={size} viewBox="0 0 60 60" aria-hidden="true">
      <path d={SHAPE[def.shape]} fill={unlocked ? hexToCss(fabric) : 'none'} stroke={unlocked ? hexToCss(thread) : '#b9945f'} stroke-width="2.2" />
      <path d={SHAPE[def.shape]} transform="translate(30 30) scale(0.86) translate(-30 -30)" fill="none" stroke={unlocked ? hexToCss(thread) : '#b9945f'} stroke-width="1.4" stroke-dasharray="2.5 2" class="patch__stitch" />
      <path d={GLYPH[def.icon]} fill="none" stroke={unlocked ? hexToCss(thread) : '#c9b48a'} stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" />
    </svg>
  );
}
