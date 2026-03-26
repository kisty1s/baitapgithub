/*  =============================================
    MAN CITY HEAD SOCCER – GAME ENGINE
    Canvas-based 2D physics game
    ============================================= */

"use strict";

// ─────── CONSTANTS ───────
const W = 1200, H = 600;
const GRAVITY = 0.55;
const FRICTION = 0.82;
const PLAYER_SPEED = 6.5;
const JUMP_FORCE = -16;
const BALL_FRICTION = 0.985;
const BALL_BOUNCE = 0.65;
const GOAL_WIDTH = 110;
const GOAL_HEIGHT = 160;
const GROUND_Y = H - 80;
const WIN_SCORE = 5;
const MATCH_TIME = 90;
const MAX_BALL_SPEED = 24;
const BALL_AIR_DRAG = 0.998;
const BALL_SPIN_DECAY = 0.98;

// Man City palette
const CITY_BLUE = '#6ECFF6';
const CITY_DARK = '#00A0DC';
const CITY_NAVY = '#1C2D57';
const CITY_GOLD = '#FFD700';
const CITY_WHITE = '#FFFFFF';
const CITY_RED = '#E0001B';  // opponent: United colours

// ─────── PLAYER ROSTER (fully differentiated) ───────
// special: 'curve' | 'cannon' | 'sprint' | 'precision'
const PLAYERS = [
  {
    name: 'DE BRUYNE', num: '17', emoji: '⚽', color: CITY_BLUE, headColor: '#FDDBB4', hairColor: '#C8A000',
    speed: 7, jump: 17, power: 8, stat: 'Speed ★★★★★', special: 'curve', specialLabel: '🌀 CURVE', mass: 6.5,
    // FC-card stats
    ovr: 91, pos: 'CAM', nation: 'be',
    pac: 88, sho: 87, pas: 94, dri: 88, def: 64, phy: 78,
    photo: 'https://resources.premierleague.com/premierleague/photos/players/250x250/p61366.png',
  },
  {
    name: 'HAALAND', num: '9', emoji: '💪', color: CITY_BLUE, headColor: '#FDDBB4', hairColor: '#FFE0A0',
    speed: 5, jump: 21, power: 14, stat: 'Power ★★★★★', special: 'cannon', specialLabel: '💥 CANNON', mass: 9,
    ovr: 95, pos: 'ST', nation: 'no',
    pac: 89, sho: 97, pas: 70, dri: 80, def: 45, phy: 88,
    photo: 'https://resources.premierleague.com/premierleague/photos/players/250x250/p223094.png',
  },
  {
    name: 'FODEN', num: '47', emoji: '🎩', color: CITY_BLUE, headColor: '#FDDBB4', hairColor: '#F0E0A0',
    speed: 11, jump: 16, power: 7, stat: 'Agility ★★★★★', special: 'sprint', specialLabel: '⚡ SPRINT', mass: 5,
    ovr: 90, pos: 'LW', nation: 'gb-eng',
    pac: 90, sho: 85, pas: 86, dri: 92, def: 60, phy: 72,
    photo: 'https://resources.premierleague.com/premierleague/photos/players/250x250/p209244.png',
  },
  {
    name: 'SILVA', num: '20', emoji: '🧘', color: CITY_BLUE, headColor: '#D4A070', hairColor: '#2a2a2a',
    speed: 6, jump: 16, power: 8, stat: 'Control ★★★★★', special: 'precision', specialLabel: '🎯 LOCK-ON', mass: 5.5,
    ovr: 88, pos: 'CM', nation: 'pt',
    pac: 72, sho: 76, pas: 89, dri: 87, def: 68, phy: 74,
    photo: 'https://resources.premierleague.com/premierleague/photos/players/250x250/p165809.png',
  },
];


const AI_LEVELS = ['⭐ LEVEL 1', '⭐⭐ LEVEL 2', '⭐⭐⭐ LEVEL 3'];
let aiDifficulty = 0;

// ─────── STATE ───────
let selectedPlayer = 0;
let canvas, ctx;
let keys = {};
let gameLoop = null;
let gameState = 'menu'; // menu | playing | paused | result
let scorePlayer = 0, scoreAI = 0;
let timeLeft = MATCH_TIME;
let timerInterval = null;
let player, ai, ball;
const ballObj = { x: 0, y: 0, vx: 0, vy: 0, r: 18, angle: 0, spin: 0, trail: [], mass: 1.2 };
let particles = [];
let confetti = [];
let fireworks = [];
let timeScale = 1.0;

function buildParticles() {
  particles = [];
  confetti = [];
  fireworks = [];
}

function spawnRunDust(e) {
  for (let i = 0; i < 3; i++) {
    particles.push({
      x: e.x + e.w / 2, y: e.y + e.h,
      vx: (Math.random() - 0.5) * 2, vy: -Math.random() * 2,
      life: 20 + Math.random() * 10, maxLife: 30,
      r: 3 + Math.random() * 4, color: 'rgba(255,255,255,0.3)',
      type: 'dust'
    });
  }
}

function spawnJumpParticles(e) {
  for (let i = 0; i < 8; i++) {
    particles.push({
      x: e.x + e.w / 2, y: e.y + e.h,
      vx: (Math.random() - 0.5) * 6, vy: -Math.random() * 3,
      life: 30, maxLife: 30, r: 4, color: CITY_BLUE, type: 'smoke'
    });
  }
}

function spawnBounceParticles() {
  for (let i = 0; i < 5; i++) {
    particles.push({
      x: ball.x, y: GROUND_Y,
      vx: (Math.random() - 0.5) * 4, vy: -Math.random() * 3,
      life: 20, maxLife: 20, r: 3, color: 'rgba(255,255,255,0.4)', type: 'dust'
    });
  }
}

function spawnDashParticles(e) {
  for (let i = 0; i < 12; i++) {
    particles.push({
      x: e.x + e.w / 2, y: e.y + e.h / 2,
      vx: -e.facing * (5 + Math.random() * 5), vy: (Math.random() - 0.5) * 3,
      life: 25, maxLife: 25, r: 5, color: '#fff', type: 'dash'
    });
  }
}

function spawnGoalExplosion(x, y) {
  const colors = [CITY_BLUE, CITY_NAVY, CITY_GOLD, '#fff'];
  for (let i = 0; i < 60; i++) {
    const color = colors[Math.floor(Math.random() * colors.length)];
    particles.push({
      x, y,
      vx: (Math.random() - 0.5) * 25, vy: (Math.random() - 0.5) * 25,
      life: 60 + Math.random() * 40, maxLife: 100,
      r: 4 + Math.random() * 6, color, type: 'glow'
    });
  }
  for (let i = 0; i < 100; i++) {
    confetti.push({
      x: Math.random() * W, y: -20,
      vx: (Math.random() - 0.5) * 4, vy: 2 + Math.random() * 5,
      r: Math.random() * 360, spin: (Math.random() - 0.5) * 10,
      size: 6 + Math.random() * 6, color: colors[Math.floor(Math.random() * colors.length)]
    });
  }
}

function spawnPowerSparks(x, y, color = CITY_GOLD) {
  for (let i = 0; i < 15; i++) {
    particles.push({
      x, y,
      vx: (Math.random() - 0.5) * 15, vy: (Math.random() - 0.5) * 15,
      life: 20, maxLife: 20, r: 3, color, type: 'spark'
    });
  }
}

function handleGoal(isPlayer) {
  // Trigger Slow Motion & Explosion
  timeScale = 0.35;
  spawnGoalExplosion(isPlayer ? W - 30 : 30, H / 2);
  triggerShake(20);

  setTimeout(() => { timeScale = 1.0; }, 1800);

  if (isPlayer) {
    scorePlayer++;
    showGoalFlash('GOAL!!! ⚽');
    sfxGoalCheer();
    celebratingPlayer = player;
  } else {
    scoreAI++;
    showGoalFlash('GOAL FOR UNITED ⚽');
    sfxGoalCheer();
    celebratingPlayer = ai;
  }

  celebrateTimer = 120;
  goalCooldown = 150;
  updateHUD();

  setTimeout(() => {
    if (scorePlayer >= WIN_SCORE || scoreAI >= WIN_SCORE) { endMatch(); return; }
    resetPositions();
    celebratingPlayer = null;
    celebrateTimer = 0;
  }, 2000);
}

let goalCooldown = 0;
let frameCount = 0;
let powerMeter = 0;
let powerCharging = false;
let ledOffset = 0;
let celebratingPlayer = null;
let celebrateTimer = 0;
let volumeEnabled = true;
let bgmNode = null;
let bgmGain = null;
let highScore = parseInt(localStorage.getItem('mancity_hs') || '0', 10);

// PRO PROGRESSION System
let playerProgress = JSON.parse(localStorage.getItem('mancity_pro_max') || JSON.stringify({
  level: 1,
  xp: 0,
  xpToNext: 100,
  unlockedSkills: ['cannon'],
  skillUnlocks: { 3: 'curve', 5: 'sprint', 8: 'precision' }
}));

function isPlayerLocked(idx) {
  const p = PLAYERS[idx];
  return !playerProgress.unlockedSkills.includes(p.special);
}

function saveProgress() {
  localStorage.setItem('mancity_pro_max', JSON.stringify(playerProgress));
}

let menuParallaxX = 0, menuParallaxY = 0;
let floodlightAngle = 0;
let shakeAmount = 0;
let specialTrail = false;
let impactWait = 0;
let playerShotHistory = []; // Tracking player patterns for Adaptive AI

// ─────── WEB AUDIO ENGINE ───────
let audioCtx = null;
function getAudioCtx() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  if (audioCtx.state === 'suspended') audioCtx.resume();
  return audioCtx;
}

function playTone(opts) {
  if (!volumeEnabled) return;
  // opts: { freq, type, duration, gain, freqEnd, delay }
  try {
    const ac = getAudioCtx();
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.connect(gain);
    gain.connect(ac.destination);
    osc.type = opts.type || 'sine';
    const t = ac.currentTime + (opts.delay || 0);
    osc.frequency.setValueAtTime(opts.freq, t);
    if (opts.freqEnd) osc.frequency.exponentialRampToValueAtTime(opts.freqEnd, t + opts.duration);
    gain.gain.setValueAtTime(opts.gain || 0.3, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + opts.duration);
    osc.start(t);
    osc.stop(t + opts.duration + 0.05);
  } catch (e) { }
}

function sfxKick() {
  playTone({ freq: 180, freqEnd: 60, type: 'sawtooth', duration: 0.12, gain: 0.4 });
  playTone({ freq: 90, freqEnd: 30, type: 'sine', duration: 0.18, gain: 0.5 });
}
function sfxBounce() {
  playTone({ freq: 250, freqEnd: 100, type: 'sine', duration: 0.1, gain: 0.2 });
}
function sfxWhistle() {
  playTone({ freq: 1400, freqEnd: 1800, type: 'sine', duration: 0.3, gain: 0.35 });
  playTone({ freq: 1600, freqEnd: 1800, type: 'sine', duration: 0.3, gain: 0.35, delay: 0.32 });
}
function sfxGoalCheer() {
  // Multi-layered cheer burst
  for (let i = 0; i < 8; i++) {
    playTone({ freq: 800 + Math.random() * 400, type: 'sawtooth', duration: 0.3 + Math.random() * 0.4, gain: 0.08, delay: i * 0.06 });
  }
  playTone({ freq: 523, type: 'triangle', duration: 0.5, gain: 0.3, delay: 0.1 });
  playTone({ freq: 659, type: 'triangle', duration: 0.5, gain: 0.3, delay: 0.3 });
  playTone({ freq: 784, type: 'triangle', duration: 0.7, gain: 0.35, delay: 0.5 });
}
function sfxPowerKick() {
  playTone({ freq: 300, freqEnd: 80, type: 'square', duration: 0.2, gain: 0.5 });
  playTone({ freq: 150, freqEnd: 40, type: 'sawtooth', duration: 0.3, gain: 0.6 });
}
function sfxGameStart() {
  [523, 659, 784, 1047].forEach((f, i) => {
    playTone({ freq: f, type: 'triangle', duration: 0.25, gain: 0.3, delay: i * 0.15 });
  });
}

