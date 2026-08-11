import { createSpyPlay } from './games/spyplay.js';
import { createMafia } from './games/mafia.js';
import { createCallIt } from './games/callit.js';

/* ─── Starfield ─── */
function initStarfield() {
  const canvas = document.getElementById('starfield');
  const ctx = canvas.getContext('2d');
  let stars = [];
  let w, h;

  function resize() {
    w = canvas.width = window.innerWidth;
    h = canvas.height = window.innerHeight;
    const count = Math.floor((w * h) / 3500);
    stars = Array.from({ length: count }, () => ({
      x: Math.random() * w,
      y: Math.random() * h,
      r: Math.random() * 1.5 + 0.3,
      speed: Math.random() * 0.3 + 0.05,
      opacity: Math.random() * 0.7 + 0.3,
      twinkle: Math.random() * Math.PI * 2,
    }));
  }

  function draw() {
    ctx.clearRect(0, 0, w, h);
    const t = Date.now() * 0.001;
    for (const s of stars) {
      s.y += s.speed;
      if (s.y > h) { s.y = 0; s.x = Math.random() * w; }
      const flicker = 0.5 + 0.5 * Math.sin(t * 2 + s.twinkle);
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(200, 220, 255, ${s.opacity * flicker})`;
      ctx.fill();
    }
    requestAnimationFrame(draw);
  }

  resize();
  window.addEventListener('resize', resize);
  draw();
}

/* ─── Shared UI helpers ─── */
let timerInterval = null;

const ui = {
  header(title, goHome) {
    return `
      <div class="game-header">
        <button class="btn-back" data-action="back" aria-label="Back">←</button>
        <span class="game-title">${title}</span>
      </div>
    `;
  },

  timer(secondsLeft, totalSeconds) {
    const radius = 70;
    const circumference = 2 * Math.PI * radius;
    const progress = secondsLeft / totalSeconds;
    const offset = circumference * (1 - progress);
    const mins = Math.floor(secondsLeft / 60);
    const secs = secondsLeft % 60;
    const display = `${mins}:${secs.toString().padStart(2, '0')}`;

    return `
      <div class="timer-ring">
        <svg width="160" height="160" viewBox="0 0 160 160">
          <circle class="timer-bg" cx="80" cy="80" r="${radius}" />
          <circle class="timer-fg" cx="80" cy="80" r="${radius}"
            stroke-dasharray="${circumference}"
            stroke-dashoffset="${offset}" />
        </svg>
        <div class="timer-text">${display}</div>
      </div>
    `;
  },

  startTimer(state, onTick, onEnd) {
    ui.stopTimer();
    timerInterval = setInterval(() => {
      state.timeLeft--;
      if (state.timeLeft <= 0) {
        ui.stopTimer();
        onEnd();
      } else {
        onTick();
      }
    }, 1000);
  },

  stopTimer() {
    if (timerInterval) {
      clearInterval(timerInterval);
      timerInterval = null;
    }
  },
};

/* ─── Router ─── */
const homeScreen = document.getElementById('screen-home');
const gameScreen = document.getElementById('screen-game');
let activeCleanup = null;

function goHome() {
  ui.stopTimer();
  if (activeCleanup) { activeCleanup(); activeCleanup = null; }
  gameScreen.classList.remove('active');
  gameScreen.innerHTML = '';
  homeScreen.classList.add('active');
}

function launchGame(gameId) {
  homeScreen.classList.remove('active');
  gameScreen.classList.add('active');
  gameScreen.innerHTML = '';

  const ctx = { goHome, ui };

  gameScreen.addEventListener('click', handleBack);
  function handleBack(e) {
    if (e.target.closest('[data-action="back"]')) goHome();
  }
  activeCleanup = () => gameScreen.removeEventListener('click', handleBack);

  switch (gameId) {
    case 'spyplay': createSpyPlay(gameScreen, ctx); break;
    case 'mafia': createMafia(gameScreen, ctx); break;
    case 'callit': createCallIt(gameScreen, ctx); break;
  }
}

/* ─── Init ─── */
initStarfield();

document.querySelectorAll('.game-card').forEach(card => {
  card.addEventListener('click', () => launchGame(card.dataset.game));
});
