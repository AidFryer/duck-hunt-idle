import { ACRES, STANDS } from '../../data/economy';
import { useState } from 'preact/hooks';
import { CROPS, FAR_PLOTS, PLOT_LEVELS, type FarPlotGround } from '../../data/crops';
import { UPGRADES } from '../../data/upgrades';
import { formatNumber, type Notation } from '../../util/format';
import type { GameControls } from '../controls';
import type { HudSnapshot } from '../hudState';
import { gainText, pulse } from './BotsTab';
import { Cost } from './Cost';

type Up = HudSnapshot['upgrades'][number];

/** Sooner things first: by the lodge level that opens them, then by price. */
const byWhen = (a: Up, b: Up) => a.lodge - b.lodge || a.price.coins.cmp(b.price.coins);

export function UpgradesTab({ hud, controls, notation }: { hud: HudSnapshot; controls: GameControls; notation: Notation }) {
  const marsh = hud.upgrades.filter((u) => !UPGRADES[u.id].field && !UPGRADES[u.id].room && !UPGRADES[u.id].ground);
  const groundOpen = (g: string) => hud.grounds.some((x) => x.id === g && x.open);
  const far = (['timber', 'bay'] as const).map((g) => ({
    g,
    name: hud.grounds.find((x) => x.id === g)!.name,
    open: groundOpen(g),
    ups: hud.upgrades.filter((u) => UPGRADES[u.id].ground === g && u.revealed).sort(byWhen),
  }));
  const field = hud.upgrades.filter((u) => UPGRADES[u.id].field);
  const open = marsh.filter((u) => u.revealed).sort(byWhen);
  const ready = open.filter((u) => u.level < u.max);
  const maxed = open.filter((u) => u.level >= u.max);
  const soon = hud.upgrades.filter((u) => !UPGRADES[u.id].field && !UPGRADES[u.id].room && !u.revealed && u.lodge === hud.lodge.level + 1).sort(byWhen);
  return (
    <div class="tab-body upgrades-tab">
      <FoodPlots hud={hud} controls={controls} notation={notation} />

      <h4 class="group-head">Marsh & habitat</h4>
      <ul class="up-list">
        <li class="up-row">
          <div class="up-row__text">
            <strong>
              Wetland Acres <span class="up-row__lvl">{hud.acres}</span>
              {hud.bestBuy === 'acre' && <span class="best-buy">Best buy</span>}
            </strong>
            <span>
              Flocks ×{formatNumber(Math.pow(ACRES.flockRateGrowth, hud.acres - 1), notation)} · {hud.maxCircling} can circle · {gainText(hud.acreGain, notation)} next
            </span>
          </div>
          <button class="btn btn--primary btn--buy btn--small" aria-disabled={!hud.acreAffordable} onClick={(e) => pulse(e.currentTarget as HTMLElement, controls.buyAcre())}>
            <Cost price={hud.acrePrice} notation={notation} />
          </button>
        </li>
        {ready.map((u) => <UpRow u={u} controls={controls} notation={notation} offline={hud.offlineHours} rep={{ now: hud.reputation, next: hud.reputationNextDock }} />)}
        {maxed.map((u) => <UpRow u={u} controls={controls} notation={notation} offline={hud.offlineHours} rep={{ now: hud.reputation, next: hud.reputationNextDock }} />)}
      </ul>

      {soon.length > 0 && (
        <>
          <h4 class="group-head">Coming with the {soon[0]!.lodgeName}</h4>
          <ul class="up-list is-soon">
            {soon.map((u) => (
              <li class="up-row is-locked">
                <div class="up-row__text">
                  <strong>{UPGRADES[u.id].name}</strong>
                  <span>{UPGRADES[u.id].effect}</span>
                </div>
              </li>
            ))}
          </ul>
        </>
      )}

      {hud.field.open && (
        <>
          <h4 class="group-head">Goose field</h4>
          <ul class="up-list">
            <FarPlotRow hud={hud} g="field" controls={controls} notation={notation} />
            {field.filter((u) => u.revealed).sort(byWhen).map((u) => <UpRow u={u} controls={controls} notation={notation} offline={hud.offlineHours} rep={{ now: hud.reputation, next: hud.reputationNextDock }} />)}
          </ul>
        </>
      )}

      {far.filter((f) => f.open).map((f) => (
        <>
          <h4 class="group-head">{f.name}</h4>
          {f.g === 'timber' && <p class="card__hint up-hint">The feather ground: birds here give {STANDS.feathers}× feathers{hud.stands.feathersPerMin >= 1 ? ` (about ${formatNumber(hud.stands.feathersPerMin, notation)} a minute now)` : ''}.</p>}
          <ul class="up-list">
            <FarPlotRow hud={hud} g={f.g} controls={controls} notation={notation} />
            {f.g === 'timber' && (
              <li class="up-row">
                <div class="up-row__text">
                  <strong>
                    Flooded Stands <span class="up-row__lvl">{hud.stands.count}</span>
                    {hud.bestBuy === 'stand' && <span class="best-buy">Best buy</span>}
                  </strong>
                  <span>Flood another stand: +{Math.round((STANDS.flockRateGrowth - 1) * 100)}% timber flocks, bigger flocks{hud.stands.gain >= 0.05 ? ` · ${gainText(hud.stands.gain, notation)}` : ''}</span>
                </div>
                <button class="btn btn--primary btn--buy btn--small" aria-disabled={!hud.stands.affordable} onClick={(e) => pulse(e.currentTarget as HTMLElement, controls.buyStand())}>
                  <Cost price={hud.stands.price} notation={notation} />
                </button>
              </li>
            )}
            {f.ups.map((u) => <UpRow u={u} controls={controls} notation={notation} offline={hud.offlineHours} rep={{ now: hud.reputation, next: hud.reputationNextDock }} />)}
          </ul>
        </>
      ))}
    </div>
  );
}

