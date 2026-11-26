import { useEffect, useRef, useState } from 'preact/hooks';
import type { Prefs } from '../app/prefs';
import { BOT_ORDER } from '../data/economy';
import type { GameControls } from './controls';
import { feedback } from './feedback';
import type { HudSnapshot } from './hudState';
import { type Store, useStore } from './store';
import { TABS, type TabId } from './tabs';
import { BotsTab } from './components/BotsTab';
import { ComingSoon } from './components/ComingSoon';
import { Icon } from './components/Icon';
import { JobBoard } from './components/JobBoard';
import { MarshTab } from './components/MarshTab';
import { ProblemLog } from './components/ProblemLog';
import { Settings } from './components/Settings';
import { TopBar } from './components/TopBar';
import { UpgradesTab } from './components/UpgradesTab';
import { FieldGuide } from './components/FieldGuide';
import { Moments } from './components/Moments';
import { OfflineCard } from './components/OfflineCard';
import { WorkflowEditor } from './components/WorkflowEditor';
import { LegacyTab } from './components/LegacyTab';
import { SeasonCeremony } from './components/SeasonCeremony';

interface AppProps {
  hud: Store<HudSnapshot>;
  prefs: Store<Prefs>;
  controls: GameControls;
  onPrefs: (p: Prefs) => void;
  onSceneHost: (el: HTMLElement) => void;
}

const BUILT_THROUGH_PHASE = 5;

export function App({ hud: hudStore, prefs: prefsStore, controls, onPrefs, onSceneHost }: AppProps) {
  const hud = useStore(hudStore);
  const prefs = useStore(prefsStore);
  const [tab, setTab] = useState<TabId>('marsh');
  const [settings, setSettings] = useState(false);
  const [problems, setProblems] = useState(false);
  const sceneRef = useRef<HTMLDivElement>(null);
  const floatRef = useRef<HTMLDivElement>(null);
  const toastRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (floatRef.current && toastRef.current) feedback.attach(floatRef.current, toastRef.current);
    if (sceneRef.current) onSceneHost(sceneRef.current);
  }, []);

  const active = TABS.find((t) => t.id === tab)!;
  const botsAlert = BOT_ORDER.some((id) => hud.bots[id].revealed && hud.bots[id].affordable);
  const upgradesAlert = hud.acreAffordable || hud.upgrades.some((u) => u.revealed && u.affordable);
  const n = prefs.notation;

  return (
    <div class={`layout ${prefs.reducedMotion ? 'reduce-motion' : ''}`}>
      <section class="scene" aria-label="The marsh">
        <div class="scene-host" ref={sceneRef} />
        <div class="floaters" ref={floatRef} aria-hidden="true" />
        <TopBar hud={hud} notation={n} onSettings={() => setSettings(true)} onProblems={() => setProblems(true)} />
        <div class="toasts" ref={toastRef} aria-live="polite" />
        <Moments />
      </section>

      <aside class="panel">
        <nav class="tabs" role="tablist" aria-label="Lodge sections">
          {TABS.map((t) => {
            const jobsAlert = Object.values(hud.jobs).some((j) => j.backedUp && j.tokens.length > 0);
            const legacyAlert = hud.season.starsNow >= 1 || hud.legacy.perks.some((p) => p.canBuy);
            const alert = (t.id === 'bots' && botsAlert) || (t.id === 'upgrades' && upgradesAlert) || (t.id === 'jobs' && jobsAlert) || (t.id === 'legacy' && legacyAlert);
            return (
              <button
                role="tab"
                aria-selected={t.id === tab}
                class={`tab ${t.id === tab ? 'is-active' : ''} ${t.phase > BUILT_THROUGH_PHASE ? 'is-locked' : ''}`}
                onClick={() => setTab(t.id)}
              >
                <Icon name={t.icon} size={20} />
                <span>{t.label}</span>
                {alert && <span class="tab__dot" aria-label="Something to buy" />}
              </button>
            );
          })}
        </nav>
        <div class="panel__content" role="tabpanel" key={tab}>
          {tab === 'marsh' && <MarshTab hud={hud} controls={controls} devTools={prefs.devTools} />}
          {tab === 'bots' && <BotsTab hud={hud} controls={controls} notation={n} />}
          {tab === 'upgrades' && <UpgradesTab hud={hud} controls={controls} notation={n} />}
          {tab === 'jobs' && <JobBoard hud={hud} controls={controls} />}
          {tab === 'guide' && <FieldGuide hud={hud} notation={n} />}
          {tab === 'workflows' && <WorkflowEditor hud={hud} controls={controls} />}
          {tab === 'legacy' && <LegacyTab hud={hud} controls={controls} notation={n} />}
          {active.phase > BUILT_THROUGH_PHASE && <ComingSoon tab={active} />}
        </div>
      </aside>

      <OfflineCard notation={n} />
      <SeasonCeremony />
      {problems && <ProblemLog hud={hud} controls={controls} onClose={() => setProblems(false)} />}
      {settings && <Settings prefs={prefs} controls={controls} onPrefs={onPrefs} onClose={() => setSettings(false)} />}
    </div>
  );
}
