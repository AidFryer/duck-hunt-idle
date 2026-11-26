# Duck Hunt Idle

A cozy automation idle game. You inherit a run-down duck marsh and an old
hunting lodge, hunt it by hand, then carve little wooden decoy-bots to run the
place: job boards, workflow chains, foremen that handle problems, and a lodge
that grows into a famous destination. The marsh runs itself while you sip
coffee in the blind at dawn.

**Play it:** <https://aidfryer.github.io/duck-hunt-idle/>. Works on phones and
computers, installs to your home screen, and plays offline.

> The game's name lives in one place: `GAME_TITLE` in `src/config.ts`.

## Features

- **The hunt:** tap the marsh itself: the water to set decoys, a circling flock to call it, ducks over the decoys to shoot, a floating bird to send the dog (keys D / C / S / R on a keyboard). Gus logs every bird at the lodge. Quick taps build a Hunter's Rhythm bonus, and a First Light gift waits each new day.
- **Eight decoy-bots** (Scout, Decoy Setter, Caller, Blind, Robo-Retriever,
  Ledger, Foreman, Tinker), each with its own post and animations.
- **Job Board:** move bots between jobs, watch throughput, queues and a 60s
  sparkline per job.
- **Problems & foremen:** stuck bots, tap-to-fix, and foremen that retry
  with a retry count and backoff you choose; a Problem Log.
- **Workflows:** tie job cards together with rope for chain bonuses.
- **Nine species** with a Field Guide, **weather** with a forecast, marsh
  upgrades, **20 achievement patches**, and offline progress with a
  "While you were away…" summary.
- **Prestige:** Close the Season for Flyway Stars, spend them in the Lodge
  Legacy tree, and move on to the Central Flyway.
- All art and sound are **generated in code**. There are no image or audio files.

## Run it locally

You need **Node.js 22 or newer**. New to this on Windows? See
**[docs/GETTING_STARTED_WINDOWS.md](docs/GETTING_STARTED_WINDOWS.md)**.

```powershell
npm install      # first time only
npm run dev      # http://localhost:5173
```

| Command | What it does |
|---|---|
| `npm run dev` | Start the game with live reload |
| `npm test` | Run the unit tests (sim, economy, saves, balance) |
| `npm run balance` | Play two simulated hours and print the pacing report |
| `npm run typecheck` | Check the TypeScript |
| `npm run build` | Production build in `dist/` (PWA included) |
| `npm run preview` | Serve the production build locally |
| `npm run build:artifact` | Build plus `dist/artifact.html` for the claude.ai play page |
| `npm run cap:android` / `cap:ios` | Build and open the native app projects (see below) |

## Deploying

Every push to `main` or `claude/duck-hunt-idle-game-05ie4u` runs
`.github/workflows/pages.yml`: it tests, builds and publishes `dist/` to the
`gh-pages` branch, which GitHub Pages serves at the link above. A separate CI
workflow type-checks, tests and builds every push.

## Phone apps

The game is a PWA: open the link on a phone and choose **Install app** (in
Settings, on Android/Chrome) or **Share → Add to Home Screen** (iPhone).
To build real Play Store / App Store apps with Capacitor, see
**[docs/MOBILE_APPS.md](docs/MOBILE_APPS.md)**.

## How the code is organised

```
src/
  config.ts        GAME_TITLE and global constants
  main.ts          boots the sim, renderer, HUD, audio, saves and offline catch-up
  data/            ALL design & balance data: palette, day cycle, economy, species,
                   weather, upgrades, achievements, workflows, legacy, flyways, goals
  sim/             pure TypeScript simulation — no Pixi, no DOM; fixed 10 ticks/sec
  render/          PixiJS marsh scene; reads sim state, never writes it
    assets/        procedural textures behind a TextureLibrary (swap in real art by key)
    layers/        sky, clouds, land, water, shore, plots, timber, blind, crew,
                   reeds, ducks, fog, effects, weather, overlay
  audio/           procedural Web Audio (ambience, effects, music)
  ui/              Preact HUD: tabs, cards, drawers, tutorial, feedback
  app/             saves, preferences, PWA install
tests/             Vitest specs, including the two-hour balance test
```

Rules the code follows:

- The **simulation is separate from rendering**. `src/sim` runs headless (tests,
  offline progress, the balance autoplayer) and never touches Pixi or the DOM.
- **No magic numbers in logic.** Tunable values live in `src/data`.
- Saves are **versioned with migrations** (`src/sim/save.ts`), autosave every
  15 seconds and when the page is hidden, and export/import as a base64 code.
- Every texture is requested by key from `TextureLibrary`, so hand-drawn
  sprites can replace any procedural art without touching game code.

## Balance

`tests/balance.test.ts` plays two hours with a scripted attentive player
(`src/sim/autoplay.ts`) and fails if the pace drifts: first bot within
seconds; new stages open at about 4 minutes (Upgrades), 10 (Field Guide),
20 (Job Board), an hour (Workflows) and two hours (Legacy); the first Flyway
Star takes about 2–2.5 hours; later seasons go faster thanks to stars and perks.

## Build status

- [x] Phase 1: scaffold and animated marsh scene
- [x] Phase 2: core loop (manual hunt, currencies, saves, first bots)
- [x] Phase 3: automation (job board, flock queue, problems, foremen)
- [x] Phase 4: species, weather, upgrades, achievements, offline progress
- [x] Phase 5: workflows, prestige and the Central Flyway
- [x] Phase 6: polish, audio, tutorial, balancing
- [x] Phase 7: PWA, GitHub Pages deploy, Capacitor
