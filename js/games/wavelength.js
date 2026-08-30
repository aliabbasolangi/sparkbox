const QUESTION_IDEAS = [
  'Name a food',
  'Name a movie',
  'Name a holiday',
  'Name a song',
  'Name a superhero',
  'Name a city',
  'Name a job',
  'Name a sport',
  'Name an animal',
  'Name a pizza topping',
  'Name a video game',
  'Name a dessert',
  'Name a TV show',
  'Name a way to spend a Saturday',
  'Name a first date',
];

function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function closenessCopy(diff) {
  if (diff === 0) return { title: 'Nailed it', sub: 'Exact hit. That was a 10/10 read.' };
  if (diff === 1) return { title: 'So close', sub: 'Off by 1. Almost on the wavelength.' };
  if (diff === 2) return { title: 'In the neighborhood', sub: 'Off by 2. The vibe was close, the number wasn’t.' };
  if (diff === 3) return { title: 'Somewhere nearby', sub: 'Off by 3. They heard you — just not clearly.' };
  return { title: 'Way off', sub: `Off by ${diff}. Different planet.` };
}

export function createWaveLength(container, { goHome, ui, roster }) {
  let state = { phase: 'setup' };

  function playerName(i) {
    return roster.label(state.playerNames[i], i);
  }

  function render() {
    switch (state.phase) {
      case 'setup': renderSetup(); break;
      case 'sendOut': renderSendOut(); break;
      case 'showNumber': renderShowNumber(); break;
      case 'bringBack': renderBringBack(); break;
      case 'questions': renderQuestions(); break;
      case 'guess': renderGuess(); break;
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
    state.sitOutMode = state.sitOutMode || 'random';
    if (state.sitOutPick == null) state.sitOutPick = 0;

    container.innerHTML = `
      ${ui.header('Wave Length', goHome)}
      <div class="panel">
        <h2>How to play</h2>
        <ul>
          <li>One player sits out. Everyone else looks at <strong>one shared number</strong> (1–10)</li>
          <li>Bring them back. They ask <strong>3 questions</strong> — the team answers as that number out of 10</li>
          <li>Example: number is 10, question is “name a food?” → they name a 10/10 food</li>
          <li>After three questions, the sit-out player locks in a number. See how close they were</li>
        </ul>
      </div>
      <div class="panel">
        <h2>Players</h2>
        <div class="form-group">
          <label>Number of players</label>
          <div class="form-row">
            <button class="btn-stepper" data-action="dec-players">−</button>
            <span class="stepper-value">${state.playerCount}</span>
            <button class="btn-stepper" data-action="inc-players">+</button>
          </div>
          <p class="helper-text">Need at least 3 — one sits out, the rest share the number.</p>
        </div>
        <div class="form-group">
          <label>Player names</label>
          ${state.playerNames.map((name, i) => `
            <input type="text" data-player="${i}" value="${name}" placeholder="Name" autocomplete="off" style="margin-bottom:0.5rem">
          `).join('')}
        </div>
        <div class="form-group">
          <label>Who sits out</label>
          <div class="chip-group">
            <span class="chip ${state.sitOutMode === 'random' ? 'active' : ''}" data-sitout="random">Random</span>
            ${state.playerNames.map((name, i) => `
              <span class="chip ${state.sitOutMode === 'pick' && state.sitOutPick === i ? 'active' : ''}" data-sitout="pick" data-index="${i}">${roster.label(name, i)}</span>
            `).join('')}
          </div>
        </div>
      </div>
      <button class="btn btn-primary" data-action="start">Send someone out</button>
    `;

    bindSetup();
  }

  function bindSetup() {
    container.querySelector('[data-action="dec-players"]')?.addEventListener('click', () => {
      if (state.playerCount > 3) {
        state.playerCount--;
        state.playerNames = roster.padPlayers(state.playerNames, state.playerCount);
        if (state.sitOutPick >= state.playerCount) state.sitOutPick = 0;
        renderSetup();
      }
    });
    container.querySelector('[data-action="inc-players"]')?.addEventListener('click', () => {
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
    container.querySelectorAll('[data-sitout]').forEach(chip => {
      chip.addEventListener('click', () => {
        if (chip.dataset.sitout === 'random') {
          state.sitOutMode = 'random';
        } else {
          state.sitOutMode = 'pick';
          state.sitOutPick = +chip.dataset.index;
        }
        renderSetup();
      });
    });
    container.querySelector('[data-action="start"]')?.addEventListener('click', startRound);
  }

  function startRound() {
    roster.savePlayers(state.playerNames);
    state.sitOutIndex = state.sitOutMode === 'pick'
      ? state.sitOutPick
      : Math.floor(Math.random() * state.playerCount);
    state.number = 1 + Math.floor(Math.random() * 10);
    state.questionIndex = 0;
    state.guess = null;
    state.phase = 'sendOut';
    render();
  }

  function sitOutName() {
    return playerName(state.sitOutIndex);
  }

  function teamNames() {
    return state.playerNames
      .map((_, i) => playerName(i))
      .filter((_, i) => i !== state.sitOutIndex);
  }

  function renderSendOut() {
    container.innerHTML = `
      ${ui.header('Wave Length', goHome)}
      <div class="pass-screen">
        <p class="pass-label">Get them out of earshot</p>
        <p class="pass-player">${sitOutName()}</p>
        <div class="panel">
          <p><strong>${sitOutName()}</strong> sits this one out. Send them out of the room — no peeking, no listening.</p>
          <p class="helper-text" style="margin-top:0.75rem">Everyone else stays. You’ll all see the number on the next screen together.</p>
        </div>
        <button class="btn btn-primary" data-action="gone">They're gone — show the number</button>
      </div>
    `;
    container.querySelector('[data-action="gone"]')?.addEventListener('click', (e) => {
      e.stopPropagation();
      state.phase = 'showNumber';
      render();
    });
  }

  function renderShowNumber() {
    const team = teamNames().join(', ');
    container.innerHTML = `
      ${ui.header('Wave Length', goHome)}
      <div class="phase-banner">Team only — hide this from ${sitOutName()}</div>
      <div class="wave-number-card">
        <p class="wave-number-label">Your number</p>
        <p class="wave-number">${state.number}</p>
        <p class="wave-number-scale">out of 10</p>
      </div>
      <div class="panel">
        <h2>How to answer</h2>
        <p>When ${sitOutName()} asks a question, answer as a <strong>${state.number}/10</strong>.</p>
        <p class="helper-text" style="margin-top:0.75rem">If they ask “name a food?” and this is ${state.number}, name a ${state.number}/10 food. Same wavelength, every answer. Team: ${team}.</p>
      </div>
      <button class="btn btn-primary" data-action="hide">Hide the number</button>
    `;
    container.querySelector('[data-action="hide"]')?.addEventListener('click', (e) => {
      e.stopPropagation();
      state.phase = 'bringBack';
      render();
    });
  }

  function renderBringBack() {
    container.innerHTML = `
      ${ui.header('Wave Length', goHome)}
      <div class="pass-screen">
        <p class="pass-label">Number is hidden</p>
        <p class="pass-player">Bring ${sitOutName()} back</p>
        <div class="panel">
          <p>The number is off the screen. Call <strong>${sitOutName()}</strong> back in. They’ll ask three questions — then lock in a guess.</p>
        </div>
        <button type="button" class="btn btn-primary" data-action="start-questions">They're back — start questions</button>
      </div>
    `;
    container.querySelector('[data-action="start-questions"]')?.addEventListener('click', (e) => {
      e.stopPropagation();
      state.phase = 'questions';
      state.questionIndex = 0;
      state.idea = pickRandom(QUESTION_IDEAS);
      render();
    });
  }

  function renderQuestions() {
    const n = state.questionIndex + 1;
    container.innerHTML = `
      ${ui.header('Wave Length', goHome)}
      <div class="phase-banner">Question ${n} of 3</div>
      <div class="panel">
        <h2>${sitOutName()} asks</h2>
        <p>Ask anything. The team answers out loud as their number out of 10 — don’t say the number.</p>
        <p class="helper-text" style="margin-top:0.75rem">Need an idea? Try: <strong>${state.idea}</strong></p>
      </div>
      <div class="wave-dots" aria-hidden="true">
        ${[0, 1, 2].map(i => `<span class="wave-dot ${i < n ? 'on' : ''}"></span>`).join('')}
      </div>
      <button class="btn btn-primary" data-action="next">
        ${n < 3 ? 'Next question' : 'Time to guess'}
      </button>
      <button class="btn btn-secondary" data-action="new-idea">Another idea</button>
    `;
    container.querySelector('[data-action="next"]')?.addEventListener('click', (e) => {
      e.stopPropagation();
      if (state.questionIndex < 2) {
        state.questionIndex++;
        state.idea = pickRandom(QUESTION_IDEAS);
        renderQuestions();
      } else {
        state.phase = 'guess';
        render();
      }
    });
    container.querySelector('[data-action="new-idea"]')?.addEventListener('click', (e) => {
      e.stopPropagation();
      state.idea = pickRandom(QUESTION_IDEAS.filter(q => q !== state.idea));
      renderQuestions();
    });
  }

  function renderGuess() {
    container.innerHTML = `
      ${ui.header('Wave Length', goHome)}
      <div class="phase-banner">${sitOutName()} locks in</div>
      <div class="panel">
        <h2>What number were they on?</h2>
        <p>Pick 1–10 from the three answers you just heard.</p>
        <div class="wave-guess-grid" data-guess-grid>
          ${[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => `
            <button type="button" class="wave-guess-btn ${state.guess === n ? 'active' : ''}" data-guess="${n}">${n}</button>
          `).join('')}
        </div>
      </div>
      <button class="btn btn-primary" data-action="lock" ${state.guess == null ? 'disabled' : ''}>Lock it in</button>
    `;
    container.querySelectorAll('[data-guess]').forEach(btn => {
      btn.addEventListener('click', () => {
        state.guess = +btn.dataset.guess;
        renderGuess();
      });
    });
    container.querySelector('[data-action="lock"]')?.addEventListener('click', () => {
      if (state.guess == null) return;
      state.phase = 'result';
      render();
    });
  }

  function renderResult() {
    const diff = Math.abs(state.guess - state.number);
    const copy = closenessCopy(diff);
    container.innerHTML = `
      ${ui.header('Wave Length', goHome)}
      <div class="result-box">
        <p class="result-title">${copy.title}</p>
        <p class="result-sub">${copy.sub}</p>
      </div>
      <div class="panel wave-result-panel">
        <div class="wave-result-pair">
          <div>
            <p class="wave-result-label">The number</p>
            <p class="wave-result-value">${state.number}</p>
          </div>
          <div>
            <p class="wave-result-label">${sitOutName()} guessed</p>
            <p class="wave-result-value">${state.guess}</p>
          </div>
        </div>
        <div class="wave-meter" aria-label="Scale from 1 to 10">
          ${[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => {
            const actual = n === state.number;
            const guess = n === state.guess;
            const cls = [actual && 'is-actual', guess && 'is-guess'].filter(Boolean).join(' ');
            return `<span class="wave-meter-tick ${cls}">${n}</span>`;
          }).join('')}
        </div>
        <p class="helper-text" style="text-align:center;margin-top:0.85rem">Cyan is the real number. Dark ring is the guess.</p>
      </div>
      <button class="btn btn-primary" data-action="again">Play again</button>
      <button class="btn btn-ghost" data-action="home">Back to Sparkbox</button>
    `;
    container.querySelector('[data-action="again"]')?.addEventListener('click', () => {
      startRound();
    });
    container.querySelector('[data-action="home"]')?.addEventListener('click', goHome);
  }

  render();
}
