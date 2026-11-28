/**
 * A scripted "attentive player" used by the balance test. It taps like a
 * person (a limited number of actions per second), fixes stuck bots,
 * buys what the pipeline's bottleneck needs, learns crew skills, trains the dog, serves guests and
 * closes the season when it's worth a star. Pure: drives the sim directly.
 */
import { TRAINING, TRAINING_ORDER } from '../data/training';
import { buyTraining, dogNext, trainDog, trainingStatus } from './training';
import { claimGuest } from './guests';
import { CARVINGS, CARVING_ORDER } from '../data/carvings';
import { buyCarving, carvingStatus } from './carvings';
import { fireVolley } from './volley';
import Decimal from 'break_infinity.js';
import { BOT_ORDER, HUNT, type BotId, type GroundId } from '../data/economy';
import { UPGRADE_ORDER, UPGRADES } from '../data/upgrades';
import { groundOpen, acrePrice, botPrice, botPriceMult, buyAcre, buyBot, buyDecoyBag, canAfford, decoyBagPrice, levelPrice, levelUpBot, type Price, standPrice, buyStand } from './economy';
import type { SimEvent } from './events';
import { doAction, canDo, fieldOpen, ground, type ActionJob } from './hunt';
import { fixAll } from './problems';
import { buyPerk, canBuyPerk, closeSeason, nextFlyway, perkCost, perkRank, starsFor } from './prestige';
import { PERK_ORDER } from '../data/legacy';
import type { GameState } from './state';
import { step } from './tick';
import { buyUpgrade, upgradePrice } from './upgrades';
import { buildLodge, buyRung, canBuildLodge, lodgeReady, nextLodge, rungPrice, rungReady } from './progression';
import { RUNG_ORDER, SPECIES_DRAW } from '../data/progression';
import type { UpgradeId } from '../data/upgrades';
import { cropsFor, FAR_PLOT_ORDER, plotCount, type CropId } from '../data/crops';
import { cropPrice, farPlotPrice, levelFarPlot, levelPlot, plantCrop, plotLevelPrice } from './crops';
import type { SpeciesId } from '../data/species';

export interface PaceReport {
  /** Sim seconds when each milestone was first reached (null = not reached). */
  firstBot: number | null;
  coins1k: number | null;
  coins10k: number | null;
  coins100k: number | null;
  firstStar: number | null;
  /** When each lodge level was built (index = level). */
  lodge: (number | null)[];
  /** When each bot's plans were earned. */
  plans: Partial<Record<BotId, number>>;
  /** Totals at the end. */
  seasonCoins: Decimal;
  lifetimeCoins: Decimal;
  birds: number;
  bots: number;
  species: number;
  /** Coins per second over the last 5 minutes. */
  incomeAtEnd: number;
  timeline: { t: number; coins: number; bots: number; birds: number }[];
}

export interface AutoplayOptions {
  seconds: number;
  /** Manual actions per second while "playing". */
  tapsPerSecond?: number;
  /** Sim step. */
  dt?: number;
  /** Close the season as soon as it's worth a star. */
  prestige?: boolean;
}

const totalBots = (s: GameState) => BOT_ORDER.reduce((a, id) => a + s.bots[id].owned, 0);

/** What the crew most needs right now (by queue pressure). */
function wanted(s: GameState): BotId[] {
  const h = s.hunt;
  const out: BotId[] = [];
  if (h.ledger.length > 6) out.push('ledger');
  if (h.downed.length > 3) out.push('retriever');
  if (h.committed.length >= 2) out.push('blind');
  if (h.incoming.length >= 2) out.push('caller');
  if (h.incoming.length === 0) out.push('scout');
  // Keep a balanced crew underneath the bottleneck buys.
  const own = (id: BotId) => s.bots[id].owned;
  if (own('caller') < 1) out.push('caller');
  if (own('blind') < own('caller')) out.push('blind');
  if (own('retriever') < own('blind')) out.push('retriever');
  if (own('ledger') < Math.ceil(own('retriever') / 2)) out.push('ledger');
  if (own('scout') < Math.ceil(own('caller') / 2)) out.push('scout');
  if (s.problems.total > 3 && own('foreman') < Math.ceil(totalBots(s) / 40)) out.push('foreman');
  if (own('tinker') < Math.floor(totalBots(s) / 60)) out.push('tinker');
  if (fieldOpen(s)) {
    const f = s.field;
    if (f.downed.length > 3 || own('fieldDog') < own('layout')) out.push('fieldDog');
    if (f.committed.length >= 1 || own('layout') < own('flagger')) out.push('layout');
    if (f.incoming.length >= 2 || own('flagger') < 1) out.push('flagger');
  }
  for (const [g, caller, shooter, pup] of [['timber', 'tCaller', 'tBlind', 'tPup'], ['bay', 'bCaller', 'bBlind', 'bPup']] as const) {
    if (!groundOpen(s, g)) continue;
    const d = ground(s, g);
    if (d.downed.length > 3 || own(pup) < 1) out.push(pup);
    if (d.committed.length >= 1 || own(shooter) < own(caller)) out.push(shooter);
    if (d.incoming.length >= 2 || own(caller) < 1) out.push(caller);
  }
  return out.filter((id) => !!s.plans[id]);
}

