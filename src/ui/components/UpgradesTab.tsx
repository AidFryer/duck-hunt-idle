import { ACRES } from '../../data/economy';
import { UPGRADES } from '../../data/upgrades';
import { formatNumber, type Notation } from '../../util/format';
import type { GameControls } from '../controls';
import type { HudSnapshot } from '../hudState';
import { pulse } from './BotsTab';
import { Cost } from './Cost';
import { Icon } from './Icon';

export function UpgradesTab({ hud, controls, notation }: { hud: HudSnapshot; controls: GameControls; notation: Notation }) {
  const acresRevealed = hud.acres > ACRES.start || hud.lodge.level >= 2;
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
            <p>Restore another acre of marsh. More water draws more flocks, and bigger ones.</p>
            <dl class="stats">
              <div><dt>Flocks</dt><dd>+{Math.round(ACRES.flockRatePerAcre * 100 * (hud.acres - 1))}%</dd></div>
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
      {hud.upgrades.map((u) => {
        const d = UPGRADES[u.id];
        if (!u.revealed) {
          // Only tease what the next lodge level brings, not the whole list.
          if (d.lodge > hud.lodge.level + 1) return null;
          return <Locked name={d.name} text={`${d.effect}. Opens with the ${u.lodgeName}.`} />;
        }
        const maxed = u.level >= u.max;
        return (
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
