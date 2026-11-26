import Decimal from 'break_infinity.js';
import { OFFLINE, UPGRADE_EFFECTS, UPGRADES, type UpgradeId } from '../data/upgrades';
import { canAfford, type Price } from './economy';
import type { EventSink } from './events';
import type { GameState } from './state';

export function upgradePrice(id: UpgradeId, level: number): Price {
  const d = UPGRADES[id];
  const k = Decimal.pow(d.costGrowth, level);
  return { coins: new Decimal(d.costCoins).mul(k).ceil(), feathers: new Decimal(d.costFeathers).mul(k).ceil() };
}

export function buyUpgrade(state: GameState, id: UpgradeId, events?: EventSink): boolean {
  const lvl = state.upgrades[id] ?? 0;
  if (lvl >= UPGRADES[id].maxLevel) return false;
  const price = upgradePrice(id, lvl);
  if (!canAfford(state, price)) return false;
  state.currencies.coins = state.currencies.coins.sub(price.coins);
  state.currencies.feathers = state.currencies.feathers.sub(price.feathers);
  state.upgrades[id] = lvl + 1;
  events?.push({ type: 'upgradeBought', upgrade: id, level: lvl + 1 });
  return true;
}

export const level = (s: GameState, id: UpgradeId): number => s.upgrades[id] ?? 0;

/** Multiplier on every bot's speed (the coffee pot). */
export function botSpeedMultiplier(s: GameState): number {
  return 1 + UPGRADE_EFFECTS.coffeeSpeed * level(s, 'coffee');
}

export function coinMultiplier(s: GameState): number {
  return 1 + UPGRADE_EFFECTS.lodgeRoomsCoins * level(s, 'lodgeRooms');
}

export function offlineCapSeconds(s: GameState): number {
  return (OFFLINE.baseHours + UPGRADE_EFFECTS.cotHours * level(s, 'cot')) * 3600;
}
