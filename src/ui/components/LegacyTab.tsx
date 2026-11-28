import { useState } from 'preact/hooks';
import { FLYWAYS, type FlywayId } from '../../data/flyways';
import { BRANCH_INFO, PERKS, PRESTIGE } from '../../data/legacy';
import { SPECIES } from '../../data/species';
import { formatNumber, type Notation } from '../../util/format';
import type { GameControls } from '../controls';
import type { HudSnapshot } from '../hudState';
import { pulse } from './BotsTab';
import { Finished, JumpChips, Row, RowNote, StarButton } from './Kit';

export function LegacyTab({ hud, controls, notation }: { hud: HudSnapshot; controls: GameControls; notation: Notation }) {
  const [confirming, setConfirming] = useState(false);
  const se = hud.season;
  const lg = hud.legacy;
  return (
    <div class="tab-body legacy-tab">
      <JumpChips
        prefix="legacy"
        items={[{ key: 'season', label: 'Season' }, ...lg.branches.map((b) => ({ key: b.id, label: BRANCH_INFO[b.id].name.replace(' branch', '') })), { key: 'map', label: 'Map' }]}
      />
      <section id="legacy-season" class="season-card jump-target">
        <div class="season-card__head">
          <div>
            <span class="goal__tag">Season {se.number}</span>
            <h3>{FLYWAYS[se.flyway].name}</h3>
          </div>
          <div class="star-badge" title="Flyway Stars you'd earn by closing now">
            <span>★</span>
            <strong>{se.starsNow}</strong>
          </div>
        </div>
        <p class="card__hint">
          Coins this season: <strong>{formatNumber(se.coins, notation)}</strong>. Next star at {formatNumber(se.nextStarAt, notation)}.
        </p>
        <div class="milestone">
          <div class="milestone__bar"><span style={{ width: `${Math.round(se.progress * 100)}%` }} /></div>
          <span class="milestone__label">{Math.round(se.progress * 100)}%</span>
        </div>
        <button
          class="btn btn--primary season-card__close"
          aria-disabled={se.starsNow < 1}
          onClick={(e) => (se.starsNow >= 1 ? setConfirming(true) : pulse(e.currentTarget as HTMLElement, false))}
        >
          {se.starsNow >= 1 ? `Close the Season (+${se.starsNow} ★)` : `Close the Season at ${formatNumber(PRESTIGE.divisor, notation)} season coins`}
        </button>
        <ClosePreviewCard hud={hud} />
      </section>

      <section class="legacy-head">
        <div><strong>★ {lg.stars}</strong><span>to spend</span></div>
        <div><strong>{lg.earned}</strong><span>earned in all</span></div>
        <div><strong>+{Math.round(lg.bonus * 100)}%</strong><span>coins & feathers</span></div>
      </section>
      <RespecRow hud={hud} controls={controls} />

      {lg.branches.map((b) => {
        const info = BRANCH_INFO[b.id];
        const perks = lg.perks.filter((p) => PERKS[p.id].branch === b.id).sort((x, y) => PERKS[x.id].tier - PERKS[y.id].tier);
        const done = perks.filter((p) => p.rank >= p.maxRank);
        const open = b.id === 'lodge' || b.open;
        const notDone = perks.filter((p) => p.rank < p.maxRank);
        // What you can buy now, plus the next locked step; the rest of the chain folds away.
        const buyable = notDone.filter((p) => open && p.prereqsMet);
        const locked = notDone.filter((p) => !(open && p.prereqsMet));
        const rest = [...buyable, ...locked.slice(0, 1)];
        const later = locked.slice(1);
        return (
          <section id={`legacy-${b.id}`} class="jump-target" aria-label={info.name}>
            <h4 class="group-head">{info.name}</h4>
            <p class="card__hint">{open ? info.blurb : `Hunt the ${FLYWAYS[b.id as FlywayId].name} to open this branch.`}</p>
            {b.id !== 'lodge' && <Mastery m={lg.mastery[b.id as FlywayId]} notation={notation} />}
            <ul class="up-list">{rest.map((p) => <PerkRowView p={p} open={open} controls={controls} />)}</ul>
            <Finished count={later.length} label="Later">{later.map((p) => <PerkRowView p={p} open={open} controls={controls} />)}</Finished>
            <Finished count={done.length} label="Owned">{done.map((p) => <PerkRowView p={p} open={open} controls={controls} />)}</Finished>
          </section>
        );
      })}

      <section id="legacy-map" class="card jump-target">
        <h3>Flyway map</h3>
        <ol class="flyway-map">
          {hud.flyways.map((f) => (
            <li class={`flyway flyway--${f.status}`}>
              <strong>{FLYWAYS[f.id].name}</strong>
              <span>{FLYWAYS[f.id].blurb}</span>
              <em>
                {f.status === 'current' ? 'You are here' : f.status === 'next' ? 'Next season' : f.status === 'visited' ? 'Visited' : f.status === 'soon' ? 'Coming in a future update' : 'Locked'}
              </em>
              {f.status !== 'soon' && <span class="flyway__twist">{FLYWAYS[f.id].twist}</span>}
            </li>
          ))}
        </ol>
      </section>

      {confirming && <CloseSeasonDialog hud={hud} controls={controls} onClose={() => setConfirming(false)} />}
    </div>
  );
}

