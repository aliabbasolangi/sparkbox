import { IMPOSTOR_GENRES, buildWordPool } from '../data/impostor-words.js';

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function createImpostor(container, { goHome, ui, roster, setResume }) {
  let state = { phase: 'setup' };

  function playerName(i) {
    return roster.label(state.playerNames[i], i);
  }

  function render() {
    switch (state.phase) {
      case 'setup': renderSetup(); break;
      case 'reveal': renderReveal(); break;
      case 'discuss': renderDiscuss(); break;
      case 'result': renderResult(); break;
    }
  }

  function renderSetup() {
    if (!state.playerNames) {
      const loaded = roster.loadPlayers({ defaultCount: 4, min: 3, max: 12 });
      state.playerCount = loaded.playerCount;
      state.playerNames = loaded.playerNames;
    }
    state.playerCount = state.playerCount || 4;
    state.timerMinutes = state.timerMinutes || 5;
    state.hintsEnabled = state.hintsEnabled !== false;
    state.selectedGenres = state.selectedGenres?.filter(id => IMPOSTOR_GENRES.some(g => g.id === id))
      ?? IMPOSTOR_GENRES.map(g => g.id);

    container.innerHTML = `
      ${ui.header('Impostor', goHome)}
      ${ui.howTo([
        state.hintsEnabled
          ? 'Everyone gets the secret word, except one <strong>Impostor</strong> who only gets a hint'
          : 'Everyone gets the secret word, except one <strong>Impostor</strong> who gets nothing',
        'Take turns saying <strong>one word</strong> related to the word to prove you\'re legit',
        'Debate in person, vote out the Impostor, or reveal when ready',
      ], roster.howToOpen !== false)}
      <div class="panel">
        <h2>Settings</h2>
        <div class="form-group">
          <label>Players</label>
          <div class="form-row">
            <button class="btn-stepper" data-action="dec">−</button>
            <span class="stepper-value">${state.playerCount}</span>
            <button class="btn-stepper" data-action="inc">+</button>
          </div>
        </div>
        <div class="form-group">
          <label>Names</label>
          ${state.playerNames.map((name, i) => `
            <input type="text" data-player="${i}" value="${name}" placeholder="Name" autocomplete="off" style="margin-bottom:0.5rem">
          `).join('')}
        </div>
        <div class="form-group">
          <label>Genres</label>
          <div class="chip-group">
            ${IMPOSTOR_GENRES.map(g => `
              <span class="chip ${state.selectedGenres.includes(g.id) ? 'active' : ''}" data-genre="${g.id}">${g.name}</span>
            `).join('')}
          </div>
        </div>
        <div class="form-group">
          <label>Impostor hints</label>
          <div class="chip-group">
            <span class="chip ${state.hintsEnabled ? 'active' : ''}" data-hints="on">On</span>
            <span class="chip ${!state.hintsEnabled ? 'active' : ''}" data-hints="off">Off</span>
          </div>
          <p class="helper-text">${state.hintsEnabled
            ? 'The Impostor sees a hint word. Everyone else sees the secret word.'
            : 'The Impostor only knows they are the Impostor, with no hint word.'}</p>
        </div>
        <div class="form-group">
          <label>Discussion timer</label>
          <div class="chip-group">
            ${[3, 5, 7, 10].map(m => `
              <span class="chip ${state.timerMinutes === m ? 'active' : ''}" data-minutes="${m}">${m} min</span>
            `).join('')}
          </div>
        </div>
      </div>
      <button class="btn btn-primary" data-action="start">Start game</button>
    `;

    container.querySelector('[data-action="dec"]')?.addEventListener('click', () => {
      if (state.playerCount > 3) {
        state.playerCount--;
        state.playerNames = roster.padPlayers(state.playerNames, state.playerCount);
        renderSetup();
      }
    });
    container.querySelector('[data-action="inc"]')?.addEventListener('click', () => {
      if (state.playerCount < 12) {
        state.playerCount++;
        state.playerNames = roster.padPlayers(state.playerNames, state.playerCount);
        renderSetup();
      }
    });
    container.querySelectorAll('[data-player]').forEach(input => {
      input.addEventListener('input', e => {
        state.playerNames[+e.target.dataset.player] = e.target.value;
        roster.savePlayers(state.playerNames);
      });
    });
    container.querySelectorAll('[data-genre]').forEach(chip => {
      chip.addEventListener('click', () => {
        const id = chip.dataset.genre;
        const next = state.selectedGenres.includes(id)
          ? state.selectedGenres.filter(g => g !== id)
          : [...state.selectedGenres, id];
        state.selectedGenres = next.length ? next : IMPOSTOR_GENRES.map(g => g.id);
        renderSetup();
      });
    });
    container.querySelectorAll('[data-hints]').forEach(chip => {
      chip.addEventListener('click', () => {
        state.hintsEnabled = chip.dataset.hints === 'on';
        renderSetup();
      });
    });
    container.querySelectorAll('[data-minutes]').forEach(chip => {
      chip.addEventListener('click', () => { state.timerMinutes = +chip.dataset.minutes; renderSetup(); });
    });
    container.querySelector('[data-action="start"]')?.addEventListener('click', startGame);
    ui.bindHowTo(container, roster);
  }

  function startGame() {
    roster.savePlayers(state.playerNames);
    roster.collapseHowTo();
    const pool = buildWordPool(state.selectedGenres);
    state.wordEntry = pickRandom(pool.length ? pool : buildWordPool(IMPOSTOR_GENRES.map(g => g.id)));
    state.impostorIndex = Math.floor(Math.random() * state.playerCount);
    state.currentPlayer = 0;
    state.revealed = false;
    state.phase = 'reveal';
    render();
  }

  function renderReveal() {
    const name = playerName(state.currentPlayer);
    const isImpostor = state.currentPlayer === state.impostorIndex;

    if (!state.revealed) {
      container.innerHTML = `
        ${ui.header('Impostor', goHome)}
        <div class="pass-screen">
          <p class="pass-label">Pass the device to</p>
          <p class="pass-player">${name}</p>
          <div class="pass-hidden" data-action="reveal">
            <div class="tap-icon">👁️</div>
            <p>Tap to see your card</p>
          </div>
          <p class="hint-text">Don't let anyone else peek!</p>
        </div>
      `;
      container.querySelector('[data-action="reveal"]')?.addEventListener('click', () => {
        state.revealed = true;
        renderReveal();
      });
    } else {
      container.innerHTML = `
        ${ui.header('Impostor', goHome)}
        <div class="pass-screen">
          <p class="pass-label">${name}</p>
          <div class="reveal-card ${isImpostor ? 'spy' : 'innocent'}">
            <p class="reveal-role">${isImpostor ? '🎭 Impostor' : '✓ In the know'}</p>
            ${isImpostor
              ? (state.hintsEnabled
                ? `<p class="word-reveal">${state.wordEntry.hint}</p>
                   <p class="reveal-detail">Your hint word only. Listen to others, say one related word on your turn, and don't get caught.</p>`
                : `<p class="reveal-detail">You don't get the word or a hint. Listen hard, say one word on your turn, and don't get caught.</p>`)
              : `<p class="word-reveal">${state.wordEntry.word}</p>
                 <p class="reveal-detail">Genre: <strong>${state.wordEntry.genre}</strong><br>On your turn, say one word that fits, to help spot who doesn't know the word.</p>`}
          </div>
          <button class="btn btn-primary" data-action="next">
            ${state.currentPlayer < state.playerCount - 1 ? 'Pass to next player' : 'Start discussion'}
          </button>
        </div>
      `;
      container.querySelector('[data-action="next"]')?.addEventListener('click', () => {
        if (state.currentPlayer < state.playerCount - 1) {
          state.currentPlayer++;
          state.revealed = false;
          renderReveal();
        } else {
          state.phase = 'discuss';
          state.timeLeft = state.timerMinutes * 60;
          render();
        }
      });
    }
  }

  function showReveal() {
    ui.stopTimer();
    state.phase = 'result';
    render();
  }

  function renderDiscuss() {
    container.innerHTML = `
      ${ui.header('Impostor', goHome)}
      <div class="phase-banner discuss">One word per turn</div>
      <div class="panel">
        <p>Go around the circle. Each player says <strong>one word</strong> linked to the secret word. Sus out the Impostor, vote in person, then reveal.</p>
        <p class="helper-text" style="margin-top:0.75rem">Genre this round: ${state.wordEntry.genre}</p>
      </div>
      ${ui.timer(state.timeLeft, state.timerMinutes * 60)}
      <button class="btn btn-primary" data-action="reveal">Reveal answers</button>
    `;
    ui.startTimer(state, () => renderDiscuss(), showReveal);
    container.querySelector('[data-action="reveal"]')?.addEventListener('click', showReveal);
  }

  function renderResult() {
    const impostorName = playerName(state.impostorIndex);
    container.innerHTML = `
      ${ui.header('Impostor', goHome)}
      <div class="result-box">
        <p class="result-title">The reveal</p>
        <p class="result-sub">
          The Impostor was <strong>${impostorName}</strong><br>
          The word was <strong>${state.wordEntry.word}</strong>${state.hintsEnabled
            ? `<br>Hint was: <strong>${state.wordEntry.hint}</strong>`
            : ''}
        </p>
      </div>
      <button class="btn btn-primary" data-action="again">Play again</button>
      <button class="btn btn-ghost" data-action="home">Back to Sparkbox</button>
    `;
    container.querySelector('[data-action="again"]')?.addEventListener('click', () => { state.phase = 'setup'; render(); });
    container.querySelector('[data-action="home"]')?.addEventListener('click', goHome);
  }

  setResume?.(() => render());
  render();
}
