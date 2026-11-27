import { KEEPER_NAME } from '../../data/goals';
import { SPECIES } from '../../data/species';
import { ACHIEVEMENTS } from '../../data/achievements';
import { formatDuration, formatNumber, type Notation } from '../../util/format';
import { offlineView } from '../moments';
import { useStore } from '../store';

/** "Catching up…" progress, then the cozy "While you were away…" summary. */
export function OfflineCard({ notation }: { notation: Notation }) {
  const v = useStore(offlineView);
  if (v.phase === 'idle') return null;
  if (v.phase === 'catching') {
    return (
      <div class="away-backdrop">
        <div class="away-card away-card--catching" role="status">
          <h3>Catching up on the marsh…</h3>
          <p>You were away {formatDuration(v.away)}.</p>
          <div class="milestone__bar"><span style={{ width: `${Math.round(v.progress * 100)}%` }} /></div>
        </div>
      </div>
    );
  }
  const s = v.summary;
  const close = () => offlineView.set({ phase: 'idle' });
  return (
    <div class="away-backdrop" onClick={(e) => e.target === e.currentTarget && close()}>
      <div class="away-card" role="dialog" aria-label="While you were away">
        <div class="away-card__head">
          <div class="keeper__portrait" aria-hidden="true">
            <span class="keeper__hat" />
            <span class="keeper__face" />
            <span class="keeper__beard" />
          </div>
          <div>
            <h3>While you were away…</h3>
            <p class="card__hint">
              {formatDuration(s.away)} away{s.capped ? ` (the crew worked the first ${s.capHours} hours)` : ''}
              {s.days > 0 ? ` · ${s.days} day${s.days > 1 ? 's' : ''} passed` : ''}
            </p>
          </div>
        </div>
        <p class="card__hint">The crew works at an easy pace without you. The best hunting happens while you play.</p>
        <p class="away-card__gus">
          {s.birds > 0
            ? `"The crew kept at it while you were gone. Here's what's in the ledger."`
            : `"Quiet out there. Without a crew, the marsh just rests. Carve some bots and they'll work while you're away."`}
          <span> — {KEEPER_NAME}</span>
        </p>
        <dl class="away-stats">
          <div><dt>Birds brought in</dt><dd>{formatNumber(s.birds, notation)}</dd></div>
          <div><dt>Coins earned</dt><dd>+{formatNumber(s.coins, notation)}</dd></div>
          <div><dt>Feathers</dt><dd>+{formatNumber(s.feathers, notation)}</dd></div>
          <div><dt>Flocks that got away</dt><dd>{formatNumber(s.flocksLost, notation)}</dd></div>
          <div><dt>Problems fixed by the foreman</dt><dd>{s.autoFixed} of {s.problems}</dd></div>
          {s.needYou > 0 && <div class="is-hot"><dt>Bots still stuck</dt><dd>{s.needYou}</dd></div>}
        </dl>
        {s.newSpecies.length > 0 && (
          <p class="away-card__new">New in the Field Guide: {s.newSpecies.map((id) => SPECIES[id].name).join(', ')}</p>
        )}
        {s.achievements.length > 0 && (
          <p class="away-card__new">
            Patches earned: {s.achievements.map((id) => ACHIEVEMENTS.find((a) => a.id === id)?.name ?? id).join(', ')}
          </p>
        )}
        <button class="btn btn--primary away-card__ok" onClick={close}>
          Back to the marsh
        </button>
      </div>
    </div>
  );
}