// ─────── BGM / AMBIENT ───────
function startBGM() {
  if (!volumeEnabled) return;
  stopBGM();
  try {
    const ac = getAudioCtx();
    bgmGain = ac.createGain();
    bgmGain.gain.setValueAtTime(0.07, ac.currentTime);
    bgmGain.connect(ac.destination);

    // Simple looping ambient beat — kick + high hats pattern
    function beatLoop() {
      if (!volumeEnabled || !bgmGain) return;
      const t = ac.currentTime;
      // Kick
      const kick = ac.createOscillator();
      const kg = ac.createGain();
      kick.connect(kg); kg.connect(bgmGain);
      kick.type = 'sine';
      kick.frequency.setValueAtTime(160, t);
      kick.frequency.exponentialRampToValueAtTime(40, t + 0.15);
      kg.gain.setValueAtTime(0.9, t);
      kg.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
      kick.start(t); kick.stop(t + 0.25);

      // Snare
      const snare = ac.createOscillator();
      const sg = ac.createGain();
      snare.type = 'sawtooth';
      snare.frequency.setValueAtTime(200, t + 0.375);
      snare.frequency.exponentialRampToValueAtTime(80, t + 0.525);
      snare.connect(sg); sg.connect(bgmGain);
      sg.gain.setValueAtTime(0.5, t + 0.375);
      sg.gain.exponentialRampToValueAtTime(0.001, t + 0.525);
      snare.start(t + 0.375); snare.stop(t + 0.55);

      // Hi-hat
      for (let i = 0; i < 4; i++) {
        const ht = ac.createOscillator();
        const hg = ac.createGain();
        ht.type = 'square';
        ht.frequency.setValueAtTime(8000 + Math.random() * 2000, t + i * 0.1875);
        ht.connect(hg); hg.connect(bgmGain);
        hg.gain.setValueAtTime(0.12, t + i * 0.1875);
        hg.gain.exponentialRampToValueAtTime(0.001, t + i * 0.1875 + 0.05);
        ht.start(t + i * 0.1875); ht.stop(t + i * 0.1875 + 0.08);
      }

      bgmNode = setTimeout(beatLoop, 750);
    }
    beatLoop();

    // Crowd ambient
    const crowd = ac.createOscillator();
    const crowdGain = ac.createGain();
    crowd.type = 'sawtooth';
    crowd.frequency.setValueAtTime(120, ac.currentTime);
    crowdGain.gain.setValueAtTime(0.015, ac.currentTime);
    crowd.connect(crowdGain);
    crowdGain.connect(bgmGain);
    crowd.start();
    // Store for stop
    bgmGain._crowdOsc = crowd;
  } catch (e) { }
}

function stopBGM() {
  try {
    if (bgmNode) { clearTimeout(bgmNode); bgmNode = null; }
    if (bgmGain) {
      if (bgmGain._crowdOsc) bgmGain._crowdOsc.stop();
      bgmGain.disconnect();
      bgmGain = null;
    }
  } catch (e) { }
}

function toggleVolume() {
  volumeEnabled = !volumeEnabled;
  const btn = document.getElementById('vol-toggle');
  if (btn) btn.textContent = volumeEnabled ? '🔊' : '🔇';
  if (volumeEnabled) startBGM();
  else stopBGM();
}

// LED ticker slogans
const LED_MESSAGES = [
  '  🔵 MANCHESTER CITY FC  •  EST. 1880  •  ETIHAD STADIUM  🏟  ',
  '  ⭐ CHAMPIONS OF ENGLAND  •  PREMIER LEAGUE  •  COME ON CITY!  ⭐  ',
  '  🎵 BLUE MOON... YOU SAW ME STANDING ALONE...  🎵  ',
  '  💙 CITY TIL I DIE  •  HAALAND  •  DE BRUYNE  •  FODEN  •  SILVA  💙  ',
  '  🏆 TREBLE WINNERS  •  6x PREMIER LEAGUE CHAMPIONS  🏆  ',
];
let ledMsgIndex = 0;
let ledFull = LED_MESSAGES[0];

// ─────── INIT UI ───────
function sfxMenuClick() { playTone({ freq: 880, type: 'sine', duration: 0.08, gain: 0.15 }); }
function sfxMenuHover() { playTone({ freq: 1200, type: 'sine', duration: 0.04, gain: 0.06 }); }

function buildPlayerCards() {
  const container = document.getElementById('player-cards');
  container.innerHTML = '';
  PLAYERS.forEach((p, i) => {
    const isLocked = isPlayerLocked(i);
    const reqLvl = Object.keys(playerProgress.skillUnlocks).find(k => playerProgress.skillUnlocks[k] === p.special);
    const card = document.createElement('div');
    card.className = 'player-card' + (i === selectedPlayer ? ' selected' : '') + (isLocked ? ' locked' : '');
    card.innerHTML = `
      <span class="card-emoji">${p.emoji}</span>
      <span class="card-name">${p.name}</span>
      <span class="card-num">#${p.num}</span>
      <span class="card-stat">${isLocked ? `<span style="color:#ffcc00">🔒 LVL ${reqLvl} REQ</span>` : p.stat}</span>
    `;
    card.addEventListener('mouseenter', sfxMenuHover);
    card.onclick = () => {
      if (isLocked) {
        const reqLvl = Object.keys(playerProgress.skillUnlocks).find(k => playerProgress.skillUnlocks[k] === p.special);
        showGoalFlash(`🔒 REACH LVL ${reqLvl} TO UNLOCK!`);
        return;
      }
      sfxMenuClick();
      selectPlayer(i);
    };
    container.appendChild(card);
  });
  updateMenuStats(selectedPlayer);
  startHeroAnimation();
}

function selectPlayer(idx) {
  selectedPlayer = idx;
  document.querySelectorAll('.player-card').forEach((c, i) => {
    c.classList.toggle('selected', i === idx);
  });
  updateMenuStats(idx);
}

function updateMenuStats(idx) {
  const p = PLAYERS[idx];
  // Quick stats panel
  document.getElementById('qs-ovr').textContent = p.ovr || '--';
  const stats = ['pac', 'sho', 'pas', 'dri', 'def', 'phy'];
  stats.forEach(s => {
    const val = p[s] || 0;
    const bar = document.getElementById('qs-' + s + '-bar');
    const valEl = document.getElementById('qs-' + s + '-val');
    if (bar) bar.style.width = val + '%';
    if (valEl) valEl.textContent = val;
  });
  // Hero panel
  const heroName = document.getElementById('hero-name');
  const heroSpecial = document.getElementById('hero-special');
  if (heroName) heroName.textContent = p.name;
  if (heroSpecial) heroSpecial.textContent = p.specialLabel || '';
}

function buildDifficultyOptions() {
  const container = document.getElementById('difficulty-options');
  if (!container) return;
  container.innerHTML = '';
  AI_LEVELS.forEach((level, i) => {
    const card = document.createElement('div');
    card.className = 'diff-card' + (i === aiDifficulty ? ' selected' : '');
    card.innerHTML = `
      <span class="diff-label">LEVEL ${i + 1}</span>
      <span class="diff-stars">${level}</span>
    `;
    card.addEventListener('mouseenter', sfxMenuHover);
    card.onclick = () => { sfxMenuClick(); selectDifficulty(i); };
    container.appendChild(card);
  });
}

function selectDifficulty(idx) {
  aiDifficulty = idx;
  document.querySelectorAll('.diff-card').forEach((c, i) => {
    c.classList.toggle('selected', i === idx);
  });
}

// ─────── FC MOBILE PLAYER CARD MODAL ───────
let cardPlayerIndex = 0;

function showPlayerCard(idx) {
  sfxMenuClick();
  cardPlayerIndex = idx;
  const p = PLAYERS[idx];
  const modal = document.getElementById('player-modal');
  // populate
  document.getElementById('fc-ovr').textContent = p.ovr || '--';
  document.getElementById('fc-pos').textContent = p.pos || 'ATT';
  document.getElementById('fc-card-name').textContent = p.name;
  document.getElementById('fc-special-badge').textContent = p.specialLabel || '';
  document.getElementById('fc-flag').src = `https://flagcdn.com/${p.nation || 'gb'}.svg`;
  document.getElementById('fc-pac').textContent = p.pac || 0;
  document.getElementById('fc-sho').textContent = p.sho || 0;
  document.getElementById('fc-pas').textContent = p.pas || 0;
  document.getElementById('fc-dri').textContent = p.dri || 0;
  document.getElementById('fc-def').textContent = p.def || 0;
  document.getElementById('fc-phy').textContent = p.phy || 0;

  // Photo
  const photoEl = document.getElementById('fc-photo');
  const fallback = document.getElementById('fc-photo-fallback');
  photoEl.style.display = 'block';
  fallback.style.display = 'none';
  photoEl.src = p.photo || '';
  photoEl.onerror = () => {
    photoEl.style.display = 'none';
    fallback.style.display = 'block';
    drawCardFallback(fallback, p);
  };

  // Re-create card element to replay animation
  const card = document.getElementById('fc-card');
  card.style.animation = 'none';
  card.offsetHeight; // reflow
  card.style.animation = '';

  modal.classList.add('open');
}

function drawCardFallback(canvas, p) {
  const c = canvas.getContext('2d');
  const cx = canvas.width / 2;
  c.clearRect(0, 0, canvas.width, canvas.height);
  // Simple big head avatar
  c.fillStyle = p.headColor || '#FDDBB4';
  c.beginPath(); c.arc(cx, 90, 55, 0, Math.PI * 2); c.fill();
  c.fillStyle = p.hairColor || '#333';
  c.beginPath(); c.arc(cx, 80, 55, Math.PI, Math.PI * 2); c.fill();
  c.fillStyle = p.color || CITY_BLUE;
  c.fillRect(cx - 40, 145, 80, 55);
  c.fillStyle = '#fff';
  c.font = 'bold 22px Orbitron, monospace';
  c.textAlign = 'center';
  c.fillText('#' + (p.num || '?'), cx, 182);
}

function closePlayerModal(e) {
  if (e && e.target !== document.getElementById('player-modal')) return;
  document.getElementById('player-modal').classList.remove('open');
}

function selectFromCard() {
  if (isPlayerLocked(cardPlayerIndex)) {
    const p = PLAYERS[cardPlayerIndex];
    const reqLvl = Object.keys(playerProgress.skillUnlocks).find(k => playerProgress.skillUnlocks[k] === p.special);
    showGoalFlash(`🔒 REACH LVL ${reqLvl} TO UNLOCK!`);
    return;
  }
  sfxMenuClick();
  selectPlayer(cardPlayerIndex);
  document.getElementById('player-modal').classList.remove('open');
}

// ─────── HERO CANVAS IDLE ANIMATION ───────
let heroAnimFrame = null;
let heroAnimCount = 0;

function startHeroAnimation() {
  if (heroAnimFrame) cancelAnimationFrame(heroAnimFrame);
  const heroCanvas = document.getElementById('heroCanvas');
  if (!heroCanvas) return;
  const hctx = heroCanvas.getContext('2d');
  function loop() {
    // Only animate while menu is active
    if (!document.getElementById('screen-menu').classList.contains('active')) {
      heroAnimFrame = null;
      return;
    }
    heroAnimCount++;
    hctx.clearRect(0, 0, heroCanvas.width, heroCanvas.height);
    const p = PLAYERS[selectedPlayer];
    drawHeroPlayer(hctx, heroCanvas.width / 2, heroCanvas.height, p, heroAnimCount);
    heroAnimFrame = requestAnimationFrame(loop);
  }
  heroAnimFrame = requestAnimationFrame(loop);
}

function drawHeroPlayer(hctx, cx, groundY, p, fc) {
  const headY = groundY - 130 + Math.sin(fc * 0.04) * 5;
  const bodyY = groundY - 95;
  const hr = 36;
  const run = Math.sin(fc * 0.07) * 0.15;

  // Shadow
  hctx.fillStyle = 'rgba(0,0,0,0.2)';
  hctx.beginPath();
  hctx.ellipse(cx, groundY - 4, 40, 8, 0, 0, Math.PI * 2);
  hctx.fill();

  // Legs
  function limb(ox, oy, ang, len, w, col) {
    hctx.strokeStyle = col;
    hctx.lineWidth = w;
    hctx.lineCap = 'round';
    hctx.beginPath();
    hctx.moveTo(ox, oy);
    const ex = ox + Math.sin(ang) * len;
    const ey = oy + Math.cos(ang) * len;
    hctx.lineTo(ex, ey);
    hctx.stroke();
    return { ex, ey };
  }
  const hipY = bodyY + 20;
  const ll = limb(cx - 9, hipY, run * 0.7, 36, 11, '#fff');
  const rl = limb(cx + 9, hipY, -run * 0.7, 36, 11, '#fff');
  hctx.fillStyle = '#00A0DC';
  hctx.beginPath(); hctx.ellipse(ll.ex, ll.ey, 13, 6, run, 0, Math.PI * 2); hctx.fill();
  hctx.beginPath(); hctx.ellipse(rl.ex, rl.ey, 13, 6, -run, 0, Math.PI * 2); hctx.fill();

  // Jersey
  const jg = hctx.createLinearGradient(cx - 24, bodyY - 16, cx + 24, bodyY + 18);
  jg.addColorStop(0, p.color || CITY_BLUE);
  jg.addColorStop(1, CITY_DARK);
  hctx.fillStyle = jg;
  hctx.beginPath();
  hctx.roundRect(cx - 26, bodyY - 16, 52, 38, 10);
  hctx.fill();
  hctx.fillStyle = '#fff'; hctx.font = 'bold 14px Orbitron,monospace'; hctx.textAlign = 'center';
  hctx.fillText('#' + (p.num || '?'), cx, bodyY + 10);

  // Arms
  limb(cx - 22, bodyY - 4, Math.PI * 0.5 + run * 0.5, 24, 10, p.color || CITY_BLUE);
  limb(cx + 22, bodyY - 4, Math.PI * 0.5 - run * 0.5, 24, 10, p.color || CITY_BLUE);

  // Head
  const hg = hctx.createRadialGradient(cx - 10, headY - 10, 4, cx, headY, hr);
  hg.addColorStop(0, lighten(p.headColor || '#FDDBB4', 20));
  hg.addColorStop(1, p.headColor || '#FDDBB4');
  hctx.fillStyle = hg; hctx.beginPath(); hctx.arc(cx, headY, hr, 0, Math.PI * 2); hctx.fill();

  // Hair
  hctx.fillStyle = p.hairColor || '#333';
  hctx.beginPath(); hctx.arc(cx, headY - 6, hr, Math.PI, Math.PI * 2); hctx.fill();
  hctx.fillRect(cx - hr, headY - hr * 0.7, hr * 2, 10);

  // Eyes
  const eyeX = cx + 8;
  hctx.fillStyle = '#fff'; hctx.beginPath(); hctx.ellipse(eyeX, headY + 4, 8, 7, 0, 0, Math.PI * 2); hctx.fill();
  hctx.fillStyle = '#1a1a2e'; hctx.beginPath(); hctx.arc(eyeX + 2, headY + 5, 4.5, 0, Math.PI * 2); hctx.fill();
  hctx.fillStyle = 'rgba(255,255,255,0.75)'; hctx.beginPath(); hctx.arc(eyeX, headY + 3, 2, 0, Math.PI * 2); hctx.fill();

  // Smile
  hctx.strokeStyle = '#7A4028'; hctx.lineWidth = 2; hctx.lineCap = 'round';
  hctx.beginPath(); hctx.arc(cx, headY + 14, 6, 0.1, Math.PI - 0.1); hctx.stroke();

  // "IDLE" glow around head
  const glowAmt = 0.3 + 0.15 * Math.sin(fc * 0.06);
  hctx.strokeStyle = `rgba(110,207,246,${glowAmt})`;
  hctx.lineWidth = 3;
  hctx.beginPath(); hctx.arc(cx, headY, hr + 8, 0, Math.PI * 2); hctx.stroke();
}

