# Handover Document: Chroma Snake (Arcade Edition)

## 1. Project Overview & Architecture
The project is a browser game featuring persistent multi-colored trailing square mechanics, organic snake visuals, synthesized audio, food lifecycle mechanics, and hazard obstacles.

- **Workspace Path**: `d:\_dev\my-playground`
- **Entry Points**:
  - `index.html` at the workspace root: Static arcade landing page linking to each game.
  - `snake/index.html`: Self-contained Snake UI, CSS, canvas effects, synthesized Web Audio, and game logic.
- Open the root `index.html` in a browser to choose a game, or open `snake/index.html` directly. No Node server or build step is required.

---

## 2. Gameplay Mechanics & Visual Features

### Grid & Viewport
- **Grid Cell Size**: `40px` (`size = 40`).
- **Play Area Dimensions**: `800px` width $\times$ `600px` height ($20 \times 15$ cells).
- **Edge Fitting**: `#viewport` uses `box-sizing: content-box` with an exterior border so edge cells ($x=760\text{px}$, $y=560\text{px}$) fit completely without cropping.

### Snake & Food Visuals
- **Snake Design**:
  - Head has animated eyes with pupils that look towards movement direction, and dynamic snout border-radius on turns.
  - Segments have rounded corners with inset scale accents; the tail tapers organically.
  - Direction chevron is positioned between the eyes.
- **Arcade Apple Food**: Styled like a fruit with a brown stem, green leaf, and specular highlight.
- **Deadly Bomb Hazard**:
  - Dark metallic sphere with animated fuse, flickering spark, skull icon, and pulsating red aura.
  - **Bomb Lifecycle**: Spawns alongside food cycles and **lasts exactly as long as the current food item** (despawns immediately when the food is eaten).
  - **Instant Kill**: Eating or colliding with the bomb triggers an explosion sound, dense particle burst, and GAME OVER.

### Segment Mechanics & Colors
- **Initial State**: 2 horizontal squares centered at $(400, 280)$ and $(360, 280)$, moving `RIGHT`.
- **Persistent Non-Repeating Colors**: Each segment permanently maintains its own gradient color from `colorPalette`.
- **Food Absorption & Reverse Progression**:
  - When the snake's head steps on food, the food disappears from the board immediately.
  - A new segment with the eaten food's color is inserted **directly behind the head (index 1)**.
  - On subsequent moves, the food square's color swaps backwards down the body (`index 1 -> 2 -> ... -> tail`) until it reaches the last segment, where it permanently settles.
- **Food Respawn**: Spawns **exactly 2 moves** after the previous food was eaten (`foodRespawnCountdown = 2`).

### Audio & Particles
- **Web Audio**: Native synthesized sound effects for chimes, turning ticks, speed level-ups, game-over buzz, and explosion crunch. Mute toggleable with <kbd>M</kbd>.
- **Particles**: Colorful canvas confetti on eating food and fiery dense burst on bomb detonation.

---

## 3. Controls Reference

The game opens with a start screen. Select **Start Game** to begin; Auto Run is enabled by default on each start/restart. While Auto Run is on, the first valid direction input is buffered for the next timer tick; further direction inputs are ignored until that tick moves the snake. This prevents multiple quick key presses from chaining turns in place. Turn Auto Run off to move one tile per direction input, with inputs limited to one per movement interval.

| Control | Action |
| :--- | :--- |
| <kbd>W</kbd> / <kbd>&uarr;</kbd> | Move UP |
| <kbd>A</kbd> / <kbd>&larr;</kbd> | Move LEFT |
| <kbd>S</kbd> / <kbd>&darr;</kbd> | Move DOWN |
| <kbd>D</kbd> / <kbd>&rarr;</kbd> | Move RIGHT |
| <kbd>Space</kbd> | Toggle Auto-Run |
| <kbd>P</kbd> | Pause / Resume Game |
| <kbd>T</kbd> | Toggle Teleport Mode (Wrap-around vs Wall Death) |
| <kbd>M</kbd> | Mute / Unmute Audio FX |
| <kbd>+</kbd> / <kbd>=</kbd> | Increase Speed Tier |
| <kbd>-</kbd> / <kbd>_</kbd> | Decrease Speed Tier |
| <kbd>R</kbd> | Restart Game |
