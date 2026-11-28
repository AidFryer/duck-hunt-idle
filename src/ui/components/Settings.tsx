import { useEffect, useState } from 'preact/hooks';
import type { Prefs } from '../../app/prefs';
import type { GameControls } from '../controls';
import { BUILD_STAMP, installState, promptInstall } from '../../app/pwa';
import { lastFileBackup, readBackupFile, saveBackupFile } from '../../app/fileBackup';
import { LODGE_LEVELS } from '../../data/progression';
import { useStore } from '../store';
import { AVATARS, NAME_MAX } from '../../data/avatars';
import { BREEDS, BREED_ORDER, DOG_NAME_MAX, type BreedId } from '../../data/crew';
import { avatarPortrait } from '../portraits';
import { showRestoreCode } from '../../app/online';

export function Settings({ prefs, controls, onPrefs, onClose, profile }: {
  prefs: Prefs;
  controls: GameControls;
  onPrefs: (p: Prefs) => void;
  onClose: () => void;
  profile: { name: string; avatar: string; dogName: string; breed: BreedId };
}) {
  const [name, setName] = useState(profile.name);
  const [nameErr, setNameErr] = useState<string | null>(null);
  const saveName = async () => {
    if (name.trim() === profile.name) return;
    setNameErr(await controls.claimName(name));
  };
  const [dogName, setDogName] = useState(profile.dogName);
  // A restore or import brings its own names along.
  useEffect(() => setName(profile.name), [profile.name]);
  useEffect(() => setDogName(profile.dogName), [profile.dogName]);
  const [code, setCode] = useState('');
  const [msg, setMsg] = useState<{ text: string; tone: 'good' | 'bad' } | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);
  const install = useStore(installState);

  const doExport = async () => {
    const c = controls.exportSave();
    setCode(c);
    try {
      await navigator.clipboard.writeText(c);
      setMsg({ text: 'Save code copied. Keep it somewhere safe.', tone: 'good' });
    } catch {
      setMsg({ text: 'Save code is in the box below. Select it all and copy it.', tone: 'good' });
    }
  };

  const doShare = async () => {
    const c = controls.exportSave();
    setCode(c);
    try {
      await navigator.share({ title: 'Duck Hunt Idle save', text: c });
      setMsg({ text: 'Save code sent. Paste it into Import save to load it.', tone: 'good' });
    } catch {
      /* cancelled */
    }
  };
  const canShare = typeof navigator.share === 'function';
  const [lastBackup, setLastBackup] = useState(lastFileBackup);
  const doFileBackup = async () => {
    const how = await saveBackupFile(controls.exportSave(), profile.name);
    if (how === 'cancelled') return;
    setLastBackup(lastFileBackup());
    setMsg({ text: how === 'shared' ? 'Backup file made. Pick "Save to Files" and choose iCloud Drive to keep it safe.' : 'Backup file downloaded. Keep it somewhere safe, like iCloud Drive.', tone: 'good' });
  };
  const doFileLoad = async (file: File | undefined) => {
    if (!file) return;
    const r = controls.importSave(await readBackupFile(file));
    setMsg(r.ok ? { text: 'Backup loaded. Welcome back!', tone: 'good' } : { text: r.error, tone: 'bad' });
  };
  const [backups, setBackups] = useState(() => controls.listBackups());
  const restore = (at: number) => {
    const r = controls.restoreBackup(at);
    setBackups(controls.listBackups());
    setMsg(r.ok ? { text: 'Backup restored. Welcome back!', tone: 'good' } : { text: r.error, tone: 'bad' });
  };

  const [cloud, setCloud] = useState(() => controls.cloudStatus());
  const [cloudBusy, setCloudBusy] = useState(false);
  const [showBring, setShowBring] = useState(false);
  const [bringName, setBringName] = useState('');
  const [bringCode, setBringCode] = useState('');
  const doCloudSave = async () => {
    setCloudBusy(true);
    const err = await controls.cloudSaveNow();
    setCloudBusy(false);
    setCloud(controls.cloudStatus());
    setMsg(err ? { text: err, tone: 'bad' } : { text: 'Saved to the cloud.', tone: 'good' });
  };
  const copyCloudCode = async () => {
    if (!cloud.code) return;
    try {
      await navigator.clipboard.writeText(`${profile.name} ${showRestoreCode(cloud.code)}`);
      setMsg({ text: 'Name and restore code copied. Keep them somewhere safe.', tone: 'good' });
    } catch {
      setMsg({ text: 'Write down your name and the restore code shown.', tone: 'good' });
    }
  };
  const doBring = async () => {
    if (!bringName.trim() || !bringCode.trim()) return;
    setCloudBusy(true);
    const r = await controls.cloudRestore(bringName, bringCode);
    setCloudBusy(false);
    setCloud(controls.cloudStatus());
    setBackups(controls.listBackups());
    if (r.ok) setShowBring(false);
    setMsg(r.ok ? { text: 'Cloud save brought back. Welcome back!', tone: 'good' } : { text: r.error, tone: 'bad' });
  };

  const doImport = () => {
    const r = controls.importSave(code);
    setMsg(r.ok ? { text: 'Save loaded. Welcome back!', tone: 'good' } : { text: r.error, tone: 'bad' });
  };

  return (
    <div class="drawer-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div class="drawer" role="dialog" aria-label="Settings" aria-modal="true">
        <header class="drawer__head">
          <h3>Settings</h3>
          <button class="icon-btn icon-btn--dark" onClick={onClose} aria-label="Close settings">✕</button>
        </header>

        <section class="drawer__section">
          <h4>Your hunter</h4>
          <label class="row profile-name" for="opt-name">
            <span>Name</span>
            <input
              id="opt-name"
              type="text"
              maxLength={NAME_MAX}
              placeholder="What should Ray call you?"
              value={name}
              onInput={(e) => {
                setName((e.currentTarget as HTMLInputElement).value);
                setNameErr(null);
              }}
              onBlur={() => void saveName()}
              onKeyDown={(e) => e.key === 'Enter' && (e.currentTarget as HTMLInputElement).blur()}
            />
          </label>
          {nameErr && <p class="name-note is-bad">{nameErr}</p>}
          <div class="avatar-grid" role="radiogroup" aria-label="Profile picture">
            {AVATARS.map((a) => (
              <button
                role="radio"
                aria-checked={profile.avatar === a.id}
                class={`avatar-choice ${profile.avatar === a.id ? 'is-on' : ''}`}
                title={a.name}
                onClick={() => controls.setProfile(profile.name, a.id)}
              >
                <img src={avatarPortrait(a.id)} alt={a.name} />
              </button>
            ))}
          </div>
        </section>

        <section class="drawer__section">
          <h4>Your retriever</h4>
          <label class="row profile-name" for="opt-dog">
            <span>Name</span>
            <input
              id="opt-dog"
              type="text"
              maxLength={DOG_NAME_MAX}
              placeholder="Biscuit"
              value={dogName}
              onInput={(e) => setDogName((e.currentTarget as HTMLInputElement).value)}
              onBlur={() => controls.setDog(dogName, profile.breed)}
              onKeyDown={(e) => e.key === 'Enter' && (e.currentTarget as HTMLInputElement).blur()}
            />
          </label>
          <div class="breed-grid" role="radiogroup" aria-label="Breed">
            {BREED_ORDER.map((b) => (
              <button
                role="radio"
                aria-checked={profile.breed === b}
                class={`breed-choice ${profile.breed === b ? 'is-on' : ''}`}
                onClick={() => controls.setDog(dogName, b)}
              >
                <span class="breed-choice__swatch" style={{ background: `#${BREEDS[b].coat.toString(16).padStart(6, '0')}`, boxShadow: `inset -8px -6px 0 #${BREEDS[b].shade.toString(16).padStart(6, '0')}` }} />
                <span>{BREEDS[b].name}</span>
              </button>
            ))}
          </div>
        </section>

        <section class="drawer__section">
          <h4>Sound</h4>
          <Slider id="vol-music" label="Music" value={prefs.music} onChange={(v) => onPrefs({ ...prefs, music: v })} />
          <Slider id="vol-ambience" label="Marsh sounds" value={prefs.ambience} onChange={(v) => onPrefs({ ...prefs, ambience: v })} />
          <Slider id="vol-effects" label="Effects" value={prefs.effects} onChange={(v) => onPrefs({ ...prefs, effects: v })} />
          <label class="row" for="opt-mute">
            <span>Mute everything</span>
            <input id="opt-mute" type="checkbox" checked={prefs.muted} onChange={(e) => onPrefs({ ...prefs, muted: (e.currentTarget as HTMLInputElement).checked })} />
          </label>
        </section>

        <section class="drawer__section">
          <h4>Display</h4>
          <label class="row" for="opt-notation">
            <span>Big numbers</span>
            <select
              id="opt-notation"
              value={prefs.notation}
              onChange={(e) => {
                const notation = (e.currentTarget as HTMLSelectElement).value as Prefs['notation'];
                controls.setNotation(notation);
                onPrefs({ ...prefs, notation });
              }}
            >
              <option value="letters">1.5K, 2.3M … aa, ab</option>
              <option value="scientific">1.5K, 2.3M … 1.2e36</option>
            </select>
          </label>
          <label class="row" for="opt-motion">
            <span>Reduce animations</span>
            <input
              id="opt-motion"
              type="checkbox"
              checked={prefs.reducedMotion}
              onChange={(e) => {
                const on = (e.currentTarget as HTMLInputElement).checked;
                controls.setReducedMotion(on);
                onPrefs({ ...prefs, reducedMotion: on });
              }}
            />
          </label>
          <label class="row" for="opt-battery">
            <span>Battery saver (cooler phone, slightly less smooth)</span>
            <input
              id="opt-battery"
              type="checkbox"
              checked={prefs.batterySaver}
              onChange={(e) => onPrefs({ ...prefs, batterySaver: (e.currentTarget as HTMLInputElement).checked })}
            />
          </label>
          <label class="row" for="opt-shake">
            <span>Screen shake on big moments</span>
            <input
              id="opt-shake"
              type="checkbox"
              checked={prefs.screenShake && !prefs.reducedMotion}
              disabled={prefs.reducedMotion}
              onChange={(e) => onPrefs({ ...prefs, screenShake: (e.currentTarget as HTMLInputElement).checked })}
            />
          </label>
          <label class="row" for="opt-haptics">
            <span>Vibration on shots and big moments</span>
            <input
              id="opt-haptics"
              type="checkbox"
              checked={prefs.haptics}
              onChange={(e) => onPrefs({ ...prefs, haptics: (e.currentTarget as HTMLInputElement).checked })}
            />
          </label>
          <label class="row" for="opt-tutorial">
            <span>Show the tutorial again</span>
            <button id="opt-tutorial" class="btn btn--small" onClick={() => { onPrefs({ ...prefs, tutorialDone: false }); onClose(); }}>Replay</button>
          </label>
          <label class="row" for="opt-dev">
            <span>Preview controls (time-lapse)</span>
            <input
              id="opt-dev"
              type="checkbox"
              checked={prefs.devTools}
              onChange={(e) => onPrefs({ ...prefs, devTools: (e.currentTarget as HTMLInputElement).checked })}
            />
          </label>
        </section>

        {!install.installed && (install.canInstall || install.ios) && (
          <section class="drawer__section">
            <h4>Play like an app</h4>
            {install.canInstall ? (
              <>
                <p class="card__hint">Install the game to your home screen. It opens full-screen and works offline.</p>
                <button class="btn btn--primary" onClick={() => void promptInstall()}>Install app</button>
              </>
            ) : (
              <p class="card__hint">On iPhone or iPad: tap the Share button in Safari, then "Add to Home Screen". It opens full-screen and works offline.</p>
            )}
          </section>
        )}

        <section class="drawer__section">
          <h4>Your save</h4>
          <p class="card__hint">
            The game saves itself every 15 seconds and updates itself when a new version is out, so there's no need to
            remove it from your home screen. Removing the home-screen app erases the save inside it.
          </p>
          {install.ios && (
            <p class="card__hint">
              On iPhone, Safari and the home-screen app keep separate saves. Use a backup file or save code to move one to the other.
            </p>
          )}
          {cloud.enabled && (
            <div class="file-backup cloud-save">
              <strong>Cloud save</strong>
              {cloud.joined && cloud.code ? (
                <>
                  <span>
                    {cloud.savedAt ? `Saved online ${whenText(cloud.savedAt)}.` : 'Saves online every few minutes.'} To bring this lodge back on any
                    phone, use your name and this code:
                  </span>
                  <code class="cloud-code">{showRestoreCode(cloud.code)}</code>
                </>
              ) : (
                <span>Pick a name above and your lodge saves online every few minutes.</span>
              )}
              <div class="btn-row">
                {cloud.joined && <button class="btn btn--small btn--primary" disabled={cloudBusy} onClick={() => void doCloudSave()}>Save now</button>}
                {cloud.joined && <button class="btn btn--small" onClick={() => void copyCloudCode()}>Copy code</button>}
                <button class="btn btn--small" onClick={() => setShowBring(!showBring)}>Bring back a save</button>
              </div>
              {showBring && (
                <div class="cloud-bring">
                  <input type="text" placeholder="Name" maxLength={NAME_MAX} value={bringName} onInput={(e) => setBringName((e.currentTarget as HTMLInputElement).value)} />
                  <input type="text" placeholder="Code" maxLength={12} autoCapitalize="characters" autoComplete="off" spellcheck={false} value={bringCode} onInput={(e) => setBringCode((e.currentTarget as HTMLInputElement).value)} />
                  <button class="btn btn--primary" disabled={cloudBusy || !bringName.trim() || !bringCode.trim()} onClick={() => void doBring()}>Bring back</button>
                </div>
              )}
              {showBring && <span class="cloud-note">This replaces the lodge on this phone. A backup of it is kept below.</span>}
            </div>
          )}
          <div class="file-backup">
            <strong>Back up to iCloud</strong>
            <span>
              {lastBackup ? `Last backup file: ${whenText(lastBackup)}.` : 'No backup file yet.'} A backup file works on any phone or
              computer, even if this app is removed.
            </span>
            <div class="btn-row">
              <button class="btn btn--primary" onClick={() => void doFileBackup()}>Back up to Files / iCloud</button>
              <label class="btn file-load">
                Load a backup file
                <input type="file" accept=".txt,text/plain" onChange={(e) => void doFileLoad((e.currentTarget as HTMLInputElement).files?.[0])} />
              </label>
            </div>
          </div>
          <div class="btn-row">
            <button class="btn" onClick={doExport}>Copy save code</button>
            {canShare && <button class="btn" onClick={() => void doShare()}>Send save code</button>}
            <button class="btn" onClick={doImport} aria-disabled={!code.trim()}>Import save</button>
          </div>
          <textarea
            id="save-code"
            class="save-code"
            placeholder="Paste a save code here, then press Import save"
            value={code}
            onInput={(e) => setCode((e.currentTarget as HTMLTextAreaElement).value)}
            rows={4}
          />
          {msg && <p class={`msg msg--${msg.tone}`}>{msg.text}</p>}
          {backups.length > 0 && (
            <>
              <h4 class="backups__head">Backups on this device</h4>
              <p class="card__hint">Copies kept every 10 minutes, and right before a reset, import or restore.</p>
              <ul class="backups">
                {backups.map((b) => (
                  <li class="backup">
                    <div class="backup__text">
                      <strong>{b.name || 'Hunter'} · {LODGE_LEVELS[b.lodge - 1]?.name ?? 'Lodge'}</strong>
                      <span>{b.birds.toLocaleString()} birds · {whenText(b.at)}{b.why === 'reset' ? ' · before reset' : b.why === 'import' ? ' · before import' : b.why === 'restore' ? ' · before restore' : ''}</span>
                    </div>
                    <button class="btn btn--small" onClick={() => restore(b.at)}>Restore</button>
                  </li>
                ))}
              </ul>
            </>
          )}
          <p class="card__hint build-stamp">Version {BUILD_STAMP}</p>
        </section>

        <section class="drawer__section">
          <h4>Start over</h4>
          {!confirmReset ? (
            <button class="btn btn--danger" onClick={() => setConfirmReset(true)}>Reset save…</button>
          ) : (
            <div class="confirm">
              <p>This starts a new marsh. A backup of your current save is kept above, so you can restore it later.</p>
              <div class="btn-row">
                <button class="btn btn--danger" onClick={() => { controls.resetSave(); setConfirmReset(false); onClose(); }}>Yes, erase everything</button>
                <button class="btn" onClick={() => setConfirmReset(false)}>Keep my save</button>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function whenText(at: number): string {
  const mins = Math.round((Date.now() - at) / 60_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs} hr ago`;
  return new Date(at).toLocaleDateString();
}

function Slider({ id, label, value, onChange }: { id: string; label: string; value: number; onChange: (v: number) => void }) {
  return (
    <label class="row" for={id}>
      <span>{label}</span>
      <input
        id={id}
        class="slider"
        type="range"
        min={0}
        max={100}
        value={Math.round(value * 100)}
        onInput={(e) => onChange(Number((e.currentTarget as HTMLInputElement).value) / 100)}
      />
    </label>
  );
}
