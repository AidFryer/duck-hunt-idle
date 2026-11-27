/** Prestige: Flyway Stars and the Lodge Legacy perk tree. */
import type { FlywayId } from './flyways';

export const PRESTIGE = {
  /** stars = floor(sqrt(seasonCoins / divisor)) */
  divisor: 8e9,
  /** Permanent production bonus per star ever earned. */
  bonusPerStar: 0.05,
} as const;

/** The shared Lodge trunk, plus one branch per flyway. */
export type BranchId = 'lodge' | FlywayId;

export type PerkId =
  // The Lodge trunk
  | 'headStart' | 'earlyRiser' | 'longNights' | 'keenEyes'
  | 'unionRates' | 'birdersLuck' | 'nestEgg' | 'seasonedCrew'
  | 'longerNights' | 'legendHunter' | 'workflowMastery'
  // Ranked (spend spare stars)
  | 'oldMoney' | 'deepBench' | 'fineFeathers'
  // Mississippi: bayou and timber
  | 'cypressCalls' | 'woodDuckBoxes' | 'bayouBrokers' | 'homecoming'
  // Central: prairie and geese
  | 'prairieWind' | 'cornfieldDeals' | 'bigSky' | 'honkerKings'
  // Pacific: rice, fog and rare birds
  | 'fogWalkers' | 'riceCountry' | 'valleyHarvest' | 'rareAir'
  // Atlantic: the coast and the bay
  | 'saltSpray' | 'seaDuckRigs' | 'eiderDown' | 'coastalCharter';

export interface PerkDef {
  id: PerkId;
  name: string;
  desc: string;
  /** Stars for the first rank. */
  cost: number;
  /** Row within its branch (0 = first). */
  tier: number;
  requires: PerkId[];
  branch: BranchId;
  /** Ranked perks can be bought again, up to this many times. */
  maxRank?: number;
  /** Extra stars for each rank after the first. */
  costStep?: number;
}

const trunk = (p: Omit<PerkDef, 'branch'>): PerkDef => ({ ...p, branch: 'lodge' });
const fly = (branch: FlywayId, p: Omit<PerkDef, 'branch'>): PerkDef => ({ ...p, branch });

