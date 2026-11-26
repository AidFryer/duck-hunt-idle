import { FLYWAYS } from '../../data/flyways';
import { seasonView } from '../moments';
import { useStore } from '../store';

/** Full-screen celebration after closing a season. */
export function SeasonCeremony() {
  const v = useStore(seasonView);
  if (!v) return null;
  const f = FLYWAYS[v.flyway];
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
        <p class="card__hint">Spend your stars in the Legacy tab. Every star also adds +5% to coins and feathers, for good.</p>
        <button class="btn btn--primary away-card__ok" onClick={() => seasonView.set(null)}>Start Season {v.season + 1}</button>
      </div>
    </div>
  );
}
