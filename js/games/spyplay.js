import { SCENE_PACKS, getLocationsForPack } from '../data/locations.js';

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

function assignInnocentRoles(location, count, spyIndex) {
  const roles = shuffle(location.roles);
  const assigned = [];
  let roleIdx = 0;
  for (let i = 0; i < count; i++) {
    if (i === spyIndex) {
      assigned.push(null);
    } else {
      assigned.push(roles[roleIdx % roles.length]);
      roleIdx++;
    }
  }
  return assigned;
}

export function createSpyfall(container, { goHome, ui, roster, setResume }) {
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
    state.rolesEnabled = state.rolesEnabled !== false;
    state.scenePackId = SCENE_PACKS.some(p => p.id === state.scenePackId)
      ? state.scenePackId
      : SCENE_PACKS[0].id;

    container.innerHTML = `
      ${ui.header('Incognito', goHome)}
      ${ui.howTo([
        'Everyone gets a location — except one spy who knows nothing',
        'The spy blends in. Ask questions, then vote someone out in person',
        'If you vote out anyone else, the spy wins. If you vote the spy, they guess the location out loud — right they win, wrong they lose',
      ], roster.howToOpen !== false)}
      <div class="panel">
        <h2>Players</h2>
        <div class="form-group">
          <label>Number of players</label>
          <div class="form-row">
            <button class="btn-stepper" data-action="dec-players">−</button>
            <span class="stepper-value">${state.playerCount}</span>
            <button class="btn-stepper" data-action="inc-players">+</button>
          </div>
        </div>
        <div class="form-group">
          <label>Player names</label>
          ${state.playerNames.map((name, i) => `
            <input type="text" data-player="${i}" value="${name}" placeholder="Name" autocomplete="off" style="margin-bottom:0.5rem">
          `).join('')}
        </div>
        <div class="form-group">
          <label>Discussion timer</label>
          <div class="chip-group" data-timer-chips>
            ${[3, 5, 7, 10].map(m => `
              <span class="chip ${state.timerMinutes === m ? 'active' : ''}" data-minutes="${m}">${m} min</span>
            `).join('')}
          </div>
        </div>
        <div class="form-group">
          <label>Scene pack</label>
          <div class="chip-group">
            ${SCENE_PACKS.map(pack => `
              <span class="chip ${state.scenePackId === pack.id ? 'active' : ''}" data-pack="${pack.id}">${pack.name}</span>
            `).join('')}
          </div>
          <p class="helper-text">${getLocationsForPack(state.scenePackId).length} locations in this pack.</p>
        </div>
        <div class="form-group">
          <label>Location roles</label>
          <div class="chip-group">
            <span class="chip ${state.rolesEnabled ? 'active' : ''}" data-roles="on">On</span>
            <span class="chip ${!state.rolesEnabled ? 'active' : ''}" data-roles="off">Off</span>
          </div>
          <p class="helper-text">${state.rolesEnabled
            ? 'Each innocent also gets a role at the location (e.g. Bartender, Pilot).'
            : 'Innocents only see the location — no individual roles.'}</p>
        </div>
      </div>
      <button class="btn btn-primary" data-action="start">Launch mission</button>
    `;

    ui.bindHowTo(container, roster);
    bindSetup();
  }

  function bindSetup() {
    container.querySelector('[data-action="dec-players"]')?.addEventListener('click', () => {
      if (state.playerCount > 3) {
        state.playerCount--;
        state.playerNames = roster.padPlayers(state.playerNames, state.playerCount);
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
    container.querySelectorAll('[data-minutes]').forEach(chip => {
      chip.addEventListener('click', () => {
        state.timerMinutes = +chip.dataset.minutes;
        renderSetup();
      });
    });
    container.querySelectorAll('[data-pack]').forEach(chip => {
      chip.addEventListener('click', () => {
        state.scenePackId = chip.dataset.pack;
        renderSetup();
      });
    });
    container.querySelectorAll('[data-roles]').forEach(chip => {
      chip.addEventListener('click', () => {
        state.rolesEnabled = chip.dataset.roles === 'on';
        renderSetup();
      });
    });
    container.querySelector('[data-action="start"]')?.addEventListener('click', startGame);
  }

  function innocentDetail(role) {
    if (state.rolesEnabled && role) {
      return `Your role: <strong>${role}</strong><br>Find the spy who doesn't know where they are.`;
    }
    return 'Find the spy who doesn\'t know where they are.';
  }

  function roleDisplay(name, i) {
    if (i === state.spyIndex) return 'Spy';
    if (state.rolesEnabled && state.playerRoles[i]) return state.playerRoles[i];
    return 'Innocent';
  }

  function startGame() {
    roster.savePlayers(state.playerNames);
    roster.collapseHowTo();
    const pool = getLocationsForPack(state.scenePackId);
    const location = pickRandom(pool);
    const spyIndex = Math.floor(Math.random() * state.playerCount);

    state.location = location;
    state.spyIndex = spyIndex;
    state.playerRoles = state.rolesEnabled
      ? assignInnocentRoles(location, state.playerCount, spyIndex)
      : state.playerNames.map((_, i) => (i === spyIndex ? null : null));
    state.currentPlayer = 0;
    state.revealed = false;
    state.phase = 'reveal';
    render();
  }

  function renderReveal() {
    const name = playerName(state.currentPlayer);

    if (!state.revealed) {
      container.innerHTML = `
        ${ui.header('Incognito', goHome)}
        <div class="pass-screen">
          <p class="pass-label">Pass the device to</p>
          <p class="pass-player">${name}</p>
          <div class="pass-hidden" data-action="reveal">
            <div class="tap-icon">👁️</div>
            <p>Tap to reveal your secret role</p>
          </div>
          <p class="hint-text">Make sure no one else is looking!</p>
        </div>
      `;
      container.querySelector('[data-action="reveal"]')?.addEventListener('click', () => {
        state.revealed = true;
        renderReveal();
      });
    } else {
      const isSpy = state.currentPlayer === state.spyIndex;
      const role = state.playerRoles[state.currentPlayer];
      container.innerHTML = `
        ${ui.header('Incognito', goHome)}
        <div class="pass-screen">
          <p class="pass-label">${name}'s role</p>
          <div class="reveal-card ${isSpy ? 'spy' : 'innocent'}">
            <p class="reveal-role">${isSpy ? '🕵️ Spy' : state.location.name}</p>
            <p class="reveal-detail">${isSpy
              ? 'You don\'t know the location. Blend in so they vote someone else. If they catch you, guess the location out loud.'
              : innocentDetail(role)}</p>
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
      ${ui.header('Incognito', goHome)}
      <div class="phase-banner discuss">Discussion</div>
      <div class="panel">
        <p>Ask questions about the location, then vote someone out in person. If you catch the spy, they guess the location out loud. The app only reveals at the end.</p>
      </div>
      ${ui.timer(state.timeLeft, state.timerMinutes * 60)}
      <button class="btn btn-primary" data-action="reveal">Reveal answers</button>
    `;

    ui.startTimer(state, () => renderDiscuss(), showReveal);
    container.querySelector('[data-action="reveal"]')?.addEventListener('click', showReveal);
  }

  function renderResult() {
    const spyName = playerName(state.spyIndex);

    container.innerHTML = `
      ${ui.header('Incognito', goHome)}
      <div class="result-box">
        <p class="result-title">The reveal</p>
        <p class="result-sub">
          The spy was <strong>${spyName}</strong><br>
          The location was <strong>${state.location.name}</strong>
        </p>
      </div>
      <div class="panel">
        <h2>Everyone's roles</h2>
        <ul class="player-list">
          ${state.playerNames.map((name, i) => `
            <li class="player-item" style="pointer-events:none">
              ${playerName(i)} — ${roleDisplay(name, i)}
            </li>
          `).join('')}
        </ul>
      </div>
      <button class="btn btn-primary" data-action="again">Play again</button>
      <button class="btn btn-ghost" data-action="home">Back to Sparkbox</button>
    `;
    container.querySelector('[data-action="again"]')?.addEventListener('click', () => {
      state.phase = 'setup';
      render();
    });
    container.querySelector('[data-action="home"]')?.addEventListener('click', goHome);
  }

  setResume?.(() => render());
  render();
}
