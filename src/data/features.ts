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
  /** Lodge level that opens it (the Field Guide opens with your first bird instead). */
  lodge: number;
  name: string;
  /** What the player needs to do, for the locked tab. */
  requirement: string;
  progress: (s: GameState) => [number, number];
  intro: {
    gus: string;
    points: string[];
  };
}

const lodge = (s: GameState) => s.lodge;

export const FEATURES: Record<FeatureId, FeatureDef> = {
  bots: {
    id: 'bots', stage: 3, lodge: 2, name: 'Workshop',
    requirement: "Build the Trapper's Cabin (lodge level 2) on the Marsh tab.",
    progress: (s) => [lodge(s), 2],
    intro: {
      gus: "Four walls and a workbench. This is where we carve help.",
      points: [
        'Do a job by hand enough times and you earn the plans for its bot. Then carve bots with coins and feathers.',
        'Each kind of bot does one job of the hunt for you.',
        'Every bot you carve costs a bit more than the last.',
        'Own 10, 25, 50 of a kind and they work together: their speed doubles.',
        'Tune-ups make every bot of a kind faster.',
      ],
    },
  },
  upgrades: {
    id: 'upgrades', stage: 3, lodge: 2, name: 'Upgrades',
    requirement: "Build the Trapper's Cabin (lodge level 2) on the Marsh tab.",
    progress: (s) => [lodge(s), 2],
    intro: {
      gus: 'The marsh itself can be improved. More water, more food, more ducks.',
      points: [
        'Wetland Acres bring more flocks, and bigger ones.',
        'Food plots, nest boxes and flooded timber bring new kinds of duck. Rarer birds only come once the marsh is ready for them.',
        'The Coffee Pot speeds up every bot. Lodge Rooms raise what guests pay.',
        'Upgrades have a few levels each and stay until you close the season.',
      ],
    },
  },
  jobs: {
    id: 'jobs', stage: 4, lodge: 3, name: 'Job Board',
    requirement: 'Build the Marsh Lodge (lodge level 3) on the Marsh tab.',
    progress: (s) => [lodge(s), 3],
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
    id: 'guide', stage: 2, lodge: 1, name: 'Field Guide',
    requirement: 'Bring in your first bird.',
    progress: (s) => [s.stats.lifetimeBirds, 1],
    intro: {
      gus: "Your first bird! Every hunter keeps a record. This book is yours now.",
      points: [
        'Every kind of duck you bring in gets a page: what it pays, when it flies and what weather it likes.',
        'The first of each new kind pays a finder\'s bonus. Rarer birds pay more.',
        'Birds you haven\'t found yet show as silhouettes with a hint.',
        'Patches are achievements, sewn on like a hunting jacket. They live here too.',
      ],
    },
  },
  workflows: {
    id: 'workflows', stage: 5, lodge: 4, name: 'Workflows',
    requirement: 'Build the Sporting Club (lodge level 4) on the Marsh tab.',
    progress: (s) => [lodge(s), 4],
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
    id: 'legacy', stage: 6, lodge: 5, name: 'Legacy',
    requirement: 'Build the Grand Lodge (lodge level 5) on the Marsh tab.',
    progress: (s) => [lodge(s), 5],
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

export const FEATURE_ORDER: readonly FeatureId[] = ['guide', 'bots', 'upgrades', 'jobs', 'workflows', 'legacy'];

export function featureReady(s: GameState, id: FeatureId): boolean {
  const [cur, goal] = FEATURES[id].progress(s);
  return cur >= goal;
}
