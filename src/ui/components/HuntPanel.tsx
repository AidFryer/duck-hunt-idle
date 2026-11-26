import type { GroundId } from '../../data/economy';
import { LAB_NAME } from '../../data/goals';
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
          <strong>The goose field.</strong> Tap the stubble to stake decoys, circling geese to flag them in, geese over the spread to shoot, and a goose on the ground to pick it up.
        </>
      ) : (
        <>
          <strong>Tap the marsh to hunt.</strong> Water sets decoys, a circling flock gets called in, ducks over the decoys get shot, and a floating bird sends {LAB_NAME}.
        </>
      )}
    </p>
  );
}
