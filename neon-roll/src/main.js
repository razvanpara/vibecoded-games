const config = window.NEON_ROLL_CONFIG;
const CHUNK_LIBRARY = window.NEON_ROLL_CHUNKS;

if (!config || !CHUNK_LIBRARY) {
  throw new Error('Neon Roll configuration did not load.');
}

const BEST_DISTANCE_KEY = 'neon-roll-best-distance';
const $ = (selector) => {
  const element = document.querySelector(selector);
  if (!element) throw new Error(`Missing Neon Roll element: ${selector}`);
  return element;
};

const ui = {
  canvas: $('#game-canvas'),
  container: $('#game-container'),
  play: $('#play-button'),
  pause: $('#pause-button'),
  resume: $('#resume-button'),
  pauseRestart: $('#pause-restart-button'),
  restart: $('#restart-button'),
  mute: $('#mute-toggle'),
  startScreen: $('#start-screen'),
  pauseMenu: $('#pause-menu'),
  gameOver: $('#game-over'),
  hud: $('#hud'),
  touchControls: $('#touch-controls'),
  distance: $('#distance-value'),
  best: $('#best-value'),
  energy: $('#energy-value'),
  tier: $('#tier-value'),
  bestStart: $('#best-start'),
  finalDistance: $('#final-distance'),
  finalEnergy: $('#final-energy'),
  finalBest: $('#final-best'),
};

const context = ui.canvas.getContext('2d', { alpha: false });
if (!context) throw new Error('Neon Roll could not create a 2D canvas context.');

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);
const formatDistance = (pixels) => `${Math.floor(pixels / 10)} m`;
const isTouchLayout = () => window.matchMedia('(pointer: coarse), (max-width: 720px)').matches;
const input = { left: false, right: false, jumpBuffer: 0 };

function readBestDistance() {
  try {
    const stored = Number(window.localStorage.getItem(BEST_DISTANCE_KEY));
    return Number.isFinite(stored) && stored > 0 ? stored : 0;
  } catch (error) {
    console.warn('Neon Roll could not read the saved best distance.', error);
    return 0;
  }
}

function seededRandom(seed) {
  let value = seed >>> 0;
  return () => {
    value += 0x6d2b79f5;
    let next = value;
    next = Math.imul(next ^ (next >>> 15), next | 1);
    next ^= next + Math.imul(next ^ (next >>> 7), next | 61);
    return ((next ^ (next >>> 14)) >>> 0) / 4294967296;
  };
}

class NeonRollGame {
  constructor() {
    this.state = 'menu';
    this.muted = false;
    this.debug = false;
    this.audioContext = null;
    this.bestDistance = readBestDistance();
    this.distance = 0;
    this.energy = 0;
    this.tier = 1;
    this.player = null;
    this.chunks = [];
    this.platforms = [];
    this.hazards = [];
    this.collectibles = [];
    this.particles = [];
    this.cameraX = 0;
    this.nextChunkX = 0;
    this.simulationTime = 0;
    this.accumulator = 0;
    this.lastFrameTime = 0;
    this.uiTimer = 0;
    this.random = Math.random;
    this.seed = 0;
    this.resizeObserver = null;
    this.backgroundStars = Array.from({ length: 115 }, (_, index) => ({
      x: (index * 173 + 57) % 2000,
      y: (index * 89 + 31) % 380,
      radius: 0.7 + (index % 4) * 0.45,
      alpha: 0.22 + (index % 5) * 0.12,
    }));
    this.resizeCanvas();
    this.watchResize();
    this.resetRun();
    this.updateBestLabels();
    this.bindEvents();
    this.setState('menu');
    this.frame = this.frame.bind(this);
    requestAnimationFrame(this.frame);
  }

  watchResize() {
    if ('ResizeObserver' in window) {
      this.resizeObserver = new ResizeObserver(() => this.resizeCanvas());
      this.resizeObserver.observe(ui.container);
    } else {
      window.addEventListener('resize', () => this.resizeCanvas());
    }
  }

