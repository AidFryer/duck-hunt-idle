import { useState } from 'preact/hooks';
import type { DayPhaseId } from '../../data/dayCycle';
import type { ComponentChildren } from 'preact';
import { KEEPER_NAME } from '../../data/goals';
import type { GameControls } from '../controls';
import type { HudSnapshot } from '../hudState';
import { HuntPanel } from './HuntPanel';
import { LodgePanel } from './Lodge';
import { GuestBoard, LodgeProjects, LodgeRooms } from './LodgeLife';
import type { Notation } from '../../util/format';
import type { GroundId } from '../../data/economy';

const JUMPS: { id: DayPhaseId; label: string }[] = [
  { id: 'predawn', label: 'Pre-dawn' },
  { id: 'sunrise', label: 'Sunrise' },
  { id: 'midday', label: 'Midday' },
  { id: 'dusk', label: 'Dusk' },
  { id: 'night', label: 'Night' },
];

const SPEEDS = [1, 10, 60];

export function MarshTab({ hud, controls, devTools, tutorial, notation, ground = 'marsh' }: { hud: HudSnapshot; controls: GameControls; devTools: boolean; tutorial: ComponentChildren; notation: Notation; ground?: GroundId }) {
  const [speed, setSpeed] = useState(controls.getTimeScale());
  return (
    <div class="tab-body">
      {tutorial}
      {!tutorial && <LodgePanel hud={hud} controls={controls} notation={notation} />}
      <HuntPanel hud={hud} ground={ground} />
      {hud.lodge.level >= 2 && <GuestBoard hud={hud} controls={controls} notation={notation} />}
      {hud.lodge.level >= 2 && <LodgeRooms hud={hud} controls={controls} notation={notation} />}
      <LodgeProjects hud={hud} controls={controls} notation={notation} />

      {!tutorial && <div class="keeper">
        <div class="keeper__portrait" aria-hidden="true">
          <span class="keeper__hat" />
          <span class="keeper__face" />
          <span class="keeper__beard" />
        </div>
        <div class="speech" key={hud.goalId}>
          <p class="speech__name">{KEEPER_NAME}, old lodge keeper</p>
          <p>{hud.goalGus}</p>
        </div>
      </div>}

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
