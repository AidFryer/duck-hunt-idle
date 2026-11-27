import { useState } from 'preact/hooks';
import { RARITY_STARS, SPECIES, type SpeciesId } from '../../data/species';
import { WEATHER } from '../../data/weather';
import { formatClock } from '../../sim/clock';
import { formatNumber, type Notation } from '../../util/format';
import type { HudSnapshot } from '../hudState';
import { speciesPortrait } from '../portraits';

export function FieldGuide({ hud, notation }: { hud: HudSnapshot; notation: Notation }) {
  const [pick, setPick] = useState<SpeciesId | null>(null);
  return (
    <div class="tab-body guide-tab">
      {(
        <>
          {pick && <BirdPage g={hud.guide.find((x) => x.id === pick)!} notation={notation} />}
          <div class="guide-grid">
            {hud.guide.map((g) => {
              const d = SPECIES[g.id];
              return (
                <button
                  class={`guide-tile guide-tile--${d.rarity} ${g.found ? '' : 'is-unknown'} ${pick === g.id ? 'is-on' : ''}`}
                  onClick={() => setPick(pick === g.id ? null : g.id)}
                  aria-label={g.found ? d.name : 'Unknown bird'}
                >
                  <img src={speciesPortrait(g.id)} alt="" />
                  <strong>{g.found ? d.name : '? ? ?'}</strong>
                  <span>{g.found ? formatNumber(g.count, notation) : '★'.repeat(RARITY_STARS[d.rarity])}</span>
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

/** One bird's page, opened from the grid. */
function BirdPage({ g, notation }: { g: HudSnapshot['guide'][number]; notation: Notation }) {
  const d = SPECIES[g.id];
  const hours = d.hours.map(([a, b]) => `${formatClock(a)}–${formatClock(b)}`).join(', ');
  return (
    <article class={`guide-card guide-card--${d.rarity} ${g.found ? '' : 'is-unknown'}`}>
      <div class="guide-card__art">
        <img src={speciesPortrait(g.id)} alt={g.found ? d.name : 'Unknown bird'} />
        <span class="guide-card__stars" aria-label={`${d.rarity}`}>{'★'.repeat(RARITY_STARS[d.rarity])}</span>
      </div>
      <div class="guide-card__text">
        <h4>{g.found ? d.name : '? ? ?'}</h4>
        {g.found ? (
          <>
            <p>{d.guide}</p>
            <dl class="stats">
              <div><dt>Brought in</dt><dd>{formatNumber(g.count, notation)}</dd></div>
              <div><dt>Pays</dt><dd>{d.coins} coins</dd></div>
              <div><dt>Feathers</dt><dd>{d.feathers}</dd></div>
              <div><dt>Active</dt><dd>{hours}</dd></div>
              <div><dt>Likes</dt><dd>{d.weather.map((w) => WEATHER[w].name).join(', ')}</dd></div>
            </dl>
          </>
        ) : (
          <>
            <p class="guide-card__hint">{d.hint}</p>
            <p class={`guide-card__draw ${g.available ? 'is-open' : ''}`}>{g.available ? 'Visiting now. Keep hunting!' : `Needs: ${g.draws}`}</p>
          </>
        )}
      </div>
    </article>
  );
}
