import { ACHIEVEMENTS, patchReward } from '../../data/achievements';
import { CARVINGS } from '../../data/carvings';
import { formatNumber, type Notation } from '../../util/format';
import type { HudSnapshot } from '../hudState';
import { carvingPortrait } from '../portraits';
import { Patch } from './Patch';

/** The lodge's trophy wall: the decoy shelf and every jacket patch. */
export function TrophyWall({ hud, notation }: { hud: HudSnapshot; notation: Notation }) {
  const owned = hud.carvings.filter((c) => c.status === 'owned');
  const earned = ACHIEVEMENTS.filter((_, i) => hud.achievements[i]!.unlocked);
  const locked = ACHIEVEMENTS.filter((_, i) => !hud.achievements[i]!.unlocked);
  return (
    <div class="tab-body trophy-wall">
      <p class="trophy-wall__bonus">
        <strong>{hud.patches} of {hud.achievements.length} patches</strong>
        <span>Every patch adds 1% to coins per bird. Yours add +{Math.round(hud.patchBonus * 100)}%.</span>
      </p>
      <section class="shelf" aria-label="Decoy shelf">
        <h4 class="group-head">Decoy shelf · {owned.length}/{hud.carvings.length}</h4>
        <div class="shelf__plank">
          {hud.carvings.map((c) => (
            <figure class={`shelf__spot ${c.status === 'owned' ? 'is-owned' : ''}`} title={c.status === 'owned' ? CARVINGS[c.id].name : 'An empty spot on the shelf'}>
              {c.status === 'owned' ? <img src={carvingPortrait(c.id)} alt={CARVINGS[c.id].name} /> : <span class="shelf__empty" aria-hidden="true" />}
            </figure>
          ))}
        </div>
        {owned.length === 0 && <p class="card__hint">Carve decoys in the Workshop to fill the shelf.</p>}
      </section>
      <h4 class="group-head">Jacket patches</h4>
      <div class="patch-grid">
        {[...earned, ...locked].map((a) => {
          const unlocked = hud.achievements[ACHIEVEMENTS.indexOf(a)]!.unlocked;
          return (
            <div class={`patch-card ${unlocked ? 'is-unlocked' : ''}`}>
              <Patch def={a} unlocked={unlocked} />
              <strong>{a.name}</strong>
              <span>{a.desc}</span>
              {!unlocked && <span class="patch-card__reward">+{formatNumber(patchReward(a), notation)} feathers</span>}
            </div>
          );
        })}
      </div>
    </div>
  );
}
