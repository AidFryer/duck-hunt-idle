import { GAME_TITLE } from '../../config';
import type { HudSnapshot } from '../hudState';
import { activityLabel, windLabel } from '../hudState';
import { Icon } from './Icon';

export function TopBar({ hud }: { hud: HudSnapshot }) {
  const night = hud.phaseId === 'night' || hud.phaseId === 'predawn';
  return (
    <header class="topbar">
      <div class="title-sign" title={GAME_TITLE}>
        <span class="title-sign__nail" />
        <span class="title-sign__text">{GAME_TITLE}</span>
        <span class="title-sign__nail" />
      </div>

      <div class="chips" aria-label="Resources">
        <Chip icon="coin" label="Coins" value={hud.coins} tone="gold" />
        <Chip icon="feather" label="Feathers" value={hud.feathers} tone="cream" />
        <Chip icon="duck" label="Bag" value={hud.bag} tone="sage" />
      </div>

      <div class="clock" aria-label={`Day ${hud.day}, ${hud.clock}, ${hud.phaseLabel}`}>
        <Icon name={night ? 'moon' : 'sun'} size={20} class={night ? 'clock__moon' : 'clock__sun'} />
        <div class="clock__text">
          <strong>{hud.clock}</strong>
          <span>
            {hud.phaseLabel} · Day {hud.day}
          </span>
        </div>
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

function Chip({ icon, label, value, tone }: { icon: 'coin' | 'feather' | 'duck'; label: string; value: number; tone: string }) {
  return (
    <div class={`chip chip--${tone}`} title={label}>
      <Icon name={icon} size={18} />
      <span class="chip__value">{value.toLocaleString()}</span>
      <span class="chip__label">{label}</span>
    </div>
  );
}
