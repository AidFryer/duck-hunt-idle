import { adminGetSave, adminPlayers, adminRemovePlayer, adminSetHidden, failureText, onlineEnabled, type AdminRow } from '../app/online';
import { LODGE_LEVELS } from '../data/progression';
import { formatNumber } from '../util/format';
import './dev.css';

/**
 * The owner's page: everyone's progress on the online board. Needs the admin
 * password set in supabase/leaderboard.sql. Not linked from the game.
 */
const KEY = 'duck-hunt-idle.devPassword';
const root = document.getElementById('dev')!;
type Sort = 'seen' | 'week' | 'birds' | 'joined';
let sort: Sort = 'seen';
let rows: AdminRow[] = [];

const esc = (t: string) => t.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
const lodgeName = (n: number) => LODGE_LEVELS[n - 1]?.name ?? `Lodge ${n}`;
function ago(iso: string): string {
  const s = (Date.now() - new Date(iso).getTime()) / 1000;
  if (s < 90) return 'just now';
  if (s < 3600) return `${Math.round(s / 60)} min ago`;
  if (s < 86400 * 2) return `${Math.round(s / 3600)} h ago`;
  return `${Math.round(s / 86400)} days ago`;
}
const day = (iso: string) => new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });

function getSaved(): string {
  try {
    return localStorage.getItem(KEY) ?? '';
  } catch {
    return '';
  }
}

function login(msg = ''): void {
  root.innerHTML = `
    <h1>Players</h1>
    <form class="card login">
      <label for="pw">Admin password</label>
      <input id="pw" type="password" autocomplete="current-password" />
      <button class="btn" type="submit">Show players</button>
      ${msg ? `<p class="bad">${esc(msg)}</p>` : ''}
    </form>`;
  const form = root.querySelector('form')!;
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    void load((root.querySelector('#pw') as HTMLInputElement).value);
  });
}

async function load(pw: string): Promise<void> {
  if (!onlineEnabled()) {
    root.innerHTML = '<h1>Players</h1><p class="card">The leaderboard isn\'t connected yet (no Supabase address in src/config.ts).</p>';
    return;
  }
  root.innerHTML = '<h1>Players</h1><p class="note">Loading…</p>';
  try {
    rows = await adminPlayers(pw);
    try {
      localStorage.setItem(KEY, pw);
    } catch {
      /* fine */
    }
    draw();
  } catch (e) {
    login(failureText(e));
  }
}

function draw(): void {
  const now = Date.now();
  const within = (h: number) => rows.filter((r) => now - new Date(r.last_seen).getTime() < h * 3600_000).length;
  const sorted = [...rows].sort((a, b) =>
    sort === 'week' ? (b.week_birds ?? 0) - (a.week_birds ?? 0) : sort === 'birds' ? b.birds - a.birds : sort === 'joined' ? b.created_at.localeCompare(a.created_at) : b.last_seen.localeCompare(a.last_seen),
  );
  root.innerHTML = `
    <h1>Players</h1>
    <section class="stats">
      <div class="card"><strong>${rows.length}</strong><span>players</span></div>
      <div class="card"><strong>${within(24)}</strong><span>played today</span></div>
      <div class="card"><strong>${within(24 * 7)}</strong><span>this week</span></div>
    </section>
    <div class="bar">
      <div class="seg">
        ${(['seen', 'week', 'birds', 'joined'] as Sort[]).map((s) => `<button data-sort="${s}" class="${s === sort ? 'on' : ''}">${s === 'seen' ? 'Last played' : s === 'week' ? 'This week' : s === 'birds' ? 'Most birds' : 'Newest'}</button>`).join('')}
      </div>
      <button class="btn small" id="refresh">Refresh</button>
    </div>
    <ul class="list">
      ${sorted.map((r) => `
        <li class="card player ${r.hidden ? 'is-hidden' : ''}">
          <div class="top"><strong>${esc(r.name)}${r.hidden ? ' <em class="tag">Hidden</em>' : ''}</strong><span>${ago(r.last_seen)}</span></div>
          <div class="line">${esc(lodgeName(r.lodge))} · ${formatNumber(r.birds, 'letters')} birds · ${r.species} kinds${r.stars ? ` · ${r.stars} ★` : ''}</div>
          <div class="line dim">Day ${r.day} · ${r.play_hours.toFixed(1)} h played · ${formatNumber(r.coins, 'letters')} coins${r.seasons ? ` · ${r.seasons} seasons` : ''}</div>
          <div class="line dim">This week: ${formatNumber(r.week_birds ?? 0, 'letters')} birds · Joined ${day(r.created_at)}${r.flyway ? ` · ${esc(r.flyway)} flyway` : ''}${r.build ? ` · v ${esc(r.build)}` : ''}</div>
          <div class="line dim">${r.saved_at ? `Cloud save: ${ago(r.saved_at)}` : 'No cloud save yet'}</div>
          <div class="tools">
            ${r.saved_at ? `<button class="btn small soft" data-save="${r.id}">Copy save code</button>` : ''}
            <button class="btn small soft" data-hide="${r.id}" data-to="${r.hidden ? '0' : '1'}">${r.hidden ? 'Show on board' : 'Hide from board'}</button>
            <button class="btn small soft danger" data-remove="${r.id}" data-name="${esc(r.name)}">Remove</button>
          </div>
        </li>`).join('') || '<li class="note">No players yet.</li>'}
    </ul>
    <p class="note"><button class="link" id="logout">Forget password on this device</button></p>`;
  root.querySelectorAll<HTMLButtonElement>('[data-sort]').forEach((b) =>
    b.addEventListener('click', () => {
      sort = b.dataset.sort as Sort;
      draw();
    }),
  );
  root.querySelector('#refresh')!.addEventListener('click', () => void load(getSaved()));
  root.querySelectorAll<HTMLButtonElement>('[data-hide]').forEach((b) =>
    b.addEventListener('click', async () => {
      b.disabled = true;
      try {
        await adminSetHidden(getSaved(), b.dataset.hide!, b.dataset.to === '1');
        await load(getSaved());
      } catch (e) {
        alert(failureText(e));
        b.disabled = false;
      }
    }),
  );
  root.querySelectorAll<HTMLButtonElement>('[data-save]').forEach((b) =>
    b.addEventListener('click', async () => {
      b.disabled = true;
      try {
        const code = await adminGetSave(getSaved(), b.dataset.save!);
        if (!code) throw new Error('none');
        try {
          await navigator.clipboard.writeText(code);
          b.textContent = 'Copied';
        } catch {
          prompt('Copy this save code:', code);
        }
      } catch (e) {
        alert(e instanceof Error && e.message === 'none' ? 'No cloud save for this player yet.' : failureText(e));
      }
      b.disabled = false;
    }),
  );
  root.querySelectorAll<HTMLButtonElement>('[data-remove]').forEach((b) =>
    b.addEventListener('click', async () => {
      if (!confirm(`Remove ${b.dataset.name} from the leaderboard for good? Their name becomes free. If they play again, they'll join again.`)) return;
      b.disabled = true;
      try {
        await adminRemovePlayer(getSaved(), b.dataset.remove!);
        await load(getSaved());
      } catch (e) {
        alert(failureText(e));
        b.disabled = false;
      }
    }),
  );
  root.querySelector('#logout')!.addEventListener('click', () => {
    try {
      localStorage.removeItem(KEY);
    } catch {
      /* fine */
    }
    login();
  });
}

const saved = getSaved();
if (saved) void load(saved);
else login();
