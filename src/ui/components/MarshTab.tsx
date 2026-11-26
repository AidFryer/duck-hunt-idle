import { useState } from 'preact/hooks';
import type { DayPhaseId } from '../../data/dayCycle';
import type { HuntStage } from '../../data/economy';
import { KEEPER_NAME } from '../../data/goals';
import type { GameControls } from '../controls';
import type { HudSnapshot } from '../hudState';
import { HuntPanel } from './HuntPanel';

const JUMPS: { id: DayPhaseId; label: string }[] = [
  { id: 'predawn', label: 'Pre-dawn' },
  { id: 'sunrise', label: 'Sunrise' },
  { id: 'midday', label: 'Midday' },
  { id: 'dusk', label: 'Dusk' },
  { id: 'night', label: 'Night' },
];

const SPEEDS = [1, 10, 60];

const GOAL_HINT: Record<string, HuntStage> = {
  decoys: 'decoys',
  call: 'call',
  shoot: 'shoot',
  retrieve: 'retrieve',
};

export function MarshTab({ hud, controls, devTools, tutorial }: { hud: HudSnapshot; controls: GameControls; devTools: boolean; tutorial: string | null }) {
  const [speed, setSpeed] = useState(controls.getTimeScale());
  return (
    <div class="tab-body">
      <HuntPanel hud={hud} controls={controls} highlight={GOAL_HINT[tutorial ?? hud.goalId] ?? null} />

      <div class="keeper">
        <div class="keeper__portrait" aria-hidden="true">
          <span class="keeper__hat" />
          <span class="keeper__face" />
          <span class="keeper__beard" />
        </div>
        <div class="speech" key={hud.goalId}>
          <p class="speech__name">{KEEPER_NAME}, old lodge keeper</p>
          <p>{hud.goalGus}</p>
        </div>
      </div>

      <div class="goal" key={`g-${hud.goalId}`}>
        <span class="goal__tag">Next goal</span>
        <p>{hud.goalTitle}</p>
        <p class="goal__hint">
          Today's bag: {hud.bag} · Best day: {hud.bestBag} · Lifetime: {hud.lifetimeBirds}
        </p>
      </div>

      {devTools && (
        <section class="card">
          <h3>Preview controls</h3>
          <p class="card__hint">Speed up the day or jump around the clock. Turn these off in Settings.</p>
          <div class="btn-row" role="group" aria-label="Time-lapse speed">
            {SPEEDS.map((s) => (
              <button
                class={`btn btn--toggle ${speed === s ? 'is-on' : ''}`}
                onClick={() => {
                  controls.setTimeScale(s);
                  setSpeed(s);
                }}
              >
                {s === 1 ? 'Real time' : `×${s}`}
              </button>
            ))}
          </div>
          <div class="btn-row" role="group" aria-label="Jump to time of day">
            {JUMPS.map((j) => (
              <button class={`btn btn--small ${hud.phaseId === j.id ? 'is-current' : ''}`} onClick={() => controls.jumpToPhase(j.id)}>
                {j.label}
              </button>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
