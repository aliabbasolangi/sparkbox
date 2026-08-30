import { createSpyfall } from './games/spyplay.js';
import { createMafia } from './games/mafia.js';
import { createCallIt } from './games/callit.js';
import { createImpostor } from './games/impostor.js';
import { createWaveLength } from './games/wavelength.js';

const GAMES = [
  { id: 'spyplay', name: 'Spyfall', icon: '🕵️' },
  { id: 'mafia', name: 'Mafia', icon: '🌙' },
  { id: 'impostor', name: 'Impostor', icon: '🎭' },
  { id: 'callit', name: 'Call It', icon: '⚡' },
  { id: 'wavelength', name: 'Wave Length', icon: '📡' },
];

/* ─── Shared roster (names persist across games this session) ─── */
const roster = {
  names: [],
  count: null,
  teamA: '',
  teamB: '',

  label(name, i) {
    const t = (name || '').trim();
    return t || `Player ${i + 1}`;
  },

  labelTeam(name, which) {
    const t = (name || '').trim();
    return t || (which === 'a' ? 'Team 1' : 'Team 2');
  },

  loadPlayers({ defaultCount = 4, min = 3, max = 12 } = {}) {
    let count = this.count ?? defaultCount;
    count = Math.min(max, Math.max(min, count));
    const names = [];
    for (let i = 0; i < count; i++) names.push(this.names[i] ?? '');
    return { playerCount: count, playerNames: names };
  },

  savePlayers(names) {
    this.names = names.map(n => n ?? '');
    this.count = this.names.length;
  },

  padPlayers(names, count) {
    const next = names.slice(0, count);
    while (next.length < count) next.push('');
    this.savePlayers(next);
    return next;
  },

  loadTeams() {
    return { teamA: this.teamA, teamB: this.teamB };
  },

  saveTeams(teamA, teamB) {
    this.teamA = teamA ?? '';
    this.teamB = teamB ?? '';
  },
};

/* ─── Shared UI helpers ─── */
let timerInterval = null;

const ui = {
  header(title) {
    return `
      <div class="game-header">
        <button class="btn-back" data-action="back" aria-label="Leave game">←</button>
        <span class="game-title">${title}</span>
        <button class="btn-switch" data-action="switch" aria-label="Switch game" title="Switch game">⇄</button>
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

/* ─── Overlays ─── */
const modalRoot = document.getElementById('modal-root');

function hideModal() {
  modalRoot.hidden = true;
  modalRoot.innerHTML = '';
}

function showModal(html) {
  modalRoot.innerHTML = html;
  modalRoot.hidden = false;
}

function confirmLeaveHome() {
  showModal(`
    <div class="sheet" role="dialog" aria-labelledby="leave-title" aria-modal="true">
      <p class="sheet-kicker">Hold up</p>
      <h2 id="leave-title" class="sheet-title">Leave this game?</h2>
      <p class="sheet-copy">You'll go back to the home screen and this round will reset. Player names stay saved for the next game.</p>
      <div class="sheet-actions">
        <button class="btn btn-secondary" data-modal="stay">Stay</button>
        <button class="btn btn-danger" data-modal="leave">Leave</button>
      </div>
    </div>
  `);
}

function openGameSwitcher() {
  showModal(`
    <div class="sheet" role="dialog" aria-labelledby="switch-title" aria-modal="true">
      <p class="sheet-kicker">Jump to</p>
      <h2 id="switch-title" class="sheet-title">Switch game</h2>
      <p class="sheet-copy">Names carry over. This round won't.</p>
      <div class="switch-list">
        ${GAMES.map(g => `
          <button class="switch-item ${g.id === currentGameId ? 'is-current' : ''}" data-switch="${g.id}" ${g.id === currentGameId ? 'disabled' : ''}>
            <span class="switch-item-icon">${g.icon}</span>
            <span class="switch-item-name">${g.name}</span>
            ${g.id === currentGameId ? '<span class="switch-item-now">Now</span>' : ''}
          </button>
        `).join('')}
      </div>
      <button class="btn btn-secondary" data-modal="stay">Cancel</button>
    </div>
  `);
}

modalRoot.addEventListener('click', e => {
  if (e.target === modalRoot || e.target.closest('[data-modal="stay"]')) {
    hideModal();
    return;
  }
  if (e.target.closest('[data-modal="leave"]')) {
    hideModal();
    goHome();
    return;
  }
  const pick = e.target.closest('[data-switch]');
  if (pick && pick.dataset.switch !== currentGameId) {
    hideModal();
    launchGame(pick.dataset.switch);
  }
});

/* ─── Router ─── */
const homeScreen = document.getElementById('screen-home');
const gameScreen = document.getElementById('screen-game');
let activeCleanup = null;
let currentGameId = null;

function tearDownGame() {
  ui.stopTimer();
  hideModal();
  if (activeCleanup) { activeCleanup(); activeCleanup = null; }
  gameScreen.innerHTML = '';
}

function goHome() {
  tearDownGame();
  currentGameId = null;
  gameScreen.classList.remove('active');
  homeScreen.classList.add('active');
}

function launchGame(gameId) {
  tearDownGame();
  currentGameId = gameId;
  homeScreen.classList.remove('active');
  gameScreen.classList.add('active');

  const ctx = { goHome, ui, roster };

  function handleChrome(e) {
    if (e.target.closest('.btn-back')) {
      confirmLeaveHome();
      return;
    }
    if (e.target.closest('.btn-switch')) {
      openGameSwitcher();
    }
  }
  gameScreen.addEventListener('click', handleChrome);
  activeCleanup = () => gameScreen.removeEventListener('click', handleChrome);

  switch (gameId) {
    case 'spyplay': createSpyfall(gameScreen, ctx); break;
    case 'mafia': createMafia(gameScreen, ctx); break;
    case 'callit': createCallIt(gameScreen, ctx); break;
    case 'impostor': createImpostor(gameScreen, ctx); break;
    case 'wavelength': createWaveLength(gameScreen, ctx); break;
  }
}

/* ─── Init ─── */
document.querySelectorAll('.game-card').forEach(card => {
  card.addEventListener('click', () => launchGame(card.dataset.game));
});
