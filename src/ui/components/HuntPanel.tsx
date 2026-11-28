import { BOTS, GROUND_CREW, type GroundId } from '../../data/economy';
import { dogNameOf } from '../../data/goals';
import type { HudSnapshot } from '../hudState';

/**
 * The hunt happens on the marsh itself (tap the water, a flock, a bird).
 * This is just a one-line reminder of how, for new players and the field.
 */
export function HuntPanel({ hud, ground = 'marsh' }: { hud: HudSnapshot; ground?: GroundId }) {
  const field = ground === 'field';
  if (ground === 'timber' || ground === 'bay') {
    const crew = GROUND_CREW[ground];
    const names = `${BOTS[crew[0]!].name}, ${BOTS[crew[1]!].name} and ${BOTS[crew[2]!].name}`;
    const crewLine = crew.every((id) => hud.plans[id].earned)
      ? `Its own crew (${names}) works it once you carve them in the Workshop.`
      : `Hunt it by hand to earn the plans for its own crew: ${names}.`;
    return (
      <p class="hunt-status__how">
        {ground === 'timber' ? (
          <><strong>The flooded timber.</strong> Wood ducks and black ducks drop through the oaks in small, quick flocks. {crewLine}</>
        ) : (
          <><strong>The coastal bay.</strong> Big rafts of sea ducks, slow to decoy. Scoters and eiders live out here. {crewLine}</>
        )}
      </p>
    );
  }
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
