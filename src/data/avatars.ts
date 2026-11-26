/** Profile pictures the player can pick, all painted by the game's own art code. */
import type { BotId } from './economy';
import type { SpeciesId } from './species';

export type AvatarSource =
  | { kind: 'person'; person: 'guest0' | 'guest1' | 'guest2' | 'guest3' | 'angler' | 'gus' }
  | { kind: 'species'; species: SpeciesId }
  | { kind: 'dog'; dog: 'lab' | 'robo' }
  | { kind: 'bot'; bot: BotId };

export interface AvatarDef {
  id: string;
  name: string;
  source: AvatarSource;
}

export const AVATARS: readonly AvatarDef[] = [
  { id: 'hunter', name: 'Hunter', source: { kind: 'person', person: 'guest1' } },
  { id: 'trapper', name: 'Trapper', source: { kind: 'person', person: 'guest0' } },
  { id: 'guide', name: 'Guide', source: { kind: 'person', person: 'guest3' } },
  { id: 'angler', name: 'Angler', source: { kind: 'person', person: 'angler' } },
  { id: 'biscuit', name: 'Biscuit', source: { kind: 'dog', dog: 'lab' } },
  { id: 'pup', name: 'Robo-pup', source: { kind: 'dog', dog: 'robo' } },
  { id: 'mallard', name: 'Mallard', source: { kind: 'species', species: 'mallard' } },
  { id: 'woodDuck', name: 'Wood Duck', source: { kind: 'species', species: 'woodDuck' } },
  { id: 'pintail', name: 'Pintail', source: { kind: 'species', species: 'pintail' } },
  { id: 'canadaGoose', name: 'Canada Goose', source: { kind: 'species', species: 'canadaGoose' } },
  { id: 'caller', name: 'Caller Bot', source: { kind: 'bot', bot: 'caller' } },
  { id: 'flagger', name: 'Flagger Bot', source: { kind: 'bot', bot: 'flagger' } },
];

export const DEFAULT_AVATAR = 'hunter';
export const NAME_MAX = 18;
