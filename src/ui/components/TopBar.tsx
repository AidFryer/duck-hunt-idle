import { GAME_TITLE } from '../../config';
import { useState } from 'preact/hooks';
import { RHYTHM } from '../../data/economy';
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
export function TopBar({ hud, notation, onSettings }: { hud: HudSnapshot; notation: Notation; onSettings: () => void }) {
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
          <span class="purse__value"><Counter value={hud.coins} notation={notation} steady /></span>
          <span class="sr-only"> coins</span>
        </span>
        <span class="purse__item" title="Feathers">
          <Icon name="feather" size={17} class="purse__feather" />
          <span class="purse__value"><Counter value={hud.feathers} notation={notation} steady /></span>
          <span class="sr-only"> feathers</span>
        </span>
      </div>

      <div class="chip chip--birds" title={`Today's birds (best day: ${hud.bestBag})`}>
        <Icon name="duck" size={17} />
        <span class="chip__value"><Counter value={hud.bag} notation={notation} steady /></span>
        <span class="chip__label">today</span>
      </div>

      <div class="topbar__right">
        <div class="clock" title={conditions} aria-label={`Day ${hud.day}, ${hud.clock}, ${hud.phaseLabel}. ${conditions}`}>
          <Icon name={night ? 'moon' : 'sun'} size={18} class={night ? 'clock__moon' : 'clock__sun'} />
          <div class="clock__text">
            <strong>{hud.clock.split(' ')[0]}<small class="clock__ampm"> {hud.clock.split(' ')[1] ?? ''}</small></strong>
            <span>
              {hud.phaseLabel}
              <span class="clock__day"> · Day {hud.day}</span>
            </span>
          </div>
          <span class={`clock__weather clock__weather--${hud.weather.id}`}>
            <Icon name={WEATHER_ICON[hud.weather.id]} size={16} />
            <span class="clock__weather-name">{hud.weather.name}</span>
          </span>
        </div>
        <button class="icon-btn avatar-btn" onClick={onSettings} aria-label={`${hud.profile.name || 'Your profile'} and settings`} title={hud.profile.name || 'Profile and settings'}>
          <img src={avatarPortrait(hud.profile.avatar)} alt="" />
        </button>
      </div>
    </header>
  );
}

const SNAG_TEXT: Record<string, string> = {
  idle: 'Tap the marsh, or carve some help in the Workshop, to get it going.',
  piling: 'Birds are piling up on the water. More retrievers would help.',
  stuck: "Someone on the crew is stuck. Tap the ! button to sort it out.",
  waiting: 'Flocks are circling with nobody calling them in.',
};

/** Crew Rhythm: how smoothly the hunt is flowing. Tap it for the why. */
export function RhythmMeter({ hud }: { hud: HudSnapshot }) {
  const [open, setOpen] = useState(false);
  const r = hud.rhythm;
  if (!r.crew && r.level < 0.01) return null;
  const status = r.snag ? SNAG_TEXT[r.snag] : r.level > 0.98 ? 'In full swing. Every bird pays the most it can.' : "Everything's moving. It's building.";
  return (
    <>
      <button class="rhythm" onClick={() => setOpen(!open)} aria-expanded={open} aria-label={`Crew Rhythm: plus ${r.bonus} percent coins`}>
        <Icon name="beat" size={16} />
        <span class="rhythm__label">Rhythm</span>
        <span class="rhythm__bar" aria-hidden="true"><span style={{ width: `${Math.round(r.level * 100)}%` }} /></span>
        <span class="rhythm__bonus">+{r.bonus}%</span>
      </button>
      {open && (
        <button class="rhythm-pop" onClick={() => setOpen(false)}>
          <strong>Crew Rhythm · +{r.bonus}% coins</strong>
          <span>Fills while the hunt flows: birds get fetched, nobody's stuck, and flocks get worked. Your own taps help too. At full, every bird pays {Math.round(RHYTHM.maxBonus * 100)}% more.</span>
          <em class={r.snag ? 'is-snag' : ''}>{status}</em>
        </button>
      )}
    </>
  );
}
