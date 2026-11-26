/**
 * Global configuration. Rename the game here — this is the only place the
 * title is defined. Everything else (HTML title, HUD sign, save key prefix)
 * reads from these constants.
 */
export const GAME_TITLE = 'Duck Hunt Idle';
export const GAME_TAGLINE = 'The marsh runs itself while you sip coffee in the blind.';

/** Simulation ticks per real second. The sim always advances in fixed steps. */
export const TICK_RATE = 10;
export const TICK_SECONDS = 1 / TICK_RATE;

/** Real seconds in one full in-game day. */
export const DAY_LENGTH_SECONDS = 600;

/** Render resolution cap — protects mid-range phones from 3x DPR fill cost. */
export const MAX_RENDER_RESOLUTION = 3;

/** Save storage key (versioned format lives in src/sim/save.ts from Phase 2). */
export const SAVE_KEY = 'duck-hunt-idle.save';
