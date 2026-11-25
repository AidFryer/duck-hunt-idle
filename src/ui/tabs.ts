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
  { id: 'bots', label: 'Bots', icon: 'bot', comingSoon: 'The carving bench is still covered in sawdust. Decoy-bots arrive soon.', phase: 2 },
  { id: 'jobs', label: 'Job Board', icon: 'board', comingSoon: 'An empty corkboard and a tin of thumbtacks. Jobs get pinned here once the bots are carved.', phase: 3 },
  { id: 'workflows', label: 'Workflows', icon: 'rope', comingSoon: 'A coil of rope for linking jobs into chains. Unlocks mid-season.', phase: 5 },
  { id: 'upgrades', label: 'Upgrades', icon: 'hammer', comingSoon: 'Flooded timber, food plots and better blinds. The shovels are ready.', phase: 4 },
  { id: 'guide', label: 'Field Guide', icon: 'book', comingSoon: 'A leather-bound guide with blank pages, waiting for its first entry.', phase: 4 },
  { id: 'legacy', label: 'Legacy', icon: 'star', comingSoon: "The lodge's legacy wall. Close your first season to hang something here.", phase: 5 },
];
