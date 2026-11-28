import { CARVINGS, CARVING_ORDER } from '../../data/carvings';
import { Texture } from 'pixi.js';
import { PAINT_SCALE } from './canvas';
import * as P from './painters';
import { SPECIES, type SpeciesId } from '../../data/species';

/**
 * The single entry point for all scene art.
 *
 * Every texture has a string key. By default a procedural painter makes it.
 * To swap in hand-drawn art later, call `override(key, texture)` (e.g. after
 * loading a PNG with Pixi's `Assets.load`) before the scene is built — no
 * game or layer code needs to change.
 *
 * `resolution` tells Pixi how many canvas pixels make one design unit, so
 * a sprite's natural size is always in design units.
 */
interface Recipe {
  paint: () => HTMLCanvasElement;
  resolution: number;
}

const recipes: Record<string, Recipe> = {
  glow: { paint: P.paintGlow, resolution: 1 },
  softDot: { paint: P.paintSoftDot, resolution: 1 },
  star: { paint: P.paintStar, resolution: 2 },
  ripple: { paint: P.paintRipple, resolution: 1 },
  shimmer: { paint: P.paintShimmer, resolution: 1 },
  droplet: { paint: P.paintDroplet, resolution: 2 },
  sun: { paint: P.paintSun, resolution: 2 },
  moon: { paint: P.paintMoon, resolution: 2 },
  fog: { paint: P.paintFog, resolution: 1 },
  grain: { paint: P.paintGrain, resolution: 1 },
  vignette: { paint: P.paintVignette, resolution: 1 },
  cattail: { paint: P.paintCattail, resolution: PAINT_SCALE },
  lodge: { paint: P.paintLodge, resolution: PAINT_SCALE },
  lodgeGlow: { paint: P.paintLodgeGlow, resolution: PAINT_SCALE },
  blind: { paint: P.paintBlind, resolution: PAINT_SCALE },
  'duck.fly.drake': { paint: () => P.paintDuckFlyBody({ drake: true }), resolution: PAINT_SCALE },
  'duck.fly.hen': { paint: () => P.paintDuckFlyBody({ drake: false }), resolution: PAINT_SCALE },
  'duck.wing.drake': { paint: () => P.paintDuckWing({ drake: true }), resolution: PAINT_SCALE },
  'duck.wing.hen': { paint: () => P.paintDuckWing({ drake: false }), resolution: PAINT_SCALE },
  'duck.swim.drake': { paint: () => P.paintDuckSwim({ drake: true }), resolution: PAINT_SCALE },
  'duck.swim.hen': { paint: () => P.paintDuckSwim({ drake: false }), resolution: PAINT_SCALE },
  'decoy.drake': { paint: () => P.paintDuckSwim({ drake: true }, true), resolution: PAINT_SCALE },
  'trim.scarf': { paint: () => P.paintTrimScarf(), resolution: PAINT_SCALE },
  'trim.cap': { paint: () => P.paintTrimCap(), resolution: PAINT_SCALE },
  'trim.medal': { paint: () => P.paintTrimMedal(), resolution: PAINT_SCALE },
  'decoy.hen': { paint: () => P.paintDuckSwim({ drake: false }, true), resolution: PAINT_SCALE },
  ...Object.fromEntries(CARVING_ORDER.map((id) => [`carving.${id}`, { paint: () => P.paintCarving(CARVINGS[id].look), resolution: PAINT_SCALE }])),
  feather: { paint: P.paintFeather, resolution: PAINT_SCALE },
  soundArc: { paint: P.paintSoundArc, resolution: PAINT_SCALE },
  gear: { paint: P.paintGear, resolution: PAINT_SCALE },
  pegLeg: { paint: P.paintPegLeg, resolution: PAINT_SCALE },
  deck: { paint: P.paintDeck, resolution: PAINT_SCALE },
  'bot.caller': { paint: () => P.paintDecoyBot('caller'), resolution: PAINT_SCALE },
  'bot.blind': { paint: () => P.paintDecoyBot('blind'), resolution: PAINT_SCALE },
  'bot.generic': { paint: () => P.paintDecoyBot('generic'), resolution: PAINT_SCALE },
  'bot.scout': { paint: () => P.paintDecoyBot('scout'), resolution: PAINT_SCALE },
  'bot.setter': { paint: () => P.paintDecoyBot('setter'), resolution: PAINT_SCALE },
  'bot.ledger': { paint: () => P.paintDecoyBot('ledger'), resolution: PAINT_SCALE },
  'bot.foreman': { paint: () => P.paintDecoyBot('foreman'), resolution: PAINT_SCALE },
  'bot.tinker': { paint: () => P.paintDecoyBot('tinker'), resolution: PAINT_SCALE },
  'bot.staker': { paint: () => P.paintDecoyBot('staker'), resolution: PAINT_SCALE },
  'bot.flagger': { paint: () => P.paintDecoyBot('flagger'), resolution: PAINT_SCALE },
  'bot.layout': { paint: () => P.paintDecoyBot('layout'), resolution: PAINT_SCALE },
  'bot.tCaller': { paint: () => P.paintDecoyBot('tCaller'), resolution: PAINT_SCALE },
  'bot.tBlind': { paint: () => P.paintDecoyBot('tBlind'), resolution: PAINT_SCALE },
  'bot.bCaller': { paint: () => P.paintDecoyBot('bCaller'), resolution: PAINT_SCALE },
  'bot.bBlind': { paint: () => P.paintDecoyBot('bBlind'), resolution: PAINT_SCALE },
  skiff: { paint: P.paintSkiff, resolution: PAINT_SCALE },
  alert: { paint: P.paintAlertBubble, resolution: PAINT_SCALE },
  rain: { paint: P.paintRainStreak, resolution: 2 },
};
for (let v = 0; v < 3; v++) {
  recipes[`skein.${v}.up`] = { paint: () => P.paintSkein(v, true), resolution: 2 };
  recipes[`skein.${v}.down`] = { paint: () => P.paintSkein(v, false), resolution: 2 };
}
for (const k of ['lab', 'robo'] as const) {
  recipes[`dog.${k}.body`] = { paint: () => P.paintDogBody(k), resolution: PAINT_SCALE };
  recipes[`dog.${k}.leg`] = { paint: () => P.paintDogLeg(k), resolution: PAINT_SCALE };
  recipes[`dog.${k}.tail`] = { paint: () => P.paintDogTail(k), resolution: PAINT_SCALE };
  recipes[`dog.${k}.swim`] = { paint: () => P.paintDogSwim(k), resolution: PAINT_SCALE };
}
for (const k of ['gus', 'guest0', 'guest1', 'guest2', 'guest3', 'angler'] as const) {
  recipes[`person.${k}`] = { paint: () => P.paintPerson(k), resolution: PAINT_SCALE };
}
for (let lv = 1; lv <= 5; lv++) {
  recipes[`lodge.${lv}`] = { paint: () => P.paintLodge(lv), resolution: PAINT_SCALE };
  recipes[`lodgeGlow.${lv}`] = { paint: () => P.paintLodgeGlow(lv), resolution: PAINT_SCALE };
}
for (let i = 0; i < 4; i++) recipes[`cloud${i}`] = { paint: () => P.paintCloud(i), resolution: PAINT_SCALE };
for (let i = 0; i < 3; i++) recipes[`reed${i}`] = { paint: () => P.paintReedBlade(i), resolution: PAINT_SCALE };
for (let i = 0; i < 3; i++) recipes[`leaf${i}`] = { paint: () => P.paintLeaf(i), resolution: PAINT_SCALE };