export const PERKS: Record<PerkId, PerkDef> = {
  headStart: trunk({ id: 'headStart', name: 'Head Start', desc: 'Begin each season with 500 coins and 50 feathers.', cost: 1, tier: 0, requires: [] }),
  earlyRiser: trunk({ id: 'earlyRiser', name: 'Early Riser', desc: 'Begin each season with 2 Callers, 2 Blind Bots, 2 Robo-Retrievers and a Decoy Setter.', cost: 1, tier: 0, requires: [] }),
  longNights: trunk({ id: 'longNights', name: 'Long Nights', desc: '+2 hours of offline progress.', cost: 1, tier: 0, requires: [] }),
  keenEyes: trunk({ id: 'keenEyes', name: 'Keen Eyes', desc: 'One more flock can circle at once, and circling flocks wait 5s longer.', cost: 2, tier: 1, requires: ['earlyRiser'] }),
  unionRates: trunk({ id: 'unionRates', name: 'Union Rates', desc: 'Foreman Bots cost half as much.', cost: 2, tier: 1, requires: ['earlyRiser'] }),
  birdersLuck: trunk({ id: 'birdersLuck', name: "Birder's Luck", desc: 'Rare and legendary birds turn up 50% more often.', cost: 2, tier: 1, requires: ['headStart'] }),
  nestEgg: trunk({ id: 'nestEgg', name: 'Nest Egg', desc: 'Begin each season with 10,000 coins and 500 feathers.', cost: 4, tier: 2, requires: ['headStart'] }),
  seasonedCrew: trunk({ id: 'seasonedCrew', name: 'Seasoned Crew', desc: 'Every bot type starts the season at level 2.', cost: 3, tier: 2, requires: ['keenEyes'] }),
  longerNights: trunk({ id: 'longerNights', name: 'Longer Nights', desc: '+4 more hours of offline progress.', cost: 3, tier: 2, requires: ['longNights'] }),
  legendHunter: trunk({ id: 'legendHunter', name: 'Legend Hunter', desc: 'King Eiders are three times as likely.', cost: 5, tier: 3, requires: ['birdersLuck'] }),
  workflowMastery: trunk({ id: 'workflowMastery', name: 'Master Trainer', desc: 'Crew Training speed skills are 50% stronger.', cost: 3, tier: 3, requires: ['seasonedCrew'] }),

  oldMoney: trunk({ id: 'oldMoney', name: 'Old Money', desc: '+10% coins from every bird, per rank.', cost: 3, costStep: 2, maxRank: 10, tier: 4, requires: ['nestEgg'] }),
  deepBench: trunk({ id: 'deepBench', name: 'Deep Bench', desc: 'The whole crew works 5% faster, per rank.', cost: 3, costStep: 2, maxRank: 10, tier: 4, requires: ['seasonedCrew'] }),
  fineFeathers: trunk({ id: 'fineFeathers', name: 'Fine Feathers', desc: '+10% feathers from every bird, per rank.', cost: 3, costStep: 2, maxRank: 10, tier: 4, requires: ['birdersLuck'] }),

  cypressCalls: fly('mississippi', { id: 'cypressCalls', name: 'Cypress Calls', desc: 'Callers and Timber Guides work 25% faster.', cost: 2, tier: 0, requires: [] }),
  woodDuckBoxes: fly('mississippi', { id: 'woodDuckBoxes', name: 'Wood Duck Boxes', desc: 'Flocks come to the Flooded Timber 30% more often.', cost: 3, tier: 1, requires: ['cypressCalls'] }),
  bayouBrokers: fly('mississippi', { id: 'bayouBrokers', name: 'Bayou Brokers', desc: 'Birds from the marsh and the timber pay 25% more coins.', cost: 5, tier: 2, requires: ['woodDuckBoxes'] }),
  homecoming: fly('mississippi', { id: 'homecoming', name: 'Homecoming', desc: 'Begin each season with 5 Callers, Blind Bots, Robo-Retrievers and Ledger Bots.', cost: 8, tier: 3, requires: ['bayouBrokers'] }),

  prairieWind: fly('central', { id: 'prairieWind', name: 'Prairie Wind', desc: 'Geese come to the Goose Field 30% more often.', cost: 2, tier: 0, requires: [] }),
  cornfieldDeals: fly('central', { id: 'cornfieldDeals', name: 'Cornfield Deals', desc: 'Goose decoys cost half as much.', cost: 3, tier: 1, requires: ['prairieWind'] }),
  bigSky: fly('central', { id: 'bigSky', name: 'Big Sky', desc: 'One more flock can circle the marsh, and one more the Goose Field.', cost: 5, tier: 2, requires: ['cornfieldDeals'] }),
  honkerKings: fly('central', { id: 'honkerKings', name: 'Honker Kings', desc: 'Birds from the Goose Field pay 50% more coins.', cost: 8, tier: 3, requires: ['bigSky'] }),

  fogWalkers: fly('pacific', { id: 'fogWalkers', name: 'Fog Walkers', desc: 'Foggy mornings bring 25% more flocks.', cost: 2, tier: 0, requires: [] }),
  riceCountry: fly('pacific', { id: 'riceCountry', name: 'Rice Country', desc: 'Rare birds turn up 25% more often.', cost: 3, tier: 1, requires: ['fogWalkers'] }),
  valleyHarvest: fly('pacific', { id: 'valleyHarvest', name: 'Valley Harvest', desc: 'Food plots draw 50% more.', cost: 5, tier: 2, requires: ['riceCountry'] }),
  rareAir: fly('pacific', { id: 'rareAir', name: 'Rare Air', desc: 'Legendary birds are twice as likely.', cost: 8, tier: 3, requires: ['valleyHarvest'] }),

  saltSpray: fly('atlantic', { id: 'saltSpray', name: 'Salt Spray', desc: 'Bay Boatmen work 25% faster.', cost: 2, tier: 0, requires: [] }),
  seaDuckRigs: fly('atlantic', { id: 'seaDuckRigs', name: 'Sea Duck Rigs', desc: 'Flocks come to the Coastal Bay 30% more often.', cost: 3, tier: 1, requires: ['saltSpray'] }),
  eiderDown: fly('atlantic', { id: 'eiderDown', name: 'Eider Down', desc: 'Birds from the Coastal Bay give 50% more feathers.', cost: 5, tier: 2, requires: ['seaDuckRigs'] }),
  coastalCharter: fly('atlantic', { id: 'coastalCharter', name: 'Coastal Charter', desc: 'Birds from the Coastal Bay pay 50% more coins.', cost: 8, tier: 3, requires: ['eiderDown'] }),
};

export const PERK_ORDER: readonly PerkId[] = [
  'headStart', 'earlyRiser', 'longNights',
  'birdersLuck', 'keenEyes', 'unionRates',
  'nestEgg', 'seasonedCrew', 'longerNights',
  'legendHunter', 'workflowMastery',
  'oldMoney', 'deepBench', 'fineFeathers',
  'cypressCalls', 'woodDuckBoxes', 'bayouBrokers', 'homecoming',
  'prairieWind', 'cornfieldDeals', 'bigSky', 'honkerKings',
  'fogWalkers', 'riceCountry', 'valleyHarvest', 'rareAir',
  'saltSpray', 'seaDuckRigs', 'eiderDown', 'coastalCharter',
];

export const BRANCH_ORDER: readonly BranchId[] = ['lodge', 'mississippi', 'central', 'pacific', 'atlantic'];

export const BRANCH_INFO: Record<BranchId, { name: string; blurb: string }> = {
  lodge: { name: 'The Lodge', blurb: 'What the lodge learns stays with it, wherever you hunt.' },
  mississippi: { name: 'Bayou branch', blurb: 'Cypress, timber and the old dabbler ways.' },
  central: { name: 'Prairie branch', blurb: 'Big skies, cornfields and geese by the thousand.' },
  pacific: { name: 'Rice Country branch', blurb: 'Fog off the coast, flooded rice and rare visitors.' },
  atlantic: { name: 'Coastal branch', blurb: 'Salt water, sea ducks and the open bay.' },
};
