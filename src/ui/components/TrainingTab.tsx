import Decimal from 'break_infinity.js';
import { BOTS, CREW_TITLE, crewOf, WORKSHOP_ORDER } from '../../data/economy';
import { BRANCHES, BRANCH_ORDER, TRAINING, type BranchId } from '../../data/training';
import { dogNameOf } from '../../data/goals';
import { LODGE_LEVELS } from '../../data/progression';
import { formatNumber, type Notation } from '../../util/format';
import type { GameControls } from '../controls';
import type { HudSnapshot } from '../hudState';
import { dogPortrait, portrait } from '../portraits';
import { BuyButton, Finished, JumpChips, Row, RowNote } from './Kit';

/** Crew Training: your retriever, drills for each bot, and skills learned for good. */
export function TrainingTab({ hud, controls, notation }: { hud: HudSnapshot; controls: GameControls; notation: Notation }) {
  const shown = BRANCH_ORDER.filter((b) => showBranch(hud, b));
  return (
    <div class="tab-body training">
      <JumpChips
        prefix="train"
        items={[{ key: 'dog', label: dogNameOf(hud.profile) }, { key: 'drills', label: 'Drills' }, ...shown.map((b) => ({ key: b, label: BRANCHES[b].name }))]}
      />
      <DogCard hud={hud} controls={controls} notation={notation} />
      <Drills hud={hud} controls={controls} notation={notation} />
      {hud.training.effects.length > 0 && (
        <p class="training__sum">
          <strong>Your crew so far:</strong> {hud.training.effects.join(' · ')}
        </p>
      )}
      {shown.map((b) => <Branch id={b} hud={hud} controls={controls} notation={notation} />)}
    </div>
  );
}

function showBranch(hud: HudSnapshot, id: BranchId): boolean {
  const skills = hud.training.skills.filter((k) => TRAINING[k.id].branch === id);
  return !skills.every((k) => k.status === 'needsLodge' && TRAINING[k.id].lodge > hud.lodge.level + 1);
}

function DogCard({ hud, controls, notation }: { hud: HudSnapshot; controls: GameControls; notation: Notation }) {
  const d = hud.dog;
  const n = d.next;
  const name = dogNameOf(hud.profile);
  const learned = d.skills.filter((k) => k.has);
  const coming = d.skills.filter((k) => !k.has);
  return (
    <section id="train-dog" class="jump-target" aria-label={`${name}, your retriever`}>
      <h4 class="group-head">{name}, your retriever</h4>
      <ul class="up-list">
        <Row
          pic={<img src={dogPortrait()} alt="" />}
          title={name}
          tag={`Lv ${d.level}/${d.max}`}
          sub={n ? `Fetch birds by hand: ${formatNumber(Math.min(n.haveFetches, n.fetches), notation)}/${formatNumber(n.fetches, notation)}` : "A champion. There's nothing left to teach."}
          extra={n && <span class="guest__bar"><span style={{ width: `${Math.round(Math.min(1, n.haveFetches / Math.max(1, n.fetches)) * 100)}%` }} /></span>}
          right={
            n ? (
              <BuyButton price={{ coins: new Decimal(0), feathers: new Decimal(n.feathers) }} notation={notation} affordable={n.affordable} label={`Train to level ${n.level}`} onBuy={() => controls.trainDog()} />
            ) : (
              <RowNote done>Champion</RowNote>
            )
          }
        />
        {coming.slice(0, 1).map((k) => <Row cls="is-locked" tag={`Lv ${k.level}`} title={k.name} sub={k.desc} />)}
      </ul>
      <Finished count={coming.length - 1} label="Later">
        {coming.slice(1).map((k) => <Row cls="is-locked" tag={`Lv ${k.level}`} title={k.name} sub={k.desc} />)}
      </Finished>
      <Finished count={learned.length} label="Learned">
        {learned.map((k) => <Row cls="is-maxed" tag={`Lv ${k.level}`} title={k.name} sub={k.desc} right={<RowNote done>✓</RowNote>} />)}
      </Finished>
    </section>
  );
}

/** Drills: one row per kind of bot you own. */
function Drills({ hud, controls, notation }: { hud: HudSnapshot; controls: GameControls; notation: Notation }) {
  const owned = WORKSHOP_ORDER.filter((id) => hud.bots[id].owned > 0);
  if (owned.length === 0) return null;
  return (
    <section id="train-drills" class="jump-target" aria-label="Drills">
      <h4 class="group-head">Drills</h4>
      <p class="card__hint">Each drill makes one kind of bot faster for the rest of the season. Skills below are kept for good.</p>
      <ul class="up-list">
        {owned.map((id) => {
          const b = hud.bots[id];
          return (
            <Row
              pic={<img src={portrait(id)} alt="" />}
              title={BOTS[id].name}
              tag={`Lv ${b.level}`}
              sub={`${CREW_TITLE[crewOf(id)].replace(' crew', '')} · +${Math.round(BOTS[id].levelSpeedBonus * 100)}% speed a drill`}
              right={<BuyButton price={b.levelPrice} notation={notation} affordable={b.levelAffordable} label={`Drill the ${BOTS[id].name}s`} onBuy={() => controls.levelUp(id)} />}
            />
          );
        })}
      </ul>
    </section>
  );
}

function Branch({ id, hud, controls, notation }: { id: BranchId; hud: HudSnapshot; controls: GameControls; notation: Notation }) {
  const skills = hud.training.skills.filter((k) => TRAINING[k.id].branch === id);
  const learned = skills.filter((k) => k.status === 'learned');
  const ready = skills.filter((k) => k.status === 'ready');
  const locked = skills.filter((k) => k.status !== 'learned' && k.status !== 'ready');
  // Ready skills, then the next locked one; anything further along folds away.
  const rest = [...ready, ...locked.slice(0, ready.length ? 0 : 1)];
  const later = locked.slice(ready.length ? 0 : 1);
  const row = (k: (typeof skills)[number]) => {
    const d = TRAINING[k.id];
    return (
      <Row
        cls={k.status === 'learned' ? 'is-maxed' : k.status === 'ready' ? '' : 'is-locked'}
        title={d.name}
        sub={d.desc}
        right={
          k.status === 'ready' ? (
            <BuyButton price={{ coins: new Decimal(d.coins), feathers: new Decimal(d.feathers) }} notation={notation} affordable={k.affordable} label={`Learn ${d.name}`} onBuy={() => controls.buyTraining(k.id)} />
          ) : k.status === 'learned' ? (
            <RowNote done>✓</RowNote>
          ) : k.status === 'needsLodge' ? (
            <RowNote>{LODGE_LEVELS[d.lodge - 1]?.name ?? `Lodge ${d.lodge}`}</RowNote>
          ) : (
            <RowNote>After {TRAINING[d.requires!].name}</RowNote>
          )
        }
      />
    );
  };
  return (
    <section id={`train-${id}`} class="jump-target" aria-label={BRANCHES[id].name}>
      <h4 class="group-head">{BRANCHES[id].name}</h4>
      <p class="card__hint">{BRANCHES[id].blurb}</p>
      <ul class="up-list">{rest.map(row)}</ul>
      <Finished count={later.length} label="Later">{later.map(row)}</Finished>
      <Finished count={learned.length} label="Learned">{learned.map(row)}</Finished>
    </section>
  );
}
