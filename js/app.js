import { createSpyfall } from './games/spyplay.js';
import { createMafia } from './games/mafia.js';
import { createCallIt } from './games/callit.js';
import { createImpostor } from './games/impostor.js';
import { createWaveLength } from './games/wavelength.js';
import { createHotTakes, HOTTAKES_SESSION } from './games/hottakes.js';
import { createInstall } from './install.js';

const GAMES = [
  { id: 'hottakes', name: 'Allegedly', icon: '🔥' },
  { id: 'spyplay', name: 'Incognito', icon: '🕵️' },
  { id: 'mafia', name: 'Mafia', icon: '🌙' },
  { id: 'impostor', name: 'Impostor', icon: '🎭' },
  { id: 'callit', name: 'Call It', icon: '⚡' },
  { id: 'wavelength', name: 'Read the Room', icon: '📡' },
];

/* ─── Shared roster (names persist across games this session) ─── */
const roster = {
  names: [],
  count: null,
  teamA: '',
  teamB: '',
  howToOpen: true,

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

  collapseHowTo() {
    this.howToOpen = false;
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

  howTo(items, open) {
    return `
      <div class="howto panel ${open ? '' : 'is-collapsed'}">
        <button type="button" class="howto-toggle" data-howto-toggle aria-expanded="${open}">
          <h2>How to play</h2>
          <span class="howto-caret" aria-hidden="true">${open ? '−' : '+'}</span>
        </button>
        <div class="howto-body">
          <ul>${items.map(item => `<li>${item}</li>`).join('')}</ul>
        </div>
      </div>
    `;
  },

  bindHowTo(container, session) {
    container.querySelector('[data-howto-toggle]')?.addEventListener('click', () => {
      const box = container.querySelector('.howto');
      const nextOpen = box.classList.contains('is-collapsed');
      session.howToOpen = nextOpen;
      box.classList.toggle('is-collapsed', !nextOpen);
      box.querySelector('.howto-caret').textContent = nextOpen ? '−' : '+';
      box.querySelector('.howto-toggle').setAttribute('aria-expanded', String(nextOpen));
    });
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
      <p class="sheet-copy">You'll go back to the home screen. A live round stays parked — you can carry on or start fresh when you come back.</p>
      <div class="sheet-actions">
        <button class="btn btn-secondary" data-modal="stay">Stay</button>
        <button class="btn btn-danger" data-modal="leave">Leave</button>
      </div>
    </div>
  `);
}

function confirmResumeParked() {
  showModal(`
    <div class="sheet" role="dialog" aria-labelledby="resume-title" aria-modal="true">
      <p class="sheet-kicker">Parked game</p>
      <h2 id="resume-title" class="sheet-title">Pick up where you left off?</h2>
      <p class="sheet-copy">Would you like to carry on the game from before, or start fresh?</p>
      <div class="sheet-actions">
        <button class="btn btn-primary" data-modal="carry-on">Carry on</button>
        <button class="btn btn-secondary" data-modal="start-fresh">Start fresh</button>
      </div>
    </div>
  `);
}

function openGameSwitcher() {
  showModal(`
    <div class="sheet" role="dialog" aria-labelledby="switch-title" aria-modal="true">
      <p class="sheet-kicker">Jump to</p>
      <h2 id="switch-title" class="sheet-title">Switch game</h2>
      <p class="sheet-copy">Names carry over. A live round stays parked — you'll choose to carry on or start fresh.</p>
      <div class="switch-list">
        ${GAMES.map(g => {
          const parkedHere = parked.has(g.id) && g.id !== currentGameId;
          return `
            <button class="switch-item ${g.id === currentGameId ? 'is-current' : ''}" data-switch="${g.id}" ${g.id === currentGameId ? 'disabled' : ''}>
              <span class="switch-item-icon">${g.icon}</span>
              <span class="switch-item-name">${g.name}</span>
              ${g.id === currentGameId ? '<span class="switch-item-now">Now</span>' : parkedHere ? '<span class="switch-item-now">Parked</span>' : ''}
            </button>
          `;
        }).join('')}
      </div>
      <button class="btn btn-secondary" data-modal="stay">Cancel</button>
    </div>
  `);
}

modalRoot.addEventListener('click', e => {
  if (e.target === modalRoot || e.target.closest('[data-modal="stay"]')) {
    hideModal();
    if (pendingParkedId) cancelPendingResume();
    return;
  }
  if (e.target.closest('[data-modal="leave"]')) {
    hideModal();
    goHome();
    return;
  }
  if (e.target.closest('[data-modal="carry-on"]')) {
    const id = pendingParkedId;
    pendingParkedId = null;
    previousGameId = null;
    hideModal();
    if (id) resumeParked(id);
    return;
  }
  if (e.target.closest('[data-modal="start-fresh"]')) {
    const id = pendingParkedId;
    pendingParkedId = null;
    previousGameId = null;
    hideModal();
    if (id) startFresh(id);
    return;
  }
  const pick = e.target.closest('[data-switch]');
  if (pick && pick.dataset.switch !== currentGameId) {
    hideModal();
    launchGame(pick.dataset.switch);
  }
});

/* ─── Router (parked games stay alive when switching) ─── */
const homeScreen = document.getElementById('screen-home');
const gameScreen = document.getElementById('screen-game');
const parked = new Map();
let currentGameId = null;
let chromeAttached = false;
let pendingParkedId = null;
let previousGameId = null;

function handleChrome(e) {
  if (e.target.closest('.btn-back')) {
    if (currentGameId === 'install') goHome();
    else confirmLeaveHome();
    return;
  }
  if (e.target.closest('.btn-switch')) {
    openGameSwitcher();
  }
}

function attachChrome() {
  if (chromeAttached) return;
  chromeAttached = true;
  gameScreen.addEventListener('click', handleChrome);
}

function pauseCurrent() {
  ui.stopTimer();
  hideModal();
  if (currentGameId && parked.has(currentGameId)) {
    parked.get(currentGameId).root.hidden = true;
  }
}

function goHome() {
  pendingParkedId = null;
  previousGameId = null;
  pauseCurrent();
  currentGameId = null;
  gameScreen.classList.remove('active');
  homeScreen.classList.add('active');
}

function cancelPendingResume() {
  const backTo = previousGameId;
  pendingParkedId = null;
  previousGameId = null;
  if (backTo && parked.has(backTo)) {
    resumeParked(backTo);
    return;
  }
  currentGameId = null;
  gameScreen.classList.remove('active');
  homeScreen.classList.add('active');
}

function resumeParked(gameId) {
  currentGameId = gameId;
  homeScreen.classList.remove('active');
  gameScreen.classList.add('active');
  attachChrome();
  const inst = parked.get(gameId);
  if (!inst) {
    startFresh(gameId);
    return;
  }
  inst.root.hidden = false;
  inst.resume?.();
}

function startFresh(gameId) {
  const existing = parked.get(gameId);
  if (existing) {
    existing.cleanup?.();
    existing.root.remove();
    parked.delete(gameId);
    if (gameId === 'hottakes') sessionStorage.removeItem(HOTTAKES_SESSION);
  }
  createFresh(gameId);
}

function createFresh(gameId) {
  currentGameId = gameId;
  homeScreen.classList.remove('active');
  gameScreen.classList.add('active');
  attachChrome();

  const root = document.createElement('div');
  root.className = 'game-instance';
  gameScreen.appendChild(root);

  const inst = { root, resume: null, cleanup: null };
  parked.set(gameId, inst);

  const ctx = {
    goHome,
    ui,
    roster,
    setResume(fn) { inst.resume = fn; },
    setCleanup(fn) { inst.cleanup = fn; },
  };

  switch (gameId) {
    case 'hottakes': createHotTakes(root, ctx); break;
    case 'spyplay': createSpyfall(root, ctx); break;
    case 'mafia': createMafia(root, ctx); break;
    case 'callit': createCallIt(root, ctx); break;
    case 'impostor': createImpostor(root, ctx); break;
    case 'wavelength': createWaveLength(root, ctx); break;
    case 'install': createInstall(root, ctx); break;
  }
}

function launchGame(gameId) {
  if (gameId === currentGameId) return;
  if (gameId === 'install') {
    pauseCurrent();
    startFresh('install');
    return;
  }

  if (parked.has(gameId)) {
    previousGameId = currentGameId;
    pauseCurrent();
    currentGameId = null;
    homeScreen.classList.remove('active');
    gameScreen.classList.add('active');
    attachChrome();
    pendingParkedId = gameId;
    confirmResumeParked();
    return;
  }

  pauseCurrent();
  createFresh(gameId);
}

/* ─── Init ─── */
document.querySelectorAll('.game-card').forEach(card => {
  card.addEventListener('click', () => launchGame(card.dataset.game));
});
