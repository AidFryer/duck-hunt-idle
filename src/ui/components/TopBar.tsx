import { GAME_TITLE } from '../../config';
import { STREAK } from '../../data/economy';
import type { Notation } from '../../util/format';
import type { HudSnapshot } from '../hudState';
import { activityLabel, windLabel } from '../hudState';
import { Counter } from './Counter';
import { avatarPortrait } from '../portraits';
import { Icon } from './Icon';
import type { IconName } from '../tabs';
import type { WeatherId } from '../../data/weather';

const WEATHER_ICON: Record<WeatherId, IconName> = { clear: 'sun', fog: 'fog', drizzle: 'drop', coldFront: 'snow', wind: 'wind' };

/** One slim row over the sky: purse, today's birds, clock + weather, buttons. */
export function TopBar({ hud, notation, onSettings, onProblems }: { hud: HudSnapshot; notation: Notation; onSettings: () => void; onProblems: () => void }) {
  const night = hud.phaseId === 'night' || hud.phaseId === 'predawn';
  const conditions = `${hud.weather.name}: ${hud.weather.blurb} Next: ${hud.weather.nextName} around ${hud.weather.changeAt}. Ducks: ${activityLabel(hud.activity)}. Wind: ${windLabel(hud.wind)}.`;
  return (
    <header class="topbar">
      <div class="title-sign" title={GAME_TITLE}>
        <span class="title-sign__nail" />
        <span class="title-sign__text">{GAME_TITLE}</span>
        <span class="title-sign__nail" />
      </div>

      <div class="purse" aria-label="Resources">
        <span class="purse__item" title="Coins">
          <Icon name="coin" size={17} class="purse__coin" />
          <Counter value={hud.coins} notation={notation} />
          <span class="sr-only"> coins</span>
        </span>
        <span class="purse__item" title="Feathers">
          <Icon name="feather" size={17} class="purse__feather" />
          <Counter value={hud.feathers} notation={notation} />
          <span class="sr-only"> feathers</span>
        </span>
      </div>

      <div class="chip chip--birds" title={`Today's birds (best day: ${hud.bestBag})`}>
        <Icon name="duck" size={17} />
        <span class="chip__value"><Counter value={hud.bag} notation={notation} /></span>
        <span class="chip__label">today</span>
      </div>

      <div class="topbar__right">
        <div class="clock" title={conditions} aria-label={`Day ${hud.day}, ${hud.clock}, ${hud.phaseLabel}. ${conditions}`}>
          <Icon name={night ? 'moon' : 'sun'} size={18} class={night ? 'clock__moon' : 'clock__sun'} />
          <div class="clock__text">
            <strong>{hud.clock}</strong>
            <span>
              {hud.phaseLabel}
              <span class="clock__day"> · Day {hud.day}</span>
            </span>
          </div>
          {hud.weather.id !== 'clear' && (
            <span class={`clock__weather clock__weather--${hud.weather.id}`}>
              <Icon name={WEATHER_ICON[hud.weather.id]} size={16} />
              <span class="clock__weather-name">{hud.weather.name}</span>
            </span>
          )}
        </div>
        {hud.problemStats.total > 0 && (
          <button
            class={`icon-btn problems-btn ${hud.needsYou ? 'is-alert' : ''}`}
            onClick={onProblems}
            aria-label={`Problem Log: ${hud.openProblems} open`}
            title="Problem Log"
          >
            <span class="problems-btn__mark">!</span>
            {hud.openProblems > 0 && <span class="problems-btn__count">{hud.openProblems}</span>}
          </button>
        )}
        <button class="icon-btn avatar-btn" onClick={onSettings} aria-label={`${hud.profile.name || 'Your profile'} and settings`} title={hud.profile.name || 'Profile and settings'}>
          <img src={avatarPortrait(hud.profile.avatar)} alt="" />
        </button>
      </div>
    </header>
  );
}

/** Hunter's Rhythm: a little meter over the marsh while you're on a roll. */
export function RhythmMeter({ hud }: { hud: HudSnapshot }) {
  if (hud.streak < 2) return null;
  const pct = Math.round(hud.streak * STREAK.bonusPerLevel * 100);
  return (
    <div class={`rhythm ${hud.streak >= 10 ? 'is-max' : ''}`} aria-live="off" title="Tap quickly in a row to build your rhythm. Birds you fetch by hand pay extra.">
      <span class="rhythm__label">Rhythm ×{hud.streak}</span>
      <span class="rhythm__bonus">+{pct}%</span>
      <span class="rhythm__bar"><span style={{ width: `${Math.round(hud.streakLeft * 100)}%` }} /></span>
    </div>
  );
}
