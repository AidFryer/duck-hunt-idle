# Duck Hunt Idle

A cozy automation idle game. You inherit a run-down duck marsh and an old
hunting lodge, then carve little wooden decoy-bots to run the place while you
sip coffee in the blind at dawn.

> The game's name lives in one place: `GAME_TITLE` in `src/config.ts`.

**Play the latest build:** <https://claude.ai/artifact/22yXQskjPm1t3hQALT4TGe>
(private to the repo owner; built with `npm run build:artifact`).

## Run it locally

You need **Node.js 22 or newer** (the "LTS" download from nodejs.org is fine).

```powershell
npm install      # first time only: downloads the libraries
npm run dev      # starts the game at http://localhost:5173
```

Other commands:

| Command | What it does |
|---|---|
| `npm test` | Runs the unit tests for the simulation |
| `npm run typecheck` | Checks the TypeScript for mistakes |
| `npm run build` | Makes a production build in `dist/` |
| `npm run preview` | Serves the production build locally |
| `npm run build:artifact` | Production build plus `dist/artifact.html` for the claude.ai play page |

New to Git on Windows? See **[docs/GETTING_STARTED_WINDOWS.md](docs/GETTING_STARTED_WINDOWS.md)**.

## How the code is organised

```
src/
  config.ts        GAME_TITLE and global constants
  main.ts          boots the sim, the renderer and the HUD
  data/            ALL design/balance data: palette tokens, day cycle, (later) bots, species, costs
  sim/             pure TypeScript game simulation — no Pixi, no DOM; fixed 10 ticks/sec; unit tested
  render/          PixiJS marsh scene; reads sim state, never writes it
    assets/        procedural textures behind a TextureLibrary (swap in hand-drawn art by key)
    layers/        sky, clouds, land, water, shore, blind, reeds, ducks, fog, effects, overlay
  ui/              Preact HUD (top bar, tabs, panels)
  util/            math & color helpers
tests/             Vitest specs
```

Rules the code follows:

- The **simulation is separate from rendering**. `src/sim` can run headless
  (tests, offline progress) and never imports Pixi or touches the DOM.
- **No magic numbers in logic** — tunable values live in `src/data`.
- All art is **drawn in code** (Canvas 2D / Pixi Graphics), so the game ships
  with zero image files. Every texture is requested by key from
  `TextureLibrary`, so real sprites can replace any of them later.

## Build status

- [x] Phase 1: scaffold, palette, animated marsh (day cycle, water, reeds, fog, flocks), responsive layout
- [x] Phase 2: core loop (manual hunt, currencies, saves, first bots)
- [x] Phase 3: automation (job board, flock queue, exceptions, foremen)
- [x] Phase 4: species, weather, upgrades, achievements, offline progress
- [ ] Phase 5: workflows and prestige
- [ ] Phase 6: polish, audio, tutorial, balancing
- [ ] Phase 7: PWA, GitHub Pages deploy, Capacitor