/** What you'd get for closing now: stars, a bigger bonus, perks and new birds. */
function ClosePreviewCard({ hud }: { hud: HudSnapshot }) {
  const se = hud.season;
  const p = se.preview;
  const nextName = FLYWAYS[se.nextFlyway].name;
  return (
    <div class="close-preview">
      <h4>{se.starsNow >= 1 ? 'Close now and you get' : 'When you close the season'}</h4>
      <ul>
        <li>
          <strong>★ {p.starsAfter}</strong> to spend{se.starsNow >= 1 ? ` (+${se.starsNow} new)` : ''}
        </li>
        <li>
          Coins & feathers <strong>+{Math.round(p.bonusAfter * 100)}%</strong> for good
          {p.bonusAfter > p.bonusNow ? ` (now +${Math.round(p.bonusNow * 100)}%)` : ''}
        </li>
        {p.perks.length > 0 && <li>Perks you could buy: {p.perks.slice(0, 3).map((id) => PERKS[id].name).join(', ')}</li>}
        {se.nextFlyway !== se.flyway && (
          <li>
            A new marsh on the <strong>{nextName}</strong>
            {p.newBirds.length > 0 ? `, with ${p.newBirds.length === 1 ? 'a bird' : `${p.newBirds.length} birds`} you haven't found: ${p.newBirds.slice(0, 4).map((b) => SPECIES[b].name).join(', ')}${p.newBirds.length > 4 ? '…' : ''}` : ''}
          </li>
        )}
      </ul>
    </div>
  );
}

function CloseSeasonDialog({ hud, controls, onClose }: { hud: HudSnapshot; controls: GameControls; onClose: () => void }) {
  const se = hud.season;
  const [dest, setDest] = useState<FlywayId>(se.nextFlyway);
  // The next new flyway first, then any flyway already hunted (to finish its mastery).
  const hunted = hud.legacy.branches.filter((b) => b.id !== 'lodge' && b.open).map((b) => b.id as FlywayId);
  const options: FlywayId[] = [...new Set<FlywayId>([se.nextFlyway, se.flyway, ...hunted])];
  return (
    <div class="away-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div class="away-card" role="dialog" aria-label="Close the season">
        <h3>Close Season {se.number}?</h3>
        <p class="away-card__gus">
          "Good season. We'll hang up the waders, count the stars and start fresh. What we learned stays with us."
          <span>— Ray Collins</span>
        </p>
        <div class="season-summary">
          <div class="season-summary__gain">★ +{se.starsNow} Flyway Stars</div>
          <ClosePreviewCard hud={hud} />
          <div class="season-summary__cols">
            <div>
              <h4>Starts over</h4>
              <ul>
                <li>Coins & feathers</li>
                <li>Bots & their levels</li>
                <li>Marsh upgrades & acres</li>
                <li>Today's birds and problems</li>
              </ul>
            </div>
            <div>
              <h4>You keep</h4>
              <ul>
                <li>Flyway Stars & perks</li>
                <li>+10% coins & feathers per star</li>
                <li>Your lodge and bot plans</li>
                <li>Carved decoys & the Big Volley</li>
                <li>Field Guide & patches</li>
                <li>Crew Training & your retriever</li>
              </ul>
            </div>
          </div>
        </div>
        <fieldset class="flyway-choice">
          <legend>Next season in</legend>
          {options.map((f) => (
            <label class={`flyway-option ${dest === f ? 'is-on' : ''}`} for={`fly-${f}`}>
              <input id={`fly-${f}`} type="radio" name="flyway" checked={dest === f} onChange={() => setDest(f)} />
              <strong>{FLYWAYS[f].name}</strong>
              <span>
                {f === se.flyway ? 'Stay on this marsh' : FLYWAYS[f].twist}
                {hud.legacy.mastery[f] && !hud.legacy.mastery[f]!.mastered && f !== se.nextFlyway ? ` · mastery ${hud.legacy.mastery[f]!.rows.filter((r) => r.cur >= r.goal).length}/4` : ''}
                {hud.legacy.mastery[f]?.mastered ? ' · mastered' : ''}
              </span>
            </label>
          ))}
        </fieldset>
        <div class="btn-row">
          <button class="btn btn--primary" onClick={() => { controls.closeSeason(dest); onClose(); }}>
            Close the Season
          </button>
          <button class="btn" onClick={onClose}>Not yet</button>
        </div>
      </div>
    </div>
  );
}

