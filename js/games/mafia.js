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

function getAlignment(role) {
  return role === 'Mafia' ? 'Mafia' : 'Civilian';
}

function minPlayers(mafiaCount, doctorOn, grandfatherOn) {
  const specials = (doctorOn ? 1 : 0) + (grandfatherOn ? 1 : 0);
  const minTown = mafiaCount + 1;
  return mafiaCount + specials + minTown;
}

function assignRoles(count, mafiaCount, doctorOn, grandfatherOn) {
  const roles = [];
  for (let i = 0; i < mafiaCount; i++) roles.push('Mafia');
  if (doctorOn) roles.push('Doctor');
  if (grandfatherOn) roles.push('Grandfather');
  while (roles.length < count) roles.push('Civilian');
  return shuffle(roles);
}

function buildDawnStory({ target, saved, victim, round }) {
  if (victim) {
    if (saved && saved !== target) {
      return pickRandom([
        `Night ${round}: the Mafia crept up on <strong>${target}</strong>, but the Doctor was with <strong>${saved}</strong> instead. By dawn, <strong>${victim}</strong> was gone.`,
        `Killers chose <strong>${target}</strong>. The Doctor watched <strong>${saved}</strong> — too late for <strong>${victim}</strong>.`,
      ]);
    }
    return pickRandom([
      `Under cover of darkness, the Mafia silenced <strong>${victim}</strong>. Nobody could stop it.`,
      `<strong>${victim}</strong> didn't survive the night. The Mafia had their way.`,
    ]);
  }
  if (target && saved === target) {
    return pickRandom([
      `The Mafia went for <strong>${target}</strong> — but the Doctor saved them in the nick of time.`,
      `An attack on <strong>${target}</strong> failed. The Doctor got there first.`,
    ]);
  }
  if (saved) {
    return pickRandom([
      `The Doctor kept watch over <strong>${saved}</strong>. No attack came... this time.`,
      `A quiet night. The Doctor never left <strong>${saved}</strong>'s side.`,
    ]);
  }
  return pickRandom([
    `Everyone survived the night — but the Mafia are still among you.`,
    `Dawn broke peacefully. Don't let it fool you.`,
  ]);
}

function buildDayStory(votedOut, role) {
  return pickRandom([
    `The town voted out <strong>${votedOut}</strong> — they were the <strong>${role}</strong>.`,
    `<strong>${votedOut}</strong> was eliminated. Their role: <strong>${role}</strong>.`,
  ]);
}

