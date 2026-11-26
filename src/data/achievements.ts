/** Achievements, shown as embroidered patches for a hunting jacket. */
import type { GameState } from '../sim/state';
import { SPECIES_ORDER } from './species';

export type PatchShape = 'round' | 'shield' | 'diamond' | 'banner';
export type PatchIcon = 'duck' | 'feather' | 'star' | 'snow' | 'moon' | 'coin' | 'gear' | 'book' | 'sun' | 'fog' | 'drop' | 'bot';

export interface AchievementDef {
  id: string;
  name: string;
  desc: string;
  shape: PatchShape;
  icon: PatchIcon;
  /** Patch fabric and thread colors. */
  colors: [number, number];
  done: (s: GameState) => boolean;
}

const owned = (s: GameState) => Object.values(s.bots).reduce((a, b) => a + b.owned, 0);

export const ACHIEVEMENTS: readonly AchievementDef[] = [
  { id: 'firstBird', name: 'First Bird', desc: 'Bring in your first bird.', shape: 'round', icon: 'duck', colors: [0x5e7352, 0xf4e9d4], done: (s) => s.stats.lifetimeBirds >= 1 },
  { id: 'birds100', name: 'Century', desc: 'Bring in 100 birds.', shape: 'round', icon: 'duck', colors: [0x6b4a2f, 0xe8a33d], done: (s) => s.stats.lifetimeBirds >= 100 },
  { id: 'birds1000', name: 'Marsh Legend', desc: 'Bring in 1,000 birds.', shape: 'shield', icon: 'duck', colors: [0x2d2520, 0xf2c46d], done: (s) => s.stats.lifetimeBirds >= 1000 },
  { id: 'bag50', name: 'Full Strap', desc: 'Bring in 50 birds in a single day.', shape: 'banner', icon: 'sun', colors: [0xb5562b, 0xf4e9d4], done: (s) => s.stats.bestBag >= 50 },
  { id: 'firstBot', name: 'Whittler', desc: 'Carve your first decoy-bot.', shape: 'round', icon: 'bot', colors: [0x8a5a3b, 0xf4e9d4], done: (s) => owned(s) >= 1 },
  { id: 'bots25', name: 'Workshop', desc: 'Own 25 bots.', shape: 'diamond', icon: 'gear', colors: [0x5a3a26, 0xc9a04e], done: (s) => owned(s) >= 25 },
  { id: 'bots100', name: 'Clockwork Marsh', desc: 'Own 100 bots.', shape: 'shield', icon: 'gear', colors: [0x1b2438, 0xc9a04e], done: (s) => owned(s) >= 100 },
  { id: 'fixer', name: 'Handy', desc: 'Fix 10 stuck bots yourself.', shape: 'round', icon: 'gear', colors: [0x5e7352, 0xe8a33d], done: (s) => s.problems.fixedByYou >= 10 },
  { id: 'foreman', name: 'Middle Management', desc: 'Let the foreman fix 25 problems.', shape: 'diamond', icon: 'bot', colors: [0xd9a62a, 0x2d2520], done: (s) => s.problems.fixedByForeman >= 25 },
  { id: 'species3', name: 'Birdwatcher', desc: 'Add 3 species to the Field Guide.', shape: 'round', icon: 'book', colors: [0x4e6e7e, 0xf4e9d4], done: (s) => discovered(s) >= 3 },
  { id: 'species8', name: 'Ornithologist', desc: 'Add 8 species to the Field Guide.', shape: 'shield', icon: 'book', colors: [0x2f6b4a, 0xf2c46d], done: (s) => discovered(s) >= 8 },
  { id: 'eider', name: 'The King', desc: 'Bring in a King Eider.', shape: 'banner', icon: 'star', colors: [0x1e1a18, 0xf08a2a], done: (s) => (s.guide.kingEider?.count ?? 0) > 0 },
  { id: 'fog', name: 'Pea Soup', desc: 'Bring in 25 birds in the fog.', shape: 'round', icon: 'fog', colors: [0xa9c1cf, 0x2d2520], done: (s) => (s.stats.birdsByWeather.fog ?? 0) >= 25 },
  { id: 'rain', name: 'Wet Boots', desc: 'Bring in 25 birds in the drizzle.', shape: 'round', icon: 'drop', colors: [0x5d7a8c, 0xf4e9d4], done: (s) => (s.stats.birdsByWeather.drizzle ?? 0) >= 25 },
  { id: 'cold', name: 'Frostbite', desc: 'Bring in 25 birds during a cold front.', shape: 'diamond', icon: 'snow', colors: [0xdfe8f2, 0x3a5e8c], done: (s) => (s.stats.birdsByWeather.coldFront ?? 0) >= 25 },
  { id: 'night', name: 'Night Owl', desc: 'Bring in a bird after dark.', shape: 'round', icon: 'moon', colors: [0x1b2438, 0xf4e9d4], done: (s) => s.stats.nightBirds >= 1 },
  { id: 'coins10k', name: 'Paying Guests', desc: 'Earn 10,000 coins in total.', shape: 'round', icon: 'coin', colors: [0xc9a04e, 0x2d2520], done: (s) => s.stats.lifetimeCoins.gte(1e4) },
  { id: 'coins1m', name: 'Lodge Tycoon', desc: 'Earn 1,000,000 coins in total.', shape: 'shield', icon: 'coin', colors: [0x2d2520, 0xf2c46d], done: (s) => s.stats.lifetimeCoins.gte(1e6) },
  { id: 'upgrades', name: 'Restoration', desc: 'Buy 10 marsh upgrade levels.', shape: 'banner', icon: 'feather', colors: [0x6f7a4e, 0xf4e9d4], done: (s) => Object.values(s.upgrades).reduce((a, b) => a + b, 0) >= 10 },
  { id: 'away', name: 'Gone Fishin\'', desc: 'Come back after an hour away.', shape: 'round', icon: 'moon', colors: [0x8a5a3b, 0xa9c1cf], done: (s) => s.stats.longestAway >= 3600 },
];

export function discovered(s: GameState): number {
  let n = 0;
  for (const id of SPECIES_ORDER) if ((s.guide[id]?.count ?? 0) > 0) n++;
  return n;
}