// ─────── STADIUM CANVAS (menu background effect) ───────
function drawStadiumMenuBg() {
  const sc = document.getElementById('stadiumCanvas');
  if (!sc) return;
  sc.width = window.innerWidth;
  sc.height = window.innerHeight;
  const sctx = sc.getContext('2d');
  const W2 = sc.width, H2 = sc.height;

  // Pitch texture
  const pitch = sctx.createLinearGradient(0, H2 * 0.5, 0, H2);
  pitch.addColorStop(0, '#063a16');
  pitch.addColorStop(0.5, '#084d1c');
  pitch.addColorStop(1, '#052e12');
  sctx.fillStyle = pitch;
  sctx.fillRect(0, H2 * 0.5, W2, H2 * 0.5);

  // Pitch stripes
  for (let i = 0; i < 12; i++) {
    sctx.fillStyle = i % 2 === 0 ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)';
    sctx.fillRect(i * (W2 / 12), H2 * 0.5, W2 / 12, H2 * 0.5);
  }
  // Centre circle glimpse
  sctx.strokeStyle = 'rgba(255,255,255,0.12)';
  sctx.lineWidth = 2;
  sctx.beginPath(); sctx.arc(W2 / 2, H2 * 0.5, 140, 0, Math.PI * 2); sctx.stroke();
  // Centre line
  sctx.beginPath(); sctx.moveTo(W2 / 2, H2 * 0.5); sctx.lineTo(W2 / 2, H2); sctx.stroke();

  // Stand silhouette (top)
  sctx.fillStyle = 'rgba(10,20,40,0.8)';
  sctx.fillRect(0, 0, W2, H2 * 0.32);

  // Crowd silhouette rows
  for (let row = 0; row < 3; row++) {
    const rowY = H2 * (0.28 + row * 0.07);
    for (let i = 0; i < Math.ceil(W2 / 20); i++) {
      sctx.fillStyle = `hsla(${210 + (i % 3) * 10},${30 + (i % 2) * 40}%,${30 + row * 10}%,0.6)`;
      sctx.beginPath(); sctx.arc(i * 20 + 10, rowY, 7, 0, Math.PI * 2); sctx.fill();
    }
  }

  // Floodlights
  [[60, 40], [W2 - 60, 40]].forEach(([lx, ly]) => {
    sctx.strokeStyle = 'rgba(180,180,180,0.5)';
    sctx.lineWidth = 5;
    sctx.beginPath(); sctx.moveTo(lx, ly + 80); sctx.lineTo(lx, H2 * 0.42); sctx.stroke();
    sctx.fillStyle = '#aaa';
    const arm = lx < W2 / 2 ? 30 : -30;
    sctx.fillRect(lx + arm - 40, ly + 30, 80, 18);
    // Cone
    const cone = sctx.createRadialGradient(lx + arm, ly + 48, 0, lx + arm, ly + 48, 280);
    cone.addColorStop(0, 'rgba(255,250,220,0.15)');
    cone.addColorStop(1, 'rgba(255,250,220,0)');
    sctx.fillStyle = cone;
    sctx.beginPath();
    sctx.moveTo(lx + arm, ly + 48);
    sctx.lineTo(lx + arm - 150, H2 * 0.5);
    sctx.lineTo(lx + arm + 150, H2 * 0.5);
    sctx.closePath(); sctx.fill();
  });
}


function buildParticles() {
  const container = document.getElementById('particles');
  container.innerHTML = '';
  for (let i = 0; i < 30; i++) {
    const p = document.createElement('div');
    p.className = 'particle';
    p.style.left = Math.random() * 100 + '%';
    p.style.width = p.style.height = (4 + Math.random() * 8) + 'px';
    p.style.animationDuration = (6 + Math.random() * 12) + 's';
    p.style.animationDelay = (Math.random() * 10) + 's';
    p.style.background = Math.random() > 0.4 ? CITY_BLUE : CITY_GOLD;
    container.appendChild(p);
  }
}

function showMenu() {
  setScreen('menu');
}
function showHowToPlay() {
  setScreen('howtoplay');
}
function setScreen(name) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById('screen-' + name).classList.add('active');
}

// ─────── PHYSICS BODIES ───────
function makePlayer(x, isAI, idx, isPlayer) {
  const pData = JSON.parse(JSON.stringify(PLAYERS[idx])); // clone

  // STAT SCALING (approx 2% increase per level)
  if (isPlayer) {
    const scale = 1 + (playerProgress.level - 1) * 0.025;
    pData.speed *= scale;
    pData.jump *= scale;
    pData.power = (pData.power || 10) * scale;
  }

  return {
    x, y: GROUND_Y - 80,
    vx: 0, vy: 0,
    w: 52, h: 80,
    onGround: false,
    isAI,
    data: pData,
    facing: isAI ? -1 : 1,
    headRadius: 30,
    dashCooldown: 0,
    dashActive: false,
    aiTimer: 0,
    aiTarget: null,
    kicking: false,
    kickTimer: 0,
    headBob: 0,
    // New polish fields
    squishY: 1,     // squash & stretch Y scale (1 = normal)
    squishX: 1,     // squash & stretch X scale (1 = normal)
    stunnedTimer: 0, // dizzy after face-hit
    sliding: false,
    slideTimer: 0,
    prevOnGround: false,
    runDustTimer: 0,
    specialCooldown: 0,
    state: 'IDLE', // AI state machine
  };
}

function makeBall() {
  return {
    x: W / 2, y: H / 2,
    vx: (Math.random() > 0.5 ? 1 : -1) * 3,
    vy: -4,
    r: 20,
    spin: 0,
    angle: 0,
    trail: [],
  };
}

// ─────── GAME START ───────
function startGame() {
  if (isPlayerLocked(selectedPlayer)) {
    showGoalFlash('🔒 CHARACTER LOCKED!');
    return;
  }
  canvas = document.getElementById('gameCanvas');
  ctx = canvas.getContext('2d');
  canvas.width = W;
  canvas.height = H;

  scorePlayer = 0;
  scoreAI = 0;
  timeLeft = MATCH_TIME;
  particles = [];
  confetti = [];
  fireworks = [];
  goalCooldown = 0;
  frameCount = 0;
  powerMeter = 0;
  powerCharging = false;
  ledOffset = 0;

  const pData = PLAYERS[selectedPlayer]; // Initialize Players
  player = makePlayer(250, false, selectedPlayer, true);

  // Choose random AI for now
  const aiIdx = Math.floor(Math.random() * PLAYERS.length);
  ai = makePlayer(W - 305, true, aiIdx, false);
  // Give AI a slight boost based on difficulty
  const aiScale = 1 + aiDifficulty * 0.15;
  ai.data.speed *= aiScale;
  ai.data.jump *= aiScale;
  ai.data.power *= aiScale;

  ball = makeBall();

  updateHUD();
  document.getElementById('hud-player-name').textContent = pData.name;
  document.getElementById('hud-ai-name').textContent = 'AI';
  document.getElementById('hud-level').textContent = AI_LEVELS[aiDifficulty];

  // Special ability HUD badge
  const badge = document.getElementById('special-badge');
  if (badge) { badge.textContent = pData.specialLabel || ''; }

  setScreen('game');
  gameState = 'playing';
  sfxGameStart();

  // Timer
  clearInterval(timerInterval);
  timerInterval = setInterval(() => {
    if (gameState !== 'playing') return;
    timeLeft--;
    const el = document.getElementById('hud-time');
    el.textContent = timeLeft;
    el.classList.toggle('urgent', timeLeft <= 15);
    if (timeLeft <= 0) { sfxWhistle(); endMatch(); }
  }, 1000);

  // Input
  document.addEventListener('keydown', onKey);
  document.addEventListener('keyup', onKeyUp);

  if (gameLoop) cancelAnimationFrame(gameLoop);
  requestAnimationFrame(gameFrame);
}

function onKey(e) {
  keys[e.key] = true;
  if (e.key === ' ') { e.preventDefault(); powerCharging = true; }
  if (e.key === 'z' || e.key === 'Z') { e.preventDefault(); specialKick(); }
  if (e.key === 'Escape') togglePause();
}
function onKeyUp(e) {
  keys[e.key] = false;
  if (e.key === ' ') {
    e.preventDefault();
    if (powerCharging && gameState === 'playing') {
      normalKick(); // Space = always works
    }
    powerCharging = false;
    powerMeter = 0;
  }
}

// ─────── GAME FRAME ───────
function gameFrame(timestamp) {
  gameLoop = requestAnimationFrame(gameFrame);
  if (gameState !== 'playing') return;

  if (impactWait > 0) {
    impactWait -= 16; // roughly 1 frame at 60fps
    return;
  }

  frameCount++;
  update();
  render();
}

function triggerImpactFrame(ms) {
  impactWait = ms;
}

// ─────── UPDATE ───────
function update() {
  // Even during goal cooldown, we update visual effects
  if (goalCooldown > 0) {
    goalCooldown--;
    updateVisualsOnly(); // Helper for particles/confetti
    return;
  }

  // Power charge
  if (powerCharging && powerMeter < 100) powerMeter = Math.min(100, powerMeter + 2.5);

  // Player movement
  const pd = PLAYERS[selectedPlayer];
  const isMovingH = (keys['ArrowLeft'] || keys['a'] || keys['A'] || keys['ArrowRight'] || keys['d'] || keys['D']);

  if (!player.sliding) {
    if (keys['ArrowLeft'] || keys['a'] || keys['A']) {
      player.vx -= (pd.speed * 0.4) * timeScale;
      player.facing = -1;
    }
    if (keys['ArrowRight'] || keys['d'] || keys['D']) {
      player.vx += (pd.speed * 0.4) * timeScale;
      player.facing = 1;
    }
    if ((keys['ArrowUp'] || keys['w'] || keys['W']) && player.onGround) {
      player.vy = -(pd.jump || 16); // Jump is an instantaneous impulse, but many physics engines scale it too. Let's keep it for height consistency.
      player.onGround = false;
      player.squishX = 0.7; player.squishY = 1.35;
      spawnJumpParticles(player);
    }
    // Slide mechanic (S or ArrowDown)
    if ((keys['s'] || keys['S'] || keys['ArrowDown']) && player.onGround && !player.sliding) {
      player.sliding = true;
      player.slideTimer = 28;
      player.vx += player.facing * 12;
      sfxKick();
    }
  }

  // Dash
  if ((keys['x'] || keys['X']) && player.dashCooldown <= 0 && player.onGround && !player.sliding) {
    player.vx += player.facing * 18;
    player.dashCooldown = 60;
    spawnDashParticles(player);
  }

  // Run dust
  if (player.onGround && isMovingH && Math.abs(player.vx) > 3) {
    player.runDustTimer++;
    if (player.runDustTimer % 6 === 0) spawnRunDust(player);
  } else { player.runDustTimer = 0; }

  // Move physics
  moveEntity(player);
  moveEntity(ai);
  moveBall();

  // AI
  updateAI();

  // Ball collision with players
  checkBallPlayerCollision(player);
  checkBallPlayerCollision(ai);

  // Player-player collision
  checkPlayerCollision();

  // Goal check
  checkGoal();

  // Celebrate timer
  if (celebrateTimer > 0) celebrateTimer--;

  // Squash & Stretch spring back
  updateSquish(player);
  updateSquish(ai);

  updateVisualsOnly();

  // Timers
  if (player.dashCooldown > 0) player.dashCooldown--;
  if (ai.dashCooldown > 0) ai.dashCooldown--;
  if (player.kickTimer > 0) { player.kickTimer--; if (!player.kickTimer) player.kicking = false; }
  if (ai.kickTimer > 0) { ai.kickTimer--; if (!ai.kickTimer) ai.kicking = false; }

  // Special Skill Cooldown
  if (player.specialCooldown > 0) {
    player.specialCooldown--;
    const bar = document.getElementById('cooldown-bar');
    if (bar) {
      const pct = (player.specialCooldown / 180) * 100;
      bar.style.width = pct + '%';
      bar.style.opacity = pct > 0 ? '1' : '0';
    }
  } else {
    const bar = document.getElementById('cooldown-bar');
    if (bar) bar.style.width = '0%';
  }

  updateHUD();

  player.headBob = Math.sin(frameCount * 0.12) * 2;
  floodlightAngle = Math.sin(frameCount * 0.02) * 15; // animate floodlights
}