interface Option {
  price: Price;
  buy: () => boolean;
  /** Goes before cheaper things (new birds, the lodge). */
  first?: boolean;
}

/** Crops that would bring a kind of duck we haven't seen. */
function cropBringsNew(s: GameState, c: CropId): boolean {
  return Object.entries(SPECIES_DRAW).some(([sp, need]) => !s.guide[sp as SpeciesId] && need!.some((d) => 'crop' in d && d.crop.includes(c)));
}

/** Upgrades that would bring a kind of duck we haven't seen. */
function bringsNewBirds(s: GameState, u: UpgradeId): boolean {
  if ((s.upgrades[u] ?? 0) > 0) return false;
  return Object.entries(SPECIES_DRAW).some(([sp, need]) => !s.guide[sp as SpeciesId] && need!.some((d) => 'upgrade' in d && d.upgrade === u));
}

function options(s: GameState): Option[] {
  const opts: Option[] = [];
  // The lodge comes first whenever it's ready: it's the big goal.
  const next = nextLodge(s);
  let cap: number | null = null;
  if (next && lodgeReady(s)) {
    if (canBuildLodge(s)) opts.push({ price: { coins: new Decimal(0), feathers: new Decimal(0) }, buy: () => buildLodge(s) });
    else cap = next.coins * 0.05; // save up: only small buys meanwhile
  }
  saveCap = cap;
  // Food plots: fill empty plots, and swap a plot to a crop that brings an unseen bird.
  const crops = cropsFor(s.flyway);
  for (let i = 0; i < plotCount(s.lodge); i++) {
    const cur = s.plots[i]!.crop;
    const curUseful = cur !== null && cropBringsNew(s, cur);
    const fresh = crops.find((c) => c !== cur && !s.plots.some((p) => p.crop === c) && cropBringsNew(s, c));
    const pick = curUseful ? null : fresh ?? (cur ? null : crops.find((c) => !s.plots.some((p) => p.crop === c)) ?? crops[0]!);
    if (pick) opts.push({ price: cropPrice(pick, i), buy: () => plantCrop(s, i, pick), first: !!fresh });
  }
  for (const id of RUNG_ORDER) if (rungReady(s, id)) opts.push({ price: rungPrice(id), buy: () => buyRung(s, id) });
  // Plot levels, and the other grounds' plots.
  for (let i = 0; i < plotCount(s.lodge); i++) if (s.plots[i]!.crop) opts.push({ price: plotLevelPrice(i, s.plots[i]!.level), buy: () => levelPlot(s, i) });
  for (const g of FAR_PLOT_ORDER) if (groundOpen(s, g)) opts.push({ price: farPlotPrice(g, s.farPlots[g]), buy: () => levelFarPlot(s, g) });
  if (s.unlocks.bots === undefined) return opts;
  for (const id of new Set(wanted(s))) {
    opts.push({ price: botPrice(id, s.bots[id].owned, 1, botPriceMult(s, id)), buy: () => buyBot(s, id, 1) > 0 });
  }
  if (s.unlocks.upgrades === undefined) return opts;
  opts.push({ price: acrePrice(s.acres), buy: () => buyAcre(s) });
  if (groundOpen(s, 'timber')) opts.push({ price: standPrice(s.stands), buy: () => buyStand(s) });
  opts.push({ price: decoyBagPrice(s), buy: () => buyDecoyBag(s) });
  for (const g of ['field', 'timber', 'bay'] as const) if (groundOpen(s, g)) opts.push({ price: decoyBagPrice(s, g), buy: () => buyDecoyBag(s, g) });
  for (const u of UPGRADE_ORDER) {
    const lvl = s.upgrades[u] ?? 0;
    if (lvl >= UPGRADES[u].maxLevel || s.lodge < UPGRADES[u].lodge) continue;
    opts.push({ price: upgradePrice(u, lvl), buy: () => buyUpgrade(s, u), first: bringsNewBirds(s, u) });
  }
  // Crew Training skills and the dog.
  for (const id of TRAINING_ORDER) {
    if (trainingStatus(s, id) !== 'ready') continue;
    opts.push({ price: { coins: new Decimal(TRAINING[id].coins), feathers: new Decimal(TRAINING[id].feathers) }, buy: () => buyTraining(s, id) });
  }
  const dn = dogNext(s);
  if (dn?.ready) opts.push({ price: { coins: new Decimal(0), feathers: new Decimal(dn.feathers) }, buy: () => trainDog(s) });
  // Lodge rooms are upgrades (already above); guests get their bookings handed over.
  for (const r of [...s.guests.board]) if (r.progress >= r.target) claimGuest(s, r.id, []);
  // Carved decoys for the shelf.
  for (const id of CARVING_ORDER) {
    if (carvingStatus(s, id) !== 'ready') continue;
    opts.push({ price: { coins: new Decimal(CARVINGS[id].coins), feathers: new Decimal(CARVINGS[id].feathers) }, buy: () => buyCarving(s, id, []) });
  }
  // Tune-ups for the most-owned types, when they are cheap relative to the crew.
  for (const id of BOT_ORDER) {
    const b = s.bots[id];
    if (b.owned >= 5) opts.push({ price: levelPrice(id, b.level), buy: () => levelUpBot(s, id) });
  }
  return opts;
}

