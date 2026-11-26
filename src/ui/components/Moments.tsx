import { useEffect } from 'preact/hooks';
import { ACHIEVEMENTS } from '../../data/achievements';
import { RARITY_STARS, SPECIES } from '../../data/species';
import { moments, popMoment } from '../moments';
import { speciesPortrait } from '../portraits';
import { useStore } from '../store';
import { Patch } from './Patch';

/** Shows queued "new Field Guide entry" / "patch earned" cards one at a time. */
export function Moments() {
  const queue = useStore(moments);
  const m = queue[0];
  useEffect(() => {
    if (!m) return;
    const t = setTimeout(popMoment, 4200);
    return () => clearTimeout(t);
  }, [m]);
  if (!m) return null;
  if (m.kind === 'species') {
    const d = SPECIES[m.id];
    return (
      <button class={`moment moment--${d.rarity}`} onClick={popMoment} key={`s-${m.id}`} aria-live="polite">
        <span class="moment__tag">New Field Guide entry</span>
        <span class="moment__sparkles" aria-hidden="true" />
        <img src={speciesPortrait(m.id)} alt="" />
        <strong>{d.name}</strong>
        <span class="moment__stars">{'★'.repeat(RARITY_STARS[d.rarity])} {d.rarity}</span>
      </button>
    );
  }
  const a = ACHIEVEMENTS.find((x) => x.id === m.id);
  if (!a) return null;
  return (
    <button class="moment moment--patch" onClick={popMoment} key={`p-${m.id}`} aria-live="polite">
      <span class="moment__tag">Patch earned</span>
      <Patch def={a} unlocked size={84} />
      <strong>{a.name}</strong>
      <span class="moment__desc">{a.desc}</span>
    </button>
  );
}
