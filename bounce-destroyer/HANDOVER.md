# Bounce Destroyer — Handover

## Project

Bounce Destroyer is a standalone browser arcade game inspired by brick-breaker games. Keep the ball in play with a movable platform, bounce it into stationary colored blocks, and clear each formation to advance. The game has three lives; losing the ball costs one, and the game ends when lives run out.

## Files and runtime

- `bounce-destroyer/index.html` contains the complete game: markup, styles, canvas rendering, game state, physics, controls, and audio.
- Open the root `index.html` in a browser to access the arcade collection, or open `bounce-destroyer/index.html` directly. No Node server or build step is required.
- There are no game dependencies or build/test scripts.
- Outfit and JetBrains Mono fonts are loaded from Google Fonts. Graphics and sound effects use native Canvas and Web Audio APIs.

## Gameplay and controls

- Fixed 800 × 600 canvas with a 10-column × 5-row stationary block formation.
- The ball spawns centered below the blocks and above the platform, initially moving downward. It bounces off the side walls, ceiling, platform, and blocks. Each block is removed on impact and awards 10 points.
- Platform bounce direction combines the incoming ball angle, horizontal impact offset, and platform velocity at contact. Each successful bounce slightly increases ball speed; speed is capped at 570 px/s.
- The ball falling below the canvas costs a life and respawns after a short delay. Clearing all blocks advances the level, regenerates the formation, and increases ball speed. The high score persists in local storage under `bounce_destroyer_hiscore`.
- **A/D** or **←/→** move the platform. On mobile, use the enlarged left/right pad at the bottom of the viewport or drag/tap the playfield to position it; the playfield remains above the touch controls.
- **P** pauses/resumes; **M** toggles sound; **R** starts a fresh game. Start, resume, and replay buttons are also available.

## Code map and handoff notes

The inline script in `index.html` is self-contained:

1. DOM references, canvas/game constants, and mutable state.
2. `makeBlocks`, score/lives helpers, sound, and ball reset/start logic.
3. `collideBlock` and `update` handle ball physics, platform bounce, scoring, life loss, and level progression.
4. `draw` and `loop` render the field and run the animation.
5. Keyboard, pointer/touch, and button handlers provide controls and UI state.

- Update uses delta time in seconds; physics speeds are expressed in pixels per second.
- Ball/block collision tests use previous and current ball positions to choose a bounce side. Revisit collision handling if changing ball speed or block geometry significantly.
- `previousBall` is assigned but is not currently used; the collision function receives the previous x/y directly.
- The game currently advances automatically to a new formation after all blocks are cleared; there is no terminal win state.
- Verify start/restart, pause/resume, scoring, wall/block/platform bounces, life loss, level progression, audio toggle, and touch behavior in a browser. No automated test suite is configured.