/** Buy the cheapest affordable useful thing, repeatedly. */
let saveCap: number | null = null;

function shop(s: GameState): void {
  for (let guard = 0; guard < 50; guard++) {
    const all = options(s);
    // Save up for a priority buy that isn't affordable yet.
    for (const o of all) if (o.first && !canAfford(s, o.price)) saveCap = Math.min(saveCap ?? Infinity, o.price.coins.toNumber() * 0.05);
    const affordable = all.filter((o) => canAfford(s, o.price) && (o.first || saveCap === null || o.price.coins.lte(saveCap)));
    if (affordable.length === 0) return;
    affordable.sort((a, b) => Number(!!b.first) - Number(!!a.first) || a.price.coins.cmp(b.price.coins));
    if (!affordable[0]!.buy()) return;
  }
}

const GROUND_TAPS: [GroundId, ActionJob[]][] = [
  ['marsh', ['shoot', 'call', 'retrieve']],
  ['field', ['fShoot', 'flag', 'fRetrieve']],
  ['timber', ['tShoot', 'tCall', 'tRetrieve']],
  ['bay', ['bShoot', 'bCall', 'bRetrieve']],
];
let taken = 0;

export function autoplay(s: GameState, opts: AutoplayOptions): PaceReport {
  const dt = opts.dt ?? 0.5;
  const taps = opts.tapsPerSecond ?? 1.5;
  const steps = Math.floor(opts.seconds / dt);
  const r: PaceReport = {
    firstBot: null, coins1k: null, coins10k: null, coins100k: null, firstStar: null, lodge: [null, 0, null, null, null, null], plans: {},
    seasonCoins: new Decimal(0), lifetimeCoins: new Decimal(0), birds: 0, bots: 0, species: 0,
    incomeAtEnd: 0, timeline: [],
  };
  const events: SimEvent[] = [];
  let tapBudget = 0;
  const start = s.elapsed;
  let coinsFiveMinAgo = new Decimal(0);
  for (let i = 0; i < steps; i++) {
    step(s, dt, events);
    events.length = 0;
    if (s.volley.charge >= 1) fireVolley(s, events);
    const t = s.elapsed - start;

    // Hands on the buttons.
    tapBudget += taps * dt;
    while (tapBudget >= 1) {
      tapBudget -= 1;
      if (s.problems.open.length > 0) {
        fixAll(s, events);
        continue;
      }
      // Take turns between the open grounds (the one in turn first, then the rest).
      const open = GROUND_TAPS.filter(([g]) => g === 'marsh' || (g === 'field' ? fieldOpen(s) : groundOpen(s, g)));
      const turn = (taken++) % open.length;
      const order: ActionJob[] = [...open.slice(turn), ...open.slice(0, turn)].flatMap(([, jobs]) => jobs);
      const stage = order.find((st) => canDo(s, st));
      if (!stage) break;
      doAction(s, stage, 'manual', events);
    }

    // Shopping and planning, about once a second.
    if (i % Math.max(1, Math.round(1 / dt)) === 0) {
      shop(s);
      if (opts.prestige) {
        // Close once this season is worth at least half the stars earned so far.
        const gain = starsFor(s.season.coins);
        if (gain >= Math.max(1, Math.ceil(s.legacy.earned * 0.5))) closeSeason(s, nextFlyway(s));
        // Spend stars: the cheapest perk (or next rank) that's open.
        for (let k = 0; k < 40; k++) {
          const buy = PERK_ORDER.filter((id) => canBuyPerk(s, id)).sort((x, y) => perkCost(x, perkRank(s, x)) - perkCost(y, perkRank(s, y)))[0];
          if (!buy || !buyPerk(s, buy)) break;
        }
      }
    }

    const sc = s.season.coins;
    if (r.firstBot === null && totalBots(s) > 0) r.firstBot = t;
    if (r.lodge[s.lodge] === null) r.lodge[s.lodge] = t;
    for (const id of BOT_ORDER) if (s.plans[id] && r.plans[id] === undefined) r.plans[id] = t;
    if (r.coins1k === null && sc.gte(1e3)) r.coins1k = t;
    if (r.coins10k === null && sc.gte(1e4)) r.coins10k = t;
    if (r.coins100k === null && sc.gte(1e5)) r.coins100k = t;
    if (r.firstStar === null && (starsFor(sc) >= 1 || s.stats.seasonsClosed > 0)) r.firstStar = t;
    if (i % Math.round(300 / dt) === 0) {
      r.timeline.push({ t, coins: sc.toNumber(), bots: totalBots(s), birds: s.stats.lifetimeBirds });
      if (t >= opts.seconds - 300 - 1) coinsFiveMinAgo = s.stats.lifetimeCoins;
    }
  }
  r.seasonCoins = s.season.coins;
  r.lifetimeCoins = s.stats.lifetimeCoins;
  r.birds = s.stats.lifetimeBirds;
  r.bots = totalBots(s);
  r.species = Object.values(s.guide).filter((g) => (g?.count ?? 0) > 0).length;
  r.incomeAtEnd = s.stats.lifetimeCoins.sub(coinsFiveMinAgo).toNumber() / 300;
  void HUNT;
  return r;
}

