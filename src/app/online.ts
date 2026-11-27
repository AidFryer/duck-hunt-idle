import { SUPABASE_KEY, SUPABASE_URL } from '../config';

/**
 * Talks to the online leaderboard. Every call fails softly: the game never
 * waits on the network, and nothing breaks when the player is offline.
 */

export type OnlineError = 'offline' | 'name_taken' | 'bad_name' | 'not_found' | 'wrong_password' | 'unknown';

export class OnlineFailure extends Error {
  constructor(readonly kind: OnlineError) {
    super(kind);
  }
}

export const onlineEnabled = (): boolean => SUPABASE_URL !== '' && SUPABASE_KEY !== '';

/** Plain words for each failure, for the HUD. */
export function failureText(e: unknown): string {
  const kind = e instanceof OnlineFailure ? e.kind : 'unknown';
  switch (kind) {
    case 'name_taken': return 'Someone already has that name. Try another.';
    case 'bad_name': return 'Names are 2 to 20 letters or numbers (spaces, . \' - _ are fine).';
    case 'offline': return "Can't reach the leaderboard right now. Check your connection and try again.";
    case 'wrong_password': return "That password isn't right.";
    case 'not_found': return "The leaderboard doesn't know this lodge any more.";
    default: return 'Something went wrong with the leaderboard. Try again in a bit.';
  }
}

async function rpc<T>(fn: string, args: Record<string, unknown>): Promise<T> {
  if (!onlineEnabled()) throw new OnlineFailure('offline');
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), 10_000);
  let res: Response;
  try {
    res = await fetch(`${SUPABASE_URL.replace(/\/$/, '')}/rest/v1/rpc/${fn}`, {
      method: 'POST',
      headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(args),
      signal: ctl.signal,
    });
  } catch {
    throw new OnlineFailure('offline');
  } finally {
    clearTimeout(timer);
  }
  const text = await res.text();
  if (!res.ok) {
    let msg = '';
    try {
      msg = (JSON.parse(text) as { message?: string }).message ?? '';
    } catch {
      /* not JSON */
    }
    if (msg === 'name_taken') throw new OnlineFailure('name_taken');
    if (msg.startsWith('bad_name')) throw new OnlineFailure('bad_name');
    if (msg === 'not_found') throw new OnlineFailure('not_found');
    if (msg === 'wrong_password') throw new OnlineFailure('wrong_password');
    throw new OnlineFailure(res.status >= 500 || res.status === 0 ? 'offline' : 'unknown');
  }
  return (text ? JSON.parse(text) : null) as T;
}

/** A long random secret that proves a lodge is ours. */
export function newSecret(): string {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

export const nameAvailable = (name: string) => rpc<boolean>('name_available', { p_name: name });
export const joinGame = (name: string, secret: string) => rpc<string>('join_game', { p_name: name, p_secret: secret });
export const renamePlayer = (id: string, secret: string, name: string) => rpc<null>('rename_player', { p_id: id, p_secret: secret, p_name: name });

export interface Progress {
  lodge: number;
  birds: number;
  species: number;
  stars: number;
  seasons: number;
  coins: number;
  day: number;
  playHours: number;
  flyway: string;
  build: string;
}
export const reportProgress = (id: string, secret: string, p: Progress) => rpc<null>('report_progress', { p_id: id, p_secret: secret, p });

export type BoardSort = 'birds' | 'lodge' | 'stars';
export interface BoardRow {
  rank: number;
  name: string;
  lodge: number;
  birds: number;
  species: number;
  stars: number;
  is_me: boolean;
}
export const leaderboard = (sort: BoardSort, id: string | null) => rpc<BoardRow[]>('leaderboard', { p_sort: sort, p_limit: 50, p_id: id });

export interface AdminRow {
  name: string;
  created_at: string;
  last_seen: string;
  lodge: number;
  birds: number;
  species: number;
  stars: number;
  seasons: number;
  coins: number;
  day: number;
  play_hours: number;
  flyway: string;
  build: string;
}
export const adminPlayers = (password: string) => rpc<AdminRow[]>('admin_players', { p_password: password });
