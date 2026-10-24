# Neon Roll

Neon Roll is a dependency-free Canvas 2D game. It uses native browser JavaScript, HTML, CSS, and the Web Audio API; there is no Phaser or physics-engine dependency to install.

## Run locally without a server

Open the repository's root `index.html` in your browser, select **Neon Roll**, then press **Play**. You can also open `neon-roll/index.html` directly. The game uses ordinary relative scripts and stylesheets—no server, module loader, build step, or install is required.

Opening a page from disk can give each game a separate local-storage origin, depending on the browser. Best-distance saving is attempted when the browser permits local storage and safely skipped when it does not. Hosting on HTTP(S) also works if you prefer it.

## Embed

Host the game folder and embed its page:

```html
<iframe
  src="https://example.com/neon-roll/"
  title="Neon Roll"
  width="960"
  height="600"
  style="width: 100%; max-width: 960px; border: 0"
  loading="lazy"
></iframe>
```

The game does not request fullscreen or take over its parent page. Best distance is stored in local storage for the game’s origin.

## Implementation

The game draws into a responsive Canvas using a fixed 960 × 540 world and a 120 Hz fixed-step update, with momentum, gravity, jump buffering, and coyote time. Its seeded generator selects among ten handcrafted chunks, maintains a bounded set of nearby platforms and entities, and increases the obstacle pool with distance. The world is periodically rebased to keep physics coordinates bounded.

The collision model uses one-way platform tops and axis-aligned lethal hazards; it is intentionally lightweight rather than a general-purpose rigid-body simulation. Audio is synthesized in-browser after player interaction and can be muted.

Press the backtick key during a run to toggle the debug overlay, which shows the run seed, active chunk, velocity, grounded state, difficulty tier, and active object count.
