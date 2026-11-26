import type { Notation } from '../../util/format';
import { formatNumber } from '../../util/format';
import type { GameControls } from '../controls';
import type { HudSnapshot, Req } from '../hudState';
import { pulse } from './BotsTab';
import { Cost } from './Cost';
import { LodgeArt } from './LodgeArt';

/** One requirement with a progress bar and a tick when it's done. */
export function ReqBar({ r, notation = 'letters' }: { r: Req; notation?: Notation }) {
  const done = r.cur >= r.goal;
  const pct = Math.max(0, Math.min(100, (r.cur / Math.max(1, r.goal)) * 100));
  return (
    <div class={`req ${done ? 'is-done' : ''}`}>
      <span class="req__label">
        <span class="req__tick" aria-hidden="true">{done ? '✓' : ''}</span>
        {r.label}
      </span>
      {r.goal > 1 && (
        <span class="req__count">
          {formatNumber(r.cur, notation, 0)}/{formatNumber(r.goal, notation, 0)}
        </span>
      )}
      {r.goal > 1 && (
        <span class="req__bar"><span style={{ width: `${pct}%` }} /></span>
      )}
    </div>
  );
}

/** The lodge: what it is now, and what it takes to build the next level. */
export function LodgePanel({ hud, controls, notation }: { hud: HudSnapshot; controls: GameControls; notation: Notation }) {
  const l = hud.lodge;
  const n = l.next;
  return (
    <section class="lodge-panel" aria-label="Your lodge">
      <div class="lodge-panel__head">
        <LodgeArt level={l.level} size={92} />
        <div>
          <span class="goal__tag">Lodge level {l.level}</span>
          <h3>{hud.profile.name ? `${hud.profile.name}'s ${l.name}` : l.name}</h3>
          {n && <p class="lodge-panel__next">Next: the {n.name}</p>}
          {!n && <p class="lodge-panel__next">The finest lodge on the flyway.</p>}
        </div>
      </div>
      {n && (
        <>
          <div class="reqs">
            {n.reqs.map((r) => <ReqBar r={r} notation={notation} />)}
          </div>
          <details class="lodge-panel__what">
            <summary>What the {n.name} brings</summary>
            <ul>
              {n.points.map((p) => <li>{p}</li>)}
            </ul>
          </details>
          <div class="btn-row">
            <button
              class="btn btn--primary btn--buy"
              aria-disabled={!n.affordable}
              onClick={(e) => pulse(e.currentTarget as HTMLElement, controls.buildLodge())}
            >
              <span>{n.ready ? `Build the ${n.name}` : 'Not ready yet'}</span>
              <Cost price={n.price} notation={notation} />
            </button>
          </div>
        </>
      )}
    </section>
  );
}
