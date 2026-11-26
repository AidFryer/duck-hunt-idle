import type { SpeciesId } from '../data/species';
import type { FlywayId } from '../data/flyways';
import type { OfflineSummary } from '../sim/offline';
import { Store } from './store';

/** Big celebratory cards: a new Field Guide entry or a patch sewn on. */
import type { FeatureId } from '../data/features';

export type Moment = { kind: 'species'; id: SpeciesId; coins: number; feathers: number } | { kind: 'patch'; id: string } | { kind: 'feature'; id: FeatureId }
  | { kind: 'daily'; coins: number; feathers: number };

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

/** Shown after Close the Season. */
export const seasonView = new Store<{ season: number; stars: number; flyway: FlywayId } | null>(null);