function updateVisualsOnly() {
  // Particles
  particles = particles.filter(p => p.life > 0);
  particles.forEach(p => {
    p.x += p.vx * timeScale; p.y += p.vy * timeScale;
    p.vy += 0.15 * timeScale;
    p.life -= timeScale;
    p.alpha = p.life / p.maxLife;
  });
  // Confetti
  confetti = confetti.filter(c => c.y < H + 20);
  confetti.forEach(c => {
    c.x += c.vx * timeScale; c.y += c.vy * timeScale;
    c.vy += 0.2 * timeScale;
    c.r += c.spin * timeScale;
  });
  // Fireworks
  fireworks = fireworks.filter(f => f.life > 0);
  fireworks.forEach(f => {
    f.x += f.vx * timeScale; f.y += f.vy * timeScale;
    f.vy += 0.08 * timeScale;
    f.life -= timeScale;
    f.alpha = f.life / f.maxLife;
    f.vx *= Math.pow(0.97, timeScale);
  });
  // LED ticker
  ledOffset -= 1.8 * timeScale;
  if (ledOffset < -3000) ledOffset = W;
  // Shake decay
  if (shakeAmount > 0) shakeAmount *= 0.9;
  if (shakeAmount < 0.1) shakeAmount = 0;
}

function updateSquish(e) {
  e.squishX += (1 - e.squishX) * 0.18;
  e.squishY += (1 - e.squishY) * 0.18;
  if (Math.abs(e.squishX - 1) < 0.01) e.squishX = 1;
  if (Math.abs(e.squishY - 1) < 0.01) e.squishY = 1;
  // Land squash
  if (!e.prevOnGround && e.onGround && Math.abs(e.vy) < 2) {
    if (Math.abs(e.squishY - 1) > 0.05) { // was stretched
      e.squishX = 1.3; e.squishY = 0.75;
      spawnRunDust(e);
    }
  }
  e.prevOnGround = e.onGround;
  // Sliding timer
  if (e.slideTimer > 0) { e.slideTimer--; if (!e.slideTimer) e.sliding = false; }
  // Stunned timer
  if (e.stunnedTimer > 0) e.stunnedTimer--;
}

function moveEntity(e) {
  // Apply friction scaled by timeScale
  const f = Math.pow(FRICTION, timeScale);
  e.vx *= f;
  e.vy += GRAVITY * timeScale;
  e.x += e.vx * timeScale;
  e.y += e.vy * timeScale;

  // Ground
  if (e.y + e.h > GROUND_Y) {
    e.y = GROUND_Y - e.h;
    e.vy = 0;
    e.onGround = true;
    const gF = Math.pow(e.sliding ? 0.96 : 0.85, timeScale);
    e.vx *= gF;
  } else {
    e.onGround = false;
  }

  // Walls
  e.x = Math.max(0, Math.min(W - e.w, e.x));

  // Cap speed
  const maxSpd = (e.data.speed || 7) * (e.sliding ? 2.5 : 1.5);
  e.vx = Math.max(-maxSpd, Math.min(maxSpd, e.vx));
}

function moveBall() {
  const f = Math.pow(BALL_FRICTION * BALL_AIR_DRAG, timeScale);
  ball.vx *= f;
  ball.vy = (ball.vy + (GRAVITY * 0.9) * timeScale) * Math.pow(BALL_AIR_DRAG, timeScale);
  ball.x += ball.vx * timeScale;
  ball.y += ball.vy * timeScale;
  ball.angle += (ball.vx * 0.04) * timeScale;
  ball.spin *= Math.pow(BALL_SPIN_DECAY, timeScale);

  // Clamp ball velocity
  ball.vx = Math.max(-MAX_BALL_SPEED, Math.min(MAX_BALL_SPEED, ball.vx));
  ball.vy = Math.max(-MAX_BALL_SPEED, Math.min(MAX_BALL_SPEED, ball.vy));
  ball.trail.push({ x: ball.x, y: ball.y, t: frameCount });
  if (ball.trail.length > 8) ball.trail.shift();

  // Ground bounce
  if (ball.y + ball.r > GROUND_Y) {
    ball.y = GROUND_Y - ball.r;
    ball.vy *= -BALL_BOUNCE;
    ball.vx *= 0.9;
    ball.spin *= 0.7; // lose spin on bounce
    if (Math.abs(ball.vy) > 3) { spawnBounceParticles(); sfxBounce(); }
  }
  // Ceiling
  if (ball.y - ball.r < 0) { ball.y = ball.r; ball.vy *= -BALL_BOUNCE; }

  // ── Magnus Effect: spin nudges horizontal velocity ──
  // Simulates the lateral force on a spinning ball in flight
  if (Math.abs(ball.spin) > 0.05 && ball.y < GROUND_Y - ball.r * 2) {
    ball.vx += ball.spin * 0.06;
  }

  // Wall bounce (not in goal areas)
  if (ball.x - ball.r < 0) {
    if (ball.y > GROUND_Y - GOAL_HEIGHT) {
      // Ball went into LEFT goal -> Point for AI
      handleGoal(false);
      return;
    }
    ball.x = ball.r; ball.vx *= -BALL_BOUNCE;
  }
  if (ball.x + ball.r > W) {
    if (ball.y > GROUND_Y - GOAL_HEIGHT) {
      // Ball went into RIGHT goal -> Point for PLAYER
      handleGoal(true);
      return;
    }
    ball.x = W - ball.r; ball.vx *= -BALL_BOUNCE;
  }
}

function checkBallPlayerCollision(e) {
  const cx = e.x + e.w / 2;
  const cy = e.y + e.h * 0.28; // head center
  const hr = e.headRadius;
  const dx = ball.x - cx;
  const dy = ball.y - cy;
  const dist = Math.sqrt(dx * dx + dy * dy);
  if (dist < hr + ball.r) {
    const nx = dx / dist, ny = dy / dist;
    ball.x = cx + nx * (hr + ball.r);
    ball.y = cy + ny * (hr + ball.r);
    const relVx = ball.vx - e.vx;
    const relVy = ball.vy - e.vy;
    const dot = relVx * nx + relVy * ny;
    if (dot < 0) {
      const m1 = e.data.mass || 6;
      const m2 = ball.mass || 1.2;
      const restitution = 0.8;

      // Normal velocities
      const v1n = e.vx * nx + e.vy * ny;
      const v2n = ball.vx * nx + ball.vy * ny;

      // Elastic collision formula for v2n_after (the ball)
      const v2n_after = (v2n * (m2 - m1) + 2 * m1 * v1n) / (m1 + m2);

      // Apply change to ball velocity
      const impulse = (v2n_after - v2n) * restitution;
      ball.vx += impulse * nx;
      ball.vy += impulse * ny;

      // Add a bit of player velocity transfer
      ball.vx += e.vx * 0.2;
      ball.vy += e.vy * 0.1;

      // PERFECT TIMING WINDOW (Jump Peak)
      if (!e.onGround && Math.abs(e.vy) < 2.5) {
        ball.vx *= 1.45;
        ball.vy *= 1.25;
        triggerImpactFrame(80);
        spawnPerfectParticles(ball.x, ball.y);
        showPerfectText();
      }

      ball.spin = e.vx * 0.15;
      e.kicking = true;
      e.kickTimer = 8;
      // Squash on kick
      e.squishX = 1.2; e.squishY = 0.8;
      // Stunned if ball hits hard & player isn't kicking
      if (relVy < -5 && dy < 0) {
        e.stunnedTimer = 45; // ~0.75s
      }
      spawnBallHitParticles(ball.x, ball.y);
      sfxKick();
    }
  }
}

function checkGoal() {
  // Simplified - handled in moveBall via wall check
}

// ─────── PLAYER-PLAYER COLLISION ───────
function checkPlayerCollision() {
  const ax = player.x + player.w / 2;
  const ay = player.y + player.h / 2;
  const bx = ai.x + ai.w / 2;
  const by = ai.y + ai.h / 2;
  const dx = bx - ax;
  const dy = by - ay;
  const dist = Math.sqrt(dx * dx + dy * dy);
  const minDist = player.w * 0.82;

  if (dist < minDist && dist > 0) {
    const overlap = minDist - dist;
    const nx = dx / dist;
    const ny = dy / dist;

    // 1. Separation correction (prevents sticking/vibrating)
    const ratio = 0.5;
    player.x -= nx * overlap * ratio;
    player.y -= ny * overlap * ratio;
    ai.x += nx * overlap * ratio;
    ai.y += ny * overlap * ratio;

    // 2. Momentum exchange (Elastic Collision Formula)
    const m1 = player.data.mass || 6;
    const m2 = ai.data.mass || 6;
    const totalMass = m1 + m2;

    const relVx = player.vx - ai.vx;
    const relVy = player.vy - ai.vy;
    const dot = relVx * nx + relVy * ny;

    if (dot > 0) {
      // Normal velocities
      const v1n = player.vx * nx + player.vy * ny;
      const v2n = ai.vx * nx + ai.vy * ny;

      // Formula: v1' = (v1(m1-m2) + 2*m2*v2) / (m1+m2)
      const v1n_after = (v1n * (m1 - m2) + 2 * m2 * v2n) / totalMass;
      const v2n_after = (v2n * (m2 - m1) + 2 * m1 * v1n) / totalMass;

      const restitution = 0.7;
      player.vx += (v1n_after - v1n) * nx * restitution;
      player.vy += (v1n_after - v1n) * ny * restitution;
      ai.vx += (v2n_after - v2n) * nx * restitution;
      ai.vy += (v2n_after - v2n) * ny * restitution;
    }

    // 3. Wall/Ground re-clamping after push
    player.x = Math.max(0, Math.min(W - player.w, player.x));
    ai.x = Math.max(0, Math.min(W - ai.w, ai.x));
    if (player.y + player.h > GROUND_Y) player.y = GROUND_Y - player.h;
    if (ai.y + ai.h > GROUND_Y) ai.y = GROUND_Y - ai.h;

    spawnCollisionParticles((ax + bx) / 2, (ay + by) / 2);
  }
}


function showGoalFlash(text) {
  const el = document.getElementById('goal-flash');
  el.textContent = text;
  el.classList.add('show');
  setTimeout(() => el.classList.remove('show'), 1900);
}

function resetPositions() {
  player.x = 250; player.y = GROUND_Y - 80; player.vx = 0; player.vy = 0;
  ai.x = W - 305; ai.y = GROUND_Y - 80; ai.vx = 0; ai.vy = 0;
  ball.x = W / 2; ball.y = H / 2;
  ball.vx = (Math.random() > 0.5 ? 1 : -1) * 2;
  ball.vy = -3;
  ball.trail = [];
  particles = [];
}

