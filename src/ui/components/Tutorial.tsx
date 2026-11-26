import { KEEPER_NAME, LAB_NAME } from '../../data/goals';
import type { HudSnapshot } from '../hudState';

export type TutorialStep = 'welcome' | 'decoys' | 'call' | 'shoot' | 'retrieve' | 'done';

/** Which step the player is on, from what they've done so far. */
export function tutorialStep(hud: HudSnapshot, welcomed: boolean): TutorialStep {
  if (!welcomed) return 'welcome';
  if (hud.lifetimeBirds > 0) return 'done';
  if (hud.downed > 0) return 'retrieve';
  if (hud.committed > 0) return 'shoot';
  if (hud.decoys < 3 && hud.incoming === 0) return 'decoys';
  return 'call';
}

const TEXT: Record<TutorialStep, string> = {
  welcome: `Morning! I'm ${KEEPER_NAME}. This old marsh is yours now. Let me show you how we hunt it, then we'll get some help carved.`,
  decoys: 'First, toss out a few decoys. Tap Set Decoys until at least three are bobbing out there.',
  call: "Now we wait for a flock to circle. When one's up there, tap Call to bring it down to the spread.",
  shoot: "They've cupped their wings over the decoys. Tap Shoot. One soft pop is all it takes.",
  retrieve: `Birds on the water. Tap Retrieve and ${LAB_NAME} will swim out for them.`,
  done: "That's the whole hunt. I log every bird at the lodge, and guests pay coins for 'em. Spend coins in the Bots tab and the crew will do this for you.",
};

/** A short, skippable first-run walkthrough voiced by Gus. */
export function Tutorial({ step, onNext, onSkip }: { step: TutorialStep; onNext: () => void; onSkip: () => void }) {
  const waiting = step !== 'welcome' && step !== 'done';
  return (
    <div class={`tutorial tutorial--${step}`} role="dialog" aria-label="Tutorial">
      <div class="keeper__portrait" aria-hidden="true">
        <span class="keeper__hat" />
        <span class="keeper__face" />
        <span class="keeper__beard" />
      </div>
      <div class="tutorial__bubble" key={step}>
        <p>{TEXT[step]}</p>
        <div class="tutorial__actions">
          {!waiting && (
            <button class="btn btn--primary btn--small" onClick={onNext}>
              {step === 'done' ? "Let's go" : 'Show me'}
            </button>
          )}
          {waiting && <span class="tutorial__hint">{step === 'call' ? 'Watch the sky… then tap Call ↓' : 'Tap the glowing button below ↓'}</span>}
          <button class="btn btn--small tutorial__skip" onClick={onSkip}>Skip tutorial</button>
        </div>
      </div>
    </div>
  );
}
