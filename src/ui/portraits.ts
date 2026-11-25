import type { BotId } from '../data/economy';
import { paintDecoyBot, paintDogBody } from '../render/assets/painters';

/** Bot portraits for the HUD, painted by the same code as the scene art. */
const cache = new Map<BotId, string>();

export function portrait(id: BotId): string {
  let url = cache.get(id);
  if (!url) {
    const canvas = id === 'retriever' ? paintDogBody('robo') : paintDecoyBot(id === 'caller' ? 'caller' : 'blind');
    url = canvas.toDataURL();
    cache.set(id, url);
  }
  return url;
}
