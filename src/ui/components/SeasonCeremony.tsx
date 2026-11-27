import { FLYWAYS } from '../../data/flyways';
import { SPECIES, SPECIES_ORDER } from '../../data/species';
import { SPECIES_DRAW } from '../../data/progression';
import { speciesPortrait } from '../portraits';
import { seasonView } from '../moments';
import { useStore } from '../store';

/** Full-screen celebration after closing a season. */
export function SeasonCeremony() {
  const v = useStore(seasonView);
  if (!v) return null;
  const f = FLYWAYS[v.flyway];
  // Birds that only visit this flyway.
  const birds = SPECIES_ORDER.filter((sp) => SPECIES_DRAW[sp]?.some((d) => 'flyway' in d && d.flyway.includes(v.flyway) && d.flyway.length < 3));
  return (
    <div class="away-backdrop ceremony" onClick={() => seasonView.set(null)}>
      <div class="away-card ceremony__card" role="dialog" aria-label="Season closed">
        <span class="moment__tag">Season {v.season} closed</span>
        <div class="ceremony__stars" aria-hidden="true">
          {Array.from({ length: Math.min(v.stars, 12) }, (_, i) => <span style={{ animationDelay: `${0.15 * i}s` }}>★</span>)}
        </div>
        <h3>+{v.stars} Flyway Star{v.stars > 1 ? 's' : ''}</h3>
        <p>Welcome to the <strong>{f.name}</strong>.</p>
        <p class="card__hint">{f.blurb}</p>
        <p class="card__hint">{f.twist}</p>
        {birds.length > 0 && (
          <div class="ceremony__birds">
            <strong>New birds here</strong>
            <div>
              {birds.slice(0, 6).map((b) => (
                <figure>
                  <img src={speciesPortrait(b)} alt="" />
                  <figcaption>{SPECIES[b].name}</figcaption>
                </figure>
              ))}
            </div>
          </div>
        )}
        <p class="card__hint">Spend your stars in the Legacy tab. Every star also adds +5% to coins and feathers, for good. Your lodge, plans, carvings and patches came with you.</p>
        <button class="btn btn--primary away-card__ok" onClick={() => seasonView.set(null)}>Start Season {v.season + 1}</button>
      </div>
    </div>
  );
}
