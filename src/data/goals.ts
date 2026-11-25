import type { GameState } from '../sim/state';

/**
 * The always-visible "next goal" track, voiced by Gus the lodge keeper.
 * Goals are checked in order; the first unfinished one is shown.
 */
export interface GoalDef {
  id: string;
  /** Short goal line on the goal card. */
  title: string;
  /** What Gus says while this goal is active. */
  gus: string;
  done: (s: GameState) => boolean;
}

export const LAB_NAME = 'Biscuit';
export const KEEPER_NAME = 'Gus Marlow';

export const GOALS: readonly GoalDef[] = [
  {
    id: 'decoys',
    title: 'Set out 3 decoys',
    gus: 'First things first. Toss a few decoys out so passing ducks figure this is a safe spot to land.',
    done: (s) => s.hunt.decoys >= 3 || s.stats.flocksCalled > 0,
  },
  {
    id: 'call',
    title: 'Call in a circling flock',
    gus: "Hear that? There's a flock circling up high. Give 'em a call and bring 'em down to the spread.",
    done: (s) => s.stats.flocksCalled > 0,
  },
  {
    id: 'shoot',
    title: 'Take the shot',
    gus: "They're working the decoys now, wings cupped. Take your shot. Easy does it.",
    done: (s) => s.stats.shots > 0,
  },
  {
    id: 'retrieve',
    title: `Send ${LAB_NAME} to retrieve`,
    gus: `Birds on the water. Send ${LAB_NAME} out. That dog lives for this.`,
    done: (s) => s.stats.lifetimeBirds > 0,
  },
  {
    id: 'coins',
    title: 'Earn 25 coins',
    gus: 'Every bird you bring in draws guests to the lodge, and guests pay. Keep the hunt going.',
    done: (s) => s.stats.lifetimeCoins.gte(25),
  },
  {
    id: 'caller',
    title: 'Carve a Caller Bot',
    gus: "Your arms'll get tired. Head to the Bots tab and carve a Caller Bot to call flocks in for you.",
    done: (s) => s.bots.caller.owned > 0,
  },
  {
    id: 'blind',
    title: 'Carve a Blind Bot',
    gus: 'Now a Blind Bot. It sits in the blind under a grass hat and takes the shot when a flock is in range.',
    done: (s) => s.bots.blind.owned > 0,
  },
  {
    id: 'retriever',
    title: 'Build a Robo-Retriever',
    gus: `${LAB_NAME} can only swim so fast. A clockwork pup could help with the fetching.`,
    done: (s) => s.bots.retriever.owned > 0,
  },
  {
    id: 'acre',
    title: 'Restore a wetland acre',
    gus: 'More marsh means more ducks. Check the Upgrades tab and restore an acre.',
    done: (s) => s.acres >= 2,
  },
  {
    id: 'bag25',
    title: 'Bag 25 birds in one day',
    gus: 'Keep the decoys set and the crew balanced. A full day of hunting can fill the lodge.',
    done: (s) => s.stats.bestBag >= 25 || s.hunt.bag >= 25,
  },
  {
    id: 'callers10',
    title: 'Own 10 Caller Bots',
    gus: 'Ten of a kind and they start working together. Their speed doubles.',
    done: (s) => s.bots.caller.owned >= 10,
  },
  {
    id: 'more',
    title: 'More coming soon',
    gus: "That's a fine operation. Next season we'll put up a job board and let the bots sort out their own troubles.",
    done: () => false,
  },
];

export function currentGoal(s: GameState): { goal: GoalDef; index: number } {
  for (let i = 0; i < GOALS.length; i++) {
    if (!GOALS[i]!.done(s)) return { goal: GOALS[i]!, index: i };
  }
  return { goal: GOALS[GOALS.length - 1]!, index: GOALS.length - 1 };
}
