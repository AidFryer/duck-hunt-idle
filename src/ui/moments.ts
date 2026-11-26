import type { SpeciesId } from '../data/species';
import type { OfflineSummary } from '../sim/offline';
import { Store } from './store';

/** Big celebratory cards: a new Field Guide entry or a patch sewn on. */
export type Moment = { kind: 'species'; id: SpeciesId } | { kind: 'patch'; id: string };

export const moments = new Store<Moment[]>([]);

export function pushMoment(m: Moment): void {
  const q = moments.get();
  if (q.length >= 6) return;
  moments.set([...q, m]);
}

export function popMoment(): void {
  moments.set(moments.get().slice(1));
}

export type OfflineView =
  | { phase: 'idle' }
  | { phase: 'catching'; progress: number; away: number }
  | { phase: 'summary'; summary: OfflineSummary };

export const offlineView = new Store<OfflineView>({ phase: 'idle' });