  resizeCanvas() {
    const bounds = ui.container.getBoundingClientRect();
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    ui.canvas.width = Math.max(1, Math.round(bounds.width * ratio));
    ui.canvas.height = Math.max(1, Math.round(bounds.height * ratio));
    this.renderScale = Math.min(ui.canvas.width / config.width, ui.canvas.height / config.height);
    this.renderOffsetX = (ui.canvas.width - config.width * this.renderScale) / 2;
    this.renderOffsetY = (ui.canvas.height - config.height * this.renderScale) / 2;
    if (this.state) ui.touchControls.classList.toggle('hidden', !isTouchLayout() || this.state !== 'running');
  }

  bindEvents() {
    ui.play.addEventListener('click', () => this.startRun());
    ui.pause.addEventListener('click', () => this.togglePause());
    ui.resume.addEventListener('click', () => this.togglePause());
    ui.pauseRestart.addEventListener('click', () => this.startRun());
    ui.restart.addEventListener('click', () => this.startRun());
    ui.mute.addEventListener('click', () => {
      this.muted = !this.muted;
      ui.mute.textContent = this.muted ? '🔇' : '🔊';
      ui.mute.setAttribute('aria-pressed', String(this.muted));
      ui.mute.setAttribute('aria-label', this.muted ? 'Unmute sound' : 'Mute sound');
    });

    window.addEventListener('keydown', (event) => this.onKeyDown(event));
    window.addEventListener('keyup', (event) => this.onKeyUp(event));
    window.addEventListener('blur', () => this.clearInput());
    document.addEventListener('visibilitychange', () => {
      if (document.hidden && this.state === 'running') this.togglePause();
    });

    this.bindTouchButton('#brake-control', 'left');
    this.bindTouchButton('#accelerate-control', 'right');
    const jumpButton = $('#jump-control');
    jumpButton.addEventListener('pointerdown', (event) => {
      event.preventDefault();
      input.jumpBuffer = config.jumpBuffer;
      jumpButton.setPointerCapture(event.pointerId);
    });

  }

  bindTouchButton(selector, action) {
    const button = $(selector);
    button.addEventListener('pointerdown', (event) => {
      event.preventDefault();
      input[action] = true;
      button.setPointerCapture(event.pointerId);
    });
    const release = () => { input[action] = false; };
    button.addEventListener('pointerup', release);
    button.addEventListener('pointercancel', release);
    button.addEventListener('lostpointercapture', release);
  }

  onKeyDown(event) {
    const key = event.code;
    if (key === 'KeyR' && !event.repeat) {
      event.preventDefault();
      this.startRun();
      return;
    }
    if (key === 'KeyP' && (this.state === 'running' || this.state === 'paused')) {
      event.preventDefault();
      this.togglePause();
      return;
    }
    if (key === 'Backquote' && (this.state === 'running' || this.state === 'paused')) {
      event.preventDefault();
      this.debug = !this.debug;
      return;
    }
    if (key === 'Escape' && (this.state === 'running' || this.state === 'paused')) {
      event.preventDefault();
      this.togglePause();
      return;
    }
    if (this.state !== 'running') return;

    if (['ArrowLeft', 'ArrowRight', 'Space'].includes(key)) event.preventDefault();
    if (key === 'KeyA' || key === 'ArrowLeft') input.left = true;
    if (key === 'KeyD' || key === 'ArrowRight') input.right = true;
    if (key === 'Space' && !event.repeat) input.jumpBuffer = config.jumpBuffer;
  }

  onKeyUp(event) {
    if (event.code === 'KeyA' || event.code === 'ArrowLeft') input.left = false;
    if (event.code === 'KeyD' || event.code === 'ArrowRight') input.right = false;
  }

  clearInput() {
    input.left = false;
    input.right = false;
    input.jumpBuffer = 0;
  }