function UpRow({ u, controls, notation, offline, rep }: { u: Up; controls: GameControls; notation: Notation; offline: number; rep?: { now: number; next: number } }) {
  const d = UPGRADES[u.id];
  const maxed = u.level >= u.max;
  return (
    <li class={`up-row ${maxed ? 'is-maxed' : ''}`} title={d.blurb}>
      <div class="up-row__text">
        <strong>
          {d.name} <span class="up-row__lvl">{u.level}/{u.max}</span>
        </strong>
        <span>
          {d.effect}
          {u.id === 'cot' ? ` (now ${offline}h)` : ''}
          {u.id === 'guestDock' && !maxed && rep ? ` (coins +${Math.round((rep.now - 1) * 100)}% → +${Math.round((rep.next - 1) * 100)}%)` : ''}
          {u.gain >= 0.05 && !maxed ? ` · ${gainText(u.gain, notation)}` : ''}
        </span>
      </div>
      {maxed ? (
        <span class="maxed">Max</span>
      ) : (
        <button class="btn btn--primary btn--buy btn--small" aria-disabled={!u.affordable} onClick={(e) => pulse(e.currentTarget as HTMLElement, controls.buyUpgrade(u.id))}>
          <Cost price={u.price} notation={notation} />
        </button>
      )}
    </li>
  );
}

