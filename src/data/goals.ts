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
    id: 'coins',
    title: 'Earn 25 coins',
    gus: 'Every bird you bring in draws guests to the lodge, and guests pay. Tap quick, one after another, and you\'ll find your rhythm.',
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
    id: 'setter',
    title: 'Carve a Decoy Setter',
    gus: 'Decoys drift loose in the wind. A Decoy Setter wades out and keeps the spread full, so you can rest your arm.',
    done: (s) => s.bots.setter.owned > 0,
  },
  {
    id: 'fix',
    title: 'Fix a stuck bot',
    gus: 'Every crew hits a snag. When a bot wobbles with a "!" over its head, tap it to set it right.',
    done: (s) => s.problems.fixedByYou + s.problems.fixedByForeman > 0,
  },
  {
    id: 'acre',
    title: 'Restore a wetland acre',
    gus: 'More marsh means more ducks. Check the Upgrades tab and restore an acre.',
    done: (s) => s.acres >= 2,
  },
  {
    id: 'ledger',
    title: 'Hire a Ledger Bot',
    gus: "I can only write so fast. Birds don't pay till they're logged, so a Ledger Bot on the porch would be a real help.",
    done: (s) => s.bots.ledger.owned > 0,
  },
  {
    id: 'board',
    title: 'Move a bot on the Job Board',
    gus: 'Open the Job Board. If one job is backing up, move a bot over to help. They work slower off their own job, but it keeps things moving.',
    done: (s) => s.stats.botMoves > 0,
  },
  {
    id: 'upgrade',
    title: 'Build a marsh upgrade',
    gus: 'The Upgrades tab has plans for the marsh: flooded timber, food plots, a better coffee pot. Each one draws more ducks or makes the crew better.',
    done: (s) => Object.values(s.upgrades).some((v) => v > 0),
  },
  {
    id: 'foreman',
    title: 'Hire a Foreman Bot',
    gus: "Fixing every stuck bot yourself gets old. A Foreman will retry them for you. Set how hard it tries in the Problem Log.",
    done: (s) => s.bots.foreman.owned > 0,
  },
  {
    id: 'bag25',
    title: 'Bring in 25 birds in one day',
    gus: 'Keep the decoys set and the crew balanced. A full day of hunting can fill the lodge.',
    done: (s) => s.stats.bestBag >= 25 || s.hunt.bag >= 25,
  },
  {
    id: 'scout',
    title: 'Hire a Scout Bot',
    gus: 'A Scout up on the blind roof spots flocks early, so more of them find our spread.',
    done: (s) => s.bots.scout.owned > 0,
  },
  {
    id: 'callers10',
    title: 'Own 10 Caller Bots',
    gus: 'Ten of a kind and they start working together. Their speed doubles.',
    done: (s) => s.bots.caller.owned >= 10,
  },
  {
    id: 'species5',
    title: 'Find 5 species for the Field Guide',
    gus: 'Not every duck is a mallard. Weather and time of day bring in different birds. Fog at dawn is my favorite.',
    done: (s) => Object.values(s.guide).filter((g) => (g?.count ?? 0) > 0).length >= 5,
  },
  {
    id: 'workflow',
    title: 'Tie a complete workflow chain',
    gus: "Open Workflows and tie the jobs together with rope: Scout, Call, Shoot, Retrieve, Log. When the whole crew knows the order, everything runs faster.",
    done: (s) => s.stats.seasonsClosed > 0 || completeChain(s),
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
