import type { BotId } from '../data/economy';
import { paintDecoyBot, paintDogBody, paintSpeciesPortrait } from '../render/assets/painters';
import { SPECIES, type SpeciesId } from '../data/species';

/** Bot portraits for the HUD, painted by the same code as the scene art. */
const cache = new Map<BotId, string>();

export function portrait(id: BotId): string {
  let url = cache.get(id);
  if (!url) {
    const canvas = id === 'retriever' ? paintDogBody('robo') : paintDecoyBot(id);
    url = canvas.toDataURL();
    cache.set(id, url);
  }
  return url;
}

const speciesCache = new Map<SpeciesId, string>();

/** Field Guide portrait of a species' drake. */
export function speciesPortrait(id: SpeciesId): string {
  let url = speciesCache.get(id);
  if (!url) {
    url = paintSpeciesPortrait(SPECIES[id].drake).toDataURL();
    speciesCache.set(id, url);
  }
  return url;
}
