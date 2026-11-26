import type { GroundId, HuntStage, Step } from '../../data/economy';
import { KEEPER_NAME, LAB_NAME } from '../../data/goals';
import { formatRate } from '../../util/format';
import type { GameControls } from '../controls';
import type { HudSnapshot } from '../hudState';

interface StepView {
  stage: Exclude<HuntStage, 'log'>;
  label: string;
  value: (h: Numbers) => string;
  bot: string;
}

interface Numbers {
  decoys: number;
  spread: number;
  incoming: number;
  committed: number;
  downed: number;
  can: Record<Step, boolean>;
  auto: Record<Step, number>;
}

const MARSH_STEPS: StepView[] = [
  { stage: 'decoys', label: 'Decoys out', value: (h) => `${h.decoys}/${h.spread}`, bot: 'Setters' },
  { stage: 'call', label: 'Circling', value: (h) => `${h.incoming}`, bot: 'Callers' },
  { stage: 'shoot', label: 'Over decoys', value: (h) => `${h.committed}`, bot: 'Blind Bots' },
  { stage: 'retrieve', label: 'On the water', value: (h) => `${h.downed}`, bot: 'Retrievers' },
];

const FIELD_STEPS: StepView[] = [
  { stage: 'decoys', label: 'Decoys staked', value: (h) => `${h.decoys}/${h.spread}`, bot: 'Stakers' },
  { stage: 'call', label: 'Geese circling', value: (h) => `${h.incoming}`, bot: 'Flaggers' },
  { stage: 'shoot', label: 'Over the spread', value: (h) => `${h.committed}`, bot: 'Layout Bots' },
  { stage: 'retrieve', label: 'In the stubble', value: (h) => `${h.downed}`, bot: 'Field Pups' },
];

/**
 * The hunt happens on the marsh itself (tap the water, a flock, a bird).
 * This slim card just shows where things stand; each cell also works as a
 * button for anyone who'd rather tap here.
 */
export function HuntPanel({ hud, controls, ground = 'marsh' }: { hud: HudSnapshot; controls: GameControls; ground?: GroundId }) {
  const field = ground === 'field';
  const nums: Numbers = field ? hud.field : { ...hud, can: hud.can, auto: hud.auto };
  const steps = field ? FIELD_STEPS : MARSH_STEPS;
  return (
    <section class="hunt-status" aria-label={field ? 'The goose field' : 'The hunt'}>
      {field && (
        <p class="hunt-status__how">
          <strong>The goose field.</strong> Tap the stubble to stake decoys, tap circling geese to flag them in, tap geese over the spread to shoot, and tap a goose on the ground to pick it up.
        </p>
      )}
      {!field && hud.lifetimeBirds < 40 && (
        <p class="hunt-status__how">
          <strong>Tap the marsh to hunt.</strong> Water sets decoys, a circling flock gets called in, ducks over the decoys get shot, and a floating bird sends {LAB_NAME}.
        </p>
      )}
      <ol class="hunt-steps">
        {steps.map((s) => {
          const can = nums.can[s.stage];
          const auto = nums.auto[s.stage];
          return (
            <li>
              <button
                class={`hunt-step ${can ? 'is-ready' : ''}`}
                aria-disabled={!can}
                aria-label={`${s.label}: ${s.value(nums)}`}
                onClick={(e) => {
                  const ok = controls.act(s.stage, ground);
                  const el = e.currentTarget as HTMLElement;
                  el.classList.remove('is-pressed', 'is-nope');
                  void el.offsetWidth;
                  el.classList.add(ok ? 'is-pressed' : 'is-nope');
                }}
              >
                <strong>{s.value(nums)}</strong>
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
