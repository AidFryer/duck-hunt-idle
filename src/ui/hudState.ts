import type Decimal from 'break_infinity.js';
import type { DayPhaseId } from '../data/dayCycle';
import { BOT_ORDER, BOTS, HUNT, type BotId, type HuntStage } from '../data/economy';
import { currentGoal } from '../data/goals';
import { clockAt, duckActivityAt, formatClock } from '../sim/clock';
import {
  acrePrice, botPrice, botRate, botUnitSpeed, canAfford, levelPrice, maxAffordableBots,
  milestoneMultiplier, nextMilestone, spreadSize, type Price,
} from '../sim/economy';
import { canDo } from '../sim/hunt';
import type { GameState } from '../sim/state';

export interface BotSnapshot {
  id: BotId;
  owned: number;
  level: number;
  /** Actions/sec for all owned. */
  rate: number;
  unitSpeed: number;
  multiplier: number;
  nextMilestone: number | null;
  price: Price;
  affordable: boolean;
  maxAffordable: number;
  levelPrice: Price;
  levelAffordable: boolean;
  revealed: boolean;
}

/** A read-only, render-friendly view of the sim for the HUD. */
export interface HudSnapshot {
  day: number;
  clock: string;
  phaseId: DayPhaseId;
  phaseLabel: string;
  hour: number;
  activity: number;
  wind: number;
  coins: Decimal;
  feathers: Decimal;
  bag: number;
  bestBag: number;
  lifetimeBirds: number;
  decoys: number;
  spread: number;
  incoming: number;
  committed: number;
  downed: number;
  can: Record<HuntStage, boolean>;
  /** Automation per stage (actions/sec), for the hunt buttons. */
  auto: Record<HuntStage, number>;
  bots: Record<BotId, BotSnapshot>;
  acres: number;
  acrePrice: Price;
  acreAffordable: boolean;
  lifetimeCoins: Decimal;
  goalId: string;
  goalTitle: string;
  goalGus: string;
  goalIndex: number;
}

export function snapshot(state: GameState): HudSnapshot {
  const c = clockAt(state.clock.dayTime);
  const bots = {} as Record<BotId, BotSnapshot>;
  for (const id of BOT_ORDER) {
    const b = state.bots[id];
    const price = botPrice(id, b.owned, 1);
    const lp = levelPrice(id, b.level);
    bots[id] = {
      id,
      owned: b.owned,
      level: b.level,
      rate: botRate(state, id),
      unitSpeed: botUnitSpeed(id, b.level),
      multiplier: milestoneMultiplier(b.owned),
      nextMilestone: nextMilestone(b.owned),
      price,
      affordable: canAfford(state, price),
      maxAffordable: maxAffordableBots(state, id),
      levelPrice: lp,
      levelAffordable: b.owned > 0 && canAfford(state, lp),
      revealed: b.owned > 0 || state.stats.lifetimeCoins.gte(BOTS[id].revealAtCoins),
    };
  }
  const ap = acrePrice(state.acres);
  const goal = currentGoal(state);
  return {
    day: state.clock.day,
    clock: formatClock(c.hour),
    phaseId: c.phase.id,
    phaseLabel: c.phase.label,
    hour: c.hour,
    activity: duckActivityAt(c.hour),
    wind: state.environment.wind,
    coins: state.currencies.coins,
    feathers: state.currencies.feathers,
    bag: state.hunt.bag,
    bestBag: state.stats.bestBag,
    lifetimeBirds: state.stats.lifetimeBirds,
    decoys: state.hunt.decoys,
    spread: spreadSize(state),
    incoming: state.hunt.incoming.length,
    committed: state.hunt.committed.length,
    downed: state.hunt.downed.length,
    can: {
      decoys: canDo(state, 'decoys'),
      call: canDo(state, 'call'),
      shoot: canDo(state, 'shoot'),
      retrieve: canDo(state, 'retrieve'),
    },
    auto: {
      decoys: 0,
      call: botRate(state, 'caller'),
      shoot: botRate(state, 'blind'),
      retrieve: botRate(state, 'retriever'),
    },
    bots,
    acres: state.acres,
    acrePrice: ap,
    acreAffordable: canAfford(state, ap),
    lifetimeCoins: state.stats.lifetimeCoins,
    goalId: goal.goal.id,
    goalTitle: goal.goal.title,
    goalGus: goal.goal.gus,
    goalIndex: goal.index,
  };
}

export const MAX_COMMITTED = HUNT.maxCommitted;

export function activityLabel(a: number): string {
  if (a > 0.8) return 'Ducks are flying!';
  if (a > 0.55) return 'Lots of activity';
  if (a > 0.3) return 'Steady';
  if (a > 0.12) return 'Quiet';
  return 'Resting';
}

export function windLabel(w: number): string {
  if (w > 0.65) return 'Gusty';
  if (w > 0.45) return 'Breezy';
  if (w > 0.25) return 'Light breeze';
  return 'Calm';
}
