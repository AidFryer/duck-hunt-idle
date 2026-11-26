import type { HuntStage } from '../../data/economy';
import { KEEPER_NAME, LAB_NAME } from '../../data/goals';
import { formatRate } from '../../util/format';
import type { GameControls } from '../controls';
import type { HudSnapshot } from '../hudState';

interface StepView {
  stage: Exclude<HuntStage, 'log'>;
  label: string;
  value: (h: HudSnapshot) => string;
  bot: string;
}

const STEPS: StepView[] = [
  { stage: 'decoys', label: 'Decoys out', value: (h) => `${h.decoys}/${h.spread}`, bot: 'Setters' },
  { stage: 'call', label: 'Circling', value: (h) => `${h.incoming}`, bot: 'Callers' },
  { stage: 'shoot', label: 'Over decoys', value: (h) => `${h.committed}`, bot: 'Blind Bots' },
  { stage: 'retrieve', label: 'On the water', value: (h) => `${h.downed}`, bot: 'Retrievers' },
];

/**
 * The hunt happens on the marsh itself (tap the water, a flock, a bird).
 * This slim card just shows where things stand; each cell also works as a
 * button for anyone who'd rather tap here.
 */
export function HuntPanel({ hud, controls }: { hud: HudSnapshot; controls: GameControls }) {
  return (
    <section class="hunt-status" aria-label="The hunt">
      {hud.lifetimeBirds < 40 && (
        <p class="hunt-status__how">
          <strong>Tap the marsh to hunt.</strong> Water sets decoys, a circling flock gets called in, ducks over the decoys get shot, and a floating bird sends {LAB_NAME}.
        </p>
      )}
      <ol class="hunt-steps">
        {STEPS.map((s) => {
          const can = hud.can[s.stage];
          const auto = hud.auto[s.stage];
          return (
            <li>
              <button
                class={`hunt-step ${can ? 'is-ready' : ''}`}
                aria-disabled={!can}
                aria-label={`${s.label}: ${s.value(hud)}`}
                onClick={(e) => {
                  const ok = controls.act(s.stage);
                  const el = e.currentTarget as HTMLElement;
                  el.classList.remove('is-pressed', 'is-nope');
                  void el.offsetWidth;
                  el.classList.add(ok ? 'is-pressed' : 'is-nope');
                }}
              >
                <strong>{s.value(hud)}</strong>
                <span>{s.label}</span>
                {auto > 0 && <em>{s.bot} {formatRate(auto)}</em>}
              </button>
            </li>
          );
        })}
      </ol>
      <p class="hunt-status__lodge">
        {KEEPER_NAME.split(' ')[0]} logs birds at the lodge: {hud.ledger} waiting
        {hud.auto.log > 0 ? ` · Ledger Bots ${formatRate(hud.auto.log)}` : ''} · guests pay ×{hud.reputation.toFixed(2)}
      </p>
    </section>
  );
}
