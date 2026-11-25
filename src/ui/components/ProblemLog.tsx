import { BOTS } from '../../data/economy';
import { formatDuration } from '../../util/format';
import type { GameControls } from '../controls';
import { FOREMAN_LIMITS, type HudSnapshot } from '../hudState';
import { portrait } from '../portraits';
import { pulse } from './BotsTab';

/** Slide-out orchestrator log: recent problems, who fixed them, foreman settings. */
export function ProblemLog({ hud, controls, onClose }: { hud: HudSnapshot; controls: GameControls; onClose: () => void }) {
  const f = hud.foreman;
  const ps = hud.problemStats;
  const autoPct = ps.byYou + ps.byForeman > 0 ? Math.round((ps.byForeman / (ps.byYou + ps.byForeman)) * 100) : 0;
  return (
    <div class="drawer-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div class="drawer" role="dialog" aria-label="Problem Log" aria-modal="true">
        <header class="drawer__head">
          <h3>Problem Log</h3>
          <button class="icon-btn icon-btn--dark" onClick={onClose} aria-label="Close problem log">✕</button>
        </header>

        <div class="log-stats">
          <div><strong>{hud.openProblems}</strong><span>open</span></div>
          <div class={hud.needsYou ? 'is-hot' : ''}><strong>{hud.needsYou}</strong><span>need you</span></div>
          <div><strong>{ps.byForeman}</strong><span>auto-fixed</span></div>
          <div><strong>{ps.byYou}</strong><span>fixed by you</span></div>
        </div>
        {hud.openProblems > 0 && (
          <button class="btn btn--primary log-fixall" onClick={(e) => pulse(e.currentTarget as HTMLElement, controls.fixAll() > 0)}>
            Fix all {hud.openProblems} now
          </button>
        )}

        <section class="drawer__section">
          <h4>Foreman settings</h4>
          {f.hired ? (
            <>
              <Stepper
                id="opt-retries"
                label="Retries before asking you"
                value={f.retries}
                min={FOREMAN_LIMITS.retriesMin}
                max={FOREMAN_LIMITS.retriesMax}
                onChange={(v) => controls.setForeman(v, f.backoff)}
              />
              <Stepper
                id="opt-backoff"
                label="First wait (seconds)"
                value={f.backoff}
                min={FOREMAN_LIMITS.backoffMin}
                max={FOREMAN_LIMITS.backoffMax}
                onChange={(v) => controls.setForeman(f.retries, v)}
              />
              <p class="card__hint">
                Each retry works {Math.round(f.chance * 100)}% of the time. Waits double each try:{' '}
                {f.delays.map((d) => `${d.toFixed(1)}s`).join(', ')}. Longer waits fix more problems, but the bot stays stuck longer.
                {f.capacity > 1 ? ` Your foremen handle ${f.capacity} problems at once.` : ' One problem at a time; more Foremen handle more.'}
              </p>
              <p class="card__hint">So far the foreman has handled {autoPct}% of fixes.</p>
            </>
          ) : (
            <p class="card__hint">Hire a Foreman Bot (Bots tab) and it will retry stuck bots for you, with the retry count and wait you choose here.</p>
          )}
        </section>

        <section class="drawer__section">
          <h4>Recent problems</h4>
          {hud.problems.length === 0 && <p class="card__hint">No problems yet. Bots hit snags now and then; they'll show up here.</p>}
          <ul class="problem-list">
            {hud.problems.map((p) => (
              <li class={`problem problem--${p.status} ${p.needsYou ? 'is-needs-you' : ''}`}>
                <img src={portrait(p.bot)} alt="" />
                <div class="problem__text">
                  <strong>{p.title}</strong>
                  <span>
                    {BOTS[p.bot].name} · {p.statusText} · {formatDuration(p.ago)} ago
                  </span>
                </div>
                {p.status !== 'fixed' && (
                  <button class="btn btn--small" onClick={(e) => pulse(e.currentTarget as HTMLElement, controls.fixProblem(p.id))}>
                    Fix
                  </button>
                )}
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}

function Stepper({ id, label, value, min, max, onChange }: {
  id: string;
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
}) {
  return (
    <div class="row" id={id}>
      <span>{label}</span>
      <div class="stepper">
        <button class="btn btn--small" aria-label={`Less: ${label}`} aria-disabled={value <= min} onClick={() => value > min && onChange(value - 1)}>−</button>
        <strong>{value}</strong>
        <button class="btn btn--small" aria-label={`More: ${label}`} aria-disabled={value >= max} onClick={() => value < max && onChange(value + 1)}>+</button>
      </div>
    </div>
  );
}
