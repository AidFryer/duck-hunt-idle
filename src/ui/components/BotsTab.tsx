import { useState } from 'preact/hooks';
import { BOT_MILESTONES, BOTS, CREW_TITLE, crewOf, DECOYS, GROUND_CREW, GROUND_NAMES, MILESTONE_MULTIPLIER, WORKSHOP_ORDER, type BotId, type CrewId, type GroundId } from '../../data/economy';
import { PLANS } from '../../data/progression';
import { botPrice } from '../../sim/economy';
import { formatNumber, formatRate, type Notation } from '../../util/format';
import type { GameControls } from '../controls';
import type { HudSnapshot, RungSnapshot } from '../hudState';
import { ReqBar } from './Lodge';
import { Cost } from './Cost';
import { carvingPortrait, portrait } from '../portraits';
import { CARVINGS } from '../../data/carvings';
import { SPECIES } from '../../data/species';
import Decimal from 'break_infinity.js';
import { feedback } from '../feedback';
import { audio } from '../../audio/AudioEngine';

type BuyMode = 1 | 10 | 'max';

export function BotsTab({ hud, controls, notation }: { hud: HudSnapshot; controls: GameControls; notation: Notation }) {
  const [mode, setMode] = useState<BuyMode>(1);
  const [openId, setOpenId] = useState<string | null>(null);
  const toggle = (id: string) => setOpenId((o) => (o === id ? null : id));
  const shown = WORKSHOP_ORDER.filter((id) => showBot(hud, id));
  const crew = (c: CrewId) => ({ key: c, title: CREW_TITLE[c], ids: shown.filter((id) => crewOf(id) === c) });
  const sections: { key: string; title: string; ids: BotId[] }[] = [
    crew('marsh'),
    { key: 'decoys', title: 'Decoys', ids: [] },
    crew('timber'),
    crew('field'),
    crew('bay'),
    crew('lodge'),
  ].filter((g) => g.key === 'decoys' || g.ids.length > 0);
  const jump = (key: string) => document.getElementById(`ws-${key}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  return (
    <div class="tab-body workshop">
      <div class="tab-head">
        <h3>The Workshop</h3>
        <div class="seg" role="group" aria-label="How many to carve">
          {([1, 10, 'max'] as BuyMode[]).map((m) => (
            <button class={`seg__btn ${mode === m ? 'is-on' : ''}`} onClick={() => setMode(m)}>
              {m === 'max' ? 'Max' : `×${m}`}
            </button>
          ))}
        </div>
      </div>
      <nav class="ws-jump" aria-label="Workshop sections">
        {sections.map((g) => (
          <button class="ws-jump__chip" onClick={() => jump(g.key)}>{g.title}</button>
        ))}
      </nav>
      <p class="crew-note">{totalNote(hud, notation)}</p>
      {sections.map((g) => (
        <section id={`ws-${g.key}`} class="ws-section" aria-label={g.title}>
          <h4 class="group-head">{g.title}</h4>
          {g.key !== 'decoys' && <p class="ws-section__note">{crewNote(hud, g.key as CrewId, notation)}</p>}
          {g.key === 'decoys' ? (
            <DecoysSection hud={hud} controls={controls} notation={notation} />
          ) : (
            <ul class="ws-list">
              {g.ids.map((id) => (
                <BotRow id={id} hud={hud} controls={controls} notation={notation} mode={mode} open={openId === id} onToggle={() => toggle(id)} />
              ))}
            </ul>
          )}
        </section>
      ))}
    </div>
  );
}

/** Decoy spreads (and their rigs) for each ground, plus the collection. */
function DecoysSection({ hud, controls, notation }: { hud: HudSnapshot; controls: GameControls; notation: Notation }) {
  const open = (g: GroundId) => hud.grounds.some((x) => x.id === g && x.open);
  return (
    <>
      <SpreadCard ground="marsh" hud={hud} controls={controls} notation={notation} rigs={hud.ladder.setter} />
      {open('timber') && <SpreadCard ground="timber" hud={hud} controls={controls} notation={notation} rigs={[]} />}
      {hud.field.open && <SpreadCard ground="field" hud={hud} controls={controls} notation={notation} rigs={hud.ladder.staker} />}
      {open('bay') && <SpreadCard ground="bay" hud={hud} controls={controls} notation={notation} rigs={[]} />}
      <DecoyCollection hud={hud} controls={controls} notation={notation} />
    </>
  );
}

/** Hand-carved decoys for the lodge shelf: each is a one-time buy with a lasting bonus. */
function DecoyCollection({ hud, controls, notation }: { hud: HudSnapshot; controls: GameControls; notation: Notation }) {
  if (hud.lodge.level < 2) {
    return (
      <section class="spread-card is-locked">
        <h4>Decoy collection</h4>
        <p>Carve one-of-a-kind decoys for the lodge shelf. The carving bench opens with the Trapper's Cabin.</p>
      </section>
    );
  }
  const owned = hud.carvings.filter((c) => c.status === 'owned').length;
  return (
    <section class="carvings" aria-label="Decoy collection">
      <h4 class="group-head">Decoy collection · {owned}/{hud.carvings.length}</h4>
      <p class="card__hint">One-of-a-kind carvings. Each keeps its bonus for good, even after you move flyways.</p>
      <ul class="carving-grid">
        {hud.carvings.map((c) => {
          const d = CARVINGS[c.id];
          const known = c.status !== 'needsLodge';
          return (
            <li class={`carving carving--${c.status}`}>
              <div class="carving__art">
                {known ? <img src={carvingPortrait(c.id)} alt="" /> : <span class="carving__mystery" aria-hidden="true">?</span>}
              </div>
              <strong>{known ? d.name : 'Unknown carving'}</strong>
              <span class="carving__effect">{known ? d.effect : `Opens with lodge level ${d.lodge}`}</span>
              {c.status === 'owned' && <span class="carving__owned">On the shelf</span>}
              {c.status === 'needsBird' && <span class="carving__need">Bring in a {SPECIES[d.needs!].name} first</span>}
              {c.status === 'ready' && (
                <button class="btn btn--primary btn--buy btn--small" aria-disabled={!c.affordable} onClick={(e) => pulse(e.currentTarget as HTMLElement, controls.buyCarving(c.id))}>
                  <span>Carve</span>
                  <Cost price={{ coins: new Decimal(d.coins), feathers: new Decimal(d.feathers) }} notation={notation} />
                </button>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

/** Show bots you have, can earn now, or will be able to earn with the next lodge. */
function showBot(hud: HudSnapshot, id: BotId): boolean {
  const p = hud.plans[id];
  return p.earned || p.open || PLANS[id].lodge <= hud.lodge.level + 1;
}

/** One bot as a compact row; tap it to open the details, tune-up and ladder. */
function BotRow({ id, hud, controls, notation, mode, open, onToggle }: { id: BotId; hud: HudSnapshot; controls: GameControls; notation: Notation; mode: BuyMode; open: boolean; onToggle: () => void }) {
  const def = BOTS[id];
  const b = hud.bots[id];
  const plan = hud.plans[id];
  if (!plan.earned) {
    return (
      <li class="ws-row is-locked">
        <div class="ws-row__main">
          <div class="ws-row__portrait" aria-hidden="true">
            <img class={`bot-portrait bot-portrait--${id} is-sketch`} src={portrait(id)} alt="" />
          </div>
          <div class="ws-row__text">
            <strong>{def.name} <span class="ws-row__tag">Plans</span></strong>
            {plan.open ? <ReqBar r={plan.req} notation={notation} /> : <span>The plans open with the {plan.lodgeName}.</span>}
          </div>
        </div>
      </li>
    );
  }
  const count = mode === 'max' ? Math.max(1, b.maxAffordable) : mode;
  const price = count === 1 ? b.price : botPrice(id, b.owned, count);
  const affordable = mode === 'max' ? b.maxAffordable > 0 : count === 1 ? b.affordable : b.maxAffordable >= count;
  const ms = b.nextMilestone;
  const prevMs = [0, ...BOT_MILESTONES].filter((m) => m <= b.owned).pop() ?? 0;
  const msPct = ms ? ((b.owned - prevMs) / (ms - prevMs)) * 100 : 100;
  const rungs = hud.ladder[id];
  const rungReady = rungs.some((r) => !r.built && r.affordable);
  return (
    <li class={`ws-row ${open ? 'is-open' : ''} ${b.stuck > 0 ? 'is-stuck' : ''}`}>
      <div class="ws-row__main">
        <button class="ws-row__toggle" aria-expanded={open} onClick={onToggle} aria-label={`${def.name} details`}>
          <div class="ws-row__portrait" aria-hidden="true">
            <img class={`bot-portrait bot-portrait--${id}`} src={portrait(id)} alt="" />
            <span class="ws-row__owned">{b.owned}</span>
            {rungReady && <span class="ws-row__dot" title="A ladder step is ready" />}
          </div>
          <div class="ws-row__text">
            <strong>
              {def.name} <span class="ws-row__tag">Lv {b.level}</span>
              {hud.bestBuy === `bot:${id}` && <span class="best-buy">Best buy</span>}
            </strong>
            <span>
              {id === 'foreman'
                ? `Handles ${Math.max(1, Math.floor(b.unitSpeed * b.multiplier))} at a time each`
                : b.gain !== null && plan.earned ? `${gainText(b.gain, notation)} each${b.owned > 0 ? ` · ${formatRate(b.rate)} working` : ''}`
                : b.owned > 0 ? `${formatRate(b.rate)} working` : def.blurb}
              {b.stuck > 0 ? ` · ${b.stuck} stuck` : ''}
            </span>
            {ms && (
              <span class="ws-row__ms" title={`At ${ms} owned, output grows ×${MILESTONE_MULTIPLIER}`}>
                <span style={{ width: `${msPct}%` }} />
              </span>
            )}
          </div>
          <span class="ws-row__chev" aria-hidden="true">{open ? '▴' : '▾'}</span>
        </button>
        <button
          class="btn btn--primary btn--buy btn--small ws-row__buy"
          aria-disabled={!affordable}
          onClick={(e) => pulse(e.currentTarget as HTMLElement, controls.buyBot(id, count) > 0)}
        >
          <span>Carve{count > 1 ? ` ×${count}` : ''}</span>
          <Cost price={price} notation={notation} />
        </button>
      </div>
      {open && (
        <div class="ws-row__more">
          <p>{def.blurb}</p>
          <dl class="stats">
            {id !== 'foreman' && <div><dt>Speed</dt><dd>{formatRate(b.unitSpeed)} each</dd></div>}
            <div><dt>Reliability</dt><dd>{(b.reliability * 100).toFixed(1)}%</dd></div>
            {ms && <div><dt>Next team-up</dt><dd>{b.owned}/{ms} → ×{formatNumber(b.multiplier * MILESTONE_MULTIPLIER, notation)}</dd></div>}
            {b.bench > 0 && <div><dt>Resting</dt><dd>{b.bench}</dd></div>}
          </dl>
          {b.owned > 0 && <p class="card__hint">Drills for this bot are in the Training sheet.</p>}
          {rungs.length > 0 && <Ladder rungs={rungs} owned={b.owned} controls={controls} notation={notation} />}
        </div>
      )}
    </li>
  );
}

/** The automation ladder for one kind of bot: built rungs, the next one, and what's above. */
function Ladder({ rungs, owned, controls, notation }: { rungs: RungSnapshot[]; owned: number; controls: GameControls; notation: Notation }) {
  const next = rungs.find((r) => !r.built);
  return (
    <div class="ladder" aria-label="Automation ladder">
      <span class="ladder__title">Automation ladder</span>
      <ol class="ladder__rungs">
        <li class={`rung ${owned > 0 ? 'is-built' : ''}`}>
          <span class="rung__tick" aria-hidden="true">{owned > 0 ? '✓' : '1'}</span>
          <span class="rung__name">The first bot</span>
        </li>
        {rungs.map((r) => (
          <li class={`rung ${r.built ? 'is-built' : r === next ? 'is-next' : 'is-later'}`}>
            <span class="rung__tick" aria-hidden="true">{r.built ? '✓' : r.tier}</span>
            <span class="rung__name">{r.name}</span>
            <span class="rung__effect">{r.effect}</span>
            {r === next && (
              <div class="rung__next">
                <p>{r.blurb}</p>
                <div class="reqs">
                  {r.reqs.map((q) => <ReqBar r={q} notation={notation} />)}
                </div>
                <button
                  class="btn btn--primary btn--buy"
                  aria-disabled={!r.affordable}
                  onClick={(e) => pulse(e.currentTarget as HTMLElement, controls.buyRung(r.id))}
                >
                  <span>{r.ready ? 'Build it' : 'Not ready yet'}</span>
                  <Cost price={r.price} notation={notation} />
                </button>
              </div>
            )}
          </li>
        ))}
      </ol>
    </div>
  );
}

/** The decoy spread: always out; buy bags of decoys and build bigger rigs. */
const SPREAD_NAME: Record<GroundId, string> = { marsh: 'Decoy spread', field: 'Goose spread', timber: 'Timber spread', bay: 'Bay rig' };

function SpreadCard({ ground, hud, controls, notation, rigs }: { ground: GroundId; hud: HudSnapshot; controls: GameControls; notation: Notation; rigs: RungSnapshot[] }) {
  const sp = hud.spreads[ground];
  const next = rigs.find((r) => !r.built);
  const per = DECOYS[ground].perBag;
  return (
    <section class="spread-card" aria-label={SPREAD_NAME[ground]}>
      <div class="spread-card__head">
        <div>
          <h4>
            {SPREAD_NAME[ground]}
            {hud.bestBuy === `decoys:${ground}` && <span class="best-buy">Best buy</span>}
          </h4>
          <p>
            {sp.decoys} decoys out · flocks ×{formatNumber(sp.draw, notation)} · {gainText(sp.gain, notation)} a bag
          </p>
        </div>
        <button class="btn btn--primary btn--buy btn--small" aria-disabled={!sp.affordable} onClick={(e) => pulse(e.currentTarget as HTMLElement, controls.buyDecoys(ground))}>
          <span>+{per} decoys</span>
          <Cost price={sp.price} notation={notation} />
        </button>
      </div>
      {rigs.length > 0 && (
        <ol class="ladder__rungs spread-card__rigs">
          {rigs.map((r) => (
            <li class={`rung ${r.built ? 'is-built' : r === next ? 'is-next' : 'is-later'}`}>
              <span class="rung__tick" aria-hidden="true">{r.built ? '✓' : ''}</span>
              <span class="rung__name">{r.name}</span>
              <span class="rung__effect">{r.effect}</span>
              {r === next && (
                <div class="rung__next">
                  <div class="reqs">
                    {r.reqs.map((q) => <ReqBar r={q} notation={notation} />)}
                  </div>
                  <button class="btn btn--primary btn--buy" aria-disabled={!r.affordable} onClick={(e) => pulse(e.currentTarget as HTMLElement, controls.buyRung(r.id))}>
                    <span>{r.ready ? 'Build it' : 'Not ready yet'}</span>
                    <Cost price={r.price} notation={notation} />
                  </button>
                </div>
              )}
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

export function pulse(el: HTMLElement, ok: boolean): void {
  el.classList.remove('is-pressed', 'is-nope');
  void el.offsetWidth;
  el.classList.add(ok ? 'is-pressed' : 'is-nope');
  if (ok && (el.classList.contains('btn--buy') || el.classList.contains('perk'))) {
    feedback.sparkle(el);
    audio.play('buy');
  }
  if (!ok) audio.play('nope');
}

/** "+12 birds/min" (small gains get one decimal). */
export function gainText(g: number, notation: Notation): string {
  if (g < 0.05) return '+0 birds/min';
  return `+${g < 10 ? (Math.round(g * 10) / 10).toString() : formatNumber(g, notation)} birds/min`;
}

/** How many birds a minute come in, across every ground. */
function totalNote(hud: HudSnapshot, notation: Notation): string {
  const bpm = hud.birdsPerMin;
  if (bpm < 0.05) return 'Carve your first crew and the marsh starts hunting on its own.';
  return `About ${formatNumber(bpm, notation)} birds a minute in all.`;
}

/** What more flocks take on each ground. */
const MORE_FLOCKS: Record<GroundId, string> = {
  marsh: 'More decoys or acres bring more',
  timber: 'More decoys or flooded stands bring more',
  field: 'More goose decoys bring more',
  bay: 'A bigger bay rig brings more',
};

/** One line under each crew: what's holding that ground back right now. */
function crewNote(hud: HudSnapshot, c: CrewId, notation: Notation): string {
  if (c === 'lodge') return 'Help every ground: Ledgers turn birds into coins, Scouts find marsh flocks, Foremen and Tinkers fix the crews.';
  const g = hud.grounds.find((x) => x.id === c);
  if (!g?.open) return `Works the ${GROUND_NAMES[c]} once it opens.`;
  const [callBot, shootBot, fetchBot] = GROUND_CREW[c].map((id) => BOTS[id].name);
  const anyOwned = GROUND_CREW[c].some((id) => hud.bots[id].owned > 0);
  if (!anyOwned) return `Works the ${GROUND_NAMES[c]}: a ${callBot}, a ${shootBot} and a ${fetchBot}. Until then, hunt it by hand.`;
  const lim = hud.limits[c] ?? 'flocks';
  const what =
    lim === 'call' ? `calling. More ${callBot}s`
    : lim === 'shoot' ? `shooting. More ${shootBot}s`
    : lim === 'fetch' ? `fetching. More ${fetchBot}s`
    : `not enough flocks. ${MORE_FLOCKS[c]}`;
  const bpm = hud.groundBirds?.[c];
  return `${bpm !== undefined ? `About ${formatNumber(bpm, notation)} birds a minute. ` : ''}Holding it back: ${what}.`;
}
