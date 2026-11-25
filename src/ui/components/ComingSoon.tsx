import type { TabDef } from '../tabs';
import { Icon } from './Icon';

export function ComingSoon({ tab }: { tab: TabDef }) {
  return (
    <div class="tab-body">
      <div class="coming-soon">
        <div class="coming-soon__icon">
          <Icon name={tab.icon} size={40} />
        </div>
        <h3>{tab.label}</h3>
        <p>{tab.comingSoon}</p>
        <span class="coming-soon__tag">Coming in build phase {tab.phase}</span>
      </div>
    </div>
  );
}
