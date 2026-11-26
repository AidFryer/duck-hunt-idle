import type { BotId } from '../data/economy';
import { paintDecoyBot, paintDogBody, paintPerson, paintSpeciesPortrait } from '../render/assets/painters';
import { AVATARS } from '../data/avatars';
import { SPECIES, type SpeciesId } from '../data/species';

/** Bot portraits for the HUD, painted by the same code as the scene art. */
const cache = new Map<BotId, string>();

export function portrait(id: BotId): string {
  let url = cache.get(id);
  if (!url) {
    const canvas = id === 'retriever' || id === 'fieldDog' ? paintDogBody('robo') : paintDecoyBot(id);
    url = canvas.toDataURL();
    cache.set(id, url);
  }
  return url;
}

const avatarCache = new Map<string, string>();

/** A profile picture, painted once and cached. */
export function avatarPortrait(id: string): string {
  const def = AVATARS.find((a) => a.id === id) ?? AVATARS[0]!;
  let url = avatarCache.get(def.id);
  if (!url) {
    const src = def.source;
    url =
      src.kind === 'species' ? speciesPortrait(src.species)
      : src.kind === 'bot' ? portrait(src.bot)
      : src.kind === 'dog' ? paintDogBody(src.dog).toDataURL()
      : paintPerson(src.person).toDataURL();
    avatarCache.set(def.id, url);
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
