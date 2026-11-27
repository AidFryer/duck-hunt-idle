import type { GroundId } from '../../data/economy';
import { dogNameOf } from '../../data/goals';
import type { HudSnapshot } from '../hudState';

/**
 * The hunt happens on the marsh itself (tap the water, a flock, a bird).
 * This is just a one-line reminder of how, for new players and the field.
 */
export function HuntPanel({ hud, ground = 'marsh' }: { hud: HudSnapshot; ground?: GroundId }) {
  const field = ground === 'field';
  if (!field && hud.lifetimeBirds >= 40) return null;
  return (
    <p class="hunt-status__how">
      {field ? (
        <>
          <strong>The goose field.</strong> Tap circling geese to flag them in, geese over the spread to shoot, and a goose on the ground to pick it up. Grow the spread in Upgrades.
        </>
      ) : (
        <>
          <strong>Tap the marsh to hunt.</strong> Tap a circling flock to call it in, ducks over the decoys to shoot, and a floating bird to send {dogNameOf(hud.profile)}. Grow your decoy spread in the Workshop.
        </>
      )}
    </p>
  );
}
