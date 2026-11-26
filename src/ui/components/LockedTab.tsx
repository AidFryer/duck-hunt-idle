import { FEATURES, type FeatureId } from '../../data/features';
import type { HudSnapshot } from '../hudState';
import type { TabDef } from '../tabs';
import { Icon } from './Icon';

/** Shown for a tab whose stage hasn't been reached yet. */
export function LockedTab({ tab, feature, hud }: { tab: TabDef; feature: FeatureId; hud: HudSnapshot }) {
  const f = FEATURES[feature];
  const [cur, goal] = hud.featureProgress[feature];
  const pct = Math.max(0, Math.min(100, (cur / goal) * 100));
  return (
    <div class="tab-body">
      <div class="coming-soon">
        <div class="coming-soon__icon"><Icon name={tab.icon} size={40} /></div>
        <span class="goal__tag">Stage {f.stage}</span>
        <h3>{f.name}</h3>
        <p>{f.requirement}</p>
        <div class="milestone stage-progress">
          <div class="milestone__bar"><span style={{ width: `${pct}%` }} /></div>
          <span class="milestone__label">{Math.round(pct)}%</span>
        </div>
      </div>
    </div>
  );
}
