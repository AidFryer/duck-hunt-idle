import { useEffect } from 'preact/hooks';
import { ACHIEVEMENTS } from '../../data/achievements';
import { RARITY_STARS, SPECIES } from '../../data/species';
import { moments, popMoment } from '../moments';
import { speciesPortrait } from '../portraits';
import { useStore } from '../store';
import { Patch } from './Patch';
import { FEATURES } from '../../data/features';
import { KEEPER_NAME } from '../../data/goals';
import { formatNumber } from '../../util/format';
import { LODGE_LEVELS, PLANS, RUNGS } from '../../data/progression';
import { BOTS } from '../../data/economy';
import { portrait } from '../portraits';
import { LodgeArt } from './LodgeArt';

/** Shows queued "new Field Guide entry" / "patch earned" cards one at a time. */
export function Moments({ onOpen }: { onOpen: (feature: string) => void }) {
  const queue = useStore(moments);
  const m = queue[0];
  useEffect(() => {
    if (!m || m.kind === 'feature' || m.kind === 'daily' || m.kind === 'lodge') return;
    const t = setTimeout(popMoment, 4200);
    return () => clearTimeout(t);
  }, [m]);
  if (!m) return null;
  if (m.kind === 'feature') {
    const f = FEATURES[m.id];
    return (
      <div class="away-backdrop">
        <div class="away-card stage-card" role="dialog" aria-label={`New: ${f.name}`} key={`f-${m.id}`}>
          <span class="moment__tag">Stage {f.stage} unlocked</span>
          <h3>{f.name}</h3>
          <p class="away-card__gus">
            "{f.intro.gus}"
            <span>— {KEEPER_NAME}</span>
          </p>
          <ul class="stage-card__points">
            {f.intro.points.map((p) => <li>{p}</li>)}
          </ul>
          <div class="btn-row">
            <button class="btn btn--primary" onClick={() => { popMoment(); onOpen(m.id); }}>Open {f.name}</button>
            <button class="btn" onClick={popMoment}>Later</button>
          </div>
        </div>
      </div>
    );
  }
  if (m.kind === 'lodge') {
    const l = LODGE_LEVELS[m.level - 1]!;
    return (
      <div class="away-backdrop">
        <div class="away-card stage-card lodge-card" role="dialog" aria-label={`Built: ${l.name}`} key={`l-${m.level}`}>
          <span class="moment__tag">Lodge level {l.level}</span>
          <LodgeArt level={l.level} />
          <h3>The {l.name}</h3>
          <p class="away-card__gus">
            "{l.gus}"
            <span>— {KEEPER_NAME}</span>
          </p>
          <ul class="stage-card__points">
            {l.points.map((p) => <li>{p}</li>)}
          </ul>
          <div class="btn-row">
            <button class="btn btn--primary" onClick={popMoment}>Wonderful</button>
          </div>
        </div>
      </div>
    );
  }
  if (m.kind === 'plan') {
    const b = BOTS[m.bot];
    return (
      <button class="moment moment--plan" onClick={popMoment} key={`pl-${m.bot}`} aria-live="polite">
        <span class="moment__tag">Plans earned</span>
        <img src={portrait(m.bot)} alt="" />
        <strong>{b.name}</strong>
        <span class="moment__desc">
          {PLANS[m.bot].counter.startsWith('hand') ? "You've done this job enough to teach it." : 'The lodge has earned these plans.'} Carve one in the Workshop.
        </span>
      </button>
    );
  }
  if (m.kind === 'rung') {
    const r = RUNGS[m.id];
    return (
      <button class="moment moment--plan" onClick={popMoment} key={`r-${m.id}`} aria-live="polite">
        <span class="moment__tag">Automation ladder · rung {r.tier}</span>
        <img src={portrait(r.bot)} alt="" />
        <strong>{r.name}</strong>
        <span class="moment__desc">{r.effect}</span>
      </button>
    );
  }
  if (m.kind === 'daily') {
    return (
      <div class="away-backdrop">
        <div class="away-card stage-card" role="dialog" aria-label="First Light gift" key="daily">
          <span class="moment__tag">First Light</span>
          <h3>A new day on the marsh</h3>
          <p class="away-card__gus">
            "Mornin'! Coffee's on, and the guests left a little something for you."
            <span>— {KEEPER_NAME}</span>
          </p>
          <ul class="stage-card__points">
            <li>+{formatNumber(m.coins)} coins</li>
            <li>+{m.feathers} feathers</li>
            <li>Come back tomorrow for another.</li>
          </ul>
          <div class="btn-row">
            <button class="btn btn--primary" onClick={popMoment}>Thanks, Gus</button>
          </div>
        </div>
      </div>
    );
  }
  if (m.kind === 'species') {
    const d = SPECIES[m.id];
    return (
      <button class={`moment moment--${d.rarity}`} onClick={popMoment} key={`s-${m.id}`} aria-live="polite">
        <span class="moment__tag">New Field Guide entry</span>
        <span class="moment__sparkles" aria-hidden="true" />
        <img src={speciesPortrait(m.id)} alt="" />
        <strong>{d.name}</strong>
        <span class="moment__stars">{'★'.repeat(RARITY_STARS[d.rarity])} {d.rarity}</span>
        {m.coins > 0 && <span class="moment__reward">Finder's bonus: +{formatNumber(m.coins)} coins, +{formatNumber(m.feathers)} feathers</span>}
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
