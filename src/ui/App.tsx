import { TrophyWall } from './components/TrophyWall';
import { Tally, VolleyButton } from './components/Volley';
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
import { MarshTab } from './components/MarshTab';
import { ProblemLog } from './components/ProblemLog';
import { Settings } from './components/Settings';
import { RhythmMeter, TopBar } from './components/TopBar';
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
  const [guide, setGuide] = useState(false);
  const [trophies, setTrophies] = useState(false);
  const [stageInfo, setStageInfo] = useState(false);
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
  const ground = hud.field.open ? prefs.ground : 'marsh';

  return (
    <div class={`layout ${tab === 'marsh' ? 'layout--marsh' : ''} ${prefs.tallPanel ? 'is-tall' : ''} ${prefs.reducedMotion ? 'reduce-motion' : ''}`}>
      <section class={`scene ${hud.volley.unlocked ? "has-volley" : ""}`} aria-label="The marsh">
        <div class="scene-host" ref={sceneRef} />
        <div class="floaters" ref={floatRef} aria-hidden="true" />
        <TopBar hud={hud} notation={n} onSettings={() => setSettings(true)} />
        <div class="toasts" ref={toastRef} aria-live="polite" />
        <Moments greetName={hud.profile.name} onOpen={(f) => (f === 'guide' ? setGuide(true) : setTab((TABS.find((t) => TAB_FEATURE[t.id] === f)?.id ?? 'marsh') as TabId))} />
        <RhythmMeter hud={hud} />
        <div class="side-rail">
          {hud.unlocks.guide && (
            <button class="rail-btn" onClick={() => setGuide(true)} aria-label={`Field Guide: ${hud.speciesFound} of ${hud.guide.length} birds found`} title="Field Guide">
              <Icon name="book" size={20} />
              <span class="bump" key={`g${hud.speciesFound}`}>{hud.speciesFound}/{hud.guide.length}</span>
            </button>
          )}
          {hud.patches > 0 && (
            <button class="rail-btn" onClick={() => setTrophies(true)} aria-label={`Trophy Wall: ${hud.patches} patches`} title="Trophy Wall">
              <Icon name="trophy" size={20} />
              <span class="bump" key={`t${hud.patches}`}>{hud.patches}</span>
            </button>
          )}
          {hud.problemStats.total > 0 && (
            <button
              class={`rail-btn rail-btn--problems ${hud.needsYou ? 'is-alert' : ''}`}
              onClick={() => setProblems(true)}
              aria-label={`Problem Log: ${hud.openProblems} open`}
              title="Problem Log"
            >
              <span class="rail-btn__mark" aria-hidden="true">!</span>
              <span>{hud.openProblems}</span>
            </button>
          )}
          {hud.lodge.level >= 2 && (
            <button class={`rail-btn rail-btn--stage rail-btn--${hud.calendar.id}`} onClick={() => setStageInfo(!stageInfo)} aria-expanded={stageInfo} aria-label={`Season calendar: ${hud.calendar.name}`} title="Season calendar">
              <Icon name="leaf" size={18} />
              <span>{hud.calendar.day}/{hud.calendar.of}</span>
            </button>
          )}
          {stageInfo && hud.lodge.level >= 2 && (
            <button class={`calendar-pop calendar-pop--${hud.calendar.id}`} onClick={() => setStageInfo(false)}>
              <strong>{hud.calendar.name}</strong>
              <span>{hud.calendar.blurb}</span>
              <em>Day {hud.calendar.day} of {hud.calendar.of} · then {hud.calendar.nextName}</em>
            </button>
          )}
        </div>
        <Tally hud={hud} notation={n} />
        <VolleyButton hud={hud} controls={controls} notation={n} />
        {hud.field.open && (
          <button class="ground-switch" onClick={() => controls.setGround(ground === 'field' ? 'marsh' : 'field')}>
            {ground === 'field' ? '‹ Back to the marsh' : 'To the goose field ›'}
          </button>
        )}
      </section>

      <aside class="panel">
        <PanelGrip tall={prefs.tallPanel} onChange={(tall) => tall !== prefs.tallPanel && onPrefs({ ...prefs, tallPanel: tall })} />
        <nav class="tabs" role="tablist" aria-label="Lodge sections">
          {TABS.map((t) => {
            const legacyAlert = hud.season.starsNow >= 1 || hud.legacy.perks.some((p) => p.canBuy);
            const alert = (t.id === 'bots' && botsAlert) || (t.id === 'upgrades' && upgradesAlert) || (t.id === 'legacy' && legacyAlert) || (t.id === 'marsh' && !!hud.lodge.next?.affordable);
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
          {activeOpen && activeFeature && hud.lodge.level < 4 && <TabHelp feature={activeFeature} />}
          {tab === 'marsh' && (
            <MarshTab
              hud={hud}
              controls={controls}
              devTools={prefs.devTools}
              notation={n}
              ground={ground}
              tutorial={tutorialOn ? (
                <Tutorial
                  step={tStep}
                  onNext={() => (tStep === 'done' ? finishTutorial() : setWelcomed(true))}
                  onSkip={finishTutorial}
                  name={hud.profile.name}
                  onName={(nm) => controls.setProfile(nm, hud.profile.avatar)}
                />
              ) : null}
            />
          )}
          {activeOpen && tab === 'bots' && <BotsTab hud={hud} controls={controls} notation={n} />}
          {activeOpen && tab === 'upgrades' && <UpgradesTab hud={hud} controls={controls} notation={n} />}
          {activeOpen && tab === 'workflows' && <WorkflowEditor hud={hud} controls={controls} />}
          {activeOpen && tab === 'legacy' && <LegacyTab hud={hud} controls={controls} notation={n} />}
        </div>
      </aside>

      <OfflineCard notation={n} />
      <SeasonCeremony />
      {problems && <ProblemLog hud={hud} controls={controls} onClose={() => setProblems(false)} />}
      {guide && (
        <div class="drawer-backdrop" onClick={(e) => e.target === e.currentTarget && setGuide(false)}>
          <div class="drawer guide-drawer" role="dialog" aria-label="Field Guide" aria-modal="true">
            <header class="drawer__head">
              <h3>Field Guide</h3>
              <button class="icon-btn icon-btn--dark" onClick={() => setGuide(false)} aria-label="Close the Field Guide">✕</button>
            </header>
            <FieldGuide hud={hud} notation={n} />
          </div>
        </div>
      )}
      {trophies && (
        <div class="drawer-backdrop" onClick={(e) => e.target === e.currentTarget && setTrophies(false)}>
          <div class="drawer guide-drawer" role="dialog" aria-label="Trophy Wall" aria-modal="true">
            <header class="drawer__head">
              <h3>Trophy Wall</h3>
              <button class="icon-btn icon-btn--dark" onClick={() => setTrophies(false)} aria-label="Close the Trophy Wall">✕</button>
            </header>
            <TrophyWall hud={hud} notation={n} />
          </div>
        </div>
      )}
      {settings && <Settings prefs={prefs} controls={controls} onPrefs={onPrefs} onClose={() => setSettings(false)} profile={hud.profile} />}
    </div>
  );
}

/** The handle on top of the panel: tap, or drag up/down, to make the panel taller or shorter. */
function PanelGrip({ tall, onChange }: { tall: boolean; onChange: (tall: boolean) => void }) {
  const start = useRef<number | null>(null);
  return (
    <button
      class="panel-grip"
      aria-label={tall ? 'Make the panel shorter' : 'Make the panel taller'}
      aria-pressed={tall}
      onPointerDown={(e) => (start.current = e.clientY)}
      onPointerUp={(e) => {
        const dy = start.current === null ? 0 : e.clientY - start.current;
        start.current = null;
        onChange(dy < -12 ? true : dy > 12 ? false : !tall);
      }}
      onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onChange(!tall)}
    >
      <span class="panel-grip__bar" />
    </button>
  );
}
