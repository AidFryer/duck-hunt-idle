import { useState } from 'preact/hooks';
import type { Prefs } from '../../app/prefs';
import type { GameControls } from '../controls';

export function Settings({ prefs, controls, onPrefs, onClose }: {
  prefs: Prefs;
  controls: GameControls;
  onPrefs: (p: Prefs) => void;
  onClose: () => void;
}) {
  const [code, setCode] = useState('');
  const [msg, setMsg] = useState<{ text: string; tone: 'good' | 'bad' } | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);

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

        <section class="drawer__section">
          <h4>Your save</h4>
          <p class="card__hint">The game saves itself every 15 seconds on this device. Export a code to back it up or move it to another device.</p>
          <div class="btn-row">
            <button class="btn" onClick={doExport}>Export save</button>
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
        </section>

        <section class="drawer__section">
          <h4>Start over</h4>
          {!confirmReset ? (
            <button class="btn btn--danger" onClick={() => setConfirmReset(true)}>Reset save…</button>
          ) : (
            <div class="confirm">
              <p>This erases your marsh, bots and coins on this device. Export a save first if you might want it back.</p>
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
