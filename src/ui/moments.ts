import type { StageId } from '../data/calendar';
import type { SpeciesId } from '../data/species';
import type { FlywayId } from '../data/flyways';
import type { OfflineSummary } from '../sim/offline';
import { Store } from './store';
import type { BotId } from '../data/economy';
import type { RungId } from '../data/progression';

/** Big celebratory cards: a new Field Guide entry or a patch sewn on. */
import type { FeatureId } from '../data/features';

export type Moment = { kind: 'species'; id: SpeciesId; coins: number; feathers: number } | { kind: 'patch'; id: string } | { kind: 'feature'; id: FeatureId }
  | { kind: 'daily'; coins: number; feathers: number }
  | { kind: 'lodge'; level: number }
  | { kind: 'plan'; bot: BotId }
  | { kind: 'rung'; id: RungId }
  | { kind: 'volley' }
  | { kind: 'patches'; ids: string[] }
  | { kind: 'stage'; id: StageId };

export const moments = new Store<Moment[]>([]);

/** Big cards that should never wait behind (or be dropped for) small ones. */
const IMPORTANT: ReadonlySet<Moment['kind']> = new Set(['lodge', 'feature', 'daily', 'volley']);

export function pushMoment(m: Moment): void {
  const q = moments.get();
  if (IMPORTANT.has(m.kind)) {
    // Right after the card on screen, ahead of any small ones waiting.
    const at = q.length === 0 ? 0 : 1 + q.slice(1).filter((x) => IMPORTANT.has(x.kind)).length;
    moments.set([...q.slice(0, at), m, ...q.slice(at)]);
    return;
  }
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
