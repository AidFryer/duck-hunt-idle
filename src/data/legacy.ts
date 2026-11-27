/** Prestige: Flyway Stars and the Lodge Legacy perk tree. */

export const PRESTIGE = {
  /** stars = floor(sqrt(seasonCoins / divisor)) */
  divisor: 4e9,
  /** Permanent production bonus per star ever earned. */
  bonusPerStar: 0.05,
} as const;

export type PerkId =
  | 'headStart' | 'earlyRiser' | 'longNights' | 'keenEyes'
  | 'unionRates' | 'birdersLuck' | 'nestEgg' | 'seasonedCrew'
  | 'longerNights' | 'legendHunter' | 'workflowMastery';

export interface PerkDef {
  id: PerkId;
  name: string;
  desc: string;
  cost: number;
  tier: number;
  requires: PerkId[];
}

export const PERKS: Record<PerkId, PerkDef> = {
  headStart: { id: 'headStart', name: 'Head Start', desc: 'Begin each season with 500 coins and 50 feathers.', cost: 1, tier: 0, requires: [] },
  earlyRiser: { id: 'earlyRiser', name: 'Early Riser', desc: 'Begin each season with 2 Callers, 2 Blind Bots, 2 Robo-Retrievers and a Decoy Setter.', cost: 1, tier: 0, requires: [] },
  longNights: { id: 'longNights', name: 'Long Nights', desc: '+2 hours of offline progress.', cost: 1, tier: 0, requires: [] },
  keenEyes: { id: 'keenEyes', name: 'Keen Eyes', desc: 'One more flock can circle at once, and circling flocks wait 5s longer.', cost: 2, tier: 1, requires: ['earlyRiser'] },
  unionRates: { id: 'unionRates', name: 'Union Rates', desc: 'Foreman Bots cost half as much.', cost: 2, tier: 1, requires: ['earlyRiser'] },
  birdersLuck: { id: 'birdersLuck', name: "Birder's Luck", desc: 'Rare and legendary birds turn up 50% more often.', cost: 2, tier: 1, requires: ['headStart'] },
  nestEgg: { id: 'nestEgg', name: 'Nest Egg', desc: 'Begin each season with 10,000 coins and 500 feathers.', cost: 4, tier: 2, requires: ['headStart'] },
  seasonedCrew: { id: 'seasonedCrew', name: 'Seasoned Crew', desc: 'Every bot type starts the season at level 2.', cost: 3, tier: 2, requires: ['keenEyes'] },
  longerNights: { id: 'longerNights', name: 'Longer Nights', desc: '+4 more hours of offline progress.', cost: 3, tier: 2, requires: ['longNights'] },
  legendHunter: { id: 'legendHunter', name: 'Legend Hunter', desc: 'King Eiders are three times as likely.', cost: 5, tier: 3, requires: ['birdersLuck'] },
  workflowMastery: { id: 'workflowMastery', name: 'Workflow Mastery', desc: 'Workflow chain bonuses are 50% stronger.', cost: 3, tier: 3, requires: ['seasonedCrew'] },
};

export const PERK_ORDER: readonly PerkId[] = [
  'headStart', 'earlyRiser', 'longNights',
  'birdersLuck', 'keenEyes', 'unionRates',
  'nestEgg', 'seasonedCrew', 'longerNights',
  'legendHunter', 'workflowMastery',
];
