# Obstacle Course — Handover

## Overview and runtime

Obstacle Course is a single-player browser survival game in the same arcade style as Block Invader. Move the smaller ship left and right to avoid groups of colored blocks that fall from the top. Survive as long as possible; contact with any block ends the game. Blocks that pass the bottom edge disappear.

- `obstacle-course/index.html` contains the entire game: HTML/CSS, canvas drawing, game logic, controls, and synthesized audio.
- Open the root `index.html` in a browser to access the arcade collection, or open `obstacle-course/index.html` directly. No Node server or build step is required.
- No game-specific dependencies, build scripts, or automated tests are configured. Google Fonts are external; visuals use Canvas and sound uses Web Audio.

## Gameplay

- Canvas coordinate space: 800 × 600 px; 16 possible columns. Falling blocks are 46 × 32 px. The player collision box is 30 × 22 px.
- A random wave spawns immediately and then every 1.5 seconds. Each wave targets 20–70% playfield width (approximately 4–11 columns); already occupied top columns are avoided when possible.
- Initial block speed is 90 px/s, three times Block Invader's 30 px/s starting speed. Speed increases by 10 px/s every 5 waves, with a 500 px/s cap.
- **+ / =** and **− / _** adjust fall speed in 10 px/s steps, bounded from 10 to 500 px/s. Starting a new game resets speed to 90 px/s.
- Blocks are not destroyed or scored individually. They are removed after passing the bottom of the canvas. A block intersecting the player ends the run immediately.
- Survival time is the score, displayed as whole seconds. Best survival is stored in local storage under `obstacle_course_hiscore`.

## Controls

| Input | Action |
| --- | --- |
| **A/D** or **←/→** | Move player left/right |
| **+ / =**, **− / _** | Increase/decrease falling speed |
| **P** | Pause/resume |
| **M** | Toggle sound |
| **R** | Restart after game over |

Movement accelerates while holding a direction, up to 2.5× normal speed; releasing or switching directions resets acceleration. Mobile/coarse-pointer layouts put the playfield above enlarged left/right touch buttons at the bottom of the viewport.

## Code map and notes

The inline script in `index.html` is self-contained. `spawnWave` generates random top-row columns and raises speed every five waves; `update` handles movement, survival time, wave timing, block descent, off-screen cleanup, and collision; `draw` and `loop` render and animate; the remaining functions handle game state, audio, keyboard, and touch input.

The animation uses delta time in seconds, with a 50 ms frame-delta cap. Blocks are removed once their top is below the canvas, and the player collision check runs before that cleanup. Keep the player/block bounds and timing units consistent when tuning geometry or speeds. Verify start/restart, pause, collision, bottom cleanup, speed controls, wave cadence, and touch input in a browser.
