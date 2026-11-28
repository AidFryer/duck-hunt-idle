import { ACRES, STANDS } from '../../data/economy';
import { useState } from 'preact/hooks';
import { CROPS, FAR_PLOTS, PLOT_LEVELS, type FarPlotGround } from '../../data/crops';
import { UPGRADES } from '../../data/upgrades';
import { formatNumber, type Notation } from '../../util/format';
import type { GameControls } from '../controls';
import type { HudSnapshot } from '../hudState';
import { gainText } from './BotsTab';
import { BuyButton, Finished, JumpChips, Row, RowNote, SectionHead, type Tone } from './Kit';
import type { IconName } from '../tabs';

type Up = HudSnapshot['upgrades'][number];

/** Sooner things first: by the lodge level that opens them, then by price. */
const byWhen = (a: Up, b: Up) => a.lodge - b.lodge || a.price.coins.cmp(b.price.coins);

const LAND_ICON: Record<string, [IconName, Tone]> = {
  marsh: ['marsh', 'marsh'], timber: ['leaf', 'timber'], field: ['wind', 'field'], bay: ['boat', 'bay'],
};

export function UpgradesTab({ hud, controls, notation }: { hud: HudSnapshot; controls: GameControls; notation: Notation }) {
  const marsh = hud.upgrades.filter((u) => !UPGRADES[u.id].field && !UPGRADES[u.id].room && !UPGRADES[u.id].ground);
  const groundOpen = (g: string) => hud.grounds.some((x) => x.id === g && x.open);
  const far = (['timber', 'bay'] as const).map((g) => ({
    g,
    name: hud.grounds.find((x) => x.id === g)!.name,
    open: groundOpen(g),
    ups: hud.upgrades.filter((u) => UPGRADES[u.id].ground === g && u.revealed).sort(byWhen),
  }));
  const field = hud.upgrades.filter((u) => UPGRADES[u.id].field && u.revealed).sort(byWhen);
  const open = marsh.filter((u) => u.revealed).sort(byWhen);
  const soon = hud.upgrades.filter((u) => !UPGRADES[u.id].field && !UPGRADES[u.id].room && !UPGRADES[u.id].ground && !u.revealed && u.lodge === hud.lodge.level + 1).sort(byWhen);
  const rep = { now: hud.reputation, next: hud.reputationNextDock };
  const up = (u: Up) => <UpRow u={u} controls={controls} notation={notation} offline={hud.offlineHours} rep={rep} />;
  const notDone = (list: Up[]) => list.filter((u) => u.level < u.max);
  const done = [...open, ...field, ...far.flatMap((f) => f.ups)].filter((u) => u.level >= u.max);
  const jumps = [
    { key: 'plots', label: 'Plots' },
    { key: 'marsh', label: 'Marsh' },
    ...(far[0]!.open ? [{ key: 'timber', label: 'Timber' }] : []),
    ...(hud.field.open ? [{ key: 'field', label: 'Goose Field' }] : []),
    ...(far[1]!.open ? [{ key: 'bay', label: 'Bay' }] : []),
  ];
  const groundSection = (key: string, title: string, children: preact.ComponentChildren, hint?: preact.ComponentChildren) => (
    <section id={`land-${key}`} class="jump-target land-section">
      <SectionHead icon={LAND_ICON[key]![0]} tone={LAND_ICON[key]![1]} title={title} note={hint} />
      <ul class="up-list">{children}</ul>
    </section>
  );
  return (
    <div class="tab-body upgrades-tab">
      {hud.plots.open > 0 && <JumpChips prefix="land" items={jumps} />}
      <div id="land-plots" class="jump-target">
        <FoodPlots hud={hud} controls={controls} notation={notation} />
      </div>

      {groundSection('marsh', 'The Marsh', (
        <>
          <Row
            title={<>Wetland Acres{hud.bestBuy === 'acre' && <span class="best-buy">Best buy</span>}</>}
            tag={hud.acres}
            sub={`Flocks ×${formatNumber(Math.pow(ACRES.flockRateGrowth, hud.acres - 1), notation)} · ${hud.maxCircling} can circle · ${gainText(hud.acreGain, notation)}`}
            right={<BuyButton price={hud.acrePrice} notation={notation} affordable={hud.acreAffordable} onBuy={() => controls.buyAcre()} />}
          />
          {notDone(open).map(up)}
          {soon.map((u) => <Row cls="is-locked" title={UPGRADES[u.id].name} sub={`${UPGRADES[u.id].effect} · comes with the ${u.lodgeName}`} />)}
        </>
      ))}

      {far[0]!.open && groundSection('timber', far[0]!.name, (
        <>
          <FarPlotRow hud={hud} g="timber" controls={controls} notation={notation} />
          <Row
            title={<>Flooded Stands{hud.bestBuy === 'stand' && <span class="best-buy">Best buy</span>}</>}
            tag={hud.stands.count}
            sub={`+${Math.round((STANDS.flockRateGrowth - 1) * 100)}% timber flocks, bigger flocks${hud.stands.gain >= 0.05 ? ` · ${gainText(hud.stands.gain, notation)}` : ''}`}
            right={<BuyButton price={hud.stands.price} notation={notation} affordable={hud.stands.affordable} onBuy={() => controls.buyStand()} />}
          />
          {notDone(far[0]!.ups).map(up)}
        </>
      ), `The feather ground: birds here give ${STANDS.feathers}× feathers${hud.stands.feathersPerMin >= 1 ? ` (about ${formatNumber(hud.stands.feathersPerMin, notation)} a minute)` : ''}.`)}

      {hud.field.open && groundSection('field', 'Goose Field', (
        <>
          <FarPlotRow hud={hud} g="field" controls={controls} notation={notation} />
          {notDone(field).map(up)}
        </>
      ))}

      {far[1]!.open && groundSection('bay', far[1]!.name, (
        <>
          <FarPlotRow hud={hud} g="bay" controls={controls} notation={notation} />
          {notDone(far[1]!.ups).map(up)}
        </>
      ))}

      <Finished count={done.length}>{done.map(up)}</Finished>
    </div>
  );
}

