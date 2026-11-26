/**
 * Feature stages: tabs open one at a time as the marsh grows, each with a
 * short explanation from Gus. Unlocks are permanent (they survive seasons).
 */
import type { GameState } from '../sim/state';

export type FeatureId = 'bots' | 'upgrades' | 'jobs' | 'guide' | 'workflows' | 'legacy';

export interface FeatureDef {
  id: FeatureId;
  /** Stage number shown to the player (Marsh is stage 1). */
  stage: number;
  name: string;
  /** What the player needs to do, for the locked tab. */
  requirement: string;
  progress: (s: GameState) => [number, number];
  intro: {
    gus: string;
    points: string[];
  };
}

const totalBots = (s: GameState) => Object.values(s.bots).reduce((a, b) => a + b.owned, 0);
const coins = (s: GameState) => s.stats.lifetimeCoins.toNumber();

export const FEATURES: Record<FeatureId, FeatureDef> = {
  bots: {
    id: 'bots', stage: 2, name: 'Bots',
    requirement: 'Earn 20 coins from logged birds.',
    progress: (s) => [coins(s), 20],
    intro: {
      gus: "You've earned enough to start whittling. This is the carving bench.",
      points: [
        'Carve decoy-bots with coins and feathers. Each kind does one job of the hunt for you.',
        'Every bot you carve costs a bit more than the last.',
        'Own 10, 25, 50 of a kind and they work together: their speed doubles.',
        'Tune-ups make every bot of a kind faster.',
      ],
    },
  },
  upgrades: {
    id: 'upgrades', stage: 3, name: 'Upgrades',
    requirement: 'Earn 750 coins in total.',
    progress: (s) => [coins(s), 750],
    intro: {
      gus: 'The marsh itself can be improved. More water, more food, more ducks.',
      points: [
        'Wetland Acres bring more flocks, and bigger ones.',
        'Food plots and flooded timber draw in particular species.',
        'The Coffee Pot speeds up every bot. Lodge Rooms raise what guests pay.',
        'Upgrades have a few levels each and stay until you close the season.',
      ],
    },
  },
  jobs: {
    id: 'jobs', stage: 5, name: 'Job Board',
    requirement: 'Own 15 bots.',
    progress: (s) => [totalBots(s), 15],
    intro: {
      gus: "With a real crew, you need a board to keep track of who's doing what.",
      points: [
        'Each card is one job: how fast the crew could go, how fast it is going, and the queue waiting.',
        'The strip on top shows the flock queue. If a job backs up, flocks fly off and are lost.',
        'Tap a bot token, then tap another job to move it there. Off its own job, a bot works at half speed.',
        'Bots sometimes get stuck. Tap the "!" over them to fix them.',
      ],
    },
  },
  guide: {
    id: 'guide', stage: 4, name: 'Field Guide',
    requirement: 'Bring in 200 birds.',
    progress: (s) => [s.stats.lifetimeBirds, 200],
    intro: {
      gus: "Not every bird is a mallard. Time to start keeping a proper record.",
      points: [
        'Every species you bring in gets a page: what it pays, when it flies and what weather it likes.',
        'Unfound birds show as silhouettes with a hint.',
        'Patches are achievements, sewn on like a hunting jacket. They live here too.',
      ],
    },
  },
  workflows: {
    id: 'workflows', stage: 6, name: 'Workflows',
    requirement: 'Earn 25,000 coins in total.',
    progress: (s) => [coins(s), 25_000],
    intro: {
      gus: 'A crew that knows the order of the hunt works faster. Here is some rope.',
      points: [
        'Tap a job card, then tap the card that comes next, to tie them together.',
        'Every link in the right order speeds up the whole hunt.',
        'A full Scout → Call → Shoot → Retrieve → Log chain adds a big bonus.',
        'Special cards only work right after the job they help.',
      ],
    },
  },
  legacy: {
    id: 'legacy', stage: 7, name: 'Legacy',
    requirement: 'Earn 250,000 coins in one season.',
    progress: (s) => [s.season.coins.toNumber(), 250_000],
    intro: {
      gus: "The season won't last forever. When it's time, we close it out and start fresh, a little wiser.",
      points: [
        'At 1,000,000 coins in a season you can Close the Season for Flyway Stars.',
        'Closing resets coins, bots and upgrades, but each star adds +5% coins and feathers for good.',
        'Spend stars on Legacy perks, like starting crews and rarer birds.',
        'A new season can move to a new flyway with its own birds and twist.',
      ],
    },
  },
};

export const FEATURE_ORDER: readonly FeatureId[] = ['bots', 'upgrades', 'guide', 'jobs', 'workflows', 'legacy'];

export function featureReady(s: GameState, id: FeatureId): boolean {
  const [cur, goal] = FEATURES[id].progress(s);
  return cur >= goal;
}
