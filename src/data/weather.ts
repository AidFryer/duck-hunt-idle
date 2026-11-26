/** Weather design data: effects on the hunt and how often it changes. */

export type WeatherId = 'clear' | 'fog' | 'drizzle' | 'coldFront' | 'wind';

export interface WeatherDef {
  id: WeatherId;
  name: string;
  /** Short line for the forecast widget. */
  blurb: string;
  /** Relative chance this weather is picked next. */
  weight: number;
  /** Multiplier on flock arrivals. */
  flockRate: number;
  /** Extra birds per flock. */
  flockSize: number;
  /** Multiplier on how fast decoys drift loose. */
  decoyDrift: number;
  /** Multiplier on problem chance for every bot. */
  problems: number;
  /** Added to the wind strength (0–1 scale). */
  wind: number;
  /** Extra fog strength (0–1) drawn in the scene. */
  fog: number;
  /** Multiplier on rare & legendary species weight. */
  rare: number;
}

export const WEATHER: Record<WeatherId, WeatherDef> = {
  clear: {
    id: 'clear', name: 'Clear', blurb: 'Clear skies. A steady day.',
    weight: 40, flockRate: 1, flockSize: 0, decoyDrift: 1, problems: 1, wind: 0, fog: 0, rare: 1,
  },
  fog: {
    id: 'fog', name: 'Fog', blurb: 'Thick fog. Ducks fly low and close.',
    weight: 16, flockRate: 1.6, flockSize: 0.5, decoyDrift: 0.8, problems: 1.1, wind: -0.15, fog: 0.4, rare: 1.5,
  },
  drizzle: {
    id: 'drizzle', name: 'Drizzle', blurb: 'Soft rain. Birds keep moving.',
    weight: 18, flockRate: 1.2, flockSize: 0, decoyDrift: 1.2, problems: 1.2, wind: 0.05, fog: 0.2, rare: 1.1,
  },
  coldFront: {
    id: 'coldFront', name: 'Cold Front', blurb: 'A cold front. Big flocks, icy calls.',
    weight: 12, flockRate: 1.5, flockSize: 2, decoyDrift: 1, problems: 1.5, wind: 0.2, fog: 0.1, rare: 2.5,
  },
  wind: {
    id: 'wind', name: 'Windy', blurb: 'Gusty wind. Decoys drift loose fast.',
    weight: 14, flockRate: 0.9, flockSize: 0, decoyDrift: 2, problems: 1.1, wind: 0.4, fog: 0, rare: 1,
  },
};

export const WEATHER_ORDER: readonly WeatherId[] = ['clear', 'fog', 'drizzle', 'coldFront', 'wind'];

/** Weather lasts this many real seconds (min–max); a day is 600 s. */
export const WEATHER_SPELL = { min: 120, max: 260 } as const;
