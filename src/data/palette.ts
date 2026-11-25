/**
 * Design tokens. Every color in the game comes from here — the Pixi scene
 * uses the numeric values, the DOM HUD uses the generated CSS variables.
 *
 * Mood: an autumn marsh at dawn — amber, rust, cattail brown, sage,
 * misty blue and cream.
 */
export const palette = {
  // Warm accents
  amber: 0xe8a33d,
  gold: 0xf2c46d,
  rust: 0xb5562b,
  rose: 0xe3a08a,
  ember: 0xd9772f,

  // Earth & reeds
  cattail: 0x6b4a2f,
  cattailDark: 0x4a3220,
  reed: 0x9a8a5a,
  reedDry: 0xc2a96b,
  sage: 0x8fa37a,
  sageDark: 0x5e7352,
  moss: 0x6f7a4e,

  // Water & air
  mistBlue: 0xa9c1cf,
  mistDeep: 0x5d7a8c,
  water: 0x4e6e7e,
  night: 0x1b2438,
  nightDeep: 0x0f1626,

  // Wood, paper, brass
  cream: 0xf4e9d4,
  parchment: 0xeadbbe,
  parchmentDark: 0xd6c29b,
  wood: 0x8a5a3b,
  woodLight: 0xb9824f,
  woodDark: 0x5a3a26,
  brass: 0xc9a04e,
  ink: 0x2d2520,

  // Lights
  lampGlow: 0xffc46b,
  firefly: 0xe9f27a,
  white: 0xffffff,
} as const;

export type PaletteKey = keyof typeof palette;

/** Mallard / waterfowl plumage colors (used by the procedural sprite painter). */
export const plumage = {
  drakeHead: 0x2f6b4a,
  drakeHeadSheen: 0x4f9a6a,
  drakeBreast: 0x7a3e2a,
  drakeFlank: 0xc9c2b4,
  drakeBack: 0x7d7468,
  drakeTail: 0x2a2622,
  henBody: 0x9a7550,
  henDark: 0x5e452e,
  henLight: 0xc9a77a,
  bill: 0xe0b84a,
  henBill: 0xc98a3c,
  speculum: 0x3a5ec0,
  wingGray: 0x8a8378,
  wingDark: 0x5c564e,
} as const;

/** UI-specific tokens (DOM). Kept as CSS color strings. */
export const uiTokens = {
  bg: '#1f1a17',
  panel: '#eadbbe',
  panelEdge: '#b9945f',
  panelShade: '#d6c29b',
  text: '#2d2520',
  textSoft: '#5f4f40',
  textOnDark: '#f4e9d4',
  accent: '#b5562b',
  accentHover: '#c86a3a',
  good: '#5e7352',
  warn: '#d9772f',
  plank: '#6b4a2f',
  plankLight: '#8a5a3b',
  brass: '#c9a04e',
  shadow: 'rgba(30, 20, 12, 0.35)',
  fontHeading: "'Zilla Slab', 'Rockwell', 'Georgia', serif",
  fontBody: "'Nunito', 'Segoe UI', system-ui, sans-serif",
} as const;

export function hexToCss(hex: number): string {
  return `#${hex.toString(16).padStart(6, '0')}`;
}

/** Push palette + UI tokens into CSS custom properties on :root. */
export function applyCssTokens(root: HTMLElement = document.documentElement): void {
  for (const [k, v] of Object.entries(palette)) {
    root.style.setProperty(`--c-${k}`, hexToCss(v));
  }
  for (const [k, v] of Object.entries(uiTokens)) {
    root.style.setProperty(`--ui-${k}`, v);
  }
}
