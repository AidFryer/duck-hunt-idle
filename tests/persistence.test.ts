import { beforeEach, describe, expect, it } from 'vitest';
import { BACKUP_SLOTS, backupNow, listBackups, loadGame, saveGame } from '../src/app/persistence';
import { SAVE_KEY } from '../src/config';
import { createInitialState } from '../src/sim/state';
import { deserialize, serialize } from '../src/sim/save';

function memoryStorage(): Storage {
  const m = new Map<string, string>();
  return {
    get length() { return m.size; },
    clear: () => m.clear(),
    getItem: (k) => m.get(k) ?? null,
    key: (i) => [...m.keys()][i] ?? null,
    removeItem: (k) => void m.delete(k),
    setItem: (k, v) => void m.set(k, String(v)),
  };
}

function played(birds: number, name = 'Fry') {
  const s = createInitialState(1, 0);
  s.stats.lifetimeBirds = birds;
  s.profile.name = name;
  return s;
}

describe('saves and backups', () => {
  beforeEach(() => {
    (globalThis as { localStorage?: Storage }).localStorage = memoryStorage();
  });

  it('round-trips a save', () => {
    saveGame(played(42), 1000);
    const r = loadGame();
    expect(r.kind).toBe('loaded');
    if (r.kind === 'loaded') expect(r.state.profile.name).toBe('Fry');
  });

  it('keeps a backup, at most one every 10 minutes', () => {
    saveGame(played(10), 0);
    saveGame(played(11), 60_000);
    expect(listBackups()).toHaveLength(1);
    saveGame(played(12), 11 * 60_000);
    expect(listBackups().map((b) => b.birds)).toEqual([12, 10]);
  });

  it('skips backing up an empty new game', () => {
    backupNow(played(0), 'auto', 5);
    expect(listBackups()).toHaveLength(0);
  });

  it('keeps the furthest-along save even when newer ones push it out', () => {
    backupNow(played(5000), 'reset', 1);
    for (let i = 0; i < BACKUP_SLOTS + 2; i++) backupNow(played(i + 1, 'New'), 'auto', 10 + i);
    const list = listBackups();
    expect(list).toHaveLength(BACKUP_SLOTS);
    expect(list.some((b) => b.birds === 5000)).toBe(true);
  });

  it('loads the newest backup when the main save is missing or damaged', () => {
    backupNow(played(77), 'auto', 1);
    expect(loadGame().kind).toBe('loaded');
    localStorage.setItem(SAVE_KEY, '{not json');
    const r = loadGame();
    expect(r.kind).toBe('loaded');
    if (r.kind === 'loaded') expect(r.state.stats.lifetimeBirds).toBe(77);
  });

  it('starts everyone fresh from an old save, keeping it as a backup', () => {
    const old = JSON.parse(serialize(played(500)));
    old.v = 18;
    old.s.version = 18;
    localStorage.setItem(SAVE_KEY, JSON.stringify(old));
    expect(loadGame().kind).toBe('restart');
    expect(localStorage.getItem(SAVE_KEY)).toBeNull();
    const kept = listBackups()[0]!;
    expect(kept.birds).toBe(500);
    // The old lodge is never picked up automatically...
    expect(loadGame().kind).toBe('none');
    // ...but it still restores by hand.
    expect(deserialize(kept.raw).stats.lifetimeBirds).toBe(500);
  });
});
