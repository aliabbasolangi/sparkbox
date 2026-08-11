import { PROMPTS } from '../data/callit-prompts.js';

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function buildDeck(selectedCategories) {
  const deck = [];
  for (const group of PROMPTS) {
    if (!selectedCategories.includes(group.category)) continue;
    for (const word of group.words) {
      deck.push({ word, category: group.category });
    }
  }
  return shuffle(deck);
}

export function createCallIt(container, { goHome, ui }) {
  let state = { phase: 'setup' };

  function render() {
    switch (state.phase) {
      case 'setup': renderSetup(); break;
      case 'pass': renderPass(); break;
      case 'play': renderPlay(); break;
      case 'scored': renderScored(); break;
      case 'result': renderResult(); break;
    }
  }

  function renderSetup() {
    state.playerCount = state.playerCount || 4;
    state.roundCount = state.roundCount || 5;
    state.roundSeconds = state.roundSeconds || 30;
    state.playerNames = state.playerNames || Array.from({ length: state.playerCount }, (_, i) => `Player ${i + 1}`);
    state.selectedCategories = state.selectedCategories?.filter(category => PROMPTS.some(group => group.category === category)) || [];
    if (state.selectedCategories.length === 0) {
      state.selectedCategories = PROMPTS.map(group => group.category);
    }

    container.innerHTML = `
      ${ui.header('Call It', goHome)}
      <div class="panel">
        <h2>How to Play</h2>
        <ul>
          <li>One player holds the phone and sees a secret word</li>
          <li>Describe it without saying the word — others shout guesses</li>
          <li>First to <strong>call it</strong> correctly wins the round!</li>
          <li>Pass the phone each round. Most points wins.</li>
        </ul>
      </div>
      <div class="panel">
        <h2>Settings</h2>
        <div class="form-group">
          <label>Players</label>
          <div class="form-row">
            <button class="btn-stepper" data-action="dec-p">−</button>
            <span class="stepper-value">${state.playerCount}</span>
            <button class="btn-stepper" data-action="inc-p">+</button>
          </div>
        </div>
        <div class="form-group">
          <label>Names</label>
          ${state.playerNames.map((name, i) => `
            <input type="text" data-player="${i}" value="${name}" style="margin-bottom:0.5rem">
          `).join('')}
        </div>
        <div class="form-group">
          <label>Rounds</label>
          <div class="chip-group">
            ${[3, 5, 7, 10].map(r => `
              <span class="chip ${state.roundCount === r ? 'active' : ''}" data-rounds="${r}">${r}</span>
            `).join('')}
          </div>
        </div>
        <div class="form-group">
          <label>Genres</label>
          <div class="chip-group">
            ${PROMPTS.map(group => `
              <span class="chip ${state.selectedCategories.includes(group.category) ? 'active' : ''}" data-category="${group.category}">${group.category}</span>
            `).join('')}
          </div>
          <p class="helper-text">Pick one or more genres for the deck before you start.</p>
        </div>
        <div class="form-group">
          <label>Time per round</label>
          <div class="chip-group">
            ${[20, 30, 45, 60].map(s => `
              <span class="chip ${state.roundSeconds === s ? 'active' : ''}" data-seconds="${s}">${s}s</span>
            `).join('')}
          </div>
        </div>
      </div>
      <button class="btn btn-primary" data-action="start">Start Game</button>
    `;

    container.querySelector('[data-action="dec-p"]')?.addEventListener('click', () => {
      if (state.playerCount > 2) { state.playerCount--; state.playerNames = state.playerNames.slice(0, state.playerCount); renderSetup(); }
    });
    container.querySelector('[data-action="inc-p"]')?.addEventListener('click', () => {
      if (state.playerCount < 10) {
        state.playerCount++;
        while (state.playerNames.length < state.playerCount) state.playerNames.push(`Player ${state.playerNames.length + 1}`);
        renderSetup();
      }
    });
    container.querySelectorAll('[data-player]').forEach(input => {
      input.addEventListener('input', e => { state.playerNames[+e.target.dataset.player] = e.target.value; });
    });
    container.querySelectorAll('[data-rounds]').forEach(chip => {
      chip.addEventListener('click', () => { state.roundCount = +chip.dataset.rounds; renderSetup(); });
    });
    container.querySelectorAll('[data-category]').forEach(chip => {
      chip.addEventListener('click', () => {
        const category = chip.dataset.category;
        const nextSelection = state.selectedCategories.includes(category)
          ? state.selectedCategories.filter(c => c !== category)
          : [...state.selectedCategories, category];
        state.selectedCategories = nextSelection.length ? nextSelection : PROMPTS.map(group => group.category);
        renderSetup();
      });
    });
    container.querySelectorAll('[data-seconds]').forEach(chip => {
      chip.addEventListener('click', () => { state.roundSeconds = +chip.dataset.seconds; renderSetup(); });
    });
    container.querySelector('[data-action="start"]')?.addEventListener('click', startGame);
  }

  function startGame() {
    state.deck = buildDeck(state.selectedCategories);
    state.scores = Object.fromEntries(state.playerNames.map(n => [n, 0]));
    state.currentRound = 1;
    state.currentClueGiver = 0;
    state.phase = 'pass';
    render();
  }

  function currentCard() {
    const idx = (state.currentRound - 1) % state.deck.length;
    return state.deck[idx];
  }

  function renderPass() {
    const name = state.playerNames[state.currentClueGiver];
    container.innerHTML = `
      ${ui.header('Call It', goHome)}
      <div class="pass-screen">
        <p class="pass-label">Round ${state.currentRound} of ${state.roundCount}</p>
        <p class="pass-player">${name}</p>
        <p style="color:var(--text-dim);margin-bottom:1.5rem;font-size:0.9rem">You're the clue giver. Grab the phone!</p>
        <div class="pass-hidden" data-action="ready">
          <div class="tap-icon">⚡</div>
          <p>Tap when you're ready to see the word</p>
        </div>
      </div>
      <div class="scoreboard">
        ${state.playerNames.map(n => `
          <div class="score-card"><div class="name">${n}</div><div class="pts">${state.scores[n]}</div></div>
        `).join('')}
      </div>
    `;
    container.querySelector('[data-action="ready"]')?.addEventListener('click', () => {
      state.phase = 'play';
      state.timeLeft = state.roundSeconds;
      state.revealed = false;
      render();
    });
  }

  function renderPlay() {
    const card = currentCard();
    const name = state.playerNames[state.currentClueGiver];

    if (!state.revealed) {
      container.innerHTML = `
        ${ui.header('Call It', goHome)}
        <div class="pass-screen">
          <p class="pass-label">${name} — don't let others see!</p>
          <div class="pass-hidden" data-action="reveal">
            <div class="tap-icon">👀</div>
            <p>Tap to reveal the word</p>
          </div>
        </div>
      `;
      container.querySelector('[data-action="reveal"]')?.addEventListener('click', () => {
        state.revealed = true;
        renderPlay();
      });
    } else {
      container.innerHTML = `
        ${ui.header('Call It', goHome)}
        <div style="text-align:center">
          <span class="category-badge">${card.category}</span>
          <p class="word-display">${card.word}</p>
          <p class="hint-text">Describe it! No rhymes, no spelling, no "sounds like" — you have ${state.roundSeconds} seconds.</p>
        </div>
        ${ui.timer(state.timeLeft, state.roundSeconds)}
        <button class="btn btn-primary" data-action="called">Someone Called It!</button>
        <button class="btn btn-secondary" data-action="timeout">Time's Up — No Points</button>
      `;

      ui.startTimer(state, () => renderPlay(), () => {
        ui.stopTimer();
        state.phase = 'scored';
        state.lastWinner = null;
        render();
      });

      container.querySelector('[data-action="called"]')?.addEventListener('click', () => {
        ui.stopTimer();
        showWinnerPicker();
      });
      container.querySelector('[data-action="timeout"]')?.addEventListener('click', () => {
        ui.stopTimer();
        state.lastWinner = null;
        state.phase = 'scored';
        render();
      });
    }
  }

  function showWinnerPicker() {
    const guessers = state.playerNames.filter((_, i) => i !== state.currentClueGiver);
    container.innerHTML = `
      ${ui.header('Call It', goHome)}
      <div class="panel">
        <p>Who called it correctly?</p>
      </div>
      <ul class="player-list">
        ${guessers.map(n => `<li class="player-item" data-winner="${n}">${n}</li>`).join('')}
      </ul>
      <button class="btn btn-ghost" data-action="nobody">Nobody got it</button>
    `;
    container.querySelectorAll('[data-winner]').forEach(el => {
      el.addEventListener('click', () => {
        state.lastWinner = el.dataset.winner;
        state.scores[state.lastWinner]++;
        state.phase = 'scored';
        render();
      });
    });
    container.querySelector('[data-action="nobody"]')?.addEventListener('click', () => {
      state.lastWinner = null;
      state.phase = 'scored';
      render();
    });
  }

  function renderScored() {
    const card = currentCard();
    container.innerHTML = `
      ${ui.header('Call It', goHome)}
      <div class="result-box">
        <p class="result-title" style="font-size:1.3rem">${state.lastWinner ? `⚡ ${state.lastWinner} scores!` : '⏱️ Time\'s up!'}</p>
        <p class="result-sub">The word was <strong>${card.word}</strong> (${card.category})</p>
      </div>
      <div class="scoreboard">
        ${state.playerNames.map(n => `
          <div class="score-card"><div class="name">${n}</div><div class="pts">${state.scores[n]}</div></div>
        `).join('')}
      </div>
      <button class="btn btn-primary" data-action="next">${state.currentRound >= state.roundCount ? 'See Final Results' : 'Next Round'}</button>
    `;
    container.querySelector('[data-action="next"]')?.addEventListener('click', () => {
      if (state.currentRound >= state.roundCount) {
        state.phase = 'result';
        render();
      } else {
        state.currentRound++;
        state.currentClueGiver = (state.currentClueGiver + 1) % state.playerCount;
        state.phase = 'pass';
        render();
      }
    });
  }

  function renderResult() {
    const sorted = [...state.playerNames].sort((a, b) => state.scores[b] - state.scores[a]);
    const topScore = state.scores[sorted[0]];
    const winners = sorted.filter(n => state.scores[n] === topScore);

    container.innerHTML = `
      ${ui.header('Call It', goHome)}
      <div class="result-box">
        <p class="result-title" style="color:var(--neon-gold)">🏆 Game Over!</p>
        <p class="result-sub">${winners.length > 1
          ? `It's a tie! ${winners.join(' & ')} win with ${topScore} points!`
          : `${winners[0]} wins with ${topScore} points!`}</p>
      </div>
      <div class="scoreboard">
        ${sorted.map(n => `
          <div class="score-card"><div class="name">${n}</div><div class="pts">${state.scores[n]}</div></div>
        `).join('')}
      </div>
      <button class="btn btn-primary" data-action="again">Play Again</button>
      <button class="btn btn-ghost" data-action="home">Back to Sparkbox</button>
    `;
    container.querySelector('[data-action="again"]')?.addEventListener('click', () => { state.phase = 'setup'; render(); });
    container.querySelector('[data-action="home"]')?.addEventListener('click', goHome);
  }

  render();
}
