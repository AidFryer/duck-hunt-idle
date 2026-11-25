import { ACRES } from '../../data/economy';
import { formatNumber, type Notation } from '../../util/format';
import type { GameControls } from '../controls';
import type { HudSnapshot } from '../hudState';
import { pulse } from './BotsTab';
import { Cost } from './Cost';
import { Icon } from './Icon';

const FUTURE = ['Flooded timber', 'Food plots (rice & millet)', 'Better blinds', 'Decoy quality', 'Lodge rooms', 'The coffee pot'];

export function UpgradesTab({ hud, controls, notation }: { hud: HudSnapshot; controls: GameControls; notation: Notation }) {
  const revealed = hud.acres > ACRES.start || hud.lifetimeCoins.gte(ACRES.revealAtCoins);
  return (
    <div class="tab-body">
      <div class="tab-head">
        <h3>Marsh work</h3>
      </div>
      {revealed ? (
        <div class="bot-card">
          <div class="bot-card__portrait" aria-hidden="true">
            <Icon name="marsh" size={28} />
            <span class="bot-card__owned">{hud.acres}</span>
          </div>
          <div class="bot-card__info">
            <h4>Wetland Acres</h4>
            <p>Restore another acre of marsh. More water draws more flocks, and bigger ones.</p>
            <dl class="stats">
              <div><dt>Acres</dt><dd>{hud.acres}</dd></div>
              <div><dt>Flocks</dt><dd>+{Math.round(ACRES.flockRatePerAcre * 100 * (hud.acres - 1))}%</dd></div>
              <div><dt>Flock size</dt><dd>+{formatNumber(ACRES.flockSizePerAcre * (hud.acres - 1), notation)}</dd></div>
            </dl>
            <div class="btn-row">
              <button
                class="btn btn--primary btn--buy"
                aria-disabled={!hud.acreAffordable}
                onClick={(e) => pulse(e.currentTarget as HTMLElement, controls.buyAcre())}
              >
                <span>Restore an acre</span>
                <Cost price={hud.acrePrice} notation={notation} />
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div class="bot-card is-locked">
          <div class="bot-card__portrait"><Icon name="marsh" size={26} /></div>
          <div class="bot-card__info">
            <h4>???</h4>
            <p>Earn {ACRES.revealAtCoins} coins to start restoring the marsh.</p>
          </div>
        </div>
      )}
      {FUTURE.map((name) => (
        <div class="bot-card is-locked">
          <div class="bot-card__portrait"><Icon name="hammer" size={24} /></div>
          <div class="bot-card__info">
            <h4>{name}</h4>
            <p>Arrives in Phase 4.</p>
          </div>
        </div>
      ))}
    </div>
  );
}