function UpRow({ u, controls, notation, offline, rep }: { u: Up; controls: GameControls; notation: Notation; offline: number; rep?: { now: number; next: number } }) {
  const d = UPGRADES[u.id];
  const maxed = u.level >= u.max;
  return (
    <Row
      cls={maxed ? 'is-maxed' : ''}
      hint={d.blurb}
      title={d.name}
      tag={`${u.level}/${u.max}`}
      sub={`${d.effect}${u.id === 'cot' ? ` (now ${offline}h)` : ''}${u.id === 'guestDock' && !maxed && rep ? ` (coins +${Math.round((rep.now - 1) * 100)}% → +${Math.round((rep.next - 1) * 100)}%)` : ''}${u.gain >= 0.05 && !maxed ? ` · ${gainText(u.gain, notation)}` : ''}`}
      right={maxed ? <RowNote done>Max</RowNote> : <BuyButton price={u.price} notation={notation} affordable={u.affordable} onBuy={() => controls.buyUpgrade(u.id)} />}
    />
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
      <SectionHead icon="sun" tone="field" title="Food plots" note={`The crop decides which birds come. Each level draws more flocks to the marsh, and every ${PLOT_LEVELS.birdsEvery} levels makes flocks bigger.`} />
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
                {plot.crop && <BuyButton price={plot.levelPrice} notation={notation} affordable={plot.levelAffordable} onBuy={() => controls.levelPlot(i)} />}
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
                          <BuyButton
                            price={o.price}
                            notation={notation}
                            affordable={o.affordable}
                            label={`Plant ${CROPS[o.crop].name}`}
                            onBuy={() => {
                              const ok = controls.plantCrop(i, o.crop);
                              if (ok) setPicking(null);
                              return ok;
                            }}
                          />
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
    <Row
      hint={FAR_PLOTS[g].blurb}
      title={<>{f.name}{hud.bestBuy === `farPlot:${g}` && <span class="best-buy">Best buy</span>}</>}
      tag={f.level > 0 ? `Lv ${f.level}` : 'new'}
      sub={`${f.level > 0 ? `Flocks +${pct(f.flocks)}%` : `Food plot: +${Math.round((FAR_PLOTS[g].flockRateGrowth - 1) * 100)}% flocks a level`}${f.gain >= 0.05 ? ` · ${gainText(f.gain, notation)}` : ''}`}
      right={<BuyButton price={f.price} notation={notation} affordable={f.affordable} onBuy={() => controls.levelFarPlot(g)} />}
    />
  );
}