// ─────── AI ───────
function updateAI() {
  const diff = aiDifficulty;
  const e = ai;
  const targetGoalX = 0; // Left goal (what AI targets to score)
  const ownGoalX = W;    // Right goal (what AI defends)

  e.aiTimer++;
  const reactionInterval = Math.max(1, 4 - diff); // was 8-diff*2: now faster
  if (e.aiTimer % reactionInterval !== 0) return;

  const bx = ball.x, by = ball.y, bvx = ball.vx, bvy = ball.vy;
  const aiCx = e.x + e.w / 2;
  const aiCy = e.y + e.h * 0.28;

  // Prediction
  const lookAhead = 12 + diff * 5;
  const predX = bx + bvx * lookAhead;
  let predY = by + bvy * lookAhead + 0.5 * (GRAVITY * 0.9) * lookAhead * lookAhead;
  if (predY > GROUND_Y - ball.r) predY = GROUND_Y - ball.r;

  // --- FSM STATE TRANSITIONS ---
  const ballCloseToGoal = bx > W - 300;
  const ballInAir = by < GROUND_Y - 150;
  const losing = scoreAI < scorePlayer;

  if (ballCloseToGoal) {
    e.state = 'PANIC';
  } else if (bx < W * 0.4 || losing) {
    e.state = 'ATTACK';
  } else if (bx > W * 0.6) {
    e.state = 'DEFEND';
  } else {
    e.state = 'SEEK';
  }

  // --- STATE BEHAVIORS ---
  let targetX = aiCx;
  let shouldJump = false;

  switch (e.state) {
    case 'IDLE':
      targetX = W - GOAL_WIDTH - 150;
      break;
    case 'SEEK':
      targetX = predX - (e.w / 2) * e.facing;
      break;
    case 'ATTACK':
      // Move aggressively, trying to get behind the ball
      targetX = predX + 20;
      break;
    case 'DEFEND':
      // Stay between ball and goal
      targetX = Math.max(W - GOAL_WIDTH - 200, predX + 80);
      // ADAPTIVE: if player history suggests fast shots, stay deeper
      if (playerShotHistory.length > 5) {
        const avgVX = playerShotHistory.reduce((a, b) => a + b, 0) / playerShotHistory.length;
        if (Math.abs(avgVX) > 12) targetX += 50;
      }
      break;
    case 'PANIC':
      // Direct chase to intercept
      targetX = bx + bvx * 5;
      shouldJump = by < aiCy || (playerShotHistory.some(v => v < -5) && Math.random() < 0.3);
      break;
  }

  // Movement execution
  const dx = targetX - e.x;
  const spd = (e.data.speed || 5) * (0.85 + diff * 0.1);
  if (Math.abs(dx) > 10) {
    e.vx += (dx > 0 ? 1 : -1) * spd * 0.35 * timeScale;
    e.facing = dx > 0 ? 1 : -1;
  }

  // Smart Jumping
  const isBallAbove = predY < aiCy - 10;
  const isBallInRange = Math.abs(aiCx - predX) < 100;
  if ((isBallAbove && isBallInRange) || shouldJump) {
    if (e.onGround && Math.random() < 0.2 + diff * 0.12) {
      e.vy = -(e.data.jump || 15);
      e.onGround = false;
    }
  }

  // Dash logic
  if (diff > 0 && e.dashCooldown <= 0 && e.onGround && Math.abs(dx) > 220) {
    if (Math.random() < 0.03 + diff * 0.015) {
      e.vx += e.facing * 18;
      e.dashCooldown = 120 - diff * 15;
    }
  }
}

// ─────── KICK SYSTEM ───────
// Space = Normal kick (ALWAYS works)
// Z     = Special skill (cooldown + unlock required)

function normalKick() {
  const cx = player.x + player.w / 2;
  const cy = player.y + player.h * 0.28;
  const dx = ball.x - cx, dy = ball.y - cy;
  const dist = Math.sqrt(dx * dx + dy * dy);
  if (dist < 120) {
    const base = 10 + powerMeter * 0.10;
    ball.vx = player.facing * base;
    ball.vy = -base * 0.5;
    player.kicking = true;
    player.kickTimer = 10;
    spawnPowerParticles(cx, cy);
    sfxKick();
    playerShotHistory.push(ball.vx);
    if (playerShotHistory.length > 15) playerShotHistory.shift();
  }
}

function specialKick() {
  if (player.specialCooldown > 0) {
    const pct = Math.ceil((player.specialCooldown / 180) * 3);
    showGoalFlash(`⏳ Skill cooldown... ${'▓'.repeat(pct)}${'░'.repeat(3 - pct)}`);
    return;
  }
  const pd = PLAYERS[selectedPlayer];
  if (!playerProgress.unlockedSkills.includes(pd.special)) {
    const reqLvl = Object.keys(playerProgress.skillUnlocks).find(k => playerProgress.skillUnlocks[k] === pd.special);
    showGoalFlash(`🔒 REACH LVL ${reqLvl} TO UNLOCK ${pd.special.toUpperCase()}!`);
    return;
  }
  const cx = player.x + player.w / 2;
  const cy = player.y + player.h * 0.28;
  const dx = ball.x - cx, dy = ball.y - cy;
  const dist = Math.sqrt(dx * dx + dy * dy);
  if (dist < 120) {
    const base = 12 + powerMeter * 0.14;
    player.specialCooldown = 180;
    if (pd.special === 'cannon') {
      ball.vx = player.facing * base * 1.8;
      ball.vy = -base * 0.2;
      ball.spin = 0;
      shakeAmount = 15;
      triggerImpactFrame(60);
    } else if (pd.special === 'curve') {
      ball.vx = player.facing * base * 1.1;
      ball.vy = -base * 0.8;
      ball.spin = player.facing * 7;
      specialTrail = true;
      setTimeout(() => { specialTrail = false; }, 1500);
      setTimeout(() => { if (ball) ball.vx += player.facing * 4; }, 180);
    } else if (pd.special === 'sprint') {
      player.vx += player.facing * 15;
      ball.vx = player.facing * base * 1.3;
      ball.vy = -base * 0.4;
    } else if (pd.special === 'precision') {
      const goalX = player.facing > 0 ? W - GOAL_WIDTH / 2 : GOAL_WIDTH / 2;
      const goalY = GROUND_Y - GOAL_HEIGHT / 2;
      const ang = Math.atan2(goalY - ball.y, goalX - ball.x);
      ball.vx = Math.cos(ang) * base * 1.25;
      ball.vy = Math.sin(ang) * base * 1.25;
    }
    player.kicking = true;
    player.kickTimer = 14;
    spawnPowerParticles(cx, cy);
    sfxPowerKick();
    playerShotHistory.push(ball.vx);
    if (playerShotHistory.length > 15) playerShotHistory.shift();
  }
}

// Keep old name for compatibility
function powerKick() { specialKick(); }

// ─────── PARTICLES ───────
function spawnJumpParticles(e) {
  for (let i = 0; i < 8; i++) {
    particles.push({
      x: e.x + e.w / 2 + (Math.random() - 0.5) * 40,
      y: GROUND_Y,
      vx: (Math.random() - 0.5) * 4,
      vy: -(Math.random() * 3 + 1),
      color: CITY_BLUE,
      r: 4 + Math.random() * 4,
      life: 20, maxLife: 20, alpha: 1,
    });
  }
}

function spawnDashParticles(e) {
  for (let i = 0; i < 12; i++) {
    particles.push({
      x: e.x + e.w / 2,
      y: e.y + e.h / 2 + (Math.random() - 0.5) * 30,
      vx: -e.facing * (3 + Math.random() * 5),
      vy: (Math.random() - 0.5) * 2,
      color: CITY_GOLD,
      r: 3 + Math.random() * 5,
      life: 18, maxLife: 18, alpha: 1,
    });
  }
}

function spawnBounceParticles() {
  for (let i = 0; i < 6; i++) {
    particles.push({
      x: ball.x + (Math.random() - 0.5) * 30,
      y: GROUND_Y,
      vx: (Math.random() - 0.5) * 5,
      vy: -(Math.random() * 4 + 1),
      color: CITY_WHITE,
      r: 2 + Math.random() * 3,
      life: 14, maxLife: 14, alpha: 0.8,
    });
  }
}

function spawnBallHitParticles(x, y) {
  for (let i = 0; i < 10; i++) {
    const a = (Math.PI * 2 * i) / 10;
    particles.push({
      x, y,
      vx: Math.cos(a) * (3 + Math.random() * 3),
      vy: Math.sin(a) * (3 + Math.random() * 3),
      color: Math.random() > 0.5 ? CITY_BLUE : CITY_GOLD,
      r: 3 + Math.random() * 4,
      life: 16, maxLife: 16, alpha: 1,
    });
  }
}

function spawnCollisionParticles(x, y) {
  for (let i = 0; i < 8; i++) {
    const a = Math.random() * Math.PI * 2;
    particles.push({
      x: x + (Math.random() - 0.5) * 20,
      y: y + (Math.random() - 0.5) * 20,
      vx: Math.cos(a) * (2 + Math.random() * 4),
      vy: Math.sin(a) * (2 + Math.random() * 4) - 2,
      color: '#ffaa44',
      r: 3 + Math.random() * 4,
      life: 14, maxLife: 14, alpha: 1,
    });
  }
}

function spawnPowerParticles(x, y) {
  for (let i = 0; i < 20; i++) {
    const a = Math.random() * Math.PI * 2;
    particles.push({
      x, y,
      vx: Math.cos(a) * (5 + Math.random() * 8),
      vy: Math.sin(a) * (5 + Math.random() * 8) - 4,
      color: CITY_GOLD,
      r: 5 + Math.random() * 6,
      life: 22, maxLife: 22, alpha: 1,
    });
  }
}

function spawnPerfectParticles(x, y) {
  for (let i = 0; i < 30; i++) {
    const a = Math.random() * Math.PI * 2;
    const spd = 6 + Math.random() * 10;
    particles.push({
      x, y,
      vx: Math.cos(a) * spd,
      vy: Math.sin(a) * spd,
      color: i % 2 === 0 ? '#FFFFFF' : CITY_GOLD,
      r: 4 + Math.random() * 5,
      life: 25, maxLife: 25, alpha: 1,
    });
  }
}

function showPerfectText() {
  const el = document.getElementById('goal-flash');
  const oldText = el.textContent;
  el.textContent = '⭐ PERFECT TIMING! ⭐';
  el.style.color = CITY_GOLD;
  el.classList.add('show');
  setTimeout(() => {
    el.classList.remove('show');
    setTimeout(() => { el.style.color = ''; }, 400);
  }, 700);
}

function spawnRunDust(e) {
  const baseX = e.x + (e.facing > 0 ? 0 : e.w);
  for (let i = 0; i < 4; i++) {
    particles.push({
      x: baseX + (Math.random() - 0.5) * 20,
      y: GROUND_Y - 2,
      vx: -e.facing * (0.5 + Math.random() * 2),
      vy: -(Math.random() * 1.5),
      color: e.sliding ? '#a0522d' : '#c8a96e',
      r: 3 + Math.random() * 4,
      life: 14, maxLife: 14, alpha: 0.7,
    });
  }
}

function spawnConfetti(isAI) {
  const colors = isAI ? ['#E0001B', '#FFD700', '#888'] : [CITY_BLUE, CITY_GOLD, CITY_WHITE, CITY_DARK];
  for (let i = 0; i < 80; i++) {
    confetti.push({
      x: Math.random() * W,
      y: -10,
      vx: (Math.random() - 0.5) * 5,
      vy: 2 + Math.random() * 5,
      r: 0,
      spin: (Math.random() - 0.5) * 0.15,
      w: 6 + Math.random() * 10,
      h: 4 + Math.random() * 8,
      color: colors[Math.floor(Math.random() * colors.length)],
    });
  }
}

function spawnFireworks(isCity) {
  const colors = isCity ? [CITY_BLUE, CITY_GOLD, CITY_WHITE] : ['#E0001B', '#FFD700'];
  for (let burst = 0; burst < 6; burst++) {
    const bx = 100 + Math.random() * (W - 200);
    const by = 60 + Math.random() * 180;
    for (let i = 0; i < 28; i++) {
      const a = (i / 28) * Math.PI * 2;
      const spd = 4 + Math.random() * 7;
      fireworks.push({
        x: bx, y: by,
        vx: Math.cos(a) * spd,
        vy: Math.sin(a) * spd,
        color: colors[Math.floor(Math.random() * colors.length)],
        r: 2 + Math.random() * 3,
        life: 40 + Math.random() * 30,
        maxLife: 70,
        alpha: 1,
      });
    }
  }
}

function triggerShake(amt) {
  shakeAmount = amt;
}

// ─────── HUD ───────
function getRank(level) {
  if (level < 3) return '🥉 BRONZE';
  if (level < 5) return '🥈 SILVER';
  if (level < 8) return '🥇 GOLD';
  if (level < 12) return '💎 PLATINUM';
  return '👑 DIAMOND';
}

function updateHUD() {
  const scorePlayerEl = document.getElementById('score-player');
  const scoreAIEl = document.getElementById('score-ai');
  const timeEl = document.getElementById('hud-time');
  const levelEl = document.getElementById('hud-level');
  const aiNameEl = document.getElementById('hud-ai-name');

  if (scorePlayerEl) scorePlayerEl.textContent = scorePlayer;
  if (scoreAIEl) scoreAIEl.textContent = scoreAI;
  if (timeEl) timeEl.textContent = Math.max(0, Math.ceil(timeLeft));
  if (levelEl) levelEl.textContent = `⭐ LVL ${playerProgress.level}  ${getRank(playerProgress.level)}`;
  if (aiNameEl) {
    const diffLabels = ['EASY 🟢', 'MEDIUM 🟡', 'HARD 🔴'];
    aiNameEl.textContent = diffLabels[aiDifficulty] || 'AI';
  }
}

