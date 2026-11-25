import { useEffect, useRef, useState } from 'preact/hooks';
import type { GameControls } from './controls';
import type { HudSnapshot } from './hudState';
import { type Store, useStore } from './store';
import { TABS, type TabId } from './tabs';
import { ComingSoon } from './components/ComingSoon';
import { Icon } from './components/Icon';
import { MarshTab } from './components/MarshTab';
import { TopBar } from './components/TopBar';

interface AppProps {
  hud: Store<HudSnapshot>;
  controls: GameControls;
  onSceneHost: (el: HTMLElement) => void;
}

export function App({ hud: hudStore, controls, onSceneHost }: AppProps) {
  const hud = useStore(hudStore);
  const [tab, setTab] = useState<TabId>('marsh');
  const sceneRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (sceneRef.current) onSceneHost(sceneRef.current);
  }, []);

  const active = TABS.find((t) => t.id === tab)!;

  return (
    <div class="layout">
      <section class="scene" aria-label="The marsh">
        <div class="scene-host" ref={sceneRef} />
        <TopBar hud={hud} />
      </section>

      <aside class="panel">
        <nav class="tabs" role="tablist" aria-label="Lodge sections">
          {TABS.map((t) => (
            <button
              role="tab"
              aria-selected={t.id === tab}
              class={`tab ${t.id === tab ? 'is-active' : ''} ${t.phase > 1 ? 'is-locked' : ''}`}
              onClick={() => setTab(t.id)}
            >
              <Icon name={t.icon} size={20} />
              <span>{t.label}</span>
            </button>
          ))}
        </nav>
        <div class="panel__content" role="tabpanel" key={tab}>
          {tab === 'marsh' ? <MarshTab hud={hud} controls={controls} /> : <ComingSoon tab={active} />}
        </div>
      </aside>
    </div>
  );
}
