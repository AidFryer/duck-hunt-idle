import type { EventSink } from './events';
import type { GameState } from './state';

/**
 * A stray carved decoy drifts across the water now and then. Tap it for a
 * small gift (about 45 seconds of income). It's a gift, not earnings, so it
 * doesn't count toward unlocks or Flyway Stars.
 */
export const DRIFTER = {
  /** Shortest gap between two drifters (sim seconds). */
  minGapSeconds: 150,
  /** Seconds of current income it's worth. */
  rewardSeconds: 45,
  minCoins: 25,
  minFeathers: 3,
} as const;

/** Is one allowed to float by now? (Some crew needed: it's for a lodge that runs itself.) */
export function drifterReady(state: GameState): boolean {
  const crew = Object.values(state.bots).some((b) => b.owned > 0);
  return crew && state.elapsed - state.drifterAt >= DRIFTER.minGapSeconds;
}

/** Fish it out of the water. Returns false if it's too soon. */
export function claimDrifter(state: GameState, events: EventSink): boolean {
  if (!drifterReady(state)) return false;
  state.drifterAt = state.elapsed;
  const v = state.volley;
  const coins = Math.round(Math.max(DRIFTER.minCoins, v.coinsRate * DRIFTER.rewardSeconds));
  const feathers = Math.round(Math.max(DRIFTER.minFeathers, v.feathersRate * DRIFTER.rewardSeconds));
  state.currencies.coins = state.currencies.coins.add(coins);
  state.currencies.feathers = state.currencies.feathers.add(feathers);
  events.push({ type: 'drifterClaimed', coins, feathers });
  return true;
}
