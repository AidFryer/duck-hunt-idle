import type { GameState } from '../sim/state';
import { workflowEval } from '../sim/workflow';

const completeChain = (s: GameState) => workflowEval(s).complete;

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
  /** Only shown after the first season is closed. */
  later?: boolean;
}

export const LAB_NAME = 'Biscuit';
export const KEEPER_NAME = 'Gus Marlow';

export const GOALS: readonly GoalDef[] = [
  {
    id: 'decoys',
    title: 'Set out 3 decoys',
    gus: 'First things first. Tap the water to toss a few decoys out, so passing ducks figure this is a safe spot to land.',
    done: (s) => s.hunt.decoys >= 3 || s.stats.flocksCalled > 0,
  },
  {
    id: 'call',
    title: 'Call in a circling flock',
    gus: "Hear that? There's a flock circling up high. Tap it to give 'em a call and bring 'em down to the spread.",
    done: (s) => s.stats.flocksCalled > 0,
  },
  {
    id: 'shoot',
    title: 'Take the shot',
    gus: "They're working the decoys now, wings cupped. Tap 'em to take your shot. Easy does it.",
    done: (s) => s.stats.shots > 0,
  },
  {
    id: 'retrieve',
    title: `Send ${LAB_NAME} to retrieve`,
    gus: `Birds on the water. Tap one to send ${LAB_NAME} out. That dog lives for this.`,
    done: (s) => s.stats.lifetimeBirds > 0,
  },
  {
    id: 'cabin',
    title: "Build the Trapper's Cabin",
    gus: "This old shack won't hold a workbench. Bring in 150 birds, find a second kind of duck, then build a proper cabin from the Marsh tab.",
    done: (s) => s.lodge >= 2,
  },
  {
    id: 'callerPlans',
    title: 'Earn the Caller Bot plans',
    gus: 'Bots learn by watching you. Call 60 flocks in by hand and the Workshop will have the plans drawn up.',
    done: (s) => !!s.plans.caller,
  },
  {
    id: 'caller',
    title: 'Carve a Caller Bot',
    gus: 'There they are. Head to the Workshop and carve your first Caller Bot.',
    done: (s) => s.bots.caller.owned > 0,
  },
  {
    id: 'blind',
    title: 'Carve a Blind Bot',
    gus: 'Same with the blind: take 60 shots yourself, then carve a Blind Bot. It sits under a grass hat and takes the shot.',
    done: (s) => s.bots.blind.owned > 0,
  },
  {
    id: 'retriever',
    title: 'Build a Robo-Retriever',
    gus: `Fetch 150 birds by hand and ${LAB_NAME} will teach a clockwork pup the rest.`,
    done: (s) => s.bots.retriever.owned > 0,
  },
  {
    id: 'species3',
    title: 'Find a third kind of duck',
    gus: "Mallards and teal are just the start. Nest boxes and millet bring new birds. The Field Guide says what each one needs.",
    done: (s) => speciesCount(s) >= 3,
  },
  {
    id: 'setter',
    title: 'Carve a Decoy Setter',
    gus: "Set 30 decoys by hand and you'll know the spread well enough to teach it. Then a Setter keeps it full for you.",
    done: (s) => s.bots.setter.owned > 0,
  },
  {
    id: 'acre',
    title: 'Restore a wetland acre',
    gus: 'More marsh means more ducks. Check the Upgrades tab and restore an acre.',
    done: (s) => s.acres >= 2,
  },
  {
    id: 'lodge3',
    title: 'Build the Marsh Lodge',
    gus: "Bring in 500 birds and find four kinds of duck, and we can build a real lodge. Guests'll come from three counties.",
    done: (s) => s.lodge >= 3,
  },
  {
    id: 'fix',
    title: 'Fix a stuck bot',
    gus: 'Every crew hits a snag. When a bot wobbles with a "!" over its head, tap it to set it right.',
    done: (s) => s.problems.fixedByYou + s.problems.fixedByForeman > 0,
  },
  {
    id: 'ledger',
    title: 'Hire a Ledger Bot',
    gus: "I can only write so fast. Once I've logged 600 birds, I'll teach a Ledger Bot to help on the porch.",
    done: (s) => s.bots.ledger.owned > 0,
  },
  {
    id: 'board',
    title: 'Move a bot on the Job Board',
    gus: 'Open the Job Board. If one job is backing up, move a bot over to help. They work slower off their own job, but it keeps things moving.',
    done: (s) => s.stats.botMoves > 0,
  },
  {
    id: 'rung',
    title: 'Climb a rung on the automation ladder',
    gus: 'Own ten of a kind and their ladder opens up in the Workshop: spinning-wing decoys, duet callers, a steady blind. Each rung is a big step.',
    done: (s) => Object.keys(s.rungs).length > 0 || s.stats.seasonsClosed > 0,
  },
  {
    id: 'species7',
    title: 'Find 7 kinds of duck',
    gus: 'Rice brings pintail, flooded timber brings black ducks, wild celery brings wigeon. Fill those Field Guide pages.',
    done: (s) => speciesCount(s) >= 7,
  },
  {
    id: 'club',
    title: 'Build the Sporting Club',
    gus: 'A trophy room, members, the works. Build the Sporting Club and the whole crew can be tied together with rope.',
    done: (s) => s.lodge >= 4,
  },
  {
    id: 'workflow',
    title: 'Tie a complete workflow chain',
    gus: "Open Workflows and tie the jobs together with rope: Scout, Call, Shoot, Retrieve, Log. When the whole crew knows the order, everything runs faster.",
    done: (s) => s.stats.seasonsClosed > 0 || completeChain(s),
  },
  {
    id: 'foreman',
    title: 'Hire a Foreman Bot',
    gus: "Fixing every stuck bot yourself gets old. Fix a dozen by hand and the Foreman plans are yours.",
    done: (s) => s.bots.foreman.owned > 0,
  },
  {
    id: 'grand',
    title: 'Build the Grand Lodge',
    gus: "Stone chimney, three wings, a flag on the roof. Ten kinds of duck in the book and we can build her.",
    done: (s) => s.lodge >= 5,
  },
  {
    id: 'tinker',
    title: 'Hire a Tinker Bot',
    gus: 'A Tinker keeps the whole crew in good repair and tunes them up while you sleep.',
    done: (s) => s.bots.tinker.owned > 0,
  },
  {
    id: 'season',
    title: 'Close your first season',
    gus: "Earn a million coins in a season and we can close it out. You'll bank Flyway Stars, and a new flyway opens up.",
    done: (s) => s.stats.seasonsClosed > 0,
  },
  {
    id: 'nextStar',
    title: 'Earn your next Flyway Star',
    gus: "New marsh, same old crew-building. Rebuild fast, tie your chain again, and spend your stars in the Legacy tab. Every season goes quicker than the last.",
    done: () => false,
    later: true,
  },
  {
    id: 'more',
    title: 'More coming soon',
    gus: "That's a fine operation. Before long we'll talk about closing out the season and seeing what the other flyways have to offer.",
    done: () => false,
  },
];

function speciesCount(s: GameState): number {
  return Object.values(s.guide).filter((g) => (g?.count ?? 0) > 0).length;
}

export function currentGoal(s: GameState): { goal: GoalDef; index: number } {
  const veteran = s.stats.seasonsClosed > 0;
  for (let i = 0; i < GOALS.length; i++) {
    const g = GOALS[i]!;
    // Veterans skip the first-season tutorial; newcomers skip later goals.
    if (veteran && !g.later && g.id !== 'more') continue;
    if (!veteran && g.later) continue;
    if (!g.done(s)) return { goal: g, index: i };
  }
  return { goal: GOALS[GOALS.length - 1]!, index: GOALS.length - 1 };
}
