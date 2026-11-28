import { ACRES } from '../../data/economy';
import { CROPS } from '../../data/crops';
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
        {ready.map((u) => <UpRow u={u} controls={controls} notation={notation} offline={hud.offlineHours} />)}
        {maxed.map((u) => <UpRow u={u} controls={controls} notation={notation} offline={hud.offlineHours} />)}
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
            {field.filter((u) => u.revealed).sort(byWhen).map((u) => <UpRow u={u} controls={controls} notation={notation} offline={hud.offlineHours} />)}
          </ul>
        </>
      )}

      {far.filter((f) => f.open && f.ups.length > 0).map((f) => (
        <>
          <h4 class="group-head">{f.name}</h4>
          <ul class="up-list">
            {f.ups.map((u) => <UpRow u={u} controls={controls} notation={notation} offline={hud.offlineHours} />)}
          </ul>
        </>
      ))}
    </div>
  );
}

function UpRow({ u, controls, notation, offline }: { u: Up; controls: GameControls; notation: Notation; offline: number }) {
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

/** Food plots: pick a crop for each plot; what grows depends on the flyway. */
function FoodPlots({ hud, controls, notation }: { hud: HudSnapshot; controls: GameControls; notation: Notation }) {
  const p = hud.plots;
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
      {p.list.map((plot, i) => (
        <div class="spread-card plot-card">
          <h4>
            Plot {i + 1}: {plot.crop ? CROPS[plot.crop].name : 'empty'}
            {plot.crop && <span class="up-row__lvl"> {plot.growth >= 1 ? 'grown' : `${Math.round(plot.growth * 100)}%`}</span>}
          </h4>
          {plot.crop && plot.growth < 1 && (
            <span class="req__bar"><span style={{ width: `${Math.round(plot.growth * 100)}%` }} /></span>
          )}
          <div class="crop-row">
            {plot.options.map((o) => (
              <button
                class={`crop-btn ${plot.crop === o.crop ? 'is-on' : ''}`}
                aria-disabled={!o.affordable && plot.crop !== o.crop}
                title={CROPS[o.crop].blurb}
                onClick={(e) => plot.crop !== o.crop && pulse(e.currentTarget as HTMLElement, controls.plantCrop(i, o.crop))}
              >
                <strong>{CROPS[o.crop].name}</strong>
                <span>{CROPS[o.crop].effect}</span>
                {plot.crop !== o.crop && <Cost price={o.price} notation={notation} />}
              </button>
            ))}
          </div>
        </div>
      ))}
      {p.nextLodgeName && <p class="plot-note">Another plot opens with the {p.nextLodgeName}.</p>}
    </section>
  );
}
