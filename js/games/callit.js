import { GENRES, POINTS_TO_WIN, NAME_SECONDS } from '../data/callit-prompts.js';

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

function buildGenreDeck(selectedIds) {
  return shuffle(GENRES.filter(g => selectedIds.includes(g.id)));
}

export function createCallIt(container, { goHome, ui, roster, setResume }) {
  let state = { phase: 'setup' };

  function render() {
    switch (state.phase) {
      case 'setup': renderSetup(); break;
      case 'genre': renderGenre(); break;
      case 'reps': renderReps(); break;
      case 'bid': renderBid(); break;
      case 'challenge': renderChallenge(); break;
      case 'timer': renderTimer(); break;
      case 'score': renderScore(); break;
      case 'result': renderResult(); break;
    }
  }

  function teamScoreboard() {
    return `
      <div class="team-scoreboard">
        <div class="team-score team-score--a ${state.scores.a >= state.pointsToWin ? 'team-score--winning' : ''}">
          <span class="team-score-name">${teamName('a')}</span>
          <span class="team-score-pts">${state.scores.a}</span>
        </div>
        <span class="team-score-vs">vs</span>
        <div class="team-score team-score--b ${state.scores.b >= state.pointsToWin ? 'team-score--winning' : ''}">
          <span class="team-score-name">${teamName('b')}</span>
          <span class="team-score-pts">${state.scores.b}</span>
        </div>
      </div>
      <p class="score-target">First to ${state.pointsToWin} wins</p>
    `;
  }

  function renderSetup() {
    if (state.teamA == null || state.teamB == null) {
      const teams = roster.loadTeams();
      state.teamA = state.teamA ?? teams.teamA;
      state.teamB = state.teamB ?? teams.teamB;
    }
    state.pointsToWin = state.pointsToWin ?? 7;
    state.nameSeconds = state.nameSeconds ?? NAME_SECONDS;
    state.selectedGenres = state.selectedGenres?.filter(id => GENRES.some(g => g.id === id)) ?? GENRES.map(g => g.id);

    container.innerHTML = `
      ${ui.header('Call It', goHome)}
      ${ui.howTo([
        'Two teams bid in person — "I can name 5…" "I can name 8…" until someone <strong>calls it</strong>',
        'The challenged player must name that many items in 30 seconds',
        'Make it → their team gets 1 point. Fail → other team gets 1 point',
      ], roster.howToOpen !== false)}
      <div class="panel">
        <h2>Teams</h2>
        <div class="form-group">
          <label>Team 1 name</label>
          <input type="text" data-team="a" value="${state.teamA}" placeholder="Team 1" autocomplete="off">
        </div>
        <div class="form-group">
          <label>Team 2 name</label>
          <input type="text" data-team="b" value="${state.teamB}" placeholder="Team 2" autocomplete="off">
        </div>
        <div class="form-group">
          <label>Points to win</label>
          <div class="chip-group">
            ${POINTS_TO_WIN.map(p => `
              <span class="chip ${state.pointsToWin === p ? 'active' : ''}" data-points="${p}">${p}</span>
            `).join('')}
          </div>
        </div>
        <div class="form-group">
          <label>Genres</label>
          <div class="chip-group">
            ${GENRES.map(g => `
              <span class="chip ${state.selectedGenres.includes(g.id) ? 'active' : ''}" data-genre="${g.id}">${g.name}</span>
            `).join('')}
          </div>
          <p class="helper-text">Pick one or more genres for the round prompts.</p>
        </div>
        <div class="form-group">
          <label>Naming time</label>
          <div class="chip-group">
            ${[20, 30, 45].map(s => `
              <span class="chip ${state.nameSeconds === s ? 'active' : ''}" data-seconds="${s}">${s}s</span>
            `).join('')}
          </div>
        </div>
      </div>
      <button class="btn btn-primary" data-action="start">Start game</button>
    `;

    container.querySelector('[data-team="a"]')?.addEventListener('input', e => {
      state.teamA = e.target.value;
      roster.saveTeams(state.teamA, state.teamB);
    });
    container.querySelector('[data-team="b"]')?.addEventListener('input', e => {
      state.teamB = e.target.value;
      roster.saveTeams(state.teamA, state.teamB);
    });
    container.querySelectorAll('[data-points]').forEach(chip => {
      chip.addEventListener('click', () => { state.pointsToWin = +chip.dataset.points; renderSetup(); });
    });
    container.querySelectorAll('[data-genre]').forEach(chip => {
      chip.addEventListener('click', () => {
        const id = chip.dataset.genre;
        const next = state.selectedGenres.includes(id)
          ? state.selectedGenres.filter(g => g !== id)
          : [...state.selectedGenres, id];
        state.selectedGenres = next.length ? next : GENRES.map(g => g.id);
        renderSetup();
      });
    });
    container.querySelectorAll('[data-seconds]').forEach(chip => {
      chip.addEventListener('click', () => { state.nameSeconds = +chip.dataset.seconds; renderSetup(); });
    });
    container.querySelector('[data-action="start"]')?.addEventListener('click', startGame);
    ui.bindHowTo(container, roster);
  }

  function startGame() {
    roster.saveTeams(state.teamA, state.teamB);
    roster.collapseHowTo();
    state.deck = buildGenreDeck(state.selectedGenres);
    state.deckIndex = 0;
    state.scores = { a: 0, b: 0 };
    state.round = 1;
    startRound();
  }

  function startRound() {
    if (state.deckIndex >= state.deck.length) {
      state.deck = buildGenreDeck(state.selectedGenres);
      state.deckIndex = 0;
    }
    state.currentGenre = state.deck[state.deckIndex];
    state.deckIndex++;
    state.challengedTeam = null;
    state.targetCount = null;
    state.phase = 'genre';
    render();
  }

  function checkWin() {
    if (state.scores.a >= state.pointsToWin) return 'a';
    if (state.scores.b >= state.pointsToWin) return 'b';
    return null;
  }

  function otherTeam(team) {
    return team === 'a' ? 'b' : 'a';
  }

  function teamName(team) {
    return roster.labelTeam(team === 'a' ? state.teamA : state.teamB, team);
  }

  function renderGenre() {
    const g = state.currentGenre;
    container.innerHTML = `
      ${ui.header('Call It', goHome)}
      ${teamScoreboard()}
      <div class="phase-banner discuss">Round ${state.round}</div>
      <div class="panel challenge-panel">
        <span class="category-badge">${g.name}</span>
        <p class="challenge-prompt">How many <strong>${g.item}</strong> can you name in ${state.nameSeconds} seconds?</p>
      </div>
      <div class="panel">
        <p>Use this genre for the round. Each team picks one person to represent them, then start bidding in person.</p>
      </div>
      <button class="btn btn-primary" data-action="next">Reps chosen — start bidding</button>
    `;
    container.querySelector('[data-action="next"]')?.addEventListener('click', () => {
      state.phase = 'bid';
      render();
    });
  }

  function renderBid() {
    const g = state.currentGenre;
    container.innerHTML = `
      ${ui.header('Call It', goHome)}
      ${teamScoreboard()}
      <div class="panel">
        <h2>Bid in person</h2>
        <p>Reps take turns: <em>"I can name 4"</em> → <em>"I can name 6"</em> → until someone <strong>calls it</strong> and says the other can't do it.</p>
        <p class="helper-text" style="margin-top:0.75rem">Genre: <strong>${g.name}</strong> — ${g.item}</p>
      </div>
      <div class="panel">
        <h2>When bidding is done</h2>
        <p class="helper-text">Who got called? They must name the target count below.</p>
        <div class="form-group">
          <label>Challenged team</label>
          <div class="chip-group">
            <span class="chip ${state.challengedTeam === 'a' ? 'active' : ''}" data-challenged="a">${teamName('a')}</span>
            <span class="chip ${state.challengedTeam === 'b' ? 'active' : ''}" data-challenged="b">${teamName('b')}</span>
          </div>
        </div>
        <div class="form-group">
          <label>How many must they name?</label>
          <div class="form-row">
            <button class="btn-stepper" data-action="dec-target">−</button>
            <span class="stepper-value">${state.targetCount ?? 3}</span>
            <button class="btn-stepper" data-action="inc-target">+</button>
          </div>
        </div>
      </div>
      <button class="btn btn-primary" data-action="start-timer" ${!state.challengedTeam ? 'disabled style="opacity:0.5"' : ''}>Start ${state.nameSeconds}s countdown</button>
    `;

    if (state.targetCount == null) state.targetCount = 3;

    container.querySelectorAll('[data-challenged]').forEach(chip => {
      chip.addEventListener('click', () => {
        state.challengedTeam = chip.dataset.challenged;
        renderBid();
      });
    });
    container.querySelector('[data-action="dec-target"]')?.addEventListener('click', () => {
      if (state.targetCount > 1) { state.targetCount--; renderBid(); }
    });
    container.querySelector('[data-action="inc-target"]')?.addEventListener('click', () => {
      if (state.targetCount < 50) { state.targetCount++; renderBid(); }
    });
    container.querySelector('[data-action="start-timer"]')?.addEventListener('click', () => {
      if (!state.challengedTeam) return;
      state.phase = 'challenge';
      render();
    });
  }

  function renderChallenge() {
    const g = state.currentGenre;
    const challenged = teamName(state.challengedTeam);
    container.innerHTML = `
      ${ui.header('Call It', goHome)}
      <div class="pass-screen" style="min-height:auto;padding:1rem 0">
        <p class="pass-label">Challenged</p>
        <p class="pass-player" style="font-size:1.5rem;margin-bottom:1rem">${challenged}</p>
      </div>
      <div class="panel challenge-panel">
        <p class="challenge-prompt">Name <strong>${state.targetCount}</strong> ${g.item}</p>
        <p class="helper-text">Genre: ${g.name} · ${state.nameSeconds} seconds on the clock</p>
      </div>
      <button class="btn btn-primary" data-action="go">Start timer</button>
    `;
    container.querySelector('[data-action="go"]')?.addEventListener('click', () => {
      state.timeLeft = state.nameSeconds;
      state.phase = 'timer';
      render();
    });
  }

  function renderTimer() {
    const g = state.currentGenre;
    container.innerHTML = `
      ${ui.header('Call It', goHome)}
      <div class="panel challenge-panel" style="text-align:center">
        <p class="challenge-prompt">${state.targetCount} × ${g.item}</p>
        <p class="helper-text">${teamName(state.challengedTeam)} — go!</p>
      </div>
      ${ui.timer(state.timeLeft, state.nameSeconds)}
      <button class="btn btn-primary" data-action="done">Time's up — score it</button>
    `;

    ui.startTimer(state, () => renderTimer(), () => {
      ui.stopTimer();
      state.phase = 'score';
      render();
    });
    container.querySelector('[data-action="done"]')?.addEventListener('click', () => {
      ui.stopTimer();
      state.phase = 'score';
      render();
    });
  }

  function renderScore() {
    const g = state.currentGenre;
    const challenged = teamName(state.challengedTeam);
    const other = teamName(otherTeam(state.challengedTeam));

    container.innerHTML = `
      ${ui.header('Call It', goHome)}
      ${teamScoreboard()}
      <div class="panel">
        <h2>Did they make it?</h2>
        <p><strong>${challenged}</strong> had to name <strong>${state.targetCount}</strong> ${g.item} (${g.name}).</p>
      </div>
      <button class="btn btn-primary" data-action="success">${challenged} got it — +1 point</button>
      <button class="btn btn-secondary" data-action="fail">${challenged} failed — ${other} +1 point</button>
    `;

    container.querySelector('[data-action="success"]')?.addEventListener('click', () => {
      state.scores[state.challengedTeam]++;
      afterScore();
    });
    container.querySelector('[data-action="fail"]')?.addEventListener('click', () => {
      state.scores[otherTeam(state.challengedTeam)]++;
      afterScore();
    });
  }

  function afterScore() {
    const winner = checkWin();
    if (winner) {
      state.winner = winner;
      state.phase = 'result';
    } else {
      state.round++;
      startRound();
    }
    render();
  }

  function renderResult() {
    const winnerName = teamName(state.winner);
    container.innerHTML = `
      ${ui.header('Call It', goHome)}
      <div class="result-box">
        <p class="result-title">🏆 ${winnerName} wins!</p>
        <p class="result-sub">Final score: ${teamName('a')} ${state.scores.a} – ${state.scores.b} ${teamName('b')}</p>
      </div>
      ${teamScoreboard()}
      <button class="btn btn-primary" data-action="again">Play again</button>
      <button class="btn btn-ghost" data-action="home">Back to Sparkbox</button>
    `;
    container.querySelector('[data-action="again"]')?.addEventListener('click', () => { state.phase = 'setup'; render(); });
    container.querySelector('[data-action="home"]')?.addEventListener('click', goHome);
  }

  setResume?.(() => render());
  render();
}