  resetRun(seed = 0) {
    this.distance = 0;
    this.energy = 0;
    this.tier = 1;
    this.simulationTime = 0;
    this.accumulator = 0;
    this.cameraX = 0;
    this.nextChunkX = 0;
    this.chunks = [];
    this.platforms = [];
    this.hazards = [];
    this.collectibles = [];
    this.particles = [];
    this.seed = seed;
    this.random = seed ? seededRandom(seed) : Math.random;
    this.chunksGenerated = 0;
    this.player = {
      x: 145,
      y: 436,
      previousX: 145,
      previousY: 436,
      velocityX: 300,
      velocityY: 0,
      rotation: 0,
      grounded: true,
      coyote: config.coyoteTime,
    };
    this.addChunk(CHUNK_LIBRARY[0]);
    while (this.chunks.length < config.chunksAhead) this.addNextChunk();
    this.refreshHud();
  }

  addNextChunk() {
    const tier = Math.min(config.difficultyCap, 1 + Math.floor(this.distance / 1200));
    this.tier = tier;
    const eligible = CHUNK_LIBRARY.filter((chunk) => chunk.minTier <= tier && chunk.maxTier >= tier);
    if (this.chunksGenerated < 3) {
      this.addChunk(CHUNK_LIBRARY.find((chunk) => chunk.name === 'safe-flat'));
      return;
    }
    if (this.chunksGenerated === 3) {
      const tutorialGap = CHUNK_LIBRARY.find((chunk) => chunk.name === 'short-gap');
      this.addChunk({ ...tutorialGap, hazards: [] });
      return;
    }
    const recoveryChunks = eligible.filter((chunk) => chunk.name === 'safe-flat' || chunk.name === 'short-gap');
    const previous = this.chunks[this.chunks.length - 1];
    const previousWasHard = previous && previous.template.minTier >= 3;
    const forceRecovery = this.chunksGenerated % 4 === 3 || previousWasHard;
    const pool = forceRecovery && recoveryChunks.length ? recoveryChunks : eligible;
    let template = pool[Math.floor(this.random() * pool.length)];
    if (pool.length > 1 && previous && template.name === previous.template.name) {
      template = pool[(pool.indexOf(template) + 1 + Math.floor(this.random() * (pool.length - 1))) % pool.length];
    }
    this.addChunk(template);
  }

  addChunk(template) {
    const origin = this.nextChunkX;
    const chunk = { origin, width: template.width, template, platforms: [], hazards: [], collectibles: [] };
    for (const platform of template.platforms) {
      const item = { x: origin + platform.x, width: platform.width, top: platform.top };
      chunk.platforms.push(item);
      this.platforms.push(item);
    }
    for (const definition of template.hazards) {
      const hazard = {
        ...definition,
        x: origin + definition.x,
        baseX: origin + definition.x,
        baseY: definition.y,
        phase: this.random() * definition.period,
        active: false,
      };
      chunk.hazards.push(hazard);
      this.hazards.push(hazard);
    }
    for (const orb of template.orbs) {
      const collectible = { x: origin + orb.x, y: orb.y, collected: false };
      chunk.collectibles.push(collectible);
      this.collectibles.push(collectible);
    }
    this.chunks.push(chunk);
    this.chunksGenerated += 1;
    this.nextChunkX += template.width;
  }

  updateChunkManagement() {
    while (this.chunks.length < config.chunksAhead) this.addNextChunk();
    const cutoff = this.player.x - 650;
    while (this.chunks.length > 1 && this.chunks[0].origin + this.chunks[0].width < cutoff) {
      const removed = this.chunks.shift();
      this.platforms = this.platforms.filter((platform) => !removed.platforms.includes(platform));
      this.hazards = this.hazards.filter((hazard) => !removed.hazards.includes(hazard));
      this.collectibles = this.collectibles.filter((orb) => !removed.collectibles.includes(orb));
    }
  }

