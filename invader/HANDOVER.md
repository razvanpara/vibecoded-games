# Block Invader — Handover

## Project

Block Invader is a single-player browser arcade shooter. The player pilots a ship at the bottom of the playfield and shoots randomly positioned groups of falling blocks. Waves keep arriving until a block reaches the ground or collides with the ship.

## Files and runtime

- `invader/index.html` is the complete game: HTML, CSS, canvas rendering, gameplay, input, and synthesized sound.
- Open the root `index.html` in a browser to access the arcade collection, or open `invader/index.html` directly. No Node server or build step is required.
- There are no game dependencies or build, lint, or test scripts.
- Google Fonts (Outfit and JetBrains Mono) are loaded externally. The game otherwise uses native Canvas and Web Audio APIs.

## Gameplay

- The playfield canvas is 800 × 600 px. It has 16 possible block columns, 46 px wide, at the top row.
- A wave spawns immediately at game start, then every 3 seconds. Each wave aims to occupy a random 20–70% of the canvas width, represented by 4–11 columns. Columns already occupied at the top are excluded; the actual count can be smaller when few columns remain free.
- Blocks descend continuously. Initial fall speed is 30 px/s. It increases by 10 px/s every five waves, capped at 500 px/s.
- **+ / =** increases fall speed by 10 px/s; **− / _** decreases it by 10 px/s. Manual adjustment is bounded from 10 to 500 px/s. Starting a fresh game resets it to 30 px/s.
- Each block destroyed adds one point. The game ends immediately if a block reaches the danger line or overlaps the player ship; there is no lives mechanic.
- The high score is stored in local storage under `invader_hiscore`.

## Controls

| Input | Action |
| --- | --- |
| **A/D** or **←/→** | Move ship |
| Hold **Space** | Fire continuously |
| **+ / =**, **− / _** | Increase/decrease block fall speed |
| **P** | Pause/resume |
| **M** | Toggle sound |
| **R** | Restart after game over |

Movement accelerates while a direction is held, up to 2.5× normal ship speed; releasing or changing direction resets the acceleration. Coarse-pointer/mobile layouts provide a left/right touch pad.

## Code map and handoff notes

The inline script in `index.html` contains the complete game. It defines canvas and gameplay constants, `spawnWave`, update/collision and scoring logic, rendering and effects, the animation loop, then keyboard, touch, pause, and sound controls. Main parameters such as wave cadence, grid size, speed bounds/increments, player acceleration, and firing cooldown are constants near the start of the script.

- Spawning uses a discrete 16-column grid, so a requested percentage is approximated by a whole number of columns rather than a continuous-width formation.
- Top-row occupied columns are not reused while those blocks remain near the top, to reduce direct overlap between new waves.
- Each bullet destroys only the first intersecting block; bullets are not limited by an on-screen count.
- The game uses delta time (seconds) for movement and fall speed. Keep time units consistent when adjusting speed or wave intervals.
- Validate changes in a browser; the project does not have an automated test suite.
