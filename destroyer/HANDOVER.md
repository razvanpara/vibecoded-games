# Block Destroyer — Handover

## Project

Block Destroyer is a single-player, browser-based arcade shooter in the same visual family as the Chroma Snake game in this workspace. The player controls a ship at the bottom of the screen and fires at descending colored blocks. Clear the field to advance to the next, faster level; if a block reaches the ground or ship, the game ends.

## Files and runtime

- `destroyer/index.html` contains the complete game: markup, styling, canvas rendering, game state, input handling, audio, and responsive layout.
- Open the root `index.html` in a browser to access the arcade collection. You can also launch `destroyer/index.html` directly; no Node server or build step is required.
- There are no game/build dependencies or test, lint, and build scripts.
- Google Fonts (Outfit and JetBrains Mono) are loaded from Google Fonts; the game otherwise uses native Canvas and Web Audio APIs without image or audio assets.

## Gameplay and controls

- Canvas size: 800 × 600 pixels. The field starts with 16 columns × 7 rows of blocks.
- Move left/right with **A/D** or **←/→**; hold **Space** to fire. Bullets have a 250 ms cooldown and at most two can be active at once.
- **P** pauses/resumes, **M** toggles sound, and **R** restarts after game over. Start and restart buttons are also available.
- Touch/coarse-pointer layouts show enlarged left/right/fire controls at the bottom of the viewport, below the playfield.
- Blocks descend by one row every 5 seconds initially. The interval is reduced by 15% each level, down to a 1.2-second minimum.
- Destroying a block adds one point. Clearing the field increments the level, rebuilds the blocks, and clears active bullets.
- The high score is stored in browser `localStorage` under `destroyer_hiscore`.
- Synthesized sound effects are generated with Web Audio; particle bursts and floating score labels are drawn on the canvas.

## Code map

The game script is inline near the end of `destroyer/index.html`. Its main sections are:

1. DOM references, canvas geometry, palette, and mutable game state.
2. Web Audio helpers (`getAudio`, `playSound`) and block/row helpers.
3. Canvas drawing and effects for the ship, bullets, blocks, particles, and HUD indicator.
4. Score/level updates, game-over and level-clear handling, reset, update, and animation loop.
5. Keyboard, button, touch/mouse D-pad, and responsive scaling handlers.

The canvas uses a fixed internal resolution and the wrapper is CSS-scaled to fit the viewport. Keep the game's coordinate constants and player/block collision checks consistent if changing canvas geometry.

## Handoff notes / caveats

- The HUD displays three hearts, but `lives` is currently cosmetic: it is initialized/reset to 3 and is not decremented. Any block reaching the ground or overlapping the ship immediately triggers game over. Preserve that behavior unless implementing an actual lives mechanic.
- `fireHeld`, `player.shooting`, each block's `hp`, and `lowestAliveRow()` appear unused in current gameplay. Check references before building on them or removing them.
- The animation loop updates movement and effects frame-by-frame (some timing is delta-based, some speeds are per frame). Take care when changing frame timing or making speed behavior independent of refresh rate.
- There is no automated test suite. Verify gameplay in a browser after changes, including start/pause/restart, keyboard and touch controls, level progression, collisions, sound toggle, and narrow viewport scaling.
