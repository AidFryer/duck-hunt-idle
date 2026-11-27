/**
 * Save files: back the game up to iCloud Drive / Files (or any folder) and
 * load it back on any device. No accounts: the file holds a save code.
 */
const LAST_KEY = 'duck-hunt-idle.lastFileBackup';
/** Nudge for a fresh backup after this long. */
export const BACKUP_NUDGE_MS = 3 * 24 * 3600 * 1000;

export function lastFileBackup(): number {
  try {
    return Number(localStorage.getItem(LAST_KEY) ?? 0) || 0;
  } catch {
    return 0;
  }
}

function markBackedUp(): void {
  try {
    localStorage.setItem(LAST_KEY, String(Date.now()));
  } catch {
    /* ignore */
  }
}

function fileName(name: string): string {
  const d = new Date();
  const day = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const who = name.trim().replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '') || 'hunter';
  return `duck-hunt-idle-${who}-${day}.txt`;
}

/**
 * Hand the save file to the share sheet ("Save to Files" → iCloud Drive), or
 * download it where sharing files isn't supported. Returns how it went.
 */
export async function saveBackupFile(code: string, name: string): Promise<'shared' | 'downloaded' | 'cancelled'> {
  const file = new File([code], fileName(name), { type: 'text/plain' });
  const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
  if (nav.canShare?.({ files: [file] })) {
    try {
      await nav.share({ files: [file], title: 'Duck Hunt Idle save' });
      markBackedUp();
      return 'shared';
    } catch (e) {
      if ((e as Error).name === 'AbortError') return 'cancelled';
      /* fall through to a download */
    }
  }
  const url = URL.createObjectURL(file);
  const a = document.createElement('a');
  a.href = url;
  a.download = file.name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
  markBackedUp();
  return 'downloaded';
}

/** Read a save code out of a backup file. */
export async function readBackupFile(file: File): Promise<string> {
  const text = await file.text();
  return text.trim();
}
