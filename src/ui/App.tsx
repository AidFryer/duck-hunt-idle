import { GroundPicker } from './components/GroundPicker';
import { TrophyWall } from './components/TrophyWall';
import { Leaderboard } from './components/Leaderboard';
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
import { TrainingTab } from './components/TrainingTab';
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
  const [tab, setTabRaw] = useState<TabId>('marsh');
  const [sheetOpen, setSheetOpen] = useState(false);
  /** Open a menu sheet (or close it if it's already showing). */
  const openTab = (id: TabId, toggle = false) => {
    if (toggle && sheetOpen && id === tab) {
      setSheetOpen(false);
      return;
    }
    setTabRaw(id);
    setSheetOpen(true);
  };
  const setTab = (id: TabId) => openTab(id);
  const [settings, setSettings] = useState(false);
  const [problems, setProblems] = useState(false);
  const [guide, setGuide] = useState(false);
  const [trophies, setTrophies] = useState(false);
  const [board, setBoard] = useState(false);
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
  const ground = hud.grounds.find((g) => g.id === prefs.ground)?.open ? prefs.ground : 'marsh';

  return (
    <div class={`layout layout--app ${sheetOpen ? 'has-sheet' : ''} ${prefs.reducedMotion ? 'reduce-motion' : ''}`}>
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
          {controls.onlineStatus().enabled && (
            <button class="rail-btn" onClick={() => setBoard(true)} aria-label="Leaderboard" title="Leaderboard">
              <Icon name="podium" size={20} />
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
        <GroundPicker hud={hud} ground={ground} onPick={(g) => controls.setGround(g)} />
        {tutorialOn ? (
          <div class="float-tutorial">
            <Tutorial
              step={tStep}
              onNext={() => (tStep === 'done' ? finishTutorial() : setWelcomed(true))}
              onSkip={finishTutorial}
              name={hud.profile.name}
              onName={(nm) => controls.claimName(nm)}
              online={controls.onlineStatus().enabled}
            />
          </div>
        ) : (
          !sheetOpen && (
            <button class="goal-strip" onClick={() => openTab('marsh')} key={`gs-${hud.goalId}`}>
              <span class="goal-strip__tag">Next</span>
              <span class="goal-strip__text">{hud.goalTitle}</span>
              {hud.lodge.next && ['cabin', 'lodge3', 'club', 'grand'].includes(hud.goalId) && <span class="goal-strip__pct">{lodgePct(hud)}%</span>}
              <span class="goal-strip__chev" aria-hidden="true">›</span>
            </button>
          )
        )}
      </section>

      <aside class={`sheet ${sheetOpen ? 'is-open' : ''} ${prefs.tallPanel ? 'is-tall' : ''}`} aria-hidden={!sheetOpen} aria-label={active.label}>
        <header class="sheet__head">
          <button
            class="sheet__grip"
            aria-label={prefs.tallPanel ? 'Make the sheet shorter' : 'Make the sheet taller'}
            onClick={() => onPrefs({ ...prefs, tallPanel: !prefs.tallPanel })}
          >
            <span />
          </button>
          <h2 class="sheet__title">
            <Icon name={active.icon} size={20} />
            {active.label}
          </h2>
          <button class="sheet__close" onClick={() => setSheetOpen(false)} aria-label="Close">✕</button>
        </header>
        <div class="sheet__content panel__content" role="tabpanel" key={tab}>
          {!activeOpen && activeFeature && <LockedTab tab={active} feature={activeFeature} hud={hud} />}
          {activeOpen && activeFeature && hud.lodge.level < 4 && <TabHelp feature={activeFeature} />}
          {tab === 'marsh' && (
            <MarshTab hud={hud} controls={controls} devTools={prefs.devTools} notation={n} ground={ground} tutorial={null} />
          )}
          {activeOpen && tab === 'bots' && <BotsTab hud={hud} controls={controls} notation={n} />}
          {activeOpen && tab === 'upgrades' && <UpgradesTab hud={hud} controls={controls} notation={n} />}
          {activeOpen && tab === 'workflows' && <TrainingTab hud={hud} controls={controls} notation={n} />}
          {activeOpen && tab === 'legacy' && <LegacyTab hud={hud} controls={controls} notation={n} />}
        </div>
      </aside>

      <nav class="dock" role="tablist" aria-label="Lodge menus">
        {TABS.map((t) => {
          const legacyAlert = hud.season.starsNow >= 1 || hud.legacy.perks.some((p) => p.canBuy);
          const alert = (t.id === 'bots' && botsAlert) || (t.id === 'upgrades' && upgradesAlert) || (t.id === 'legacy' && legacyAlert) || (t.id === 'marsh' && !!hud.lodge.next?.affordable);
          const on = sheetOpen && t.id === tab;
          return (
            <button
              role="tab"
              aria-selected={on}
              class={`dock__btn ${on ? 'is-active' : ''} ${isOpen(t.id) ? '' : 'is-locked'}`}
              onClick={() => openTab(t.id, true)}
            >
              <span class="dock__icon">
                <Icon name={t.icon} size={24} />
                {alert && isOpen(t.id) && <span class="dock__dot" aria-label="Something to buy" />}
                {!isOpen(t.id) && <span class="dock__lock" aria-label="Locked"><Icon name="lock" size={11} /></span>}
              </span>
              <span class="dock__label">{t.label}</span>
            </button>
          );
        })}
      </nav>

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
      {board && (
        <div class="drawer-backdrop" onClick={(e) => e.target === e.currentTarget && setBoard(false)}>
          <div class="drawer guide-drawer" role="dialog" aria-label="Leaderboard" aria-modal="true">
            <header class="drawer__head">
              <h3>Leaderboard</h3>
              <button class="icon-btn icon-btn--dark" onClick={() => setBoard(false)} aria-label="Close the leaderboard">✕</button>
            </header>
            <Leaderboard controls={controls} notation={n} />
          </div>
        </div>
      )}
      {settings && <Settings prefs={prefs} controls={controls} onPrefs={onPrefs} onClose={() => setSettings(false)} profile={hud.profile} />}
    </div>
  );
}

/** How far along the next lodge is, by its slowest requirement. */
function lodgePct(hud: HudSnapshot): number {
  const reqs = hud.lodge.next?.reqs ?? [];
  if (reqs.length === 0) return 0;
  return Math.round(Math.min(...reqs.map((r) => Math.min(1, r.cur / Math.max(1, r.goal)))) * 100);
}
