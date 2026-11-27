/**
 * Lodge projects: big builds you fund bit by bit. Each has four stages,
 * and every finished stage gives a lasting bonus (kept across seasons).
 */
export type ProjectId = 'boathouse' | 'carvingShop' | 'lookout';

export interface ProjectStage {
  name: string;
  /** What finishing it does, in plain words. */
  does: string;
  coins: number;
  feathers: number;
}

export interface ProjectDef {
  id: ProjectId;
  name: string;
  blurb: string;
  stages: readonly [ProjectStage, ProjectStage, ProjectStage, ProjectStage];
}

export const PROJECTS: Record<ProjectId, ProjectDef> = {
  boathouse: {
    id: 'boathouse', name: 'The Boathouse', blurb: 'A proper home for the boats, down by the water.',
    stages: [
      { name: 'Rowboat Rack', does: 'Fetching is 10% faster.', coins: 50_000, feathers: 5_000 },
      { name: 'Slip & Winch', does: 'One more flock can work the decoys at once.', coins: 5_000_000, feathers: 300_000 },
      { name: 'Motor Launch', does: 'Flocks come to the timber and the bay 20% more often.', coins: 500_000_000, feathers: 20_000_000 },
      { name: "Harbor Master's Office", does: 'Timber Guides and Bay Boatmen work 30% faster.', coins: 50_000_000_000, feathers: 1_500_000_000 },
    ],
  },
  carvingShop: {
    id: 'carvingShop', name: 'The Carving Shop', blurb: 'Benches, chisels and the smell of fresh cedar.',
    stages: [
      { name: 'Workbench', does: 'New bots cost 5% less.', coins: 20_000, feathers: 2_000 },
      { name: 'Lathe', does: 'Crew gear costs 25% less.', coins: 2_000_000, feathers: 150_000 },
      { name: 'Paint Loft', does: 'Decoys cost 20% less on every ground.', coins: 200_000_000, feathers: 10_000_000 },
      { name: 'Master Carver', does: 'Every bird pays 15% more coins.', coins: 20_000_000_000, feathers: 1_000_000_000 },
    ],
  },
  lookout: {
    id: 'lookout', name: 'The Lookout Tower', blurb: 'Climb up at dawn and you can see the flocks coming.',
    stages: [
      { name: 'Platform', does: 'Flocks come to the marsh 8% more often.', coins: 30_000, feathers: 3_000 },
      { name: 'Spyglass', does: 'Golden flocks turn up 30% more often.', coins: 3_000_000, feathers: 200_000 },
      { name: 'Signal Lamp', does: 'Circling flocks wait 15% longer.', coins: 300_000_000, feathers: 15_000_000 },
      { name: 'Weather Vane', does: 'Named days come twice as often.', coins: 30_000_000_000, feathers: 1_200_000_000 },
    ],
  },
};

export const PROJECT_ORDER: readonly ProjectId[] = ['carvingShop', 'lookout', 'boathouse'];
/** Lodge level that opens the projects. */
export const PROJECTS_LODGE = 2;
