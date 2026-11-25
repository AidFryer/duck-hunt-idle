import type { HuntStage } from '../../data/economy';
import { LAB_NAME } from '../../data/goals';
import { formatRate } from '../../util/format';
import type { GameControls } from '../controls';
import type { HudSnapshot } from '../hudState';

interface StageView {
  stage: HuntStage;
  verb: string;
  status: (h: HudSnapshot) => string;
  idle: string;
  bot: string;
}

const STAGES: StageView[] = [
  {
    stage: 'decoys',
    verb: 'Set Decoys',
    status: (h) => `${h.decoys}/${h.spread} out`,
    idle: 'Spread is full',
    bot: 'Decoy Setters arrive in Phase 3',
  },
  {
    stage: 'call',
    verb: 'Call',
    status: (h) => (h.incoming ? `${h.incoming} circling` : 'No flocks circling'),
    idle: 'Wait for a flock',
    bot: 'Caller Bots',
  },
  {
    stage: 'shoot',
    verb: 'Shoot',
    status: (h) => (h.committed ? `${h.committed} in range` : 'Nothing in range'),
    idle: 'Call a flock in first',
    bot: 'Blind Bots',
  },
  {
    stage: 'retrieve',
    verb: 'Retrieve',
    status: (h) => (h.downed ? `${h.downed} on the water` : 'Nothing to fetch'),
    idle: `${LAB_NAME} is waiting`,
    bot: 'Robo-Retrievers',
  },
];

/** The four manual hunt actions, laid out as a pipeline. */
export function HuntPanel({ hud, controls, highlight }: { hud: HudSnapshot; controls: GameControls; highlight: HuntStage | null }) {
  return (
    <section class="hunt" aria-label="The hunt">
      <ol class="hunt__row">
        {STAGES.map((s, i) => {
          const can = hud.can[s.stage];
          const auto = hud.auto[s.stage];
          return (
            <li class="hunt__cell">
              <button
                class={`hunt-btn hunt-btn--${s.stage} ${can ? 'is-ready' : ''} ${highlight === s.stage ? 'is-hint' : ''}`}
                aria-disabled={!can}
                onClick={(e) => {
                  const ok = controls.act(s.stage);
                  const el = e.currentTarget as HTMLElement;
                  el.classList.remove('is-pressed', 'is-nope');
                  void el.offsetWidth;
                  el.classList.add(ok ? 'is-pressed' : 'is-nope');
                }}
              >
                <span class="hunt-btn__step">{i + 1}</span>
                <span class="hunt-btn__verb">{s.verb}</span>
                <span class="hunt-btn__status">{can || s.stage !== 'decoys' ? s.status(hud) : s.idle}</span>
                {auto > 0 && <span class="hunt-btn__auto">{s.bot}: {formatRate(auto)}</span>}
              </button>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
