import { useEffect, useRef, useState } from 'preact/hooks';
import type { Prefs } from '../app/prefs';
import { BOT_ORDER } from '../data/economy';
import type { GameControls } from './controls';
import { feedback } from './feedback';
import type { HudSnapshot } from './hudState';
import { type Store, useStore } from './store';
import { TAB_FEATURE, TABS, type TabId } from './tabs';
import { LockedTab } from './components/LockedTab';
import { TabHelp } from './components/TabHelp';
import { BotsTab } from './components/BotsTab';
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
import { Tutorial, tutorialStep } from './components/Tutorial';

interface AppProps {
  hud: Store<HudSnapshot>;
  prefs: Store<Prefs>;
  controls: GameControls;
  onPrefs: (p: Prefs) => void;
  onSceneHost: (el: HTMLElement) => void;
}


export function App({ hud: hudStore, prefs: prefsStore, controls, onPrefs, onSceneHost }: AppProps) {
  const hud = useStore(hudStore);
  const prefs = useStore(prefsStore);
  const [tab, setTab] = useState<TabId>('marsh');
  const [settings, setSettings] = useState(false);
  const [problems, setProblems] = useState(false);
  const [welcomed, setWelcomed] = useState(false);
  const tutorialOn = !prefs.tutorialDone && hud.lifetimeBirds < 5 && hud.season.number === 1;
  const tStep = tutorialStep(hud, welcomed);
  const finishTutorial = () => onPrefs({ ...prefs, tutorialDone: true });
  const sceneRef = useRef<HTMLDivElement>(null);
  const floatRef = useRef<HTMLDivElement>(null);
  const toastRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (floatRef.current && toastRef.current) feedback.attach(floatRef.current, toastRef.current);
    if (sceneRef.current) onSceneHost(sceneRef.current);
  }, []);

  const active = TABS.find((t) => t.id === tab)!;
  const isOpen = (id: TabId) => {
    const f = TAB_FEATURE[id];
    return f === null || hud.unlocks[f];
  };
  const activeFeature = TAB_FEATURE[tab];
  const activeOpen = isOpen(tab);
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
        <Moments onOpen={(f) => setTab((TABS.find((t) => TAB_FEATURE[t.id] === f)?.id ?? 'marsh') as TabId)} />
        {tutorialOn && tab === 'marsh' && (
          <Tutorial
            step={tStep}
            onNext={() => (tStep === 'done' ? finishTutorial() : setWelcomed(true))}
            onSkip={finishTutorial}
          />
        )}
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
                class={`tab ${t.id === tab ? 'is-active' : ''} ${isOpen(t.id) ? '' : 'is-locked'}`}
                onClick={() => setTab(t.id)}
              >
                <Icon name={t.icon} size={20} />
                <span>{t.label}</span>
                {alert && isOpen(t.id) && <span class="tab__dot" aria-label="Something to buy" />}
                {!isOpen(t.id) && <span class="tab__lock" aria-label="Locked"><Icon name="lock" size={12} /></span>}
              </button>
            );
          })}
        </nav>
        <div class="panel__content" role="tabpanel" key={tab}>
          {!activeOpen && activeFeature && <LockedTab tab={active} feature={activeFeature} hud={hud} />}
          {activeOpen && activeFeature && <TabHelp feature={activeFeature} />}
          {tab === 'marsh' && <MarshTab hud={hud} controls={controls} devTools={prefs.devTools} tutorial={tutorialOn && welcomed ? tStep : null} />}
          {activeOpen && tab === 'bots' && <BotsTab hud={hud} controls={controls} notation={n} />}
          {activeOpen && tab === 'upgrades' && <UpgradesTab hud={hud} controls={controls} notation={n} />}
          {activeOpen && tab === 'jobs' && <JobBoard hud={hud} controls={controls} />}
          {activeOpen && tab === 'guide' && <FieldGuide hud={hud} notation={n} />}
          {activeOpen && tab === 'workflows' && <WorkflowEditor hud={hud} controls={controls} />}
          {activeOpen && tab === 'legacy' && <LegacyTab hud={hud} controls={controls} notation={n} />}
        </div>
      </aside>

      <OfflineCard notation={n} />
      <SeasonCeremony />
      {problems && <ProblemLog hud={hud} controls={controls} onClose={() => setProblems(false)} />}
      {settings && <Settings prefs={prefs} controls={controls} onPrefs={onPrefs} onClose={() => setSettings(false)} />}
    </div>
  );
}
