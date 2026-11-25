/**
 * Day-cycle design data.
 *
 * One in-game day lasts DAY_LENGTH_SECONDS real seconds, but the phases are
 * not equal: sunrise (peak duck activity) gets more screen time than the
 * middle of the night.
 */

export type DayPhaseId =
  | 'predawn'
  | 'sunrise'
  | 'morning'
  | 'midday'
  | 'afternoon'
  | 'dusk'
  | 'night';

export interface DayPhaseDef {
  id: DayPhaseId;
  label: string;
  /** Real seconds this phase lasts (all phases sum to DAY_LENGTH_SECONDS). */
  seconds: number;
  /** Clock hour at the start and end of the phase (end may exceed 24). */
  startHour: number;
  endHour: number;
}

/** Ordered phases. The day starts at pre-dawn so a new game opens on sunrise. */
export const DAY_PHASES: readonly DayPhaseDef[] = [
  { id: 'predawn', label: 'Pre-dawn', seconds: 60, startHour: 4.5, endHour: 6 },
  { id: 'sunrise', label: 'Golden Sunrise', seconds: 100, startHour: 6, endHour: 8 },
  { id: 'morning', label: 'Morning', seconds: 90, startHour: 8, endHour: 11 },
  { id: 'midday', label: 'Midday', seconds: 110, startHour: 11, endHour: 15 },
  { id: 'afternoon', label: 'Afternoon', seconds: 70, startHour: 15, endHour: 17.5 },
  { id: 'dusk', label: 'Dusk', seconds: 85, startHour: 17.5, endHour: 19.75 },
  { id: 'night', label: 'Starry Night', seconds: 85, startHour: 19.75, endHour: 28.5 },
];

/** Where in the day (real seconds) a brand-new game begins. */
export const NEW_GAME_DAY_TIME = 40;

/** Sun & moon timing in clock hours. */
export const CELESTIAL = {
  sunrise: 6.0,
  sunset: 19.2,
  moonrise: 19.4,
  moonset: 29.6, // 5:36 AM next day
} as const;

/**
 * Sky keyframes, keyed by clock hour (0–24). Colors are hex numbers; the
 * renderer interpolates between neighbours and wraps around midnight.
 *
 * - skyTop/skyMid/skyLow: vertical sky gradient
 * - glow: sun/horizon glow color
 * - light: multiply tint applied to "lit" objects (lodge, reeds, ducks)
 * - farLand/nearLand: silhouette colors for distant and near treelines
 * - waterTop/waterLow: water gradient (horizon → foreground)
 * - cloud: cloud tint
 * - stars, fog: 0–1 strengths
 */
export interface SkyKeyframe {
  hour: number;
  skyTop: number;
  skyMid: number;
  skyLow: number;
  glow: number;
  light: number;
  farLand: number;
  nearLand: number;
  waterTop: number;
  waterLow: number;
  cloud: number;
  stars: number;
  fog: number;
}

