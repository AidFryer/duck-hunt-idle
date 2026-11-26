import { useState } from 'preact/hooks';
import { FLYWAYS, type FlywayId } from '../../data/flyways';
import { PERKS, PRESTIGE } from '../../data/legacy';
import { formatNumber, type Notation } from '../../util/format';
import type { GameControls } from '../controls';
import type { HudSnapshot } from '../hudState';
import { pulse } from './BotsTab';

export function LegacyTab({ hud, controls, notation }: { hud: HudSnapshot; controls: GameControls; notation: Notation }) {
  const [confirming, setConfirming] = useState(false);
  const se = hud.season;
  const lg = hud.legacy;
  const tiers = [0, 1, 2, 3];
  return (
    <div class="tab-body legacy-tab">
      <section class="season-card">
        <div class="season-card__head">
          <div>
            <span class="goal__tag">Season {se.number}</span>
            <h3>{FLYWAYS[se.flyway].name}</h3>
          </div>
          <div class="star-badge" title="Flyway Stars you'd earn by closing now">
            <span>★</span>
            <strong>{se.starsNow}</strong>
          </div>
        </div>
        <p class="card__hint">
          Coins this season: <strong>{formatNumber(se.coins, notation)}</strong>. Next star at {formatNumber(se.nextStarAt, notation)}.
        </p>
        <div class="milestone">
          <div class="milestone__bar"><span style={{ width: `${Math.round(se.progress * 100)}%` }} /></div>
          <span class="milestone__label">{Math.round(se.progress * 100)}%</span>
        </div>
        <button
          class="btn btn--primary season-card__close"
          aria-disabled={se.starsNow < 1}
          onClick={(e) => (se.starsNow >= 1 ? setConfirming(true) : pulse(e.currentTarget as HTMLElement, false))}
        >
          {se.starsNow >= 1 ? `Close the Season (+${se.starsNow} ★)` : `Close the Season at ${formatNumber(PRESTIGE.divisor, notation)} season coins`}
        </button>
      </section>

      <section class="legacy-head">
        <div><strong>★ {lg.stars}</strong><span>to spend</span></div>
        <div><strong>{lg.earned}</strong><span>earned in all</span></div>
        <div><strong>+{Math.round(lg.bonus * 100)}%</strong><span>coins & feathers</span></div>
      </section>

      <section class="perk-tree" aria-label="Lodge Legacy perks">
        {tiers.map((t) => (
          <div class="perk-tier">
            {lg.perks.filter((p) => PERKS[p.id].tier === t).map((p) => {
              const d = PERKS[p.id];
              return (
                <button
                  class={`perk ${p.owned ? 'is-owned' : ''} ${p.canBuy ? 'is-buyable' : ''} ${!p.prereqsMet ? 'is-locked' : ''}`}
                  aria-disabled={!p.canBuy}
                  onClick={(e) => !p.owned && pulse(e.currentTarget as HTMLElement, controls.buyPerk(p.id))}
                >
                  <strong>{d.name}</strong>
                  <span>{d.desc}</span>
                  <em>
                    {p.owned ? 'Owned' : !p.prereqsMet ? `Needs ${d.requires.map((r) => PERKS[r].name).join(', ')}` : `★ ${d.cost}`}
                  </em>
                </button>
              );
            })}
          </div>
        ))}
      </section>

      <section class="card">
        <h3>Flyway map</h3>
        <ol class="flyway-map">
          {hud.flyways.map((f) => (
            <li class={`flyway flyway--${f.status}`}>
              <strong>{FLYWAYS[f.id].name}</strong>
              <span>{FLYWAYS[f.id].blurb}</span>
              <em>
                {f.status === 'current' ? 'You are here' : f.status === 'next' ? 'Next season' : f.status === 'visited' ? 'Visited' : f.status === 'soon' ? 'Coming in a future update' : 'Locked'}
              </em>
              {f.status !== 'soon' && <span class="flyway__twist">{FLYWAYS[f.id].twist}</span>}
            </li>
          ))}
        </ol>
      </section>

      {confirming && <CloseSeasonDialog hud={hud} controls={controls} onClose={() => setConfirming(false)} />}
    </div>
  );
}

function CloseSeasonDialog({ hud, controls, onClose }: { hud: HudSnapshot; controls: GameControls; onClose: () => void }) {
  const se = hud.season;
  const [dest, setDest] = useState<FlywayId>(se.nextFlyway);
  const options: FlywayId[] = se.nextFlyway !== se.flyway ? [se.nextFlyway, se.flyway] : [se.flyway];
  return (
    <div class="away-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div class="away-card" role="dialog" aria-label="Close the season">
        <h3>Close Season {se.number}?</h3>
        <p class="away-card__gus">
          "Good season. We'll hang up the waders, count the stars and start fresh. What we learned stays with us."
          <span>— Gus Marlow</span>
        </p>
        <div class="season-summary">
          <div class="season-summary__gain">★ +{se.starsNow} Flyway Stars</div>
          <div class="season-summary__cols">
            <div>
              <h4>Starts over</h4>
              <ul>
                <li>Coins & feathers</li>
                <li>Bots & their levels</li>
                <li>Marsh upgrades & acres</li>
                <li>Today's bag and problems</li>
              </ul>
            </div>
            <div>
              <h4>You keep</h4>
              <ul>
                <li>Flyway Stars & perks</li>
                <li>+5% coins & feathers per star</li>
                <li>Field Guide & patches</li>
                <li>Your workflow board</li>
              </ul>
            </div>
          </div>
        </div>
        <fieldset class="flyway-choice">
          <legend>Next season in</legend>
          {options.map((f) => (
            <label class={`flyway-option ${dest === f ? 'is-on' : ''}`} for={`fly-${f}`}>
              <input id={`fly-${f}`} type="radio" name="flyway" checked={dest === f} onChange={() => setDest(f)} />
              <strong>{FLYWAYS[f].name}</strong>
              <span>{f === se.flyway ? 'Stay on this marsh' : FLYWAYS[f].twist}</span>
            </label>
          ))}
        </fieldset>
        <div class="btn-row">
          <button class="btn btn--primary" onClick={() => { controls.closeSeason(dest); onClose(); }}>
            Close the Season
          </button>
          <button class="btn" onClick={onClose}>Not yet</button>
        </div>
      </div>
    </div>
  );
}
