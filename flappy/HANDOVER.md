# Flappy Bird Handover

## Overview

`index.html` is a complete, dependency-free Flappy Bird-style game. It renders a 288 × 512 playfield with Canvas and uses inline CSS and JavaScript; no build or install step is required.

## Run

Open `index.html` in a modern browser, or launch Flappy Bird from the Arcade Lab games page. The **Back to games** link returns to the root `index.html`.

## Controls and gameplay

- Click, tap, or press **Space** to start and flap.
- The bird passes through randomly positioned pipe gaps; touching a pipe or the ground ends the run.
- The score increases as each pipe pair is passed. The best score is saved in `localStorage` under `flappyBirdBest`.
- After game over, wait half a second before tapping or pressing Space to restart.

## Implementation notes

- Game simulation updates at a fixed 60 Hz, with elapsed frame time clamped to avoid large catch-up steps.
- Constants for physics, dimensions, pipe spacing, collision inset, and restart timing are at the top of the inline script.
- The canvas scales to the viewport while keeping its 9:16 aspect ratio. The top navigation is included in the available vertical space.
- Pipes, ground details, bird, clouds, and interface are drawn with canvas shapes and text. A short Web Audio beep plays on scoring where browser audio is available.

## Verification

Validated the inline script syntax and browser rendering, including canvas aspect-ratio resizing, gameplay input, scoring, and best-score persistence. No external libraries, fonts, or image assets are used.