  update(dt) {
    const player = this.player;
    player.previousX = player.x;
    player.previousY = player.y;
    const wasGrounded = player.grounded;
    const move = Number(input.right) - Number(input.left);

    if (move > 0) {
      player.velocityX = Math.min(config.maxSpeed, player.velocityX + (wasGrounded ? config.groundAcceleration : config.airAcceleration) * dt);
    } else if (move < 0) {
      player.velocityX = Math.max(0, player.velocityX - config.brakingStrength * dt);
    } else if (player.velocityX > config.cruiseSpeed) {
      player.velocityX = Math.max(config.cruiseSpeed, player.velocityX - (wasGrounded ? config.groundFriction : config.airDrag) * dt);
    } else {
      player.velocityX = Math.min(config.cruiseSpeed, player.velocityX + config.groundFriction * 0.2 * dt);
    }

    player.x += player.velocityX * dt;
    player.velocityY = Math.min(1250, player.velocityY + config.gravity * dt);
    player.y += player.velocityY * dt;
    player.grounded = false;

    const radius = config.ballRadius;
    for (const platform of this.platforms) {
      const overlapsX = player.x + radius > platform.x && player.x - radius < platform.x + platform.width;
      if (!overlapsX || player.velocityY < 0) continue;
      const previousBottom = player.previousY + radius;
      const currentBottom = player.y + radius;
      const crossedTop = previousBottom <= platform.top + 3 && currentBottom >= platform.top;
      const gentleStep = wasGrounded
        && Math.abs(player.previousY + radius - platform.top) <= 28
        && currentBottom >= platform.top - 1
        && currentBottom <= platform.top + 30;
      if (crossedTop || gentleStep) {
        player.y = platform.top - radius;
        player.velocityY = 0;
        player.grounded = true;
        player.coyote = config.coyoteTime;
        break;
      }
    }

    if (!player.grounded) player.coyote = Math.max(0, player.coyote - dt);
    if (input.jumpBuffer > 0) input.jumpBuffer = Math.max(0, input.jumpBuffer - dt);
    if (input.jumpBuffer > 0 && (player.grounded || player.coyote > 0)) {
      player.velocityY = -config.jumpImpulse;
      player.grounded = false;
      player.coyote = 0;
      input.jumpBuffer = 0;
      this.spawnBurst(player.x, player.y + radius, '#67e8f9', 8);
      this.playTone(235, 0.08, 'square', 0.035);
    }

    player.rotation += (player.x - player.previousX) / radius;
    this.distance += Math.max(0, player.x - player.previousX);
    this.tier = Math.min(config.difficultyCap, 1 + Math.floor(this.distance / 1200));
    this.simulationTime += dt;
    this.updateHazards();
    if (this.state !== 'running') return;
    this.updateCollectibles();
    this.updateParticles(dt);
    this.updateChunkManagement();

    const cameraTarget = Math.max(0, player.x - config.cameraOffset);
    this.cameraX += (cameraTarget - this.cameraX) * (1 - Math.exp(-7 * dt));
    this.uiTimer += dt;
    if (this.uiTimer >= 0.12) {
      this.uiTimer = 0;
      this.refreshHud();
    }

    if (player.y > config.height + 140) this.finishRun();
    this.rebaseWorld();
  }

  updateHazards() {
    const player = this.player;
    for (const hazard of this.hazards) {
      if (hazard.kind === 'laser') {
        const cycle = (this.simulationTime + hazard.phase) % hazard.period;
        hazard.active = cycle < hazard.activeFor;
        hazard.warning = !hazard.active && cycle < hazard.activeFor + 0.45;
      } else {
        hazard.x = hazard.baseX + Math.sin(this.simulationTime * hazard.speed + hazard.phase) * hazard.amplitude;
        hazard.active = true;
      }
      if (!hazard.active) continue;
      if (
        Math.abs(player.x - hazard.x) < hazard.width / 2 + config.ballRadius * 0.72
        && Math.abs(player.y - hazard.y) < hazard.height / 2 + config.ballRadius * 0.72
      ) {
        this.finishRun();
        return;
      }
    }
  }

