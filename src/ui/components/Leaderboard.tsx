import { useEffect, useState } from 'preact/hooks';
import type { BoardRow, BoardSort } from '../../app/online';
import { LODGE_LEVELS } from '../../data/progression';
import { formatNumber, type Notation } from '../../util/format';
import type { GameControls } from '../controls';

const SORTS: { id: BoardSort; label: string }[] = [
  { id: 'week', label: 'This week' },
  { id: 'birds', label: 'All time' },
  { id: 'lodge', label: 'Biggest lodge' },
  { id: 'stars', label: 'Most stars' },
];

const lodgeName = (n: number) => LODGE_LEVELS[n - 1]?.name ?? `Lodge ${n}`;

/** The online leaderboard: top hunters, your own spot, and a way to join. */
export function Leaderboard({ controls, notation }: { controls: GameControls; notation: Notation }) {
  const [sort, setSort] = useState<BoardSort>('week');
  const [rows, setRows] = useState<BoardRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState(controls.onlineStatus());
  const [draft, setDraft] = useState(status.takenName ? '' : status.name);
  const [joinErr, setJoinErr] = useState<string | null>(status.takenName ? `Someone already has "${status.takenName}". Pick another name.` : null);
  const [busy, setBusy] = useState(false);

  const load = async (s: BoardSort) => {
    setError(null);
    const r = await controls.fetchBoard(s);
    if (r.ok) setRows(r.rows);
    else setError(r.error);
  };
  useEffect(() => {
    setRows(null);
    void load(sort);
  }, [sort]);

  const join = async () => {
    if (!draft.trim()) return setJoinErr('Pick a name first.');
    setBusy(true);
    const e = await controls.claimName(draft);
    setBusy(false);
    setJoinErr(e);
    setStatus(controls.onlineStatus());
    if (!e) void load(sort);
  };

  const value = (r: BoardRow) =>
    sort === 'week' ? `${formatNumber(r.week_birds ?? 0, notation)} birds` : sort === 'lodge' ? lodgeName(r.lodge) : sort === 'stars' ? `${r.stars} ★` : `${formatNumber(r.birds, notation)} birds`;
  const detail = (r: BoardRow) =>
    sort === 'week' ? `${lodgeName(r.lodge)} · ${formatNumber(r.birds, notation)} all time` : sort === 'birds' ? `${lodgeName(r.lodge)} · ${r.species} kinds` : `${formatNumber(r.birds, notation)} birds · ${r.species} kinds`;
  const top = rows?.filter((r) => r.rank <= 50) ?? [];
  const mine = rows?.find((r) => r.is_me && r.rank > 50);

  return (
    <div class="lb">
      {!status.joined && (
        <section class="lb-join">
          <h4>Join the leaderboard</h4>
          <p>Pick a name that's yours alone. It shows here with your lodge and birds.</p>
          <div class="lb-join__row">
            <input
              type="text"
              maxLength={18}
              placeholder="Your name"
              value={draft}
              onInput={(e) => {
                setDraft((e.currentTarget as HTMLInputElement).value);
                setJoinErr(null);
              }}
              onKeyDown={(e) => e.key === 'Enter' && void join()}
            />
            <button class="btn btn--primary btn--small" aria-disabled={busy} onClick={() => !busy && void join()}>
              {busy ? 'Checking…' : 'Join'}
            </button>
          </div>
          {joinErr && <p class="name-note is-bad">{joinErr}</p>}
        </section>
      )}
      <div class="seg lb__sorts" role="group" aria-label="Rank by">
        {SORTS.map((s) => (
          <button class={`seg__btn ${sort === s.id ? 'is-on' : ''}`} onClick={() => setSort(s.id)}>{s.label}</button>
        ))}
      </div>
      {sort === 'week' && <p class="lb__hint">Birds brought in since Monday. Everyone starts even each week.</p>}
      {error ? (
        <p class="lb__note">
          {error} <button class="btn btn--small" onClick={() => void load(sort)}>Try again</button>
        </p>
      ) : !rows ? (
        <p class="lb__note">Checking the board…</p>
      ) : rows.length === 0 ? (
        <p class="lb__note">Nobody's on the board yet. You could be first.</p>
      ) : sort === 'week' && rows.every((r) => !r.week_birds) ? (
        <p class="lb__note">A fresh week: nobody's brought in a bird yet. It starts over every Monday.</p>
      ) : (
        <ol class="lb__list">
          {top.map((r) => <Row r={r} value={value(r)} detail={detail(r)} />)}
          {mine && (
            <>
              <li class="lb__gap" aria-hidden="true">⋯</li>
              <Row r={mine} value={value(mine)} detail={detail(mine)} />
            </>
          )}
        </ol>
      )}
    </div>
  );
}

function Row({ r, value, detail }: { r: BoardRow; value: string; detail: string }) {
  return (
    <li class={`lb__row ${r.is_me ? 'is-me' : ''} ${r.rank <= 3 ? `is-top is-top${r.rank}` : ''}`}>
      <span class="lb__rank">{r.rank}</span>
      <span class="lb__who">
        <strong>{r.name}{r.is_me ? ' (you)' : ''}</strong>
        <span>{detail}</span>
      </span>
      <span class="lb__value">{value}</span>
    </li>
  );
}
