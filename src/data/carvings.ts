/**
 * The decoy collection: hand-carved decoys for the lodge shelf. Each one is
 * bought once, keeps its small bonus for good (across seasons), and a few of
 * them bob in the spread on the water.
 */
import type { SpeciesId } from './species';

export type CarvingId =
  | 'corkMallard'
  | 'canvasPintail'
  | 'paintedWoodie'
  | 'cedarBluebill'
  | 'hollowBlackDuck'
  | 'silhouetteCanada'
  | 'antiqueCanvasback'
  | 'shellSnowGoose'
  | 'gunningBrant'
  | 'goldenDrake';

export interface CarvingFx {
  /** Flock arrival rate (×). */
  flockRate?: number;
  /** Coins per bird (×). */
  coins?: number;
  /** Feathers per bird (×). */
  feathers?: number;
  /** Golden flocks come more often (×). */
  golden?: number;
  /** Bird mix (×). */
  species?: Partial<Record<SpeciesId, number>>;
  /** Goose field flock rate (×). */
  fieldRate?: number;
}

export interface CarvingDef {
  id: CarvingId;
  name: string;
  blurb: string;
  effect: string;
  /** Lodge level needed. */
  lodge: number;
  /** Must have this bird in the Field Guide first. */
  needs?: SpeciesId;
  coins: number;
  feathers: number;
  fx: CarvingFx;
  /** Colors for the little painted decoy: body, head, accent. */
  look: { body: number; head: number; accent: number; goose?: boolean };
}

export const CARVINGS: Record<CarvingId, CarvingDef> = {
  corkMallard: {
    id: 'corkMallard', name: 'Cork Mallard', lodge: 2, coins: 1500, feathers: 150,
    blurb: 'Light as a cork bobber, the first one every carver makes.',
    effect: '+5% flocks', fx: { flockRate: 1.05 },
    look: { body: 0x9a8a74, head: 0x2f6b4a, accent: 0xe8a33d },
  },
  canvasPintail: {
    id: 'canvasPintail', name: 'Canvas Pintail', lodge: 2, needs: 'pintail', coins: 8000, feathers: 600,
    blurb: 'Stretched canvas over a wire frame, with a long painted tail.',
    effect: 'More pintail · +5% feathers', fx: { species: { pintail: 1.5 }, feathers: 1.05 },
    look: { body: 0xd8d2c4, head: 0x6e5a46, accent: 0xf4f2ec },
  },
  paintedWoodie: {
    id: 'paintedWoodie', name: 'Painted Woodie', lodge: 3, needs: 'woodDuck', coins: 250_000, feathers: 15_000,
    blurb: 'Seven colors of paint and a lot of patience.',
    effect: 'More wood ducks · +5% coins', fx: { species: { woodDuck: 1.5 }, coins: 1.05 },
    look: { body: 0x8a5a3b, head: 0x2f6b4a, accent: 0xb5562b },
  },
  cedarBluebill: {
    id: 'cedarBluebill', name: 'Cedar Bluebill', lodge: 3, needs: 'scaup', coins: 600_000, feathers: 30_000,
    blurb: 'Carved from an old cedar fence post. Rides low like a real diver.',
    effect: 'More scaup & ring-necks · +5% flocks', fx: { species: { scaup: 1.5, ringNeck: 1.4 }, flockRate: 1.05 },
    look: { body: 0xb8bcc0, head: 0x1e2430, accent: 0x7fa0c0 },
  },
  hollowBlackDuck: {
    id: 'hollowBlackDuck', name: 'Hollow Black Duck', lodge: 3, needs: 'blackDuck', coins: 1_200_000, feathers: 60_000,
    blurb: 'Hollowed out so it rocks on the swell. Wary birds trust it.',
    effect: 'More black ducks · +8% coins', fx: { species: { blackDuck: 1.6 }, coins: 1.08 },
    look: { body: 0x3a2e26, head: 0x5a4a3c, accent: 0x6f8fa0 },
  },
  silhouetteCanada: {
    id: 'silhouetteCanada', name: 'Silhouette Canada', lodge: 4, needs: 'canadaGoose', coins: 12_000_000, feathers: 450_000,
    blurb: 'A flat painted board on a stake. Geese can\'t tell from above.',
    effect: '+10% goose flocks', fx: { fieldRate: 1.1 },
    look: { body: 0x86745e, head: 0x1e1a18, accent: 0xf4f2ec, goose: true },
  },
  antiqueCanvasback: {
    id: 'antiqueCanvasback', name: 'Antique Canvasback', lodge: 4, needs: 'canvasback', coins: 27_000_000, feathers: 900_000,
    blurb: 'Found in the lodge attic, paint worn soft by a hundred seasons.',
    effect: 'More canvasback · +10% coins', fx: { species: { canvasback: 1.6 }, coins: 1.1 },
    look: { body: 0xe8e4dc, head: 0x8a3e1f, accent: 0x2d2520 },
  },
  shellSnowGoose: {
    id: 'shellSnowGoose', name: 'Shell Snow Goose', lodge: 4, needs: 'snowGoose', coins: 60_000_000, feathers: 1_800_000,
    blurb: 'A white shell that stacks by the dozen. Looks like a whole flock.',
    effect: 'More snow & Ross\'s geese · +10% goose flocks', fx: { species: { snowGoose: 1.4, rossGoose: 1.4 }, fieldRate: 1.1 },
    look: { body: 0xf4f2ec, head: 0xf8f6f0, accent: 0x2d2520, goose: true },
  },
  gunningBrant: {
    id: 'gunningBrant', name: 'Gunning Brant', lodge: 5, needs: 'brant', coins: 640_000_000, feathers: 16_000_000,
    blurb: 'A salty old coastal decoy with a white necklace.',
    effect: 'More brant & rare birds · +10% feathers', fx: { species: { brant: 1.6, harlequin: 1.3, longtail: 1.3 }, feathers: 1.1 },
    look: { body: 0x4a5060, head: 0x1e1a18, accent: 0xf4f2ec, goose: true },
  },
  goldenDrake: {
    id: 'goldenDrake', name: 'Golden Drake', lodge: 5, coins: 4_000_000_000, feathers: 80_000_000,
    blurb: 'Gilded by Gus himself. It catches the sunrise like nothing else.',
    effect: 'Golden flocks 50% more often · +15% coins', fx: { golden: 1.5, coins: 1.15 },
    look: { body: 0xe8b84a, head: 0xd9a62a, accent: 0xfff1c4 },
  },
};

export const CARVING_ORDER = Object.keys(CARVINGS) as CarvingId[];
