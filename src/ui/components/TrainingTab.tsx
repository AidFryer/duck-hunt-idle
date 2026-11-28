import Decimal from 'break_infinity.js';
import { BOTS, crewOf, WORKSHOP_ORDER, type CrewId } from '../../data/economy';
import { BRANCHES, BRANCH_ORDER, TRAINING, type BranchId } from '../../data/training';
import { dogNameOf } from '../../data/goals';
import { LODGE_LEVELS } from '../../data/progression';
import { formatNumber, type Notation } from '../../util/format';
import type { GameControls } from '../controls';
import type { HudSnapshot } from '../hudState';
import { dogPortrait, portrait } from '../portraits';
import { BuyButton, JumpChips, Path, PathStep, Row, RowNote, SectionHead, type Tone } from './Kit';
import type { IconName } from '../tabs';

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
  return (
    <section id="train-dog" class="dog-card jump-target" aria-label={`${name}, your retriever`}>
      <div class="dog-card__head">
        <div class="dog-card__portrait"><img src={dogPortrait()} alt="" /></div>
        <div class="dog-card__who">
          <strong>{name}</strong>
          <em>Your retriever · level {d.level} of {d.max}</em>
        </div>
      </div>
      <div class="dog-card__next">
        {n ? (
          <>
            <div class="dog-card__need">
              <small>Fetch birds by hand to train: {formatNumber(Math.min(n.haveFetches, n.fetches), notation)}/{formatNumber(n.fetches, notation)}</small>
              <span class="guest__bar"><span style={{ width: `${Math.round(Math.min(1, n.haveFetches / Math.max(1, n.fetches)) * 100)}%` }} /></span>
            </div>
            <BuyButton price={{ coins: new Decimal(0), feathers: new Decimal(n.feathers) }} notation={notation} affordable={n.affordable} label={`Train to level ${n.level}`} onBuy={() => controls.trainDog()} />
          </>
        ) : (
          <RowNote done>A champion. Nothing left to teach.</RowNote>
        )}
      </div>
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

/** Drills: one row per kind of bot you own. */
function Drills({ hud, controls, notation }: { hud: HudSnapshot; controls: GameControls; notation: Notation }) {
  const owned = WORKSHOP_ORDER.filter((id) => hud.bots[id].owned > 0);
  if (owned.length === 0) return null;
  return (
    <section id="train-drills" class="jump-target" aria-label="Drills">
      <SectionHead icon="gear" tone="wood" title="Drills" note="Each drill makes one kind of bot faster for the rest of the season. Skills below are kept for good." />
      <ul class="up-list">
        {owned.map((id) => {
          const b = hud.bots[id];
          return (
            <Row
              pic={<img src={portrait(id)} alt="" />}
              title={BOTS[id].name}
              tag={`Lv ${b.level}`}
              sub={`${SHORT_CREW[crewOf(id)]} · +${Math.round(BOTS[id].levelSpeedBonus * 100)}% speed a drill`}
              right={<BuyButton price={b.levelPrice} notation={notation} affordable={b.levelAffordable} label={`Drill the ${BOTS[id].name}s`} onBuy={() => controls.levelUp(id)} />}
            />
          );
        })}
      </ul>
    </section>
  );
}

const SHORT_CREW: Record<CrewId, string> = { marsh: 'Marsh', timber: 'Timber', field: 'Goose Field', bay: 'Bay', lodge: 'Lodge' };

const BRANCH_ICON: Record<BranchId, [IconName, Tone]> = {
  teamwork: ['rope', 'wood'], callers: ['wind', 'marsh'], blinds: ['star', 'rust'], retrievers: ['drop', 'bay'], ledger: ['book', 'gold'], field: ['sun', 'field'],
};

function Branch({ id, hud, controls, notation }: { id: BranchId; hud: HudSnapshot; controls: GameControls; notation: Notation }) {
  const skills = hud.training.skills.filter((k) => TRAINING[k.id].branch === id);
  let nextShown = false;
  return (
    <section id={`train-${id}`} class="jump-target" aria-label={BRANCHES[id].name}>
      <SectionHead icon={BRANCH_ICON[id][0]} tone={BRANCH_ICON[id][1]} title={BRANCHES[id].name} note={BRANCHES[id].blurb} />
      <Path>
        {skills.map((k) => {
          const d = TRAINING[k.id];
          if (k.status === 'learned') return <PathStep state="done" title={d.name} />;
          if (k.status === 'ready') {
            nextShown = true;
            return (
              <PathStep
                state="ready"
                title={d.name}
                sub={d.desc}
                right={<BuyButton price={{ coins: new Decimal(d.coins), feathers: new Decimal(d.feathers) }} notation={notation} affordable={k.affordable} label={`Learn ${d.name}`} onBuy={() => controls.buyTraining(k.id)} />}
              />
            );
          }
          const why = k.status === 'needsLodge' ? LODGE_LEVELS[d.lodge - 1]?.name ?? `Lodge ${d.lodge}` : `After ${TRAINING[d.requires!].name}`;
          const state = nextShown ? 'later' : 'next';
          nextShown = true;
          return <PathStep state={state} title={d.name} sub={d.desc} right={<RowNote>{why}</RowNote>} />;
        })}
      </Path>
    </section>
  );
}