/**
 * Species textures are made on demand from keys like
 * "duck.fly.woodDuck.drake", "duck.wing.teal.hen", "duck.swim.pintail.drake".
 */
function speciesRecipe(key: string): Recipe | undefined {
  const d = /^decoy\.species\.(\w+)$/.exec(key);
  if (d) {
    const def = SPECIES[d[1] as SpeciesId];
    return def ? { paint: () => P.paintDuckSwim(def.drake, true), resolution: PAINT_SCALE } : undefined;
  }
  const m = /^duck\.(fly|wing|swim)\.(\w+)\.(drake|hen)$/.exec(key);
  if (!m) return undefined;
  const def = SPECIES[m[2] as SpeciesId];
  if (!def) return undefined;
  const look = m[3] === 'drake' ? def.drake : def.hen;
  const paint = m[1] === 'fly' ? P.paintDuckFlyBody : m[1] === 'wing' ? P.paintDuckWing : P.paintDuckSwim;
  return { paint: () => paint(look), resolution: PAINT_SCALE };
}

export class TextureLibrary {
  private readonly cache = new Map<string, Texture>();

  get(key: string): Texture {
    let tex = this.cache.get(key);
    if (!tex) {
      const recipe = recipes[key] ?? speciesRecipe(key);
      if (!recipe) throw new Error(`TextureLibrary: unknown texture "${key}"`);
      tex = Texture.from({ resource: recipe.paint(), resolution: recipe.resolution, autoGenerateMipmaps: true, scaleMode: 'linear' });
      this.cache.set(key, tex);
    }
    return tex;
  }

  /** Replace a procedural texture with custom art. */
  override(key: string, texture: Texture): void {
    this.cache.set(key, texture);
  }

  has(key: string): boolean {
    return key in recipes || this.cache.has(key);
  }

  destroy(): void {
    for (const t of this.cache.values()) t.destroy(true);
    this.cache.clear();
  }
}