// ─────── HUD ───────
function getRank(level) {
  if (level < 3) return 'BRONZE III';
  if (level < 5) return 'BRONZE I';
  if (level < 8) return 'SILVER';
  if (level < 12) return 'GOLD';
  if (level < 18) return 'PLATINUM';
  return 'DIAMOND';
}

function updateHUD() {
  document.getElementById('score-player').textContent = scorePlayer;
  document.getElementById('score-ai').textContent = scoreAI;
  document.getElementById('hud-time').textContent = formatTime(timeLeft);

  // Show level/rank in HUD
  const rank = getRank(playerProgress.level);
  document.getElementById('hud-level').innerHTML = `RANK: <span style="color:var(--city-gold)">${rank}</span> | LVL: ${playerProgress.level}`;
}

// ─────── END MATCH ───────
function endMatch() {
  clearInterval(timerInterval);
  gameState = 'result';

  const rs = document.getElementById('result-scoreline');
  const rt = document.getElementById('result-title');
  const rm = document.getElementById('result-msg');
  const stars = document.getElementById('result-stars');
  const trophy = document.getElementById('result-trophy');

  rs.textContent = `${scorePlayer} – ${scoreAI}`;

  let earnedXP = 20; // base match XP
  earnedXP += scorePlayer * 10; // 10 XP per goal

  if (scorePlayer > scoreAI) {
    rt.textContent = 'FULL TIME! 🏆';
    rm.textContent = 'CITY WIN! CHAMPIONS!';
    rm.className = 'result-msg win';
    trophy.textContent = '🏆';
    stars.textContent = '⭐⭐⭐';
    earnedXP += 50; // win bonus
    spawnConfetti(false);
  } else if (scoreAI > scorePlayer) {
    rt.textContent = 'FULL TIME!';
    rm.textContent = 'DEFEAT. Come back stronger!';
    rm.className = 'result-msg lose';
    trophy.textContent = '😢';
    stars.textContent = '⭐';
  } else {
    rt.textContent = 'FULL TIME!';
    rm.textContent = 'IT\'S A DRAW!';
    rm.className = 'result-msg draw';
    trophy.textContent = '🤝';
    stars.textContent = '⭐⭐';
    earnedXP += 20; // draw bonus
  }

  grantXP(earnedXP);

  document.getElementById('screen-game').classList.remove('active');
  setScreen('result');
}

function grantXP(amount) {
  playerProgress.xp += amount;
  if (playerProgress.xp >= playerProgress.xpToNext) {
    playerProgress.level++;
    playerProgress.xp -= playerProgress.xpToNext;
    playerProgress.xpToNext = Math.floor(playerProgress.xpToNext * 1.3);

    // Skill Unlocks
    const newSkill = playerProgress.skillUnlocks[playerProgress.level];
    if (newSkill && !playerProgress.unlockedSkills.includes(newSkill)) {
      playerProgress.unlockedSkills.push(newSkill);
      showUnlockMessage(newSkill);
    }

    showLevelUpMessage();
  }
  saveProgress();
  updateRewardUI(amount);
}

function updateRewardUI(earned) {
  // Simple injection for now, will build full screen later
  const rm = document.getElementById('result-msg');
  const xpInfo = document.createElement('div');
  xpInfo.style.cssText = 'color:var(--city-gold); font-size:1rem; margin-top:10px; font-family:Orbitron;';
  xpInfo.innerHTML = `+${earned} XP <br> LVL ${playerProgress.level} (${playerProgress.xp}/${playerProgress.xpToNext})`;
  rm.appendChild(xpInfo);
}

function showLevelUpMessage() {
  showGoalFlash('🌟 LEVEL UP! 🌟');
  sfxGoalCheer();
}

function showUnlockMessage(skill) {
  setTimeout(() => {
    showGoalFlash(`🔥 UNLOCKED: ${skill.toUpperCase()}! 🔥`);
  }, 2000);
}

