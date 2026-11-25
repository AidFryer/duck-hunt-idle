import { useState } from 'preact/hooks';
import type { DayPhaseId } from '../../data/dayCycle';
import type { GameControls } from '../controls';
import type { HudSnapshot } from '../hudState';

const JUMPS: { id: DayPhaseId; label: string }[] = [
  { id: 'predawn', label: 'Pre-dawn' },
  { id: 'sunrise', label: 'Sunrise' },
  { id: 'midday', label: 'Midday' },
  { id: 'dusk', label: 'Dusk' },
  { id: 'night', label: 'Night' },
];

const SPEEDS = [1, 10, 60];

export function MarshTab({ hud, controls }: { hud: HudSnapshot; controls: GameControls }) {
  const [speed, setSpeed] = useState(controls.getTimeScale());
  return (
    <div class="tab-body">
      <div class="keeper">
        <div class="keeper__portrait" aria-hidden="true">
          <span class="keeper__hat" />
          <span class="keeper__face" />
          <span class="keeper__beard" />
        </div>
        <div class="speech">
          <p class="speech__name">Gus Marlow, old lodge keeper</p>
          <p>
            Well, here she is. The old marsh. Roof leaks and the decoys need paint, but the ducks still come in
            every sunrise. Grab a coffee and watch for a bit.
          </p>
        </div>
      </div>

      <div class="goal">
        <span class="goal__tag">Next goal</span>
        <p>Watch a flock circle the decoys and splash down.</p>
        <p class="goal__hint">Hand-tapping the hunt and carving your first decoy-bots come next.</p>
      </div>

      <section class="card">
        <h3>Preview controls</h3>
        <p class="card__hint">Speed up the day or jump around the clock to see the marsh change.</p>
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
            <button
              class={`btn btn--small ${hud.phaseId === j.id ? 'is-current' : ''}`}
              onClick={() => controls.jumpToPhase(j.id)}
            >
              {j.label}
            </button>
          ))}
        </div>
        <div class="btn-row">
          <button class="btn btn--primary" onClick={() => controls.sendLandingFlock()}>
            Call in a flock
          </button>
          <button class="btn" onClick={() => controls.sendFlyover()}>
            Flyover
          </button>
        </div>
      </section>
    </div>
  );
}
