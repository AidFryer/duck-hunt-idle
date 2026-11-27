/**
 * Pacing over days: each day is one long play session (the autoplayer) and
 * then time away (bots only, at the offline pace, up to the offline cap).
 * Used by the balance tests to check the game lasts weeks without dead spots.
 */
import { OFFLINE } from '../data/upgrades';
import { autoplay } from './autoplay';
import type { SimEvent } from './events';
import type { GameState } from './state';
import { step } from './tick';
import { starsFor } from './prestige';
import { offlineCapSeconds } from './upgrades';

export interface WeekOptions {
  days: number;
  /** Hours of active play per day. */
  sessionHours?: number;
  /** Hours away between sessions (capped by the offline cap). */
  awayHours?: number;
  tapsPerSecond?: number;
  dt?: number;
  prestige?: boolean;
}

export interface WeekEvent {
  /** Day number (1-based) plus fraction of that day's session. */
  day: number;
  /** Minutes of active play so far. */
  playMin: number;
  what: string;
}

export interface WeekReport {
  lodge: (number | null)[];
  firstStar: number | null;
  events: WeekEvent[];
  /** Longest stretch of active play (minutes) with nothing new. */
  longestGapMin: number;
}

function snapshot(s: GameState) {
  return {
    lodge: s.lodge,
    plans: Object.keys(s.plans).length,
    rungs: Object.keys(s.rungs).length,
    species: Object.values(s.guide).filter((g) => (g?.count ?? 0) > 0).length,
    carvings: Object.keys(s.carvings).length,
    upgrades: Object.values(s.upgrades).filter((x) => x > 0).length,
    plots: s.plots.filter((p) => p.crop).length,
    field: s.unlocks.field !== undefined,
    volley: s.volley.unlocked,
    stars: s.stats.seasonsClosed,
    patches: Object.keys(s.achievements).length,
  };
}

export function playWeeks(s: GameState, o: WeekOptions): WeekReport {
  const session = (o.sessionHours ?? 1.5) * 3600;
  const away = (o.awayHours ?? 22.5) * 3600;
  const dt = o.dt ?? 0.5;
  const chunk = 60;
  const rep: WeekReport = { lodge: [null, 0, null, null, null, null], firstStar: null, events: [], longestGapMin: 0 };
  let prev = snapshot(s);
  let playMin = 0;
  let lastNew = 0;
  const noEvents: SimEvent[] = [];
  for (let d = 0; d < o.days; d++) {
    for (let t = 0; t < session; t += chunk) {
      autoplay(s, { seconds: chunk, dt, tapsPerSecond: o.tapsPerSecond ?? 1, prestige: o.prestige });
      playMin += chunk / 60;
      const now = snapshot(s);
      const day = d + 1 + t / session;
      const news: string[] = [];
      if (now.lodge > prev.lodge) {
        news.push(`LODGE ${now.lodge}`);
        rep.lodge[now.lodge] = day;
      }
      if (now.plans > prev.plans) news.push(`+${now.plans - prev.plans} plan`);
      if (now.rungs > prev.rungs) news.push(`+${now.rungs - prev.rungs} rung`);
      if (now.species > prev.species) news.push(`+${now.species - prev.species} bird`);
      if (now.carvings > prev.carvings) news.push('+carving');
      if (now.upgrades > prev.upgrades) news.push(`+${now.upgrades - prev.upgrades} upgrade`);
      if (now.plots > prev.plots) news.push('+plot');
      if (now.field && !prev.field) news.push('GOOSE FIELD');
      if (now.patches > prev.patches) news.push(`+${now.patches - prev.patches} patch`);
      if (now.volley && !prev.volley) news.push('VOLLEY');
      if (now.stars > prev.stars && false) {
        news.push('SEASON CLOSED');
        rep.firstStar ??= day;
      }
      if (news.length) {
        rep.events.push({ day, playMin, what: news.join(', ') });
        rep.longestGapMin = Math.max(rep.longestGapMin, playMin - lastNew);
        lastNew = playMin;
      }
      prev = now;
    }
    // Away: the crew keeps working at the offline pace; nothing gets bought.
    const offline = Math.min(away, offlineCapSeconds(s)) * OFFLINE.efficiency;
    for (let t = 0; t < offline; t += dt) {
      step(s, dt, noEvents);
      noEvents.length = 0;
    }
    if (rep.firstStar === null && starsFor(s.season.coins) >= 1) rep.firstStar = d + 1.99;
    rep.events.push({ day: d + 1.99, playMin, what: `end of day: season coins ${s.season.coins.toExponential(2)}, bots ${Object.values(s.bots).reduce((a, b) => a + b.owned, 0)}` });
  }
  return rep;
}

export function formatWeeks(r: WeekReport): string {
  const d = (x: number | null) => (x === null ? 'not reached' : `day ${x.toFixed(1)}`);
  return [
    ...r.lodge.slice(2).map((x, i) => `Lodge ${i + 2}: ${d(x)}`),
    `First star ready: ${d(r.firstStar)}`,
    `Longest active stretch with nothing new: ${r.longestGapMin.toFixed(0)} min`,
    ...r.events.map((e) => `  d${e.day.toFixed(2)} (${e.playMin.toFixed(0)}m): ${e.what}`),
  ].join('\n');
}
