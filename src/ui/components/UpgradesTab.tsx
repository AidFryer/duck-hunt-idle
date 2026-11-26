import { ACRES } from '../../data/economy';
import { UPGRADES } from '../../data/upgrades';
import { CROPS } from '../../data/crops';
import { formatNumber, type Notation } from '../../util/format';
import type { GameControls } from '../controls';
import type { HudSnapshot } from '../hudState';
import { pulse } from './BotsTab';
import { Cost } from './Cost';
import { Icon } from './Icon';

export function UpgradesTab({ hud, controls, notation }: { hud: HudSnapshot; controls: GameControls; notation: Notation }) {
  const acresRevealed = hud.acres > ACRES.start || hud.unlocks.upgrades;
  return (
    <div class="tab-body">
      <div class="tab-head">
        <h3>Marsh & lodge</h3>
      </div>
      {acresRevealed ? (
        <div class="bot-card">
          <div class="bot-card__portrait" aria-hidden="true">
            <Icon name="marsh" size={28} />
            <span class="bot-card__owned">{hud.acres}</span>
          </div>
          <div class="bot-card__info">
            <h4>Wetland Acres</h4>
            <p>Restore another acre of marsh. Every acre multiplies the flocks that come in, makes them bigger, and lets more circle at once.</p>
            <dl class="stats">
              <div><dt>Flocks</dt><dd>×{formatNumber(Math.pow(ACRES.flockRateGrowth, hud.acres - 1), notation)}</dd></div>
              <div><dt>Circling at once</dt><dd>{hud.maxCircling}</dd></div>
              <div><dt>Flock size</dt><dd>+{formatNumber(ACRES.flockSizePerAcre * (hud.acres - 1), notation)}</dd></div>
            </dl>
            <div class="btn-row">
              <button class="btn btn--primary btn--buy" aria-disabled={!hud.acreAffordable} onClick={(e) => pulse(e.currentTarget as HTMLElement, controls.buyAcre())}>
                <span>Restore an acre</span>
                <Cost price={hud.acrePrice} notation={notation} />
              </button>
            </div>
          </div>
        </div>
      ) : (
        <Locked name="Wetland Acres" text="Opens with the Trapper's Cabin." />
      )}
      <FoodPlots hud={hud} controls={controls} notation={notation} />
      {hud.upgrades.map((u) => {
        const d = UPGRADES[u.id];
        const head = u.id === 'cornStubble' && d.lodge <= hud.lodge.level + 1 ? <h4 class="group-head">Goose field</h4> : null;
        if (!u.revealed) {
          // Only tease what the next lodge level brings, not the whole list.
          if (d.lodge > hud.lodge.level + 1) return null;
          return <>{head}<Locked name={d.name} text={`${d.effect}. Opens with the ${u.lodgeName}.`} /></>;
        }
        const maxed = u.level >= u.max;
        return (
          <>
          {head}
          <div class="bot-card">
            <div class="bot-card__portrait" aria-hidden="true">
              <Icon name="hammer" size={26} />
              <span class="bot-card__owned">{u.level}/{u.max}</span>
            </div>
            <div class="bot-card__info">
              <h4>{d.name}</h4>
              <p>{d.blurb}</p>
              <p class="upgrade-effect">Each level: {d.effect}{u.id === 'cot' ? ` (now ${hud.offlineHours}h)` : ''}</p>
              <div class="level-pips" aria-label={`Level ${u.level} of ${u.max}`}>
                {Array.from({ length: u.max }, (_, i) => <span class={i < u.level ? 'is-on' : ''} />)}
              </div>
              <div class="btn-row">
                {maxed ? (
                  <span class="maxed">Fully upgraded</span>
                ) : (
                  <button class="btn btn--primary btn--buy" aria-disabled={!u.affordable} onClick={(e) => pulse(e.currentTarget as HTMLElement, controls.buyUpgrade(u.id))}>
                    <span>{u.level === 0 ? 'Build' : 'Upgrade'}</span>
                    <Cost price={u.price} notation={notation} />
                  </button>
                )}
              </div>
            </div>
          </div>
          </>
        );
      })}
    </div>
  );
}

function Locked({ name, text }: { name: string; text: string }) {
  return (
    <div class="bot-card is-locked">
      <div class="bot-card__portrait"><Icon name="hammer" size={24} /></div>
      <div class="bot-card__info">
        <h4>{name}</h4>
        <p>{text}</p>
      </div>
    </div>
  );
}

/** Food plots: pick a crop for each plot; what grows depends on the flyway. */
function FoodPlots({ hud, controls, notation }: { hud: HudSnapshot; controls: GameControls; notation: Notation }) {
  const p = hud.plots;
  if (p.open === 0) {
    return <Locked name="Food plots" text={`Plant crops on the far bank to bring new ducks. Your first plot opens with the ${p.nextLodgeName ?? "Trapper's Cabin"}.`} />;
  }
  return (
    <section class="plots" aria-label="Food plots">
      <h4 class="group-head">Food plots</h4>
      {p.list.map((plot, i) => (
        <div class="bot-card plot-card">
          <div class="plot-card__info">
            <h4>
              Plot {i + 1}: {plot.crop ? CROPS[plot.crop].name : 'empty'}
            </h4>
            {plot.crop ? (
              <>
                <p>{CROPS[plot.crop].effect}</p>
                <div class="req">
                  <span class="req__label">{plot.growth >= 1 ? 'Fully grown' : 'Growing'}</span>
                  <span class="req__count">{Math.round(plot.growth * 100)}%</span>
                  <span class="req__bar"><span style={{ width: `${Math.round(plot.growth * 100)}%` }} /></span>
                </div>
              </>
            ) : (
              <p>Pick a crop. It grows in over a few minutes.</p>
            )}
            <div class="crop-row">
              {plot.options.map((o) => (
                <button
                  class={`crop-btn ${plot.crop === o.crop ? 'is-on' : ''}`}
                  aria-disabled={!o.affordable}
                  title={CROPS[o.crop].effect}
                  onClick={(e) => pulse(e.currentTarget as HTMLElement, controls.plantCrop(i, o.crop))}
                >
                  <strong>{CROPS[o.crop].name}</strong>
                  <span>{CROPS[o.crop].effect}</span>
                  {plot.crop !== o.crop && <Cost price={o.price} notation={notation} />}
                </button>
              ))}
            </div>
          </div>
        </div>
      ))}
      {p.nextLodgeName && <p class="plot-note">Another plot opens with the {p.nextLodgeName}.</p>}
    </section>
  );
}
