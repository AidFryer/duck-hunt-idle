import { GUEST_NAMES, GUESTS } from '../data/guests';
import { SPECIES, type SpeciesId } from '../data/species';
import { WEATHER, type WeatherId } from '../data/weather';
import type { EventSink } from './events';
import { fieldOpen } from './hunt';
import { speciesWeights } from './species';
import { rand, type GameState, type GuestRequest } from './state';

/** Fill empty slots on the booking board and drop bookings that ran out. Call on each new day. */
export function refreshGuests(state: GameState, events?: EventSink): void {
  const g = state.guests;
  if (state.lodge < GUESTS.fromLodge) return;
  const day = state.clock.day;
  g.board = g.board.filter((r) => r.claimed === false && (r.progress >= r.target || r.expires >= day));
  // The very first time, the board fills up; after that, one new guest a day.
  let room = g.nextId === 1 ? GUESTS.slots : 1;
  while (g.board.length < GUESTS.slots && room-- > 0) {
    const r = makeRequest(state);
    if (!r) break;
    g.board.push(r);
    events?.push({ type: 'guestBooked', who: r.who });
  }
}

function pick<T>(state: GameState, list: readonly T[]): T {
  return list[Math.floor(rand(state) * list.length)]!;
}

function makeRequest(state: GameState): GuestRequest | null {
  const g = state.guests;
  const pace = Math.max(0.3, state.volley.birdsRate);
  const work = pace * GUESTS.workSeconds;
  const kinds: GuestRequest['kind'][] = ['birds', 'species', 'species'];
  if (state.environment.weather !== 'clear') kinds.push('weather');
  if (fieldOpen(state)) kinds.push('geese');
  if (state.lodge >= 3) kinds.push('golden');
  const taken = new Set(g.board.map((r) => r.kind + (r.species ?? '')));
  for (let tries = 0; tries < 8; tries++) {
    const kind = pick(state, kinds);
    let r: Omit<GuestRequest, 'id' | 'who' | 'progress' | 'coins' | 'feathers' | 'expires' | 'claimed'> | null = null;
    if (kind === 'birds') r = { kind, target: roundNice(Math.max(30, work)) };
    else if (kind === 'weather') r = { kind, weather: state.environment.weather, target: roundNice(Math.max(15, work * 0.4)) };
    else if (kind === 'geese') r = { kind, target: roundNice(Math.max(10, work * 0.15)) };
    else if (kind === 'golden') r = { kind, target: 1 };
    else {
      const w = speciesWeights(state, 8, 'marsh');
      const total = Object.values(w).reduce((a, b) => a + b, 0);
      const options = (Object.keys(w) as SpeciesId[]).filter((id) => w[id] > 0 && (state.guide[id]?.count ?? 0) > 0 && id !== 'mallard');
      if (options.length === 0 || total <= 0) continue;
      const species = pick(state, options);
      const share = w[species] / total;
      r = { kind, species, target: roundNice(Math.max(5, work * share * 1.2)) };
    }
    if (!r || taken.has(r.kind + (r.species ?? ''))) continue;
    const weight = r.kind === 'golden' ? 1.4 : r.kind === 'species' ? 1.2 : 1;
    return {
      ...r,
      id: g.nextId++,
      who: pick(state, GUEST_NAMES),
      progress: 0,
      coins: Math.round(Math.max(150 * state.lodge ** 2, state.volley.coinsRate * GUESTS.paySeconds * weight)),
      feathers: Math.round(Math.max(15 * state.lodge ** 2, state.volley.feathersRate * GUESTS.paySeconds * weight)),
      expires: state.clock.day + GUESTS.lastsDays,
      claimed: false,
    };
  }
  return null;
}

function roundNice(n: number): number {
  if (n < 20) return Math.round(n);
  const p = Math.pow(10, Math.floor(Math.log10(n)) - 1);
  return Math.round(n / p) * p;
}

/** Birds brought in: count them toward matching bookings. */
export function guestBirds(state: GameState, species: readonly SpeciesId[], field: boolean): void {
  const board = state.guests.board;
  if (board.length === 0) return;
  const w = state.environment.weather;
  for (const r of board) {
    if (r.progress >= r.target) continue;
    if (r.kind === 'birds') r.progress += species.length;
    else if (r.kind === 'geese' && field) r.progress += species.length;
    else if (r.kind === 'weather' && r.weather === w) r.progress += species.length;
    else if (r.kind === 'species') for (const sp of species) if (sp === r.species) r.progress += 1;
    r.progress = Math.min(r.progress, r.target);
  }
}

/** A golden flock shot by hand. */
export function guestGolden(state: GameState): void {
  for (const r of state.guests.board) if (r.kind === 'golden' && r.progress < r.target) r.progress += 1;
}

/** Hand over a filled booking: pay out and sign the guestbook. */
export function claimGuest(state: GameState, id: number, events: EventSink): boolean {
  const g = state.guests;
  const r = g.board.find((x) => x.id === id);
  if (!r || r.claimed || r.progress < r.target) return false;
  r.claimed = true;
  g.board = g.board.filter((x) => x !== r);
  g.served += 1;
  state.currencies.coins = state.currencies.coins.add(r.coins);
  state.currencies.feathers = state.currencies.feathers.add(r.feathers);
  state.stats.lifetimeCoins = state.stats.lifetimeCoins.add(r.coins);
  state.stats.lifetimeFeathers = state.stats.lifetimeFeathers.add(r.feathers);
  state.season.coins = state.season.coins.add(r.coins);
  events.push({ type: 'guestServed', who: r.who, coins: r.coins, feathers: r.feathers, served: g.served });
  return true;
}

/** A short line for the booking card. */
export function requestText(r: GuestRequest): string {
  switch (r.kind) {
    case 'birds': return `wants a ${r.target.toLocaleString()}-bird hunt`;
    case 'species': return `wants ${r.target.toLocaleString()} ${SPECIES[r.species!].name}`;
    case 'weather': return `wants ${r.target.toLocaleString()} birds in the ${WEATHER[r.weather as WeatherId].name.toLowerCase()}`;
    case 'geese': return `wants ${r.target.toLocaleString()} geese from the field`;
    case 'golden': return 'wants to see a golden flock shot';
  }
}
