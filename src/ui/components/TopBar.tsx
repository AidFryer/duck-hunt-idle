import { GAME_TITLE } from '../../config';
import type { Notation } from '../../util/format';
import type { HudSnapshot } from '../hudState';
import { activityLabel, windLabel } from '../hudState';
import { Counter } from './Counter';
import { Icon } from './Icon';

export function TopBar({ hud, notation, onSettings }: { hud: HudSnapshot; notation: Notation; onSettings: () => void }) {
  const night = hud.phaseId === 'night' || hud.phaseId === 'predawn';
  return (
    <header class="topbar">
      <div class="title-sign" title={GAME_TITLE}>
        <span class="title-sign__nail" />
        <span class="title-sign__text">{GAME_TITLE}</span>
        <span class="title-sign__nail" />
      </div>

      <div class="chips" aria-label="Resources">
        <div class="chip chip--gold" title="Coins">
          <Icon name="coin" size={18} />
          <span class="chip__value"><Counter value={hud.coins} notation={notation} /></span>
          <span class="chip__label">Coins</span>
        </div>
        <div class="chip chip--cream" title="Feathers">
          <Icon name="feather" size={18} />
          <span class="chip__value"><Counter value={hud.feathers} notation={notation} /></span>
          <span class="chip__label">Feathers</span>
        </div>
        <div class="chip chip--sage" title={`Today's bag (best: ${hud.bestBag})`}>
          <Icon name="duck" size={18} />
          <span class="chip__value"><Counter value={hud.bag} notation={notation} /></span>
          <span class="chip__label">Bag</span>
        </div>
      </div>

      <div class="topbar__right">
        <div class="clock" aria-label={`Day ${hud.day}, ${hud.clock}, ${hud.phaseLabel}`}>
          <Icon name={night ? 'moon' : 'sun'} size={20} class={night ? 'clock__moon' : 'clock__sun'} />
          <div class="clock__text">
            <strong>{hud.clock}</strong>
            <span>
              {hud.phaseLabel}
              <span class="clock__day"> · Day {hud.day}</span>
            </span>
          </div>
        </div>
        <button class="icon-btn" onClick={onSettings} aria-label="Settings" title="Settings">
          <Icon name="gear" size={22} />
        </button>
      </div>

      <div class="conditions">
        <span>
          <Icon name="duck" size={16} /> {activityLabel(hud.activity)}
        </span>
        <span>
          <Icon name="wind" size={16} /> {windLabel(hud.wind)}
        </span>
      </div>
    </header>
  );
}
