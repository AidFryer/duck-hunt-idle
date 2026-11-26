import { DAILY } from '../data/economy';
import { birdValue } from './economy';
import type { EventSink } from './events';
import { throughput } from './metrics';
import type { GameState } from './state';

/** Local calendar date as YYYY-MM-DD. */
export function localDayKey(d = new Date()): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/**
 * First Light: the first time the game is opened on a new calendar day,
 * hand out a gift worth a few minutes of current income. Returns the coins
 * given (0 if already claimed today).
 */
export function claimDailyBonus(state: GameState, dayKey: string, events?: EventSink): number {
  if (state.meta.lastDailyBonus === dayKey) return 0;
  const first = state.meta.lastDailyBonus === '';
  state.meta.lastDailyBonus = dayKey;
  if (first) return 0; // no gift on the very first launch — that's the tutorial's moment
  const perBird = birdValue(state, 'mallard').coins;
  const income = throughput(state, 'log') * perBird;
  const coins = Math.round(Math.max(DAILY.minCoins, income * DAILY.incomeSeconds));
  state.currencies.coins = state.currencies.coins.add(coins);
  state.currencies.feathers = state.currencies.feathers.add(DAILY.feathers);
  // A gift, not earnings: it doesn't count toward unlocks or Flyway Stars.
  events?.push({ type: 'dailyBonus', coins, feathers: DAILY.feathers });
  return coins;
}
