import { useState } from 'preact/hooks';
import { BOTS, JOB_ORDER, type BotId, type JobId, type Slot } from '../../data/economy';
import { formatRate } from '../../util/format';
import type { GameControls } from '../controls';
import type { HudSnapshot, JobSnapshot } from '../hudState';
import { portrait } from '../portraits';
import { pulse } from './BotsTab';
import { Sparkline } from './Sparkline';

interface Pick {
  bot: BotId;
  from: Slot;
}

function canGo(bot: BotId, to: Slot): boolean {
  if (to === 'bench') return true;
  const d = BOTS[bot];
  return d.job === to || d.crossJobs.includes(to);
}

const TILT = [-1.2, 0.8, -0.4, 1.1, -0.9, 0.5, -0.6, 1];

export function JobBoard({ hud, controls }: { hud: HudSnapshot; controls: GameControls }) {
  const [pick, setPick] = useState<Pick | null>(null);
  const anyBots = Object.values(hud.bots).some((b) => b.owned > 0);

  const drop = (to: Slot, el: HTMLElement) => {
    if (!pick) return;
    const ok = controls.moveBot(pick.bot, pick.from, to);
    pulse(el, ok);
    setPick(null);
  };

  const benchTokens = Object.values(hud.bots).filter((b) => b.bench > 0);

  return (
    <div class="tab-body board-tab">
      <div class="queue-strip" aria-label="Flock queue">
        <QueueItem label="Circling" value={`${hud.incoming}/4`} hot={hud.incoming >= 4} />
        <QueueItem label="In range" value={`${hud.committed}/3`} hot={hud.committed >= 3} />
        <QueueItem label="On the water" value={hud.downed} hot={hud.downed >= 6} />
        <QueueItem label="Unlogged" value={hud.ledger} hot={hud.ledger >= 10} />
        <QueueItem label="Lost today" value={hud.lostToday} hot={false} warn={hud.lostToday > 0} />
      </div>

      {pick ? (
        <div class="pick-banner" role="status">
          <img src={portrait(pick.bot)} alt="" />
          <span>Moving one {BOTS[pick.bot].name}. Tap a job to place it.</span>
          <button class="btn btn--small" onClick={() => setPick(null)}>Cancel</button>
        </div>
      ) : (
        <p class="card__hint board-hint">
          {anyBots
            ? 'Tap a bot token, then tap a job to move it there (or drag it on a computer). Bots work at half speed away from their own job.'
            : 'Carve some bots and they will be pinned to their jobs here.'}
        </p>
      )}

      <div class="board">
        {JOB_ORDER.map((j, i) => (
          <JobCard
            job={hud.jobs[j]}
            tilt={TILT[i % TILT.length]!}
            pick={pick}
            onPick={(bot) => setPick(pick && pick.bot === bot && pick.from === j ? null : { bot, from: j })}
            onDrop={(el) => drop(j, el)}
            onDragPick={(bot) => setPick({ bot, from: j })}
          />
        ))}
        <div
          class={`job-card job-card--bench ${pick ? 'is-target' : ''}`}
          style={{ '--tilt': '0.6deg' }}
          onClick={(e) => pick && drop('bench', e.currentTarget as HTMLElement)}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            drop('bench', e.currentTarget as HTMLElement);
          }}
        >
          <span class="pin" />
          <h4>The Bench</h4>
          <p class="job-card__blurb">Resting bots don't work and don't get stuck.</p>
          <div class="tokens">
            {benchTokens.length === 0 && <span class="tokens__empty">Nobody resting</span>}
            {benchTokens.map((b) => (
              <Token
                bot={b.id}
                count={b.bench}
                stuck={0}
                selected={pick?.bot === b.id && pick.from === 'bench'}
                onPick={() => setPick(pick?.bot === b.id && pick.from === 'bench' ? null : { bot: b.id, from: 'bench' })}
                onDragPick={() => setPick({ bot: b.id, from: 'bench' })}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function QueueItem({ label, value, hot, warn }: { label: string; value: string | number; hot: boolean; warn?: boolean }) {
  return (
    <div class={`queue-item ${hot ? 'is-hot' : ''} ${warn ? 'is-warn' : ''}`}>
      <strong>{value}</strong>
      <span>{label}</span>
    </div>
  );
}

function JobCard({ job, tilt, pick, onPick, onDrop, onDragPick }: {
  job: JobSnapshot;
  tilt: number;
  pick: Pick | null;
  onPick: (bot: BotId) => void;
  onDrop: (el: HTMLElement) => void;
  onDragPick: (bot: BotId) => void;
}) {
  const target = pick && pick.from !== job.id && canGo(pick.bot, job.id as JobId);
  const blocked = pick && !target && pick.from !== job.id;
  return (
    <div
      class={`job-card ${job.backedUp ? 'is-backed-up' : ''} ${target ? 'is-target' : ''} ${blocked ? 'is-blocked' : ''}`}
      style={{ '--tilt': `${tilt}deg` }}
      onClick={(e) => {
        if (target && !(e.target as HTMLElement).closest('.token')) onDrop(e.currentTarget as HTMLElement);
      }}
      onDragOver={(e) => target && e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault();
        if (target) onDrop(e.currentTarget as HTMLElement);
      }}
    >
      <span class="pin" />
      <h4>{job.name}</h4>
      <p class="job-card__blurb">{job.blurb}</p>
      <dl class="job-stats">
        <div><dt>Crew</dt><dd>{formatRate(job.rate)}</dd></div>
        <div><dt>Actual</dt><dd>{formatRate(job.throughput)}</dd></div>
        <div class={job.backedUp ? 'is-hot' : ''}><dt>Queue</dt><dd>{job.queue}</dd></div>
        <div><dt>Success</dt><dd>{Math.round(job.success * 100)}%</dd></div>
      </dl>
      <Sparkline done={job.spark} fails={job.fails} />
      <div class="tokens">
        {job.tokens.length === 0 && <span class="tokens__empty">{job.manual ?? 'No bots yet'}</span>}
        {job.tokens.map((t) => (
          <Token
            bot={t.bot}
            count={t.count}
            stuck={t.stuck}
            selected={pick?.bot === t.bot && pick.from === job.id}
            onPick={() => onPick(t.bot)}
            onDragPick={() => onDragPick(t.bot)}
          />
        ))}
      </div>
    </div>
  );
}

function Token({ bot, count, stuck, selected, onPick, onDragPick }: {
  bot: BotId;
  count: number;
  stuck: number;
  selected: boolean;
  onPick: () => void;
  onDragPick: () => void;
}) {
  return (
    <button
      class={`token ${selected ? 'is-selected' : ''}`}
      draggable
      onDragStart={(e) => {
        e.dataTransfer?.setData('text/plain', bot);
        onDragPick();
      }}
      onClick={(e) => {
        e.stopPropagation();
        onPick();
      }}
      aria-pressed={selected}
      title={`${BOTS[bot].name} × ${count}${stuck ? ` (${stuck} stuck)` : ''}`}
    >
      <img src={portrait(bot)} alt="" />
      <span class="token__count">{count}</span>
      {stuck > 0 && <span class="token__stuck">!{stuck}</span>}
      <span class="sr-only">{BOTS[bot].name}</span>
    </button>
  );
}
