import { useState } from 'preact/hooks';
import { BOT_ORDER, BOTS, type BotId } from '../../data/economy';
import { botPrice } from '../../sim/economy';
import { formatRate, type Notation } from '../../util/format';
import type { GameControls } from '../controls';
import type { HudSnapshot, RungSnapshot } from '../hudState';
import { ReqBar } from './Lodge';
import { Cost } from './Cost';
import { portrait } from '../portraits';
import { feedback } from '../feedback';
import { audio } from '../../audio/AudioEngine';

type BuyMode = 1 | 10 | 'max';

export function BotsTab({ hud, controls, notation }: { hud: HudSnapshot; controls: GameControls; notation: Notation }) {
  const [mode, setMode] = useState<BuyMode>(1);
  return (
    <div class="tab-body">
      <div class="tab-head">
        <h3>The Workshop</h3>
        <div class="seg" role="group" aria-label="How many to buy">
          {([1, 10, 'max'] as BuyMode[]).map((m) => (
            <button class={`seg__btn ${mode === m ? 'is-on' : ''}`} onClick={() => setMode(m)}>
              {m === 'max' ? 'Max' : `×${m}`}
            </button>
          ))}
        </div>
      </div>
      {BOT_ORDER.map((id) => (
        <BotCard id={id} hud={hud} controls={controls} notation={notation} mode={mode} />
      ))}
    </div>
  );
}

function BotCard({ id, hud, controls, notation, mode }: { id: BotId; hud: HudSnapshot; controls: GameControls; notation: Notation; mode: BuyMode }) {
  const def = BOTS[id];
  const b = hud.bots[id];
  const plan = hud.plans[id];
  if (!plan.earned) {
    return (
      <div class="bot-card is-locked">
        <div class="bot-card__portrait" aria-hidden="true">
          <img class={`bot-portrait bot-portrait--${id} is-sketch`} src={portrait(id)} alt="" />
        </div>
        <div class="bot-card__info">
          <h4>{def.name} <span class="bot-card__lvl">Plans</span></h4>
          <p>{def.blurb}</p>
          {plan.open ? (
            <>
              <p class="plan-note">Earn the plans by doing the work yourself:</p>
              <ReqBar r={plan.req} notation={notation} />
            </>
          ) : (
            <p class="plan-note">The plans open with the {plan.lodgeName}.</p>
          )}
        </div>
      </div>
    );
  }
  const count = mode === 'max' ? Math.max(1, b.maxAffordable) : mode;
  const price = count === 1 ? b.price : botPrice(id, b.owned, count);
  const affordable = mode === 'max' ? b.maxAffordable > 0 : count === 1 ? b.affordable : b.maxAffordable >= count;
  const ms = b.nextMilestone;
  const prevMs = [0, 10, 25, 50, 100, 200].filter((m) => m <= b.owned).pop() ?? 0;
  const msPct = ms ? ((b.owned - prevMs) / (ms - prevMs)) * 100 : 100;
  return (
    <div class={`bot-card bot-card--${id}`}>
      <div class="bot-card__portrait" aria-hidden="true">
        <img class={`bot-portrait bot-portrait--${id}`} src={portrait(id)} alt="" />
        <span class="bot-card__owned">{b.owned}</span>
      </div>
      <div class="bot-card__info">
        <h4>
          {def.name} <span class="bot-card__lvl">Lv {b.level}</span>
        </h4>
        <p>{def.blurb}</p>
        <dl class="stats">
          {id !== 'foreman' && <div><dt>Speed</dt><dd>{formatRate(b.unitSpeed)} each</dd></div>}
          {id !== 'foreman' && <div><dt>Working</dt><dd>{formatRate(b.rate)}</dd></div>}
          {id === 'foreman' && <div><dt>Handles</dt><dd>{Math.max(1, Math.floor(b.unitSpeed * b.multiplier))} at a time each</dd></div>}
          <div><dt>Reliability</dt><dd>{(b.reliability * 100).toFixed(1)}%</dd></div>
          {b.stuck > 0 && <div class="is-hot"><dt>Stuck</dt><dd>{b.stuck}</dd></div>}
          {b.bench > 0 && <div><dt>Resting</dt><dd>{b.bench}</dd></div>}
        </dl>
        {ms && (
          <div class="milestone" title={`At ${ms} owned, output doubles`}>
            <div class="milestone__bar"><span style={{ width: `${msPct}%` }} /></div>
            <span class="milestone__label">
              {b.owned}/{ms} → ×{b.multiplier * 2} output
            </span>
          </div>
        )}
        <div class="btn-row">
          <button
            class="btn btn--primary btn--buy"
            aria-disabled={!affordable}
            onClick={(e) => {
              const ok = controls.buyBot(id, count) > 0;
              pulse(e.currentTarget as HTMLElement, ok);
            }}
          >
            <span>Carve {count > 1 ? `×${count}` : ''}</span>
            <Cost price={price} notation={notation} />
          </button>
          {b.owned > 0 && (
            <button
              class="btn btn--buy"
              aria-disabled={!b.levelAffordable}
              onClick={(e) => pulse(e.currentTarget as HTMLElement, controls.levelUp(id))}
              title={`+${Math.round(def.levelSpeedBonus * 100)}% speed`}
            >
              <span>Tune up</span>
              <Cost price={b.levelPrice} notation={notation} />
            </button>
          )}
        </div>
        {hud.ladder[id].length > 0 && <Ladder rungs={hud.ladder[id]} owned={b.owned} controls={controls} notation={notation} />}
      </div>
    </div>
  );
}

/** The automation ladder for one kind of bot: built rungs, the next one, and what's above. */
function Ladder({ rungs, owned, controls, notation }: { rungs: RungSnapshot[]; owned: number; controls: GameControls; notation: Notation }) {
  const next = rungs.find((r) => !r.built);
  return (
    <div class="ladder" aria-label="Automation ladder">
      <span class="ladder__title">Automation ladder</span>
      <ol class="ladder__rungs">
        <li class={`rung ${owned > 0 ? 'is-built' : ''}`}>
          <span class="rung__tick" aria-hidden="true">{owned > 0 ? '✓' : '1'}</span>
          <span class="rung__name">The first bot</span>
        </li>
        {rungs.map((r) => (
          <li class={`rung ${r.built ? 'is-built' : r === next ? 'is-next' : 'is-later'}`}>
            <span class="rung__tick" aria-hidden="true">{r.built ? '✓' : r.tier}</span>
            <span class="rung__name">{r.name}</span>
            <span class="rung__effect">{r.effect}</span>
            {r === next && (
              <div class="rung__next">
                <p>{r.blurb}</p>
                <div class="reqs">
                  {r.reqs.map((q) => <ReqBar r={q} notation={notation} />)}
                </div>
                <button
                  class="btn btn--primary btn--buy"
                  aria-disabled={!r.affordable}
                  onClick={(e) => pulse(e.currentTarget as HTMLElement, controls.buyRung(r.id))}
                >
                  <span>{r.ready ? 'Build it' : 'Not ready yet'}</span>
                  <Cost price={r.price} notation={notation} />
                </button>
              </div>
            )}
          </li>
        ))}
      </ol>
    </div>
  );
}

export function pulse(el: HTMLElement, ok: boolean): void {
  el.classList.remove('is-pressed', 'is-nope');
  void el.offsetWidth;
  el.classList.add(ok ? 'is-pressed' : 'is-nope');
  if (ok && (el.classList.contains('btn--buy') || el.classList.contains('perk'))) {
    feedback.sparkle(el);
    audio.play('buy');
  }
  if (!ok) audio.play('nope');
}