  updateCollectibles() {
    for (const orb of this.collectibles) {
      if (orb.collected) continue;
      if (Math.hypot(this.player.x - orb.x, this.player.y - orb.y) < config.ballRadius + 13) {
        orb.collected = true;
        this.energy += 1;
        this.spawnBurst(orb.x, orb.y, '#67e8f9', 12);
        this.playTone(520, 0.09, 'triangle', 0.04);
      }
    }
  }

  updateParticles(dt) {
    for (const particle of this.particles) {
      particle.x += particle.vx * dt;
      particle.y += particle.vy * dt;
      particle.vy += 350 * dt;
      particle.life -= dt;
    }
    this.particles = this.particles.filter((particle) => particle.life > 0);
  }

  spawnBurst(x, y, color, count) {
    for (let index = 0; index < count && this.particles.length < 180; index += 1) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 50 + Math.random() * 170;
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color,
        life: 0.25 + Math.random() * 0.35,
        maxLife: 0.6,
        radius: 1.5 + Math.random() * 2.5,
      });
    }
  }

  rebaseWorld() {
    if (this.player.x < config.rebaseAt) return;
    const shift = config.rebaseBy;
    this.player.x -= shift;
    this.player.previousX -= shift;
    this.cameraX -= shift;
    this.nextChunkX -= shift;
    for (const chunk of this.chunks) chunk.origin -= shift;
    for (const platform of this.platforms) platform.x -= shift;
    for (const hazard of this.hazards) {
      hazard.x -= shift;
      hazard.baseX -= shift;
    }
    for (const orb of this.collectibles) orb.x -= shift;
    for (const particle of this.particles) particle.x -= shift;
  }

  refreshHud() {
    ui.distance.textContent = formatDistance(this.distance);
    ui.best.textContent = formatDistance(Math.max(this.bestDistance, this.distance));
    ui.energy.textContent = String(this.energy);
    ui.tier.textContent = String(this.tier);
  }

  updateBestLabels() {
    ui.bestStart.textContent = formatDistance(this.bestDistance);
    ui.best.textContent = formatDistance(this.bestDistance);
    ui.finalBest.textContent = formatDistance(this.bestDistance);
  }

  setState(state) {
    this.state = state;
    ui.startScreen.classList.toggle('hidden', state !== 'menu');
    ui.pauseMenu.classList.toggle('hidden', state !== 'paused');
    ui.gameOver.classList.toggle('hidden', state !== 'gameover');
    ui.hud.classList.toggle('hidden', state !== 'running' && state !== 'paused');
    ui.touchControls.classList.toggle('hidden', !isTouchLayout() || state !== 'running');
    if (state !== 'running') this.clearInput();
  }

  startRun() {
    const bytes = new Uint32Array(1);
    if (window.crypto?.getRandomValues) window.crypto.getRandomValues(bytes);
    else bytes[0] = Date.now() >>> 0;
    this.resetRun(bytes[0] || 1);
    this.setState('running');
    ui.canvas.focus({ preventScroll: true });
    this.playTone(265, 0.07, 'triangle', 0.035);
  }

  togglePause() {
    if (this.state === 'running') {
      this.setState('paused');
      ui.resume.focus({ preventScroll: true });
    } else if (this.state === 'paused') {
      this.setState('running');
      ui.canvas.focus({ preventScroll: true });
    }
  }

  finishRun() {
    if (this.state !== 'running') return;
    this.bestDistance = Math.max(this.bestDistance, this.distance);
    try {
      window.localStorage.setItem(BEST_DISTANCE_KEY, String(Math.floor(this.bestDistance)));
    } catch (error) {
      console.warn('Neon Roll could not save the best distance.', error);
    }
    ui.finalDistance.textContent = formatDistance(this.distance);
    ui.finalEnergy.textContent = String(this.energy);
    ui.finalBest.textContent = formatDistance(this.bestDistance);
    this.updateBestLabels();
    this.refreshHud();
    this.setState('gameover');
    ui.restart.focus({ preventScroll: true });
    this.playTone(120, 0.22, 'sawtooth', 0.07);
  }

  ensureAudio() {
    const AudioConstructor = window.AudioContext || window.webkitAudioContext;
    if (!AudioConstructor || this.muted) return null;
    if (!this.audioContext) this.audioContext = new AudioConstructor();
    if (this.audioContext.state === 'suspended') this.audioContext.resume();
    return this.audioContext;
  }

  playTone(frequency, duration, type, volume) {
    const audio = this.ensureAudio();
    if (!audio) return;
    const oscillator = audio.createOscillator();
    const gain = audio.createGain();
    oscillator.type = type;
    oscillator.frequency.value = frequency;
    gain.gain.setValueAtTime(volume, audio.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, audio.currentTime + duration);
    oscillator.connect(gain);
    gain.connect(audio.destination);
    oscillator.start();
    oscillator.stop(audio.currentTime + duration);
  }

  frame(timestamp) {
    if (!this.lastFrameTime) this.lastFrameTime = timestamp;
    const elapsed = Math.min((timestamp - this.lastFrameTime) / 1000, config.maxFrameTime);
    this.lastFrameTime = timestamp;
    if (this.state === 'running') {
      this.accumulator = Math.min(this.accumulator + elapsed, config.maxFrameTime);
      while (this.accumulator >= config.fixedStep && this.state === 'running') {
        this.update(config.fixedStep);
        this.accumulator -= config.fixedStep;
      }
    } else {
      this.accumulator = 0;
    }
    this.render();
    requestAnimationFrame(this.frame);
  }

  render() {
    const scale = this.renderScale || 1;
    context.setTransform(1, 0, 0, 1, 0, 0);
    context.clearRect(0, 0, ui.canvas.width, ui.canvas.height);
    context.setTransform(scale, 0, 0, scale, this.renderOffsetX || 0, this.renderOffsetY || 0);
    context.fillStyle = '#07101d';
    context.fillRect(0, 0, config.width, config.height);
    this.drawBackground();
    this.drawWorld();
    this.drawPlayer();
    this.drawParticles();
    if (this.debug) this.drawDebug();
  }

  drawBackground() {
    const gradient = context.createLinearGradient(0, 0, 0, config.height);
    gradient.addColorStop(0, '#091426');
    gradient.addColorStop(0.7, '#0b1423');
    gradient.addColorStop(1, '#08101b');
    context.fillStyle = gradient;
    context.fillRect(0, 0, config.width, config.height);

    const glow = context.createRadialGradient(510, 280, 12, 510, 280, 500);
    glow.addColorStop(0, 'rgba(25, 94, 132, .16)');
    glow.addColorStop(1, 'rgba(7, 14, 25, 0)');
    context.fillStyle = glow;
    context.fillRect(0, 0, config.width, config.height);

    context.save();
    context.globalAlpha = 0.32;
    context.strokeStyle = '#2c4761';
    context.lineWidth = 1;
    const gridOffset = -((this.cameraX * 0.16) % 48);
    for (let x = gridOffset; x < config.width; x += 48) {
      context.beginPath();
      context.moveTo(x, 0);
      context.lineTo(x, config.height);
      context.stroke();
    }
    for (let y = 25; y < 500; y += 48) {
      context.beginPath();
      context.moveTo(0, y);
      context.lineTo(config.width, y);
      context.stroke();
    }
    context.restore();

    for (const star of this.backgroundStars) {
      const x = ((star.x - this.cameraX * 0.08) % 2000 + 2000) % 2000;
      if (x > config.width) continue;
      context.globalAlpha = star.alpha;
      context.fillStyle = '#a5e9ff';
      context.beginPath();
      context.arc(x, star.y, star.radius, 0, Math.PI * 2);
      context.fill();
    }
    context.globalAlpha = 1;

    const horizonOffset = (this.cameraX * 0.28) % 520;
    context.fillStyle = 'rgba(28, 47, 69, .42)';
    for (let index = -1; index < 4; index += 1) {
      const x = index * 270 - horizonOffset;
      const height = 75 + ((index * 37 + 200) % 65);
      context.fillRect(x, 455 - height, 4, height);
      context.fillRect(x + 15, 455 - height * 0.7, 3, height * 0.7);
      context.fillRect(x + 29, 455 - height * 0.86, 5, height * 0.86);
    }
  }

  drawWorld() {
    const minX = this.cameraX - 80;
    const maxX = this.cameraX + config.width + 80;
    for (const platform of this.platforms) {
      if (platform.x + platform.width < minX || platform.x > maxX) continue;
      const x = platform.x - this.cameraX;
      const depth = context.createLinearGradient(0, platform.top, 0, config.height);
      depth.addColorStop(0, '#263c55');
      depth.addColorStop(0.1, '#17263b');
      depth.addColorStop(1, '#0c1523');
      context.fillStyle = depth;
      context.fillRect(x, platform.top, platform.width, config.height - platform.top + 80);
      context.shadowColor = 'rgba(75, 218, 255, .6)';
      context.shadowBlur = 10;
      context.strokeStyle = '#62dff5';
      context.lineWidth = 2;
      context.beginPath();
      context.moveTo(x, platform.top + 1);
      context.lineTo(x + platform.width, platform.top + 1);
      context.stroke();
      context.shadowBlur = 0;
      context.fillStyle = 'rgba(116, 213, 255, .14)';
      context.fillRect(x + 12, platform.top + 9, Math.max(0, platform.width - 24), 2);
    }

    for (const chunk of this.chunks) {
      for (let index = 0; index < chunk.platforms.length - 1; index += 1) {
        const platform = chunk.platforms[index];
        const nextPlatform = chunk.platforms[index + 1];
        const edge = platform.x + platform.width;
        if (nextPlatform.x <= edge || edge < minX || edge > maxX) continue;
        const markerX = edge - this.cameraX - 72;
        context.save();
        context.fillStyle = 'rgba(251, 191, 36, .9)';
        context.font = '700 11px "DM Mono", monospace';
        context.textAlign = 'center';
        context.fillText('JUMP  →', markerX, platform.top - 17);
        context.strokeStyle = 'rgba(251, 191, 36, .74)';
        context.lineWidth = 2;
        context.beginPath();
        context.moveTo(markerX, platform.top - 12);
        context.lineTo(markerX, platform.top - 5);
        context.stroke();
        context.restore();
      }
    }

    for (const orb of this.collectibles) {
      if (orb.collected || orb.x < minX || orb.x > maxX) continue;
      const pulse = 1 + Math.sin(this.simulationTime * 5 + orb.x) * 0.12;
      const x = orb.x - this.cameraX;
      context.save();
      context.shadowColor = '#67e8f9';
      context.shadowBlur = 18;
      context.fillStyle = 'rgba(103, 232, 249, .2)';
      context.beginPath();
      context.arc(x, orb.y, 12 * pulse, 0, Math.PI * 2);
      context.fill();
      const orbGradient = context.createRadialGradient(x - 3, orb.y - 4, 1, x, orb.y, 8);
      orbGradient.addColorStop(0, '#f0fdff');
      orbGradient.addColorStop(0.4, '#67e8f9');
      orbGradient.addColorStop(1, '#0ea5c8');
      context.fillStyle = orbGradient;
      context.beginPath();
      context.arc(x, orb.y, 7 * pulse, 0, Math.PI * 2);
      context.fill();
      context.restore();
    }

    for (const hazard of this.hazards) {
      if (hazard.x < minX || hazard.x > maxX) continue;
      const x = hazard.x - this.cameraX;
      if (hazard.kind === 'laser') {
        const warning = hazard.warning;
        context.save();
        context.globalAlpha = hazard.active ? 0.78 : warning ? 0.55 : 0.14;
        context.shadowColor = hazard.active ? '#fb4d8a' : warning ? '#fbbf24' : '#60a5fa';
        context.shadowBlur = hazard.active ? 22 : warning ? 12 : 4;
        context.fillStyle = hazard.active ? '#fb4d8a' : warning ? '#fbbf24' : '#60a5fa';
        context.fillRect(x - 4, hazard.y - hazard.height / 2, 8, hazard.height);
        context.fillStyle = warning ? '#fde68a' : '#ffd5e4';
        context.fillRect(x - 10, hazard.y - hazard.height / 2 - 5, 20, 5);
        context.restore();
      } else {
        context.save();
        context.shadowColor = '#f472b6';
        context.shadowBlur = 18;
        context.fillStyle = '#a63976';
        context.fillRect(x - hazard.width / 2, hazard.y - hazard.height / 2, hazard.width, hazard.height);
        context.shadowBlur = 0;
        context.strokeStyle = '#ffc0df';
        context.lineWidth = 2;
        context.strokeRect(x - hazard.width / 2, hazard.y - hazard.height / 2, hazard.width, hazard.height);
        context.fillStyle = 'rgba(255,255,255,.38)';
        context.fillRect(x - hazard.width / 2 + 6, hazard.y - hazard.height / 2 + 6, hazard.width - 12, 4);
        context.restore();
      }
    }
  }

  drawPlayer() {
    const player = this.player;
    const x = player.x - this.cameraX;
    const y = player.y;
    const radius = config.ballRadius;
    context.save();
    context.translate(x, y);
    context.rotate(player.rotation);
    context.shadowColor = '#67e8f9';
    context.shadowBlur = 24;
    const ball = context.createRadialGradient(-7, -8, 2, 0, 0, radius + 3);
    ball.addColorStop(0, '#f5feff');
    ball.addColorStop(0.24, '#8bf4ff');
    ball.addColorStop(0.68, '#29b8dd');
    ball.addColorStop(1, '#553e9d');
    context.fillStyle = ball;
    context.beginPath();
    context.arc(0, 0, radius, 0, Math.PI * 2);
    context.fill();
    context.shadowBlur = 0;
    context.strokeStyle = 'rgba(255,255,255,.88)';
    context.lineWidth = 2;
    context.stroke();
    context.strokeStyle = 'rgba(244,114,182,.9)';
    context.lineWidth = 3;
    context.beginPath();
    context.arc(0, 0, radius * 0.66, -0.25, 2.1);
    context.stroke();
    context.fillStyle = 'rgba(255,255,255,.86)';
    context.beginPath();
    context.arc(-7, -8, 3, 0, Math.PI * 2);
    context.fill();
    context.restore();
  }

  drawParticles() {
    for (const particle of this.particles) {
      context.globalAlpha = clamp(particle.life / particle.maxLife, 0, 1);
      context.fillStyle = particle.color;
      context.beginPath();
      context.arc(particle.x - this.cameraX, particle.y, particle.radius, 0, Math.PI * 2);
      context.fill();
    }
    context.globalAlpha = 1;
  }

  drawDebug() {
    const player = this.player;
    const activeChunk = this.chunks.find((chunk) => (
      player.x >= chunk.origin && player.x < chunk.origin + chunk.width
    ));
    const lines = [
      `seed ${this.seed}`,
      `chunk ${activeChunk?.template.name ?? 'none'}`,
      `velocity ${player.velocityX.toFixed(1)}, ${player.velocityY.toFixed(1)}`,
      `grounded ${player.grounded}`,
      `tier ${this.tier} · physics bodies ${this.platforms.length + this.hazards.length + 1}`,
    ];
    context.fillStyle = 'rgba(3, 8, 17, .82)';
    context.fillRect(12, 82, 250, 104);
    context.fillStyle = '#a5f3fc';
    context.font = '12px "DM Mono", monospace';
    lines.forEach((line, index) => context.fillText(line, 22, 101 + index * 17));
  }
}

new NeonRollGame();
