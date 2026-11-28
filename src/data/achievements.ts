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
  /** Feathers on unlock (defaults by patch shape). */
  reward?: number;
}

/** Every patch on the jacket adds this much to coins per bird. */
export const PATCH_COIN_BONUS = 0.01;
const SHAPE_REWARD: Record<PatchShape, number> = { round: 25, banner: 80, diamond: 150, shield: 500 };
export function patchReward(a: AchievementDef): number {
  return a.reward ?? SHAPE_REWARD[a.shape];
}

const owned = (s: GameState) => Object.values(s.bots).reduce((a, b) => a + b.owned, 0);

export const ACHIEVEMENTS: readonly AchievementDef[] = [
  { id: 'firstBird', name: 'First Bird', desc: 'Bring in your first bird.', shape: 'round', icon: 'duck', colors: [0x5e7352, 0xf4e9d4], done: (s) => s.stats.lifetimeBirds >= 1 },
  { id: 'birds100', name: 'Century', desc: 'Bring in 100 birds.', shape: 'round', icon: 'duck', colors: [0x6b4a2f, 0xe8a33d], done: (s) => s.stats.lifetimeBirds >= 100 },
  { id: 'birds1000', name: 'Marsh Legend', desc: 'Bring in 1,000 birds.', shape: 'shield', icon: 'duck', colors: [0x2d2520, 0xf2c46d], done: (s) => s.stats.lifetimeBirds >= 1000 },
  { id: 'golden10', name: 'Golden Hour', desc: 'Shoot 10 golden flocks yourself.', shape: 'diamond', icon: 'sun', colors: [0x6b4a2f, 0xf2c46d], done: (s) => s.stats.goldenShot >= 10 },
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
  { id: 'birds10k', name: 'Flight Deck', desc: 'Bring in 10,000 birds.', shape: 'shield', icon: 'duck', colors: [0x2f6b4a, 0xf4e9d4], done: (s) => s.stats.lifetimeBirds >= 1e4, reward: 1_000 },
  { id: 'birds100k', name: 'Big Water', desc: 'Bring in 100,000 birds.', shape: 'shield', icon: 'duck', colors: [0x1b2438, 0x7fa0c0], done: (s) => s.stats.lifetimeBirds >= 1e5, reward: 6_650 },
  { id: 'birds1m', name: 'Sky Full of Wings', desc: 'Bring in 1,000,000 birds.', shape: 'shield', icon: 'duck', colors: [0x6b4a2f, 0xf2c46d], done: (s) => s.stats.lifetimeBirds >= 1e6, reward: 50_000 },
  { id: 'birds10m', name: 'Legendary Marsh', desc: 'Bring in 10,000,000 birds.', shape: 'shield', icon: 'star', colors: [0x2d2520, 0xe8b84a], done: (s) => s.stats.lifetimeBirds >= 1e7, reward: 333_350 },
  { id: 'bag500', name: 'Strap Full', desc: 'Bring in 500 birds in a single day.', shape: 'banner', icon: 'sun', colors: [0x8a5a3b, 0xf2c46d], done: (s) => s.stats.bestBag >= 500, reward: 150 },
  { id: 'bag5k', name: 'Banner Day', desc: 'Bring in 5,000 birds in a single day.', shape: 'banner', icon: 'sun', colors: [0x2f6b4a, 0xf2c46d], done: (s) => s.stats.bestBag >= 5000, reward: 850 },
  { id: 'bag50k', name: 'Flight of the Century', desc: 'Bring in 50,000 birds in a single day.', shape: 'banner', icon: 'sun', colors: [0x1b2438, 0xe8b84a], done: (s) => s.stats.bestBag >= 5e4, reward: 8_350 },
  { id: 'bag200k', name: 'Wall of Wings', desc: 'Bring in 200,000 birds in a single day.', shape: 'banner', icon: 'star', colors: [0x8a3e1f, 0xfff1c4], done: (s) => s.stats.bestBag >= 2e5, reward: 40_000 },
  { id: 'golden50', name: 'Gilded', desc: 'Shoot 50 golden flocks yourself.', shape: 'diamond', icon: 'sun', colors: [0x2d2520, 0xe8b84a], done: (s) => s.stats.goldenShot >= 50, reward: 1_650 },
  { id: 'volley1', name: 'Big Volley', desc: 'Fire your first Big Volley.', shape: 'diamond', icon: 'star', colors: [0xb5562b, 0xfff1c4], done: (s) => s.volley.fired >= 1, reward: 1_650 },
  { id: 'volley50', name: 'Thunder on the Marsh', desc: 'Fire 50 Big Volleys.', shape: 'shield', icon: 'star', colors: [0x1b2438, 0xf2c46d], done: (s) => s.volley.fired >= 50, reward: 20_000 },
  { id: 'carving1', name: 'First Carving', desc: 'Put a carved decoy on the lodge shelf.', shape: 'round', icon: 'feather', colors: [0x8a5a3b, 0xe8a33d], done: (s) => Object.keys(s.carvings).length >= 1, reward: 100 },
  { id: 'carving5', name: 'Decoy Shelf', desc: 'Collect 5 carved decoys.', shape: 'diamond', icon: 'feather', colors: [0x5a3a26, 0xf4e9d4], done: (s) => Object.keys(s.carvings).length >= 5, reward: 2_650 },
  { id: 'carvingAll', name: 'Master Carver', desc: 'Collect every carved decoy.', shape: 'shield', icon: 'feather', colors: [0x2d2520, 0xe8b84a], done: (s) => Object.keys(s.carvings).length >= 10, reward: 166_650 },
  { id: 'lifeList', name: 'Life List', desc: 'Find every bird in the Field Guide.', shape: 'shield', icon: 'book', colors: [0x2f6b4a, 0xe8b84a], done: (s) => discovered(s) >= SPECIES_ORDER.length, reward: 66_650 },
  { id: 'species16', name: 'Field Naturalist', desc: 'Add 16 species to the Field Guide.', shape: 'diamond', icon: 'book', colors: [0x4e6e7e, 0xf2c46d], done: (s) => discovered(s) >= 16, reward: 650 },
  { id: 'geese1k', name: 'Goose Talker', desc: 'Bring in 1,000 geese and cranes.', shape: 'diamond', icon: 'duck', colors: [0x86745e, 0xf4f2ec], done: (s) => s.stats.geese >= 1000, reward: 1_000 },
  { id: 'crane', name: 'Sandhill Sunrise', desc: 'Bring in a sandhill crane.', shape: 'banner', icon: 'sun', colors: [0x8a8a8a, 0xb5562b], done: (s) => (s.guide.sandhillCrane?.count ?? 0) > 0, reward: 500 },
  { id: 'freeze', name: 'Iced In', desc: 'Bring in 1,000 birds during a Hard Freeze.', shape: 'diamond', icon: 'snow', colors: [0xc8d4dc, 0x1b2438], done: (s) => (s.stats.birdsByStage.freeze ?? 0) >= 1000, reward: 1_350 },
  { id: 'calendar', name: 'Whole Season', desc: 'Hunt through every part of the season calendar.', shape: 'banner', icon: 'sun', colors: [0xa0703f, 0xf4e9d4], done: (s) => ['opening', 'peak', 'late', 'freeze'].every((k) => (s.stats.birdsByStage[k] ?? 0) > 0), reward: 500 },
  { id: 'goodDog', name: 'Good Dog', desc: 'Give your retriever a name.', shape: 'round', icon: 'duck', colors: [0xd9b26a, 0x2d2520], done: (s) => s.profile.dogName.trim().length > 0, reward: 50 },
  { id: 'grandLodge', name: 'Grand Opening', desc: 'Build the Grand Lodge.', shape: 'shield', icon: 'star', colors: [0x6b4a2f, 0xe8b84a], done: (s) => s.lodge >= 5, reward: 6_650 },
  { id: 'bots1000', name: 'Clockwork Kingdom', desc: 'Own 1,000 bots.', shape: 'shield', icon: 'gear', colors: [0x2d2520, 0xc9a04e], done: (s) => owned(s) >= 1000, reward: 13_350 },
  { id: 'coins1b', name: 'Lodge Baron', desc: 'Earn 1 billion coins in total.', shape: 'shield', icon: 'coin', colors: [0x1b2438, 0xe8b84a], done: (s) => s.stats.lifetimeCoins.gte(1e9), reward: 16_650 },
  { id: 'season', name: 'Flyway Veteran', desc: 'Close a season and move on.', shape: 'banner', icon: 'star', colors: [0x2f6b4a, 0xf4e9d4], done: (s) => s.stats.seasonsClosed >= 1, reward: 650 },
  { id: 'birds500k', name: 'Half a Million', desc: 'Bring in 500,000 birds.', shape: 'diamond', icon: 'duck', colors: [0x5e7352, 0xf2c46d], done: (s) => s.stats.lifetimeBirds >= 5e5, reward: 30_000 },
  { id: 'birds3m', name: 'Clouds of Wings', desc: 'Bring in 3,000,000 birds.', shape: 'diamond', icon: 'duck', colors: [0x3a5e8c, 0xf4e9d4], done: (s) => s.stats.lifetimeBirds >= 3e6, reward: 300_000 },
  { id: 'birds5m', name: 'Flyway Famous', desc: 'Bring in 5,000,000 birds.', shape: 'banner', icon: 'duck', colors: [0x8a5a3b, 0xe8b84a], done: (s) => s.stats.lifetimeBirds >= 5e6, reward: 500_000 },
  { id: 'bots250', name: 'Busy Workshop', desc: 'Own 250 bots.', shape: 'diamond', icon: 'gear', colors: [0x8a5a3b, 0xc9a04e], done: (s) => owned(s) >= 250, reward: 20_000 },
  { id: 'bots500', name: 'Clockwork Army', desc: 'Own 500 bots.', shape: 'shield', icon: 'gear', colors: [0x5a3a26, 0xe8b84a], done: (s) => owned(s) >= 500, reward: 200_000 },
  { id: 'volley10', name: 'Ten Volleys', desc: 'Fire 10 Big Volleys.', shape: 'round', icon: 'star', colors: [0xb5562b, 0xf4e9d4], done: (s) => s.volley.fired >= 10, reward: 20_000 },
  { id: 'volley25', name: 'Rolling Thunder', desc: 'Fire 25 Big Volleys.', shape: 'diamond', icon: 'star', colors: [0x8a3e1f, 0xf2c46d], done: (s) => s.volley.fired >= 25, reward: 60_000 },
  { id: 'volley100', name: 'Hundred Volleys', desc: 'Fire 100 Big Volleys.', shape: 'banner', icon: 'star', colors: [0x2d2520, 0xf2c46d], done: (s) => s.volley.fired >= 100, reward: 400_000 },
  { id: 'acres10', name: 'Wetland Keeper', desc: 'Restore 10 acres of wetland.', shape: 'round', icon: 'drop', colors: [0x4e6e7e, 0xf4e9d4], done: (s) => s.acres >= 10, reward: 2_000 },
  { id: 'acres20', name: 'Marsh Maker', desc: 'Restore 20 acres of wetland.', shape: 'diamond', icon: 'drop', colors: [0x2f6b4a, 0xf4e9d4], done: (s) => s.acres >= 20, reward: 60_000 },
  { id: 'acres30', name: 'Wild Country', desc: 'Restore 30 acres of wetland.', shape: 'shield', icon: 'drop', colors: [0x1b2438, 0x7fa0c0], done: (s) => s.acres >= 30, reward: 400_000 },
  { id: 'upgrades50', name: 'Fixer-Upper', desc: 'Buy 50 marsh upgrade levels.', shape: 'diamond', icon: 'feather', colors: [0x6f7a4e, 0xf2c46d], done: (s) => Object.values(s.upgrades).reduce((a, b) => a + b, 0) >= 50, reward: 25_000 },
  { id: 'upgrades100', name: 'Restored to Glory', desc: 'Buy 100 marsh upgrade levels.', shape: 'shield', icon: 'feather', colors: [0x2d2520, 0xc9a04e], done: (s) => Object.values(s.upgrades).reduce((a, b) => a + b, 0) >= 100, reward: 250_000 },
  { id: 'carving3', name: 'Whittling Away', desc: 'Collect 3 carved decoys.', shape: 'round', icon: 'feather', colors: [0x8a5a3b, 0xf4e9d4], done: (s) => Object.keys(s.carvings).length >= 3, reward: 3_000 },
  { id: 'carving7', name: 'Full Shelf', desc: 'Collect 7 carved decoys.', shape: 'diamond', icon: 'feather', colors: [0x5a3a26, 0xe8b84a], done: (s) => Object.keys(s.carvings).length >= 7, reward: 150_000 },
  { id: 'golden25', name: 'Gold Rush', desc: 'Shoot 25 golden flocks yourself.', shape: 'round', icon: 'sun', colors: [0x6b4a2f, 0xe8b84a], done: (s) => s.stats.goldenShot >= 25, reward: 15_000 },
  { id: 'coins10b', name: 'Old Money', desc: 'Earn 1.2 billion coins in total.', shape: 'banner', icon: 'coin', colors: [0x2d2520, 0xe8b84a], done: (s) => s.stats.lifetimeCoins.gte(1e10), reward: 600_000 },
  { id: 'coins100m', name: 'Lodge Magnate', desc: 'Earn 100 million coins in total.', shape: 'diamond', icon: 'coin', colors: [0xc9a04e, 0x2d2520], done: (s) => s.stats.lifetimeCoins.gte(1e8), reward: 15_000 },
  { id: 'away', name: 'Gone Fishin\'', desc: 'Come back after an hour away.', shape: 'round', icon: 'moon', colors: [0x8a5a3b, 0xa9c1cf], done: (s) => s.stats.longestAway >= 3600 },
];

export function discovered(s: GameState): number {
  let n = 0;
  for (const id of SPECIES_ORDER) if ((s.guide[id]?.count ?? 0) > 0) n++;
  return n;
}
