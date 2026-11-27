# Duck Hunt Idle: notes for contributors

A cozy automation idle game (Vite + TypeScript, PixiJS scene, Preact HUD).
The sim lives in `src/sim` (pure TS, fixed 10 Hz), balance data in `src/data`,
drawing in `src/render`, HUD in `src/ui`. Run `npx tsc --noEmit`, `npx vitest run`
and `npm run build` before committing.

## Look and feel (applies to every new screen, card and feature)

- **Cozy lodge theme.** Warm parchment cards, wood, brass, sage and rust from the
  palette tokens in `src/styles/main.css`. Original, code-drawn art only.
- **No border accents on boxes.** No colored stripe on one side of a card
  (`border-left: 4px …`, `inset 3px 0 0 …`), no thick bottom or top accent bars.
  Show state with a soft background tint, a full thin outline or a gentle glow.
- **Rounded, soft cards** (`border-radius` 10–14px, light drop shadow).
- **Plain words.** Labels and tips read like Ray talking, not like a spreadsheet.
- **Phone first.** Everything must fit a narrow phone screen with no sideways
  scrolling; lists stay compact and easy to scan.
- **One popup per moment.** Combine related numbers (coins and feathers from a
  pickup) into a single popup; when lots happen at once, roll them into a tally.
- **Gentle motion.** Sparkles, rows easing in and counters ticking up are good;
  always respect the "Reduce animations" setting.
- **Numbers never flash.** No color flashes, size bounces, wobbles or pulses on
  numbers or prices; they just count. The top bar never shifts or resizes.

## Saves

- Bump `SAVE_VERSION` and add a migration in `src/sim/save.ts` for any state change.
- Never clear a player's save without keeping a backup (`backupNow`).