export function createMafia(container, { goHome, ui }) {
  let state = { phase: 'setup' };

  function render() {
    switch (state.phase) {
      case 'setup': renderSetup(); break;
      case 'reveal': renderReveal(); break;
      case 'night-intro': renderNightIntro(); break;
      case 'night-action': renderNightAction(); break;
      case 'night-result': renderNightResult(); break;
      case 'day': renderDay(); break;
      case 'vote': renderVote(); break;
      case 'eliminate': renderEliminate(); break;
      case 'result': renderResult(); break;
    }
  }

  function alivePlayers() {
    return state.players.filter(p => p.alive);
  }

  function mafiaAlive() {
    return state.players.filter(p => p.alive && p.role === 'Mafia');
  }

  function nonMafiaAlive() {
    return state.players.filter(p => p.alive && p.role !== 'Mafia');
  }

  function checkWin() {
    const m = mafiaAlive().length;
    const t = nonMafiaAlive().length;
    if (m === 0) return 'civilians';
    if (m >= t) return 'mafia';
    return null;
  }

  function getMinPlayers() {
    return minPlayers(state.mafiaCount, state.doctorEnabled, state.grandfatherEnabled);
  }

  function renderSetup() {
    state.mafiaCount = state.mafiaCount ?? 1;
    state.doctorEnabled = state.doctorEnabled !== false;
    state.grandfatherEnabled = state.grandfatherEnabled !== false;
    state.playerCount = state.playerCount ?? Math.max(6, getMinPlayers());
    state.playerNames = state.playerNames || Array.from({ length: state.playerCount }, (_, i) => `Player ${i + 1}`);
    const minP = getMinPlayers();

    container.innerHTML = `
      ${ui.header('Mafia', goHome)}
      <div class="panel">
        <h2>How to play</h2>
        <ul>
          <li><strong>Mafia</strong> — kill one person each night. Win when Mafia ≥ everyone else alive.</li>
          <li><strong>Civilian</strong> — no powers. Sus, debate, vote out the Mafia.</li>
          <li><strong>Doctor</strong> — save one person each night (blind). Self-save only once. Saving Mafia does nothing.</li>
          <li><strong>Grandfather</strong> — check if someone is Civilian or Mafia (not their special role).</li>
        </ul>
      </div>
      <div class="panel">
        <h2>Setup</h2>
        <div class="form-group">
          <label>Mafia count</label>
          <div class="chip-group">
            ${[1, 2, 3].map(n => `
              <span class="chip ${state.mafiaCount === n ? 'active' : ''}" data-mafia="${n}">${n} Mafia</span>
            `).join('')}
          </div>
        </div>
        <div class="form-group">
          <label>Special roles</label>
          <div class="chip-group">
            <span class="chip ${state.doctorEnabled ? 'active' : ''}" data-toggle="doctor">Doctor</span>
            <span class="chip ${state.grandfatherEnabled ? 'active' : ''}" data-toggle="grandfather">Grandfather</span>
          </div>
          <p class="helper-text">Minimum ${minP} players with current settings.</p>
        </div>
        <div class="form-group">
          <label>Players (${minP}–12)</label>
          <div class="form-row">
            <button class="btn-stepper" data-action="dec">−</button>
            <span class="stepper-value">${state.playerCount}</span>
            <button class="btn-stepper" data-action="inc">+</button>
          </div>
        </div>
        <div class="form-group">
          <label>Names</label>
          ${state.playerNames.map((name, i) => `
            <input type="text" data-player="${i}" value="${name}" style="margin-bottom:0.5rem">
          `).join('')}
        </div>
      </div>
      <button class="btn btn-primary" data-action="start" ${state.playerCount < minP ? 'disabled style="opacity:0.5"' : ''}>Begin the night</button>
    `;

    container.querySelectorAll('[data-mafia]').forEach(chip => {
      chip.addEventListener('click', () => {
        state.mafiaCount = +chip.dataset.mafia;
        if (state.playerCount < getMinPlayers()) state.playerCount = getMinPlayers();
        while (state.playerNames.length < state.playerCount) {
          state.playerNames.push(`Player ${state.playerNames.length + 1}`);
        }
        renderSetup();
      });
    });
    container.querySelectorAll('[data-toggle]').forEach(chip => {
      chip.addEventListener('click', () => {
        const key = chip.dataset.toggle;
        if (key === 'doctor') state.doctorEnabled = !state.doctorEnabled;
        if (key === 'grandfather') state.grandfatherEnabled = !state.grandfatherEnabled;
        if (!state.doctorEnabled && !state.grandfatherEnabled && state.mafiaCount >= 2 && state.playerCount < getMinPlayers()) {
          state.playerCount = getMinPlayers();
        }
        if (state.playerCount < getMinPlayers()) state.playerCount = getMinPlayers();
        renderSetup();
      });
    });
    container.querySelector('[data-action="dec"]')?.addEventListener('click', () => {
      if (state.playerCount > minP) {
        state.playerCount--;
        state.playerNames = state.playerNames.slice(0, state.playerCount);
        renderSetup();
      }
    });
    container.querySelector('[data-action="inc"]')?.addEventListener('click', () => {
      if (state.playerCount < 12) {
        state.playerCount++;
        while (state.playerNames.length < state.playerCount) {
          state.playerNames.push(`Player ${state.playerNames.length + 1}`);
        }
        renderSetup();
      }
    });
    container.querySelectorAll('[data-player]').forEach(input => {
      input.addEventListener('input', e => { state.playerNames[+e.target.dataset.player] = e.target.value; });
    });
    container.querySelector('[data-action="start"]')?.addEventListener('click', () => {
      if (state.playerCount >= minP) startGame();
    });
  }

  function startGame() {
    const roles = assignRoles(state.playerCount, state.mafiaCount, state.doctorEnabled, state.grandfatherEnabled);
    state.players = state.playerNames.map((name, i) => ({
      name,
      role: roles[i],
      alive: true,
      doctorSelfSaved: false,
    }));
    state.round = 1;
    state.currentPlayer = 0;
    state.revealed = false;
    state.phase = 'reveal';
    render();
  }

  function roleCardClass(role) {
    if (role === 'Mafia') return 'mafia';
    if (role === 'Civilian') return 'town';
    return 'special';
  }

  function roleDescription(role) {
    const desc = {
      Mafia: 'Kill one person each night with the other Mafia. Win when Mafia equals or outnumber everyone else.',
      Civilian: 'No night powers. Sus people out, survive, and vote to eliminate the Mafia.',
      Doctor: 'Each night, blindly save one person. You don\'t know who Mafia targets. Self-save only once — saving Mafia has no effect.',
      Grandfather: 'Each night, inspect one player. You learn only if they are Civilian or Mafia — not Doctor or other roles.',
    };
    return desc[role];
  }

  function roleLabel(role) {
    return {
      Mafia: '🔪 Mafia',
      Civilian: '🏘️ Civilian',
      Doctor: '💊 Doctor',
      Grandfather: '👴 Grandfather',
    }[role];
  }

  function renderReveal() {
    const player = state.players[state.currentPlayer];

    if (!state.revealed) {
      container.innerHTML = `
        ${ui.header('Mafia', goHome)}
        <div class="pass-screen">
          <p class="pass-label">Pass the device to</p>
          <p class="pass-player">${player.name}</p>
          <div class="pass-hidden" data-action="reveal">
            <div class="tap-icon">🌙</div>
            <p>Tap to see your secret role</p>
          </div>
        </div>
      `;
      container.querySelector('[data-action="reveal"]')?.addEventListener('click', () => { state.revealed = true; renderReveal(); });
    } else {
      const partners = state.players.filter(p => p.role === 'Mafia' && p.name !== player.name).map(p => p.name);
      const extra = player.role === 'Mafia' && partners.length
        ? `<p class="reveal-detail" style="margin-top:0.75rem">Your partners: <strong>${partners.join(', ')}</strong></p>`
        : '';

      container.innerHTML = `
        ${ui.header('Mafia', goHome)}
        <div class="pass-screen">
          <p class="pass-label">${player.name}</p>
          <div class="reveal-card ${roleCardClass(player.role)}">
            <p class="reveal-role">${roleLabel(player.role)}</p>
            <p class="reveal-detail">${roleDescription(player.role)}</p>
            ${extra}
          </div>
          <button class="btn btn-primary" data-action="next">
            ${state.currentPlayer < state.players.length - 1 ? 'Pass to next player' : 'Begin night 1'}
          </button>
        </div>
      `;
      container.querySelector('[data-action="next"]')?.addEventListener('click', () => {
        if (state.currentPlayer < state.players.length - 1) {
          state.currentPlayer++;
          state.revealed = false;
          renderReveal();
        } else {
          state.phase = 'night-intro';
          render();
        }
      });
    }
  }

  function startNightRound() {
    state.nightActions = {};
    state.nightPlayerIndex = 0;
    state.nightSubPhase = undefined;
    state.phase = 'night-action';
    render();
  }

  function renderNightIntro() {
    container.innerHTML = `
      ${ui.header('Mafia', goHome)}
      <div class="phase-banner night">Night ${state.round}</div>
      <div class="panel">
        <p>Everyone close your eyes. Pass the phone to each player in turn — same as role reveal.</p>
      </div>
      <button class="btn btn-primary" data-action="start-night">Begin</button>
    `;
    container.querySelector('[data-action="start-night"]')?.addEventListener('click', startNightRound);
  }

  function advanceNightTurn() {
    state.nightPlayerIndex++;
    state.nightSubPhase = undefined;
    renderNightAction();
  }

  function finishSpecialTurn() {
    state.nightSubPhase = undefined;
    advanceNightTurn();
  }

  function renderNightAction() {
    const order = alivePlayers();
    if (state.nightPlayerIndex >= order.length) {
      resolveNight();
      state.phase = 'night-result';
      render();
      return;
    }

    const player = order[state.nightPlayerIndex];

    if (player.role === 'Civilian') {
      container.innerHTML = `
        ${ui.header('Mafia', goHome)}
        <div class="phase-banner night">Night ${state.round}</div>
        <div class="pass-screen">
          <p class="pass-label">Pass the device to</p>
          <p class="pass-player">${player.name}</p>
          <div class="pass-hidden" data-action="continue">
            <div class="tap-icon">🌙</div>
            <p>Tap when you have the phone</p>
          </div>
        </div>
      `;
      container.querySelector('[data-action="continue"]')?.addEventListener('click', advanceNightTurn);
      return;
    }

    if (state.nightSubPhase !== 'action') {
      container.innerHTML = `
        ${ui.header('Mafia', goHome)}
        <div class="phase-banner night">Night ${state.round}</div>
        <div class="pass-screen">
          <p class="pass-label">Pass the device to</p>
          <p class="pass-player">${player.name}</p>
          <div class="pass-hidden" data-action="ready">
            <div class="tap-icon">🌙</div>
            <p>Tap when you have the phone</p>
          </div>
        </div>
      `;
      container.querySelector('[data-action="ready"]')?.addEventListener('click', () => {
        state.nightSubPhase = 'action';
        renderNightAction();
      });
      return;
    }

    if (player.role === 'Mafia') {
      const targets = alivePlayers().filter(p => p.role !== 'Mafia');
      container.innerHTML = `
        ${ui.header('Mafia', goHome)}
        <div class="phase-banner night">Night ${state.round}</div>
        <div class="panel"><p>Choose someone to eliminate tonight.</p></div>
        <ul class="player-list">
          ${targets.map(p => `<li class="player-item" data-target="${p.name}">${p.name}</li>`).join('')}
        </ul>
      `;
      container.querySelectorAll('[data-target]').forEach(el => {
        el.addEventListener('click', () => {
          state.nightActions.mafia = el.dataset.target;
          finishSpecialTurn();
        });
      });
    } else if (player.role === 'Doctor') {
      const selfNote = player.doctorSelfSaved
        ? 'You already used your one self-save.'
        : 'You may save yourself once per game.';
      const targets = alivePlayers().filter(p => {
        if (p.name === player.name && player.doctorSelfSaved) return false;
        return true;
      });
      container.innerHTML = `
        ${ui.header('Mafia', goHome)}
        <div class="phase-banner night">Night ${state.round}</div>
        <div class="panel">
          <p>Blind save — pick someone to protect. You don't know who Mafia is targeting.</p>
          <p class="helper-text">${selfNote} Saving a Mafia member has no effect.</p>
        </div>
        <ul class="player-list">
          ${targets.map(p => `<li class="player-item" data-target="${p.name}">${p.name}${p.name === player.name ? ' (you)' : ''}</li>`).join('')}
        </ul>
      `;
      container.querySelectorAll('[data-target]').forEach(el => {
        el.addEventListener('click', () => {
          const targetName = el.dataset.target;
          if (targetName === player.name) player.doctorSelfSaved = true;
          state.nightActions.doctor = targetName;
          finishSpecialTurn();
        });
      });
    } else if (player.role === 'Grandfather') {
      container.innerHTML = `
        ${ui.header('Mafia', goHome)}
        <div class="phase-banner night">Night ${state.round}</div>
        <div class="panel"><p>Inspect one player — you'll learn if they are <strong>Civilian</strong> or <strong>Mafia</strong> only.</p></div>
        <ul class="player-list">
          ${alivePlayers().filter(p => p.name !== player.name).map(p => `
            <li class="player-item" data-target="${p.name}">${p.name}</li>
          `).join('')}
        </ul>
      `;
      container.querySelectorAll('[data-target]').forEach(el => {
        el.addEventListener('click', () => {
          const target = state.players.find(p => p.name === el.dataset.target);
          state.nightActions.grandfatherResult = {
            name: target.name,
            alignment: getAlignment(target.role),
          };
          finishSpecialTurn();
        });
      });
    }
  }

  function resolveNight() {
    const target = state.nightActions.mafia;
    const saved = state.nightActions.doctor;
    if (target && target !== saved) {
      const victim = state.players.find(p => p.name === target);
      if (victim) victim.alive = false;
      state.lastVictim = target;
    } else {
      state.lastVictim = null;
    }
    state.dawnStory = buildDawnStory({ target, saved, victim: state.lastVictim, round: state.round });
  }

  function renderNightResult() {
    const win = checkWin();
    container.innerHTML = `
      ${ui.header('Mafia', goHome)}
      <div class="phase-banner night">Dawn breaks</div>
      <div class="panel dawn-story">
        <h2>Morning news</h2>
        <p>${state.dawnStory}</p>
      </div>
      ${state.nightActions.grandfatherResult ? `
        <div class="panel panel-private">
          <h2>Grandfather result (private)</h2>
          <p>Show only to the Grandfather: <strong>${state.nightActions.grandfatherResult.name}</strong> is a <strong>${state.nightActions.grandfatherResult.alignment}</strong>.</p>
        </div>
      ` : ''}
      <button class="btn btn-primary" data-action="continue">${win ? 'See final results' : 'Start day discussion'}</button>
    `;
    container.querySelector('[data-action="continue"]')?.addEventListener('click', () => {
      if (win) {
        state.winner = win;
        state.phase = 'result';
        render();
      } else {
        state.phase = 'day';
        state.timeLeft = 180;
        render();
      }
    });
  }

  function renderDay() {
    container.innerHTML = `
      ${ui.header('Mafia', goHome)}
      <div class="phase-banner day">Day ${state.round} — Discussion</div>
      <div class="panel">
        <h2>Alive</h2>
        <ul class="player-list">
          ${alivePlayers().map(p => `<li class="player-item" style="pointer-events:none">${p.name}</li>`).join('')}
        </ul>
      </div>
      ${ui.timer(state.timeLeft, 180)}
      <button class="btn btn-primary" data-action="vote">Call a vote</button>
    `;
    ui.startTimer(state, () => renderDay(), () => { state.phase = 'vote'; render(); });
    container.querySelector('[data-action="vote"]')?.addEventListener('click', () => { ui.stopTimer(); state.phase = 'vote'; render(); });
  }

  function renderVote() {
    container.innerHTML = `
      ${ui.header('Mafia', goHome)}
      <div class="phase-banner day">Vote to eliminate</div>
      <div class="panel"><p>Discuss and vote out one person.</p></div>
      <ul class="player-list">
        ${alivePlayers().map(p => `<li class="player-item" data-vote="${p.name}">${p.name}</li>`).join('')}
      </ul>
    `;
    container.querySelectorAll('[data-vote]').forEach(el => {
      el.addEventListener('click', () => {
        state.votedOut = el.dataset.vote;
        state.phase = 'eliminate';
        render();
      });
    });
  }

  function renderEliminate() {
    const player = state.players.find(p => p.name === state.votedOut);
    player.alive = false;
    const win = checkWin();
    if (win) {
      state.winner = win;
      state.phase = 'result';
      render();
      return;
    }
    container.innerHTML = `
      ${ui.header('Mafia', goHome)}
      <div class="phase-banner day">Town verdict</div>
      <div class="panel dawn-story">
        <h2>Evening news</h2>
        <p>${buildDayStory(state.votedOut, player.role)}</p>
      </div>
      <button class="btn btn-primary" data-action="next-night">Continue to night ${state.round + 1}</button>
    `;
    container.querySelector('[data-action="next-night"]')?.addEventListener('click', () => {
      state.round++;
      state.phase = 'night-intro';
      render();
    });
  }

  function renderResult() {
    const civiliansWon = state.winner === 'civilians';
    container.innerHTML = `
      ${ui.header('Mafia', goHome)}
      <div class="result-box">
        <p class="result-title">${civiliansWon ? 'Civilians win!' : 'Mafia wins!'}</p>
        <p class="result-sub">${civiliansWon ? 'All Mafia eliminated.' : 'Mafia equal or outnumber the town.'}</p>
      </div>
      <div class="panel">
        <h2>Final roles</h2>
        <ul class="player-list">
          ${state.players.map(p => `
            <li class="player-item" style="pointer-events:none;${p.alive ? '' : 'opacity:0.5'}">
              ${p.name} — ${p.role} ${p.alive ? '✓' : '✗'}
            </li>
          `).join('')}
        </ul>
      </div>
      <button class="btn btn-primary" data-action="again">Play again</button>
      <button class="btn btn-ghost" data-action="home">Back to Sparkbox</button>
    `;
    container.querySelector('[data-action="again"]')?.addEventListener('click', () => { state.phase = 'setup'; render(); });
    container.querySelector('[data-action="home"]')?.addEventListener('click', goHome);
  }

  render();
}