export function formatPace(r: PaceReport): string {
  const m = (t: number | null) => (t === null ? 'not reached' : `${(t / 60).toFixed(1)} min`);
  const lines = [
    `First bot:            ${m(r.firstBot)}`,
    ...r.lodge.slice(2).map((t, i) => `Lodge level ${i + 2}:        ${m(t)}`),
    `Plans: ${BOT_ORDER.map((id) => `${id} ${m(r.plans[id] ?? null)}`).join(', ')}`,
    `1K season coins:      ${m(r.coins1k)}`,
    `10K season coins:     ${m(r.coins10k)}`,
    `100K season coins:    ${m(r.coins100k)}`,
    `First Flyway Star:    ${m(r.firstStar)}`,
    `Birds brought in:     ${r.birds}`,
    `Bots owned at end:    ${r.bots}`,
    `Species found:        ${r.species}`,
    `Income at end:        ${r.incomeAtEnd.toFixed(1)} coins/s`,
    'Timeline (min: season coins / bots / birds):',
    ...r.timeline.map((p) => `  ${(p.t / 60).toFixed(0).padStart(4)}: ${Math.round(p.coins).toString().padStart(10)} / ${String(p.bots).padStart(4)} / ${p.birds}`),
  ];
  return lines.join('\n');
}
