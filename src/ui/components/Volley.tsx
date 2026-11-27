import type { Notation } from '../../util/format';
import { formatNumber } from '../../util/format';
import type { GameControls } from '../controls';
import type { HudSnapshot } from '../hudState';
import { Counter } from './Counter';
import { Icon } from './Icon';
import { feedback } from '../feedback';

/** The Big Volley: a brass button that fills up, then fires the whole crew. */
export function VolleyButton({ hud, controls, notation }: { hud: HudSnapshot; controls: GameControls; notation: Notation }) {
  const v = hud.volley;
  if (!v.unlocked) return null;
  const pct = Math.round(v.charge * 100);
  return (
    <button
      class={`volley ${v.ready ? 'is-ready' : ''}`}
      style={{ '--charge': `${pct}%` } as Record<string, string>}
      aria-disabled={!v.ready}
      aria-label={v.ready ? `Fire the Big Volley for about ${formatNumber(v.payout.birds, notation)} birds` : `Big Volley charging, ${pct}%`}
      onClick={(e) => {
        if (controls.fireVolley()) feedback.sparkle(e.currentTarget as HTMLElement);
      }}
    >
      <span class="volley__ring" aria-hidden="true" />
      <span class="volley__face">
        <span class="volley__label">{v.ready ? 'Volley!' : `${pct}%`}</span>
        {v.ready && <span class="volley__sub">+{formatNumber(v.payout.birds, notation)}</span>}
      </span>
    </button>
  );
}

/** When the marsh is busy: one running tally instead of a popup per bird. */
export function Tally({ hud, notation }: { hud: HudSnapshot; notation: Notation }) {
  if (!hud.volley.busy) return null;
  const perMin = (x: number) => formatNumber(Math.round(x * 60), notation);
  return (
    <div class="tally" aria-live="off">
      <span class="tally__row">
        <span class="tally__label">Today</span>
        <strong><Counter value={hud.bag} notation={notation} /></strong>
        <span class="tally__unit">birds</span>
      </span>
      <span class="tally__row tally__rates">
        <span class="tally__coins"><Icon name="coin" size={13} />+{perMin(hud.volley.coinsRate)}</span>
        <span class="tally__feathers"><Icon name="feather" size={13} />+{perMin(hud.volley.feathersRate)}</span>
        <span class="tally__unit">a minute</span>
      </span>
    </div>
  );
}