function restartGame() { startGame(); }
function showHowToPlay() {
  const existing = document.getElementById('how-to-play-overlay');
  if (existing) { existing.remove(); return; }
  const overlay = document.createElement('div');
  overlay.id = 'how-to-play-overlay';
  overlay.style.cssText = `
    position:fixed;inset:0;background:rgba(10,15,35,0.92);
    z-index:9999;display:flex;align-items:center;justify-content:center;
    font-family:'Orbitron',monospace;
  `;
  overlay.innerHTML = `
    <div style="background:linear-gradient(135deg,#0d1f3c,#1a3055);border:2px solid var(--city-blue,#6ecff6);border-radius:16px;padding:36px 40px;max-width:480px;width:90%;color:#fff;">
      <h2 style="color:var(--city-blue,#6ecff6);text-align:center;margin-bottom:20px;font-size:1.3rem">📋 HOW TO PLAY</h2>
      <table style="width:100%;border-collapse:collapse;font-size:0.9rem;">
        <tr><td style="padding:6px 0;color:#adf">◀ ▶</td><td style="padding:6px 8px">Move left / right</td></tr>
        <tr><td style="padding:6px 0;color:#adf">▲ / W</td><td style="padding:6px 8px">Jump</td></tr>
        <tr><td style="padding:6px 0;color:#adf">▼ / S</td><td style="padding:6px 8px">Slide tackle</td></tr>
        <tr><td style="padding:6px 0;color:var(--city-gold,#FFD700);font-weight:bold">SPACE</td><td style="padding:6px 8px">⚽ Normal kick <span style="color:#4f4">(always works)</span></td></tr>
        <tr><td style="padding:6px 0;color:#f84;font-weight:bold">Z</td><td style="padding:6px 8px">🌟 Special skill <span style="color:#f99">(cooldown + unlock req)</span></td></tr>
        <tr><td style="padding:6px 0;color:#adf">X</td><td style="padding:6px 8px">💨 Dash burst</td></tr>
        <tr><td style="padding:6px 0;color:#adf">ESC</td><td style="padding:6px 8px">⏸ Pause</td></tr>
      </table>
      <p style="color:#888;font-size:0.75rem;margin-top:16px;text-align:center">Hold SPACE to charge, release to kick harder!</p>
      <div style="text-align:center;margin-top:20px;">
        <button onclick="document.getElementById('how-to-play-overlay').remove()" style="
          background:var(--city-blue,#6ecff6);border:none;color:#000;
          padding:10px 28px;border-radius:8px;font-family:inherit;font-size:0.95rem;
          cursor:pointer;font-weight:bold;">CLOSE</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);
  overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });
}

function updateMenuRankDisplay() {
  const el = document.getElementById('menu-rank-display');
  if (el) {
    el.textContent = `⭐ LVL ${playerProgress.level} — ${getRank(playerProgress.level)}`;
  }
  const hsEl = document.getElementById('hs-display');
  if (hsEl) {
    hsEl.textContent = `XP: ${playerProgress.xp}/${playerProgress.xpToNext}`;
  }
}

function goToMenu() {
  clearInterval(timerInterval);
  gameState = 'menu';
  document.removeEventListener('keydown', onKey);
  document.removeEventListener('keyup', onKeyUp);
  setScreen('menu');
}

function togglePause() {
  if (gameState === 'playing') {
    gameState = 'paused';
    document.getElementById('screen-pause').classList.add('active');
  } else if (gameState === 'paused') {
    gameState = 'playing';
    document.getElementById('screen-pause').classList.remove('active');
  }
}

// ─────── RENDER ───────
function render() {
  ctx.save();
  if (shakeAmount > 0) {
    const sx = (Math.random() - 0.5) * shakeAmount;
    const sy = (Math.random() - 0.5) * shakeAmount;
    ctx.translate(sx, sy);
  }
  ctx.clearRect(0, 0, W, H);

  drawStadiumBg();
  drawLEDTicker();
  drawGround();
  drawGoals();
  drawCenterLine();
  drawFireworks();
  drawConfetti();
  drawParticles();
  drawBallTrail();
  drawBall();
  drawPlayer(player);
  drawPlayer(ai);
  if (powerCharging && powerMeter > 0) drawPowerMeter();
  drawGoalArrows();
  drawAIIntelligence();
  ctx.restore();
}

// ─────── DRAW FUNCTIONS ───────
function drawStadiumBg() {
  // Sky gradient
  const sky = ctx.createLinearGradient(0, 0, 0, H);
  sky.addColorStop(0, '#0a1628');
  sky.addColorStop(0.4, '#0d1f3c');
  sky.addColorStop(1, '#0a2218');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, H);

  // Floodlights
  drawFloodlight(80, 40);
  drawFloodlight(W - 80, 40);

  // Crowd silhouette back row
  drawCrowd(0, H * 0.42, W, 55, 0.5);
  // Crowd front row
  drawCrowd(0, H * 0.5, W, 45, 0.7);

  // Pitch green overlay (below crowd)
  const pitchGrad = ctx.createLinearGradient(0, H * 0.58, 0, GROUND_Y + 20);
  pitchGrad.addColorStop(0, '#0b4a1e');
  pitchGrad.addColorStop(0.5, '#0d5522');
  pitchGrad.addColorStop(1, '#0a4019');
  ctx.fillStyle = pitchGrad;
  ctx.fillRect(0, H * 0.58, W, GROUND_Y - H * 0.58 + 20);

  // Pitch stripes
  for (let i = 0; i < 10; i++) {
    ctx.fillStyle = i % 2 === 0 ? 'rgba(255,255,255,0.025)' : 'rgba(0,0,0,0.025)';
    ctx.fillRect(i * (W / 10), H * 0.58, W / 10, GROUND_Y - H * 0.58 + 20);
  }

  // Overhead sign
  drawStadiumSign();

  // Stars in sky
  for (let i = 0; i < 25; i++) {
    const sx = (i * 53 + 17) % W;
    const sy = (i * 31 + 11) % (H * 0.35);
    const ss = 0.5 + (i % 3) * 0.5;
    const alpha = 0.3 + Math.sin(frameCount * 0.03 + i) * 0.2;
    ctx.fillStyle = `rgba(255,255,255,${alpha})`;
    ctx.beginPath();
    ctx.arc(sx, sy, ss, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawFloodlight(x, y) {
  const isLeft = x < W / 2;
  const armX = x + (isLeft ? 40 : -40);
  const sweep = isLeft ? floodlightAngle : -floodlightAngle; // slight swing

  // Pole
  ctx.strokeStyle = '#555';
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.moveTo(x, y + 80);
  ctx.lineTo(x, H * 0.5);
  ctx.stroke();

  // Arm
  ctx.beginPath();
  ctx.moveTo(x, y + 80);
  ctx.lineTo(armX, y + 60);
  ctx.stroke();

  // Light head
  ctx.fillStyle = '#ccc';
  ctx.fillRect(armX - 25, y + 40, 50, 20);

  // Animated light cone
  const lx = armX;
  const ly = y + 60;
  const targetX = W / 2 + sweep * 8;
  const cone = ctx.createRadialGradient(lx, ly, 0, lx, ly, 280);
  cone.addColorStop(0, 'rgba(255,250,220,0.14)');
  cone.addColorStop(1, 'rgba(255,250,220,0)');
  ctx.fillStyle = cone;
  ctx.beginPath();
  ctx.moveTo(lx, ly);
  ctx.lineTo(targetX - 120, GROUND_Y);
  ctx.lineTo(targetX + 120, GROUND_Y);
  ctx.closePath();
  ctx.fill();
}

function drawCrowd(x, y, w, rowH, alpha) {
  for (let i = 0; i < Math.ceil(w / 18); i++) {
    const px = x + i * 18 + (Math.sin(i * 3.7) * 3);
    const py = y + Math.sin(i * 2.3 + frameCount * 0.01) * 4;
    const hue = Math.random() > 0.7 ? 200 : 220;
    const sat = Math.random() > 0.7 ? 80 : 20;
    ctx.fillStyle = `hsla(${hue},${sat}%,60%,${alpha})`;
    // Head
    ctx.beginPath();
    ctx.arc(px, py, 7, 0, Math.PI * 2);
    ctx.fill();
    // Body/scarf
    ctx.fillStyle = i % 3 === 0 ? `rgba(110,207,246,${alpha * 0.8})` : `rgba(50,80,130,${alpha})`;
    ctx.fillRect(px - 6, py + 6, 12, rowH * 0.55);
  }
}

function drawStadiumSign() {
  // Static banner at the top
  const bx = W / 2 - 220, by = 12, bw = 440, bh = 30;
  ctx.fillStyle = 'rgba(10,22,40,0.85)';
  roundRect(bx, by, bw, bh, 7);
  ctx.strokeStyle = CITY_BLUE;
  ctx.lineWidth = 1.5;
  roundRect(bx, by, bw, bh, 7, true);
  ctx.fillStyle = CITY_BLUE;
  ctx.font = 'bold 12px "Orbitron", monospace';
  ctx.textAlign = 'center';
  ctx.fillText('⚽  ETIHAD STADIUM  –  MAN CITY HEAD SOCCER  ⚽', W / 2, by + 20);
}

function drawLEDTicker() {
  // Scrolling LED board along the bottom of crowd stand
  const ly = H * 0.565;
  ctx.fillStyle = '#0a1e10';
  ctx.fillRect(0, ly, W, 18);
  ctx.strokeStyle = 'rgba(0,200,60,0.4)';
  ctx.lineWidth = 1;
  ctx.strokeRect(0, ly, W, 18);

  ctx.save();
  ctx.beginPath();
  ctx.rect(0, ly, W, 18);
  ctx.clip();

  ctx.font = 'bold 11px "Orbitron", monospace';
  ctx.fillStyle = '#00FF60';
  ctx.textAlign = 'left';
  ctx.shadowColor = '#00FF60';
  ctx.shadowBlur = 6;
  ctx.fillText(ledFull, ledOffset, ly + 13);
  // Wrap-around copy
  const tw = ctx.measureText(ledFull).width;
  ctx.fillText(ledFull, ledOffset + tw, ly + 13);
  ctx.shadowBlur = 0;
  ctx.restore();
}

function drawGoalArrows() {
  // Flashing arrows showing player's attack direction
  if (frameCount % 60 < 30) {
    const alpha = 0.5 + 0.5 * Math.sin(frameCount * 0.2);
    ctx.globalAlpha = alpha;
    // Right arrow pointing to AI's goal (right side)
    ctx.fillStyle = CITY_GOLD;
    ctx.font = 'bold 20px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('▶▶', W - GOAL_WIDTH - 36, GROUND_Y - GOAL_HEIGHT / 2);
    ctx.globalAlpha = 1;
  }
}

function drawGround() {
  // Ground bar
  const g = ctx.createLinearGradient(0, GROUND_Y, 0, GROUND_Y + 20);
  g.addColorStop(0, '#fff');
  g.addColorStop(0.3, '#d0d0d0');
  g.addColorStop(1, '#999');
  ctx.fillStyle = g;
  ctx.fillRect(0, GROUND_Y, W, 8);
}

function drawGoals() {
  // Left goal (AI scores here / player defends)
  drawGoalPost(0, GROUND_Y - GOAL_HEIGHT, GOAL_WIDTH, GOAL_HEIGHT, CITY_WHITE, true);
  // Right goal (Player scores here / AI defends)
  drawGoalPost(W - GOAL_WIDTH, GROUND_Y - GOAL_HEIGHT, GOAL_WIDTH, GOAL_HEIGHT, CITY_WHITE, false);
}

function drawGoalPost(x, y, w, h, color, isLeft) {
  // Colour-code: sky blue for player's goal (right), red for AI goal (left)
  const postColor = isLeft ? '#ff6666' : CITY_BLUE;
  ctx.strokeStyle = color;
  ctx.lineWidth = 7;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  // Net
  ctx.fillStyle = 'rgba(255,255,255,0.06)';
  ctx.fillRect(x, y, w, h);
  // Net lines
  ctx.strokeStyle = 'rgba(255,255,255,0.15)';
  ctx.lineWidth = 1;
  for (let nx = x; nx <= x + w; nx += 14) {
    ctx.beginPath(); ctx.moveTo(nx, y); ctx.lineTo(nx, y + h); ctx.stroke();
  }
  for (let ny = y; ny <= y + h; ny += 14) {
    ctx.beginPath(); ctx.moveTo(x, ny); ctx.lineTo(x + w, ny); ctx.stroke();
  }

  // Posts
  ctx.strokeStyle = postColor;
  ctx.lineWidth = 7;
  // Crossbar
  ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + w, y); ctx.stroke();
  // Back post (wall side)
  if (isLeft) {
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, GROUND_Y); ctx.stroke();
  } else {
    ctx.beginPath(); ctx.moveTo(x + w, y); ctx.lineTo(x + w, GROUND_Y); ctx.stroke();
  }

  // Small label above crossbar
  ctx.font = 'bold 9px "Orbitron",monospace';
  ctx.textAlign = 'center';
  ctx.fillStyle = isLeft ? '#ff9999' : CITY_BLUE;
  ctx.fillText(isLeft ? 'AI GOAL' : 'YOUR GOAL', x + w / 2, y - 6);
}

function drawCenterLine() {
  ctx.setLineDash([10, 10]);
  ctx.strokeStyle = 'rgba(255,255,255,0.25)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(W / 2, H * 0.58);
  ctx.lineTo(W / 2, GROUND_Y);
  ctx.stroke();
  ctx.setLineDash([]);

  // Center circle
  ctx.strokeStyle = 'rgba(255,255,255,0.18)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(W / 2, GROUND_Y - 20, 70, -Math.PI, 0);
  ctx.stroke();
}

function drawBallTrail() {
  const speed = Math.sqrt(ball.vx * ball.vx + ball.vy * ball.vy);
  // Velocity-based trail length: faster ball = longer trail
  const maxTrail = Math.min(12, 4 + speed * 0.4);
  const trail = ball.trail.slice(-Math.floor(maxTrail));
  const trailLen = trail.length;

  trail.forEach((t, i) => {
    // Motion blur: draw circles with decreasing opacity
    const alpha = (i / trailLen) * (0.3 + speed * 0.015);
    const r = ball.r * (0.3 + (i / trailLen) * 0.6);

    ctx.beginPath();
    ctx.arc(t.x, t.y, r, 0, Math.PI * 2);

    if (specialTrail) {
      // De Bruyne curve trail
      ctx.fillStyle = `rgba(255, 215, 0, ${alpha * 1.5})`;
      ctx.shadowBlur = 10;
      ctx.shadowColor = CITY_GOLD;
    } else {
      ctx.fillStyle = `rgba(110, 207, 246, ${alpha})`;
      ctx.shadowBlur = 0;
    }
    ctx.fill();
  });
  ctx.shadowBlur = 0;
}

function drawBall() {
  ctx.save();
  ctx.translate(ball.x, ball.y);
  ctx.rotate(ball.angle);

  // Shadow
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.beginPath();
  ctx.ellipse(0, ball.r + 2, ball.r * 0.8, ball.r * 0.3, 0, 0, Math.PI * 2);
  ctx.fill();

  // Ball
  const ballGrad = ctx.createRadialGradient(-ball.r * 0.3, -ball.r * 0.3, 2, 0, 0, ball.r);
  ballGrad.addColorStop(0, '#ffffff');
  ballGrad.addColorStop(0.4, '#dddddd');
  ballGrad.addColorStop(1, '#aaaaaa');
  ctx.fillStyle = ballGrad;
  ctx.beginPath();
  ctx.arc(0, 0, ball.r, 0, Math.PI * 2);
  ctx.fill();

  // Pentagons on ball
  ctx.fillStyle = '#333';
  // Center
  drawPentagon(0, 0, 8);
  // Around
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2 - Math.PI / 2;
    drawPentagon(Math.cos(a) * 11, Math.sin(a) * 11, 6.5);
  }

  // Shine
  const shine = ctx.createRadialGradient(-ball.r * 0.3, -ball.r * 0.3, 0, -ball.r * 0.2, -ball.r * 0.2, ball.r * 0.5);
  shine.addColorStop(0, 'rgba(255,255,255,0.55)');
  shine.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = shine;
  ctx.beginPath();
  ctx.arc(0, 0, ball.r, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

function drawPentagon(cx, cy, r) {
  ctx.beginPath();
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2 - Math.PI / 2;
    i === 0 ? ctx.moveTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r)
      : ctx.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
  }
  ctx.closePath();
  ctx.fill();
}

function drawPlayer(e) {
  const cx = e.x + e.w / 2;
  const isCity = !e.isAI;
  const teamColor = e.data.color || CITY_BLUE;
  const hairColor = e.data.hairColor || '#333';
  const headColor = e.data.headColor || '#FDDBB4';
  const isCelebrating = (celebratingPlayer === e && celebrateTimer > 0);
  const isSad = (celebratingPlayer !== null && celebratingPlayer !== e && celebrateTimer > 0);
  const isStunned = e.stunnedTimer > 0;
  const isSliding = e.sliding;

  // Ball direction for eye tracking
  const bDx = ball ? (ball.x - cx) : e.facing * 40;
  const bDy = ball ? (ball.y - (e.y + e.h * 0.22)) : 0;
  const bDist = Math.sqrt(bDx * bDx + bDy * bDy) || 1;
  const trackX = (bDx / bDist) * 3;  // max 3px pupil offset
  const trackY = (bDy / bDist) * 2;

  // Animation phases
  const run = Math.sin(frameCount * 0.28);
  const jump = e.onGround ? 0 : 1;
  const kick = e.kicking ? 1 : 0;

  // --- positions ---
  let bodyY = e.y + e.h * 0.5;
  let headY = e.y + e.h * 0.22 + (isCelebrating ? Math.sin(frameCount * 0.3) * 4 : 0) + e.headBob;
  const hr = e.headRadius;

  const celebAng = isCelebrating ? Math.sin(frameCount * 0.25) * 0.4 : 0;

  ctx.save();

  // --- Squash & Stretch scale ---
  if (e.squishX !== 1 || e.squishY !== 1) {
    const pivotX = cx;
    const pivotY = e.y + e.h; // scale from feet
    ctx.translate(pivotX, pivotY);
    ctx.scale(e.squishX, e.squishY);
    ctx.translate(-pivotX, -pivotY);
  }

  // --- Ground shadow ---
  ctx.fillStyle = 'rgba(0,0,0,0.22)';
  ctx.beginPath();
  ctx.ellipse(cx, GROUND_Y + 3, hr * (isCelebrating ? 1.2 : 0.9) * (isSliding ? 1.5 : 1), 7, 0, 0, Math.PI * 2);
  ctx.fill();

  // ─── SLIDING POSE ───
  if (isSliding) {
    // Body flat horizontal
    const slx = cx + e.facing * 10;
    const jerseyGrad = ctx.createLinearGradient(slx - 30, bodyY + 4, slx + 30, bodyY + 4);
    jerseyGrad.addColorStop(0, teamColor);
    jerseyGrad.addColorStop(1, isCity ? CITY_DARK : '#AA0011');
    ctx.fillStyle = jerseyGrad;
    roundRectCtx(ctx, slx - 30, bodyY, 60, 18, 7);
    ctx.fill();
    // Boot (leading foot)
    ctx.fillStyle = isCity ? CITY_DARK : '#333';
    ctx.beginPath();
    ctx.ellipse(slx + e.facing * 34, bodyY + 9, 14, 7, 0.3 * e.facing, 0, Math.PI * 2);
    ctx.fill();
    // Head stays above
    headY = e.y + e.h * 0.15;
  } else {

    // === LEGS (skeletal: two separate limbs with pivot) ===
    const legLen = 28;
    const legW = 9;
    const hipX = cx;
    const hipY = bodyY + 18;

    // Leg swing angles
    let angL, angR;
    if (isCelebrating) {
      angL = -0.5 + Math.sin(frameCount * 0.3) * 0.7;
      angR = 0.5 - Math.sin(frameCount * 0.3) * 0.7;
    } else if (!e.onGround) {
      angL = -0.5; angR = 0.4;
    } else {
      angL = run * 0.45;
      angR = -run * 0.45;
    }

    // Draw leg
    function drawLimb(ox, oy, ang, len, w, col) {
      ctx.strokeStyle = col;
      ctx.lineWidth = w;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(ox, oy);
      const ex = ox + Math.sin(ang) * len;
      const ey = oy + Math.cos(ang) * len;
      ctx.lineTo(ex, ey);
      ctx.stroke();
      return { ex, ey };
    }

    // Shorts color
    const shortColor = isCity ? '#fff' : '#ddd';
    const bootColor = isCity ? CITY_DARK : '#333';

    // Left leg
    const ll = drawLimb(hipX - 8, hipY, angL, legLen, legW, shortColor);
    // Boot left
    ctx.fillStyle = bootColor;
    ctx.beginPath();
    ctx.ellipse(ll.ex, ll.ey, 10, 5, angL, 0, Math.PI * 2);
    ctx.fill();

    // Right leg
    const rl = drawLimb(hipX + 8, hipY, angR, legLen, legW, shortColor);
    // Boot right
    ctx.fillStyle = bootColor;
    ctx.beginPath();
    ctx.ellipse(rl.ex, rl.ey, 10, 5, angR, 0, Math.PI * 2);
    ctx.fill();

    // === BODY / JERSEY ===
    const jerseyGrad = ctx.createLinearGradient(cx - 22, bodyY - 14, cx + 22, bodyY + 18);
    jerseyGrad.addColorStop(0, teamColor);
    jerseyGrad.addColorStop(1, isCity ? CITY_DARK : '#AA0011');
    ctx.fillStyle = jerseyGrad;
    roundRectCtx(ctx, cx - 22, bodyY - 14, 44, 32, 9);
    ctx.fill();

    // Jersey collar
    ctx.fillStyle = 'rgba(255,255,255,0.25)';
    ctx.fillRect(cx - 6, bodyY - 14, 12, 6);

    // Jersey number
    ctx.fillStyle = CITY_WHITE;
    ctx.font = `bold 11px "Orbitron", monospace`;
    ctx.textAlign = 'center';
    ctx.fillText(e.data.num || '?', cx, bodyY + 7);

    // === ARMS ===
    let armAngL, armAngR;
    if (isCelebrating) {
      // Both arms raised in V shape
      armAngL = -Math.PI * 0.7 - Math.sin(frameCount * 0.3) * 0.2;
      armAngR = -Math.PI * 0.3 + Math.sin(frameCount * 0.3) * 0.2;
    } else if (kick) {
      armAngL = -Math.PI * 0.3;
      armAngR = Math.PI * 0.5;
    } else {
      armAngL = Math.PI * 0.5 + run * 0.35;
      armAngR = Math.PI * 0.5 - run * 0.35;
    }

    const armLen = 20;
    drawLimb(cx - 18, bodyY - 5, armAngL, armLen, 8, teamColor);
    drawLimb(cx + 18, bodyY - 5, armAngR, armLen, 8, teamColor);

    // === HEAD ===
    // Slight tilt when sad
    ctx.save();
    if (isSad) {
      ctx.translate(cx, headY);
      ctx.rotate(0.2);
      ctx.translate(-cx, -headY);
    }

    // Neck
    ctx.fillStyle = headColor;
    ctx.fillRect(cx - 5, headY + hr - 4, 10, 10);

    // Head circle
    const headGrad = ctx.createRadialGradient(cx - hr * 0.25, headY - hr * 0.2, 2, cx, headY, hr);
    headGrad.addColorStop(0, lighten(headColor, 15));
    headGrad.addColorStop(1, headColor);
    ctx.fillStyle = headGrad;
    ctx.beginPath();
    ctx.arc(cx, headY, hr, 0, Math.PI * 2);
    ctx.fill();

    // --- Hair ---
    ctx.fillStyle = hairColor;
    ctx.beginPath();
    ctx.arc(cx, headY - 5, hr, Math.PI, Math.PI * 2);
    ctx.fill();
    // Hairline band
    ctx.fillRect(cx - hr, headY - hr * 0.7, hr * 2, 9);

  } // end non-sliding block

  // --- Eyes (unified: stunned/celebrate/sad/ball-tracking) ---
  const eyeFacing = e.facing > 0 ? 1 : -1;
  const eyeOffX = eyeFacing * 7;
  const eyeX = cx + eyeOffX;

  if (isStunned) {
    // Dizzy X eyes
    const spin = (frameCount * 0.15) % (Math.PI * 2);
    ctx.strokeStyle = '#1a1a2e';
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    for (let xi = 0; xi < 2; xi++) {
      const ex2 = cx + (xi === 0 ? -8 : 8);
      ctx.save();
      ctx.translate(ex2, headY + 3);
      ctx.rotate(spin);
      ctx.beginPath();
      ctx.moveTo(-4, -4); ctx.lineTo(4, 4);
      ctx.moveTo(4, -4); ctx.lineTo(-4, 4);
      ctx.stroke();
      ctx.restore();
    }
    // Little stars
    ctx.fillStyle = CITY_GOLD;
    ctx.font = '8px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('★', cx - 14, headY - hr);
    ctx.fillText('★', cx + 14, headY - hr);
  } else if (isCelebrating) {
    // Happy squint eyes ^^
    ctx.strokeStyle = '#1a1a2e';
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.arc(eyeX, headY + 3, 5, Math.PI, Math.PI * 2);
    ctx.stroke();
    // Blush
    ctx.fillStyle = 'rgba(255,120,120,0.35)';
    ctx.beginPath();
    ctx.ellipse(eyeX, headY + 8, 7, 4, 0, 0, Math.PI * 2);
    ctx.fill();
  } else if (isSad) {
    // Closed sad eyes
    ctx.strokeStyle = '#1a1a2e';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(eyeX, headY + 3, 5, 0, Math.PI);
    ctx.stroke();
    // Tear drop
    ctx.fillStyle = 'rgba(110,207,246,0.7)';
    ctx.beginPath();
    ctx.ellipse(eyeX, headY + 11, 2, 4, 0, 0, Math.PI * 2);
    ctx.fill();
  } else {
    // Normal eye with BALL-TRACKING pupil
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.ellipse(eyeX, headY + 2, 7, 6, 0, 0, Math.PI * 2);
    ctx.fill();
    // Iris tracks ball
    ctx.fillStyle = '#1a1a2e';
    ctx.beginPath();
    ctx.arc(eyeX + Math.max(-3, Math.min(3, trackX)), headY + 3 + Math.max(-2, Math.min(2, trackY)), 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.75)';
    ctx.beginPath();
    ctx.arc(eyeX + eyeFacing - 1, headY + 1, 1.5, 0, Math.PI * 2);
    ctx.fill();
  }

  // --- Mouth ---
  ctx.strokeStyle = '#7A4028';
  ctx.lineWidth = 2;
  ctx.lineCap = 'round';
  ctx.beginPath();
  const mouthX = cx;
  if (isCelebrating) {
    // Big open grin
    ctx.arc(mouthX, headY + 11, 8, 0, Math.PI);
    ctx.fillStyle = '#cc4444';
    ctx.fill();
    ctx.stroke();
  } else if (isSad) {
    // Frown
    ctx.arc(mouthX, headY + 16, 6, Math.PI, Math.PI * 2);
    ctx.stroke();
  } else if (kick) {
    // Determined grit
    ctx.arc(mouthX, headY + 11, 6, 0, Math.PI);
    ctx.stroke();
  } else {
    // Light smile
    ctx.arc(mouthX, headY + 11, 4, 0.1, Math.PI - 0.1);
    ctx.stroke();
  }

  ctx.restore(); // restore head tilt

  // --- Name tag ---
  const tagColor = isCity ? CITY_GOLD : '#ff9999';
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  ctx.font = '8px "Orbitron",monospace';
  ctx.textAlign = 'center';
  const tagW = e.data.name.length * 5.2 + 10;
  roundRectCtx(ctx, cx - tagW / 2, headY - hr - 22, tagW, 14, 4);
  ctx.fill();
  ctx.fillStyle = tagColor;
  ctx.fillText(e.data.name, cx, headY - hr - 11);

  // --- YOU indicator ---
  if (!e.isAI) {
    ctx.fillStyle = CITY_GOLD;
    ctx.beginPath();
    ctx.moveTo(cx - 8, headY - hr - 38);
    ctx.lineTo(cx + 8, headY - hr - 38);
    ctx.lineTo(cx, headY - hr - 28);
    ctx.closePath();
    ctx.fill();
    ctx.font = 'bold 9px "Orbitron", monospace';
    ctx.fillText('YOU', cx, headY - hr - 43);
  }

  // --- Kick effect rings ---
  if (kick) {
    ctx.strokeStyle = CITY_GOLD;
    ctx.lineWidth = 2;
    ctx.globalAlpha = 0.55;
    for (let i = 1; i <= 3; i++) {
      ctx.beginPath();
      ctx.arc(cx, headY, hr + i * 9, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }

  // --- Celebration star burst ---
  if (isCelebrating) {
    const starAlpha = celebrateTimer / 90;
    ctx.globalAlpha = starAlpha * 0.8;
    const starColors = [CITY_GOLD, CITY_BLUE, '#fff'];
    for (let i = 0; i < 6; i++) {
      const sa = (i / 6) * Math.PI * 2 + frameCount * 0.06;
      const sr = 45 + Math.sin(frameCount * 0.2 + i) * 8;
      const sx = cx + Math.cos(sa) * sr;
      const sy = headY + Math.sin(sa) * sr;
      ctx.fillStyle = starColors[i % 3];
      ctx.beginPath();
      ctx.arc(sx, sy, 4, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  ctx.restore();
}

// Lighten a hex color by amount
function lighten(hex, amt) {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.min(255, (n >> 16) + amt);
  const g = Math.min(255, ((n >> 8) & 0xFF) + amt);
  const b = Math.min(255, (n & 0xFF) + amt);
  return '#' + ((r << 16) | (g << 8) | b).toString(16).padStart(6, '0');
}

function drawPowerMeter() {
  const x = player.x + player.w / 2 - 25;
  const y = player.y - 20;
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  roundRectCtx(ctx, x - 3, y - 3, 56, 14, 5);
  ctx.fill();
  const powerGrad = ctx.createLinearGradient(x, y, x + 50, y);
  powerGrad.addColorStop(0, CITY_BLUE);
  powerGrad.addColorStop(0.5, CITY_GOLD);
  powerGrad.addColorStop(1, '#ff4444');
  ctx.fillStyle = powerGrad;
  roundRectCtx(ctx, x, y, powerMeter / 2, 8, 4);
  ctx.fill();
  ctx.strokeStyle = CITY_GOLD;
  ctx.lineWidth = 1;
  roundRectCtx(ctx, x, y, 50, 8, 4, true);
}

function drawParticles() {
  particles.forEach(p => {
    ctx.globalAlpha = p.alpha;
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.globalAlpha = 1;
}

function drawFireworks() {
  fireworks.forEach(f => {
    ctx.globalAlpha = f.alpha;
    ctx.fillStyle = f.color;
    ctx.shadowColor = f.color;
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.shadowBlur = 0;
  ctx.globalAlpha = 1;
}

function drawConfetti() {
  confetti.forEach(c => {
    ctx.save();
    ctx.translate(c.x, c.y);
    ctx.rotate(c.r);
    ctx.fillStyle = c.color;
    ctx.fillRect(-c.w / 2, -c.h / 2, c.w, c.h);
    ctx.restore();
  });
}

function drawAIIntelligence() {
  // Draw AI difficulty badge
  if (aiDifficulty > 0) {
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.font = '10px Arial';
    ctx.textAlign = 'right';
    ctx.fillText(`AI: ${AI_LEVELS[aiDifficulty]}`, W - 16, H - 16);
  }
}

// ─────── UTILS ───────
function roundRect(x, y, w, h, r, stroke) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
  if (stroke) ctx.stroke(); else ctx.fill();
}

function roundRectCtx(c, x, y, w, h, r, stroke) {
  c.beginPath();
  c.moveTo(x + r, y);
  c.lineTo(x + w - r, y);
  c.quadraticCurveTo(x + w, y, x + w, y + r);
  c.lineTo(x + w, y + h - r);
  c.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  c.lineTo(x + r, y + h);
  c.quadraticCurveTo(x, y + h, x, y + h - r);
  c.lineTo(x, y + r);
  c.quadraticCurveTo(x, y, x + r, y);
  c.closePath();
  if (stroke) c.stroke(); else c.fill();
}

// ─────── TOUCH / MOBILE CONTROLS ───────
function addTouchControls() {
  const gameScreen = document.getElementById('screen-game');
  const touch = document.createElement('div');
  touch.style.cssText = `
    position:absolute; bottom:20px; left:0; right:0;
    display:flex; justify-content:space-between;
    padding:0 20px; z-index:200; pointer-events:none;
  `;
  touch.innerHTML = `
    <div style="display:flex;gap:10px;pointer-events:auto;">
      <button class="touch-btn" id="tc-left" ontouchstart="keys['ArrowLeft']=true" ontouchend="keys['ArrowLeft']=false">◀</button>
      <button class="touch-btn" id="tc-right" ontouchstart="keys['ArrowRight']=true" ontouchend="keys['ArrowRight']=false">▶</button>
    </div>
    <div style="display:flex;gap:10px;pointer-events:auto;">
      <button class="touch-btn" id="tc-kick" ontouchstart="powerCharging=true" ontouchend="powerKick();powerCharging=false;powerMeter=0">⚡</button>
      <button class="touch-btn" id="tc-jump" ontouchstart="if(player.onGround){player.vy=-16;player.onGround=false}" ontouchend="">▲</button>
    </div>
  `;

  const style = document.createElement('style');
  style.textContent = `.touch-btn{
    width:60px;height:60px;border-radius:50%;
    background:rgba(110,207,246,0.25);
    border:2px solid rgba(110,207,246,0.6);
    color:white;font-size:1.4rem;
    cursor:pointer;touch-action:none;
    font-family:"Orbitron",monospace;
  }`;
  document.head.appendChild(style);
  gameScreen.appendChild(touch);
}

function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s < 10 ? '0' : ''}${s}`;
}

// ─────── INIT ───────
window.addEventListener('DOMContentLoaded', () => {
  drawStadiumMenuBg();
  buildParticles();

  // Find first unlocked player to select by default
  const firstUnlocked = PLAYERS.findIndex((p, i) => !isPlayerLocked(i));
  if (firstUnlocked !== -1) selectedPlayer = firstUnlocked;

  buildPlayerCards();
  buildDifficultyOptions();
  updateMenuRankDisplay();
  addTouchControls();
  setScreen('menu');
  window.addEventListener('resize', drawStadiumMenuBg);
});
