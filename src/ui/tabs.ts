/** Panel tabs and the phase in which each one unlocks during development. */
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
export type IconName = 'marsh' | 'bot' | 'board' | 'rope' | 'hammer' | 'book' | 'star' | 'sun' | 'moon' | 'coin' | 'feather' | 'duck' | 'wind' | 'gear';

export const TABS: readonly TabDef[] = [
  { id: 'marsh', label: 'Marsh', icon: 'marsh', comingSoon: '', phase: 1 },
  { id: 'bots', label: 'Bots', icon: 'bot', comingSoon: '', phase: 2 },
  { id: 'jobs', label: 'Job Board', icon: 'board', comingSoon: '', phase: 3 },
  { id: 'workflows', label: 'Workflows', icon: 'rope', comingSoon: 'A coil of rope for linking jobs into chains. Unlocks mid-season.', phase: 5 },
  { id: 'upgrades', label: 'Upgrades', icon: 'hammer', comingSoon: '', phase: 2 },
  { id: 'guide', label: 'Field Guide', icon: 'book', comingSoon: 'A leather-bound guide with blank pages, waiting for its first entry.', phase: 4 },
  { id: 'legacy', label: 'Legacy', icon: 'star', comingSoon: "The lodge's legacy wall. Close your first season to hang something here.", phase: 5 },
];
