import { SUPABASE_KEY, SUPABASE_URL } from '../config';

/**
 * Talks to the online leaderboard. Every call fails softly: the game never
 * waits on the network, and nothing breaks when the player is offline.
 */

export type OnlineError = 'not_set_up' | 'offline' | 'name_taken' | 'bad_name' | 'not_found' | 'wrong_password' | 'unknown';

export class OnlineFailure extends Error {
  constructor(readonly kind: OnlineError) {
    super(kind);
  }
}

/**
 * Whether the board's functions exist on the server: unknown until the first
 * call, false while the database setup hasn't been run.
 */
let ready: boolean | null = null;

/** Configured, and not known to be missing its database setup. */
export const onlineEnabled = (): boolean => SUPABASE_URL !== '' && SUPABASE_KEY !== '' && ready !== false;

/** Ask the server once whether the board is set up (used while it isn't). */
export async function probeOnline(): Promise<void> {
  if (SUPABASE_URL === '' || SUPABASE_KEY === '') return;
  try {
    await rpc('leaderboard', { p_sort: 'birds', p_limit: 1, p_id: null }, true);
  } catch {
    /* the result is recorded in `ready` */
  }
}

export const onlineReady = (): boolean | null => ready;

/** Plain words for each failure, for the HUD. */
export function failureText(e: unknown): string {
  const kind = e instanceof OnlineFailure ? e.kind : 'unknown';
  switch (kind) {
    case 'not_set_up': return "The leaderboard isn't set up yet.";
    case 'name_taken': return 'Someone already has that name. Try another.';
    case 'bad_name': return 'Names are 2 to 20 letters or numbers (spaces, . \' - _ are fine).';
    case 'offline': return "Can't reach the leaderboard right now. Check your connection and try again.";
    case 'wrong_password': return "That password isn't right.";
    case 'not_found': return "The leaderboard doesn't know this lodge any more.";
    default: return 'Something went wrong with the leaderboard. Try again in a bit.';
  }
}

async function rpc<T>(fn: string, args: Record<string, unknown>, probe = false): Promise<T> {
  if (!probe && !onlineEnabled()) throw new OnlineFailure('not_set_up');
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), 10_000);
  let res: Response;
  try {
    res = await fetch(`${SUPABASE_URL.replace(/\/$/, '')}/rest/v1/rpc/${fn}`, {
      method: 'POST',
      // New-style publishable keys go in the apikey header only; old JWT keys also as a bearer token.
      headers: {
        apikey: SUPABASE_KEY,
        ...(SUPABASE_KEY.startsWith('sb_') ? {} : { Authorization: `Bearer ${SUPABASE_KEY}` }),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(args),
      signal: ctl.signal,
    });
  } catch {
    throw new OnlineFailure('offline');
  } finally {
    clearTimeout(timer);
  }
  const text = await res.text();
  // 404: the functions aren't there yet (setup not run).
  if (res.status === 404) {
    ready = false;
    throw new OnlineFailure('not_set_up');
  }
  ready = true;
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
