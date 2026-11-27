/** Panel tabs and the phase in which each one unlocks during development. */
import type { FeatureId } from '../data/features';

/** Which feature stage opens each tab (Marsh is always open). */
export const TAB_FEATURE: Record<TabId, FeatureId | null> = {
  marsh: null, bots: 'bots', workflows: 'workflows', upgrades: 'upgrades', legacy: 'legacy',
};

export interface TabDef {
  id: TabId;
  label: string;
  icon: IconName;
  /** In-world blurb shown while the tab is still being built. */
  comingSoon: string;
  /** Build phase that delivers this tab. */
  phase: number;
}

export type TabId = 'marsh' | 'bots' | 'workflows' | 'upgrades' | 'legacy';
export type IconName = 'marsh' | 'bot' | 'board' | 'rope' | 'hammer' | 'book' | 'star' | 'sun' | 'moon' | 'coin' | 'feather' | 'duck' | 'wind' | 'gear' | 'fog' | 'drop' | 'snow' | 'cloud' | 'lock' | 'trophy' | 'leaf' | 'lodge' | 'bed' | 'mug' | 'boat' | 'lamp' | 'map' | 'podium' | 'beat';

export const TABS: readonly TabDef[] = [
  { id: 'marsh', label: 'Lodge', icon: 'lodge', comingSoon: '', phase: 1 },
  { id: 'upgrades', label: 'Land', icon: 'marsh', comingSoon: '', phase: 2 },
  { id: 'bots', label: 'Workshop', icon: 'bot', comingSoon: '', phase: 2 },
  { id: 'workflows', label: 'Training', icon: 'board', comingSoon: '', phase: 3 },
  { id: 'legacy', label: 'Legacy', icon: 'star', comingSoon: '', phase: 5 },
];
