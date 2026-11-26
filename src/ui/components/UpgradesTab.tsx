import { ACRES } from '../../data/economy';
import { CROPS } from '../../data/crops';
import { UPGRADES } from '../../data/upgrades';
import { formatNumber, type Notation } from '../../util/format';
import type { GameControls } from '../controls';
import type { HudSnapshot, RungSnapshot } from '../hudState';
import { pulse } from './BotsTab';
import { Cost } from './Cost';
import { ReqBar } from './Lodge';

type Up = HudSnapshot['upgrades'][number];

/** Sooner things first: by the lodge level that opens them, then by price. */
const byWhen = (a: Up, b: Up) => a.lodge - b.lodge || a.price.coins.cmp(b.price.coins);

export function UpgradesTab({ hud, controls, notation }: { hud: HudSnapshot; controls: GameControls; notation: Notation }) {
  const marsh = hud.upgrades.filter((u) => !UPGRADES[u.id].field);
  const field = hud.upgrades.filter((u) => UPGRADES[u.id].field);
  const open = marsh.filter((u) => u.revealed).sort(byWhen);
  const ready = open.filter((u) => u.level < u.max);
  const maxed = open.filter((u) => u.level >= u.max);
  const soon = marsh.filter((u) => !u.revealed && u.lodge === hud.lodge.level + 1).sort(byWhen);
  return (
    <div class="tab-body upgrades-tab">
      <SpreadCard ground="marsh" hud={hud} controls={controls} notation={notation} rigs={hud.ladder.setter} />
      <FoodPlots hud={hud} controls={controls} notation={notation} />

      <h4 class="group-head">Marsh & lodge</h4>
      <ul class="up-list">
        <li class="up-row">
          <div class="up-row__text">
            <strong>Wetland Acres <span class="up-row__lvl">{hud.acres}</span></strong>
            <span>
              Flocks ×{formatNumber(Math.pow(ACRES.flockRateGrowth, hud.acres - 1), notation)} · {hud.maxCircling} can circle at once
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
          <SpreadCard ground="field" hud={hud} controls={controls} notation={notation} rigs={hud.ladder.staker} />
          <ul class="up-list">
            {field.filter((u) => u.revealed).sort(byWhen).map((u) => <UpRow u={u} controls={controls} notation={notation} offline={hud.offlineHours} />)}
          </ul>
        </>
      )}
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

/** The decoy spread: always out; buy bags of decoys and build bigger rigs. */
function SpreadCard({ ground, hud, controls, notation, rigs }: { ground: 'marsh' | 'field'; hud: HudSnapshot; controls: GameControls; notation: Notation; rigs: RungSnapshot[] }) {
  const sp = hud.spreads[ground];
  const next = rigs.find((r) => !r.built);
  const per = ground === 'field' ? 4 : 2;
  return (
    <section class="spread-card" aria-label={ground === 'field' ? 'Goose decoy spread' : 'Decoy spread'}>
      <div class="spread-card__head">
        <div>
          <h4>{ground === 'field' ? 'Goose spread' : 'Decoy spread'}</h4>
          <p>
            {sp.decoys} decoys out · flocks ×{formatNumber(sp.draw, notation)}
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
