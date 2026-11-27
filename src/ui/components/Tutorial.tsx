import { useState } from 'preact/hooks';
import { KEEPER_NAME, LAB_NAME } from '../../data/goals';
import type { HudSnapshot } from '../hudState';

export type TutorialStep = 'welcome' | 'call' | 'shoot' | 'retrieve' | 'done';

/** Which step the player is on, from what they've done so far. */
export function tutorialStep(hud: HudSnapshot, welcomed: boolean): TutorialStep {
  if (!welcomed) return 'welcome';
  if (hud.lifetimeBirds > 0) return 'done';
  if (hud.downed > 0) return 'retrieve';
  if (hud.committed > 0) return 'shoot';
  return 'call';
}

const TEXT: Record<TutorialStep, string> = {
  welcome: `Morning! I'm ${KEEPER_NAME}. This old marsh is yours now. Let me show you how we hunt it, then we'll get some help carved.`,
  call: "The decoys are out and bobbing. Now we wait for a flock to circle. When one's up there, tap it to call it down to the spread. The ring around it is how long they'll wait.",
  shoot: "They've cupped their wings over the decoys. Tap them to shoot. One soft pop is all it takes.",
  retrieve: `Birds on the water. Tap one and ${LAB_NAME} will swim out for it.`,
  done: "That's the whole hunt. I log every bird at the lodge myself, and guests pay coins for 'em. Tap quick, one after another, and you'll find your rhythm: extra coins. Save up to build a proper cabin, and we'll start carving bots that learn from you.",
};

/** A short, skippable first-run walkthrough voiced by Ray. */
export function Tutorial({ step, onNext, onSkip, name = '', onName }: { step: TutorialStep; onNext: () => void; onSkip: () => void; name?: string; onName?: (n: string) => void }) {
  const waiting = step !== 'welcome' && step !== 'done';
  const [draft, setDraft] = useState(name);
  return (
    <div class={`tutorial tutorial--inline tutorial--${step}`} role="dialog" aria-label="Tutorial">
      <div class="keeper__portrait" aria-hidden="true">
        <span class="keeper__hat" />
        <span class="keeper__face" />
        <span class="keeper__beard" />
      </div>
      <div class="tutorial__bubble" key={step}>
        <p>{TEXT[step]}</p>
        {step === 'welcome' && onName && (
          <input
            class="tutorial__name"
            type="text"
            maxLength={18}
            placeholder="Your name (optional)"
            value={draft}
            onInput={(e) => setDraft((e.currentTarget as HTMLInputElement).value)}
            onBlur={() => onName(draft)}
          />
        )}
        <div class="tutorial__actions">
          {!waiting && (
            <button class="btn btn--primary btn--small" onClick={() => { if (step === 'welcome' && onName) onName(draft); onNext(); }}>
              {step === 'done' ? "Let's go" : 'Show me'}
            </button>
          )}
          {waiting && <span class="tutorial__hint">{step === 'call' ? 'Watch the sky… then tap the flock ↑' : 'Tap where it glows ↑'}</span>}
          <button class="btn btn--small tutorial__skip" onClick={onSkip}>Skip tutorial</button>
        </div>
      </div>
    </div>
  );
}