/** Food plots: the crop picks which birds come; levels draw more flocks. */
function FoodPlots({ hud, controls, notation }: { hud: HudSnapshot; controls: GameControls; notation: Notation }) {
  const p = hud.plots;
  const [picking, setPicking] = useState<number | null>(null);
  if (p.open === 0) {
    return (
      <section class="spread-card is-locked">
        <h4>Food plots</h4>
        <p>Plant crops on the far bank to bring new ducks. Your first plot opens with the {p.nextLodgeName ?? "Trapper's Cabin"}.</p>
      </section>
    );
  }
  return (
    <section class="plots" aria-label="Food plots">
      <h4 class="group-head">Food plots</h4>
      <p class="card__hint up-hint">The crop decides which birds come. Each level draws more flocks to the marsh, and every {PLOT_LEVELS.birdsEvery} levels makes flocks bigger.</p>
      <ul class="up-list">
        {p.list.map((plot, i) => {
          const open = picking === i || !plot.crop;
          return (
            <>
              <li class="up-row plot-row">
                <div class="up-row__text">
                  <strong>
                    {plot.crop ? CROPS[plot.crop].name : `Plot ${i + 1}`}{' '}
                    {plot.level > 0 && <span class="up-row__lvl">Lv {plot.level}</span>}
                    {hud.bestBuy === `plot:${i}` && <span class="best-buy">Best buy</span>}
                  </strong>
                  <span>
                    {plot.crop ? plotLine(plot, notation) : 'Empty. Pick a crop to plant.'}
                  </span>
                  {plot.crop && (
                    <button class="link-btn plot-row__change" aria-expanded={open} onClick={() => setPicking(picking === i ? null : i)}>
                      {open ? 'Keep this crop' : 'Change crop'}
                    </button>
                  )}
                </div>
                {plot.crop && (
                  <button class="btn btn--primary btn--buy btn--small" aria-disabled={!plot.levelAffordable} onClick={(e) => pulse(e.currentTarget as HTMLElement, controls.levelPlot(i))}>
                    <Cost price={plot.levelPrice} notation={notation} />
                  </button>
                )}
              </li>
              {open && (
                <li class="crop-picker">
                  {plot.options.map((o) => {
                    const on = plot.crop === o.crop;
                    return (
                      <div class={`crop-opt ${on ? 'is-on' : ''}`}>
                        <div class="crop-opt__text">
                          <strong>{CROPS[o.crop].name}</strong>
                          <span>{CROPS[o.crop].effect}</span>
                          {o.birds.length > 0 && (
                            <span class="crop-birds">
                              {o.birds.map((b) => (
                                <span class={`crop-bird ${b.found ? 'is-found' : ''}`}>{b.found ? '✓ ' : ''}{b.name}</span>
                              ))}
                            </span>
                          )}
                        </div>
                        {on ? (
                          <span class="maxed">Planted</span>
                        ) : (
                          <button
                            class="btn btn--buy btn--small"
                            aria-disabled={!o.affordable}
                            onClick={(e) => {
                              const ok = controls.plantCrop(i, o.crop);
                              pulse(e.currentTarget as HTMLElement, ok);
                              if (ok) setPicking(null);
                            }}
                          >
                            <span>Plant</span>
                            <Cost price={o.price} notation={notation} />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </li>
              )}
            </>
          );
        })}
      </ul>
      {p.nextLodgeName && <p class="plot-note">Another plot opens with the {p.nextLodgeName}.</p>}
    </section>
  );
}

const pct = (m: number) => Math.round((m - 1) * 100);

/** "Flocks +34% · +1 bird per flock · growing 40% · +12 birds/min" */
function plotLine(plot: HudSnapshot['plots']['list'][number], notation: Notation): string {
  const parts: string[] = [];
  if (pct(plot.flocks) > 0) parts.push(`Flocks +${pct(plot.flocks)}%`);
  const birds = (plot.crop ? CROPS[plot.crop].flockSize : 0) + Math.floor(plot.level / PLOT_LEVELS.birdsEvery);
  if (birds > 0) parts.push(`+${birds} bird${birds > 1 ? 's' : ''} per flock`);
  if (plot.growth < 1) parts.push(`growing ${Math.round(plot.growth * 100)}%`);
  if (plot.gain >= 0.05) parts.push(gainText(plot.gain, notation));
  return parts.join(' · ');
}

/** The plot on the timber, the goose field or the bay. */
function FarPlotRow({ hud, g, controls, notation }: { hud: HudSnapshot; g: FarPlotGround; controls: GameControls; notation: Notation }) {
  const f = hud.plots.far.find((x) => x.g === g);
  if (!f?.open) return null;
  return (
    <li class="up-row" title={FAR_PLOTS[g].blurb}>
      <div class="up-row__text">
        <strong>
          {f.name} {f.level > 0 && <span class="up-row__lvl">Lv {f.level}</span>}
          {hud.bestBuy === `farPlot:${g}` && <span class="best-buy">Best buy</span>}
        </strong>
        <span>
          {f.level > 0 ? `Flocks here +${pct(f.flocks)}%` : `Plant it: +${Math.round((FAR_PLOTS[g].flockRateGrowth - 1) * 100)}% flocks a level`}
          {f.gain >= 0.05 ? ` · ${gainText(f.gain, notation)}` : ''}
        </span>
      </div>
      <button class="btn btn--primary btn--buy btn--small" aria-disabled={!f.affordable} onClick={(e) => pulse(e.currentTarget as HTMLElement, controls.levelFarPlot(g))}>
        <Cost price={f.price} notation={notation} />
      </button>
    </li>
  );
}