export const SKY_KEYFRAMES: readonly SkyKeyframe[] = [
  { hour: 0, skyTop: 0x0c1324, skyMid: 0x18223a, skyLow: 0x2a3550, glow: 0x2a3550, light: 0x4f5e86, farLand: 0x24304a, nearLand: 0x141b2c, waterTop: 0x1f2a42, waterLow: 0x0e1522, cloud: 0x3a4664, stars: 1, fog: 0.15 },
  { hour: 4.5, skyTop: 0x141d36, skyMid: 0x2c3b62, skyLow: 0x6f7fa6, glow: 0x8a8fb5, light: 0x6d7aa6, farLand: 0x3d4a6c, nearLand: 0x222a40, waterTop: 0x4a5a80, waterLow: 0x1d2639, cloud: 0x5a6690, stars: 0.7, fog: 0.55 },
  { hour: 5.6, skyTop: 0x2b3f6e, skyMid: 0x7a84b2, skyLow: 0xe4a88f, glow: 0xf0b088, light: 0xb0a0bc, farLand: 0x6b6f8e, nearLand: 0x343750, waterTop: 0xa898b0, waterLow: 0x2f3552, cloud: 0xd4a6ae, stars: 0.2, fog: 0.8 },
  { hour: 6.6, skyTop: 0x5a86b8, skyMid: 0xe9c39a, skyLow: 0xf6c56e, glow: 0xffd27a, light: 0xf6d6ac, farLand: 0x9e8f8a, nearLand: 0x4d4540, waterTop: 0xe2b98a, waterLow: 0x4a5866, cloud: 0xf9d6a8, stars: 0, fog: 0.7 },
  { hour: 8.5, skyTop: 0x6c9cc8, skyMid: 0xa9c8dc, skyLow: 0xe8dcc4, glow: 0xfff0c8, light: 0xf8f0e2, farLand: 0x93a3a6, nearLand: 0x4f5b4c, waterTop: 0x9fbac4, waterLow: 0x3e5a68, cloud: 0xfbf5ea, stars: 0, fog: 0.3 },
  { hour: 12.5, skyTop: 0x5b93c9, skyMid: 0x9cc3dd, skyLow: 0xd8e6e6, glow: 0xffffff, light: 0xffffff, farLand: 0x8ea4a8, nearLand: 0x4c5e4a, waterTop: 0x8fb4c4, waterLow: 0x355466, cloud: 0xffffff, stars: 0, fog: 0.08 },
  { hour: 16.5, skyTop: 0x5f8fbf, skyMid: 0xb2c4cf, skyLow: 0xead2a6, glow: 0xffe0a0, light: 0xfbe6c6, farLand: 0x9a9a92, nearLand: 0x524f42, waterTop: 0xb6bdb2, waterLow: 0x3c5260, cloud: 0xfbe8cc, stars: 0, fog: 0.12 },
  { hour: 18.3, skyTop: 0x4a5f92, skyMid: 0xd08a6e, skyLow: 0xf2a65a, glow: 0xff9a4a, light: 0xf0b48a, farLand: 0x7a6470, nearLand: 0x3a2e34, waterTop: 0xd2946c, waterLow: 0x3a3444, cloud: 0xf0a07a, stars: 0.05, fog: 0.28 },
  { hour: 19.4, skyTop: 0x2a3260, skyMid: 0x6b4f78, skyLow: 0xc0706a, glow: 0xd0706a, light: 0x9a7e9e, farLand: 0x4a4060, nearLand: 0x241e30, waterTop: 0x7a5a78, waterLow: 0x1e1a2c, cloud: 0x8a6080, stars: 0.5, fog: 0.32 },
  { hour: 20.6, skyTop: 0x101830, skyMid: 0x1e2846, skyLow: 0x34406a, glow: 0x3a4670, light: 0x5a6890, farLand: 0x29334f, nearLand: 0x151b2e, waterTop: 0x28324e, waterLow: 0x10172a, cloud: 0x3c4868, stars: 1, fog: 0.2 },
];

/**
 * Duck activity by clock hour (0–1). Drives how often flocks appear.
 * Peaks at sunrise, a smaller bump at dusk, nearly nothing at night.
 */
export const DUCK_ACTIVITY_KEYS: readonly { hour: number; value: number }[] = [
  { hour: 0, value: 0.04 },
  { hour: 4.5, value: 0.15 },
  { hour: 5.8, value: 0.7 },
  { hour: 6.8, value: 1.0 },
  { hour: 8.5, value: 0.75 },
  { hour: 11, value: 0.35 },
  { hour: 14, value: 0.25 },
  { hour: 16.5, value: 0.5 },
  { hour: 18.2, value: 0.8 },
  { hour: 19.6, value: 0.3 },
  { hour: 21, value: 0.05 },
];

/** Wind model (sim/environment.ts). Values are 0–1 strengths. */
export const WIND = {
  base: 0.35,
  /** Slow drift amplitude around the base. */
  drift: 0.25,
  /** Gust amplitude (faster, smaller). */
  gust: 0.12,
  /** Periods in real seconds. */
  driftPeriod: 140,
  gustPeriod: 17,
} as const;
