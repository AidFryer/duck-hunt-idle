import Decimal from 'break_infinity.js';
import { BOTS, WORKSHOP_ORDER } from '../../data/economy';
import { BRANCHES, BRANCH_ORDER, TRAINING, type BranchId } from '../../data/training';
import { dogNameOf } from '../../data/goals';
import { formatNumber, type Notation } from '../../util/format';
import type { GameControls } from '../controls';
import type { HudSnapshot } from '../hudState';
import { dogPortrait, portrait } from '../portraits';
import { pulse } from './BotsTab';
import { Cost } from './Cost';
import { Icon } from './Icon';

/** Crew Training: your retriever, drills for each bot, and skills learned for good. */
export function TrainingTab({ hud, controls, notation }: { hud: HudSnapshot; controls: GameControls; notation: Notation }) {
  return (
    <div class="tab-body training">
      <DogCard hud={hud} controls={controls} notation={notation} />
      <Drills hud={hud} controls={controls} notation={notation} />
      {hud.training.effects.length > 0 && (
        <p class="training__sum">
          <strong>Your crew so far:</strong> {hud.training.effects.join(' · ')}
        </p>
      )}
      {BRANCH_ORDER.map((b) => <Branch id={b} hud={hud} controls={controls} notation={notation} />)}
    </div>
  );
}

function DogCard({ hud, controls, notation }: { hud: HudSnapshot; controls: GameControls; notation: Notation }) {
  const d = hud.dog;
  const n = d.next;
  const name = dogNameOf(hud.profile);
  return (
    <section class="dog-card" aria-label={`${name}, your retriever`}>
      <div class="dog-card__head">
        <div class="dog-card__portrait"><img src={dogPortrait()} alt="" /></div>
        <div>
          <strong>{name}</strong>
          <span>Level {d.level} of {d.max}</span>
        </div>
      </div>
      {n ? (
        <div class="dog-card__next">
          <span class="dog-card__need">
            Fetch birds by hand: {formatNumber(Math.min(n.haveFetches, n.fetches), notation)}/{formatNumber(n.fetches, notation)}
          </span>
          <span class="guest__bar"><span style={{ width: `${Math.round(Math.min(1, n.haveFetches / Math.max(1, n.fetches)) * 100)}%` }} /></span>
          <button class="btn btn--primary btn--buy btn--small" aria-disabled={!n.affordable} onClick={(e) => pulse(e.currentTarget as HTMLElement, controls.trainDog())}>
            <span>{n.ready ? `Train to level ${n.level}` : 'Keep fetching'}</span>
            <span class="cost"><span class="cost__item"><Icon name="feather" size={14} /> {formatNumber(n.feathers, notation)}</span></span>
          </button>
        </div>
      ) : (
        <p class="card__hint">A champion. There's nothing left to teach her.</p>
      )}
      <ul class="dog-skills">
        {d.skills.map((k) => (
          <li class={k.has ? 'has' : ''}>
            <span class="dog-skills__lvl">{k.has ? '✓' : `Lv ${k.level}`}</span>
            <span><strong>{k.name}</strong> {k.desc}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** Drills: the old tune-ups, one row per kind of bot you own. */
function Drills({ hud, controls, notation }: { hud: HudSnapshot; controls: GameControls; notation: Notation }) {
  const owned = WORKSHOP_ORDER.filter((id) => hud.bots[id].owned > 0);
  if (owned.length === 0) return null;
  return (
    <section class="lodge-section" aria-label="Drills">
      <h4 class="group-head">Drills</h4>
      <p class="card__hint">Each drill makes that kind of bot faster and steadier for the rest of the season.</p>
      <ul class="drill-list">
        {owned.map((id) => {
          const b = hud.bots[id];
          return (
            <li class="drill">
              <img src={portrait(id)} alt="" />
              <div class="drill__text">
                <strong>{BOTS[id].name}</strong>
                <span>Drill level {b.level} · +{Math.round(BOTS[id].levelSpeedBonus * 100)}% speed each</span>
              </div>
              <button class="btn btn--buy btn--small" aria-disabled={!b.levelAffordable} onClick={(e) => pulse(e.currentTarget as HTMLElement, controls.levelUp(id))}>
                <span>Drill</span>
                <Cost price={b.levelPrice} notation={notation} />
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function Branch({ id, hud, controls, notation }: { id: BranchId; hud: HudSnapshot; controls: GameControls; notation: Notation }) {
  const skills = hud.training.skills.filter((k) => TRAINING[k.id].branch === id);
  if (skills.every((k) => k.status === 'needsLodge' && TRAINING[k.id].lodge > hud.lodge.level + 1)) return null;
  return (
    <section class="branch" aria-label={BRANCHES[id].name}>
      <h4 class="group-head">{BRANCHES[id].name}</h4>
      <p class="card__hint">{BRANCHES[id].blurb}</p>
      <ol class="branch__path">
        {skills.map((k) => {
          const d = TRAINING[k.id];
          return (
            <li class={`skill skill--${k.status}`}>
              <span class="skill__dot" aria-hidden="true">{k.status === 'learned' ? '✓' : ''}</span>
              <div class="skill__text">
                <strong>{d.name}</strong>
                <span>{d.desc}</span>
                {k.status === 'needsLodge' && <em>Opens with lodge level {d.lodge}</em>}
                {k.status === 'needsPrev' && <em>Learn {TRAINING[d.requires!].name} first</em>}
              </div>
              {k.status === 'ready' && (
                <button class="btn btn--primary btn--buy btn--small" aria-disabled={!k.affordable} onClick={(e) => pulse(e.currentTarget as HTMLElement, controls.buyTraining(k.id))}>
                  <span>Learn</span>
                  <Cost price={{ coins: new Decimal(d.coins), feathers: new Decimal(d.feathers) }} notation={notation} />
                </button>
              )}
            </li>
          );
        })}
      </ol>
    </section>
  );
}