type PerkRow = HudSnapshot['legacy']['perks'][number];

/** One perk as a row: buy it, or rank it up if it has ranks. */
function PerkRowView({ p, open, controls }: { p: PerkRow; open: boolean; controls: GameControls }) {
  const d = PERKS[p.id];
  const ranked = p.maxRank > 1;
  const maxed = p.rank >= p.maxRank;
  return (
    <Row
      cls={maxed ? 'is-maxed' : !open || !p.prereqsMet ? 'is-locked' : ''}
      title={d.name}
      tag={ranked ? `${p.rank}/${p.maxRank}` : undefined}
      sub={d.desc}
      right={
        maxed ? <RowNote done>{ranked ? 'Max' : 'Owned'}</RowNote>
        : !open ? <RowNote>Locked</RowNote>
        : !p.prereqsMet ? <RowNote>After {d.requires.map((r) => PERKS[r].name).join(', ')}</RowNote>
        : <StarButton cost={p.nextCost} affordable={p.canBuy} label={`Buy ${d.name}`} onBuy={() => controls.buyPerk(p.id)} />
      }
    />
  );
}

/** The free once-a-season refund, with a second tap to confirm. */
function RespecRow({ hud, controls }: { hud: HudSnapshot; controls: GameControls }) {
  const [sure, setSure] = useState(false);
  const r = hud.legacy.respec;
  if (r.stars === 0) return null;
  return (
    <div class="respec">
      <span>{r.can ? 'Want to try a different path? Take back every perk for a full refund, free once a season.' : "You've used this season's free refund. Another comes next season."}</span>
      {r.can && (
        <button
          class={`btn btn--small ${sure ? 'btn--primary' : ''}`}
          onClick={() => {
            if (!sure) return setSure(true);
            controls.respecPerks();
            setSure(false);
          }}
        >
          {sure ? `Tap again: refund ★ ${r.stars}` : `Refund ★ ${r.stars}`}
        </button>
      )}
    </div>
  );
}

/** A flyway's four mastery challenges, as short progress rows. */
function Mastery({ m, notation }: { m: HudSnapshot['legacy']['mastery'][FlywayId]; notation: Notation }) {
  if (!m) return null;
  return (
    <div class={`mastery ${m.mastered ? 'is-mastered' : ''}`}>
      <div class="mastery__head">
        <strong>{m.mastered ? '★ Mastered' : 'Mastery'}</strong>
        <span>{m.mastered ? 'Coins +10% for good' : `${m.rows.filter((r) => r.cur >= r.goal).length} of 4 · coins +10% for good when done`}</span>
      </div>
      <ul>
        {m.rows.map((r) => (
          <li class={r.cur >= r.goal ? 'is-done' : ''}>
            <span class="mastery__tick" aria-hidden="true">{r.cur >= r.goal ? '✓' : ''}</span>
            <span class="mastery__label">{r.label}</span>
            {r.goal > 1 && <span class="mastery__num">{formatNumber(r.cur, notation)}/{formatNumber(r.goal, notation)}</span>}
          </li>
        ))}
      </ul>
    </div>
  );
}
