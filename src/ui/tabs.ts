/** Panel tabs and the phase in which each one unlocks during development. */
import type { FeatureId } from '../data/features';

/** Which feature stage opens each tab (Marsh is always open). */
export const TAB_FEATURE: Record<TabId, FeatureId | null> = {
  marsh: null, bots: 'bots', jobs: 'jobs', workflows: 'workflows', upgrades: 'upgrades', guide: 'guide', legacy: 'legacy',
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

export type TabId = 'marsh' | 'bots' | 'jobs' | 'workflows' | 'upgrades' | 'guide' | 'legacy';
export type IconName = 'marsh' | 'bot' | 'board' | 'rope' | 'hammer' | 'book' | 'star' | 'sun' | 'moon' | 'coin' | 'feather' | 'duck' | 'wind' | 'gear' | 'fog' | 'drop' | 'snow' | 'cloud' | 'lock';

export const TABS: readonly TabDef[] = [
  { id: 'marsh', label: 'Marsh', icon: 'marsh', comingSoon: '', phase: 1 },
  { id: 'guide', label: 'Field Guide', icon: 'book', comingSoon: '', phase: 4 },
  { id: 'bots', label: 'Bots', icon: 'bot', comingSoon: '', phase: 2 },
  { id: 'upgrades', label: 'Upgrades', icon: 'hammer', comingSoon: '', phase: 2 },
  { id: 'jobs', label: 'Job Board', icon: 'board', comingSoon: '', phase: 3 },
  { id: 'workflows', label: 'Workflows', icon: 'rope', comingSoon: '', phase: 5 },
  { id: 'legacy', label: 'Legacy', icon: 'star', comingSoon: '', phase: 5 },
];
