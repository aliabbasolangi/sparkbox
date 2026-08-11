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

function buildDawnStory({ target, saved, victim, round }) {
  if (victim) {
    if (saved && saved !== target) {
      return pickRandom([
        `Night ${round} brought terror to the town. The Mafia crept up on <strong>${target}</strong>, blades ready—but the Doctor had stayed with <strong>${saved}</strong> instead. By dawn, <strong>${victim}</strong> was gone, and the streets were filled with whispers.`,
        `While the town slept, killers closed in on <strong>${target}</strong>. The Doctor watched over <strong>${saved}</strong> through the long hours, but couldn't reach everyone. When the sun rose, they found <strong>${victim}</strong> had been taken in the night.`,
        `Footsteps in the alley. A muffled struggle. The Mafia had chosen <strong>${target}</strong>, and this time nothing stopped them. <strong>${victim}</strong> didn't make it to see the morning.`,
      ]);
    }
    return pickRandom([
      `In the dead of night, the Mafia slipped through the shadows toward <strong>${victim}</strong>. No one came to their aid. At dawn, the town woke to the worst kind of silence.`,
      `They never stood a chance. Under cover of darkness, the killers found <strong>${victim}</strong> alone—and when morning broke, another name was added to the town's grim ledger.`,
      `The night belonged to the Mafia. <strong>${victim}</strong> was hunted, cornered, and eliminated before the first rooster crowed.`,
    ]);
  }

  if (target && saved === target) {
    return pickRandom([
      `Night ${round}: the Mafia crept up on <strong>${target}</strong> and tried to eliminate them—but the Doctor was there in the nick of time. <strong>${target}</strong> stumbled into the daylight, shaken but alive.`,
      `Killers had <strong>${target}</strong> in their sights, moving silently through the dark. Just as all seemed lost, the Doctor burst in. <strong>${target}</strong> lives to tell the tale... for now.`,
      `Whispers, then footsteps. The Mafia reached <strong>${target}</strong>'s door—but the Doctor had already arrived. The save came in the final heartbeat before dawn.`,
    ]);
  }

  if (saved) {
    return pickRandom([
      `The Doctor kept a lonely vigil over <strong>${saved}</strong> all night. No attack came this time, but every shadow still felt like a threat come morning.`,
      `Through the long hours of darkness, the Doctor never left <strong>${saved}</strong>'s side. The town awoke intact—though nobody could say for how long.`,
    ]);
  }

  return pickRandom([
    `An uneasy quiet hung over the town. The Mafia couldn't agree on a target—or chose to wait. When morning came, every soul was still accounted for... though no one slept easy.`,
    `Night ${round} passed without bloodshed. Still, eyes darted across the breakfast table. The killers are here. They're just biding their time.`,
    `Dawn broke on a town holding its breath. No one fell last night—but the Mafia are still out there, somewhere in the crowd.`,
  ]);
}

function buildDayStory(votedOut, role) {
  return pickRandom([
    `The town had heard enough. After a fierce debate, they turned on <strong>${votedOut}</strong>—and when the verdict came down, the truth spilled out: they were the <strong>${role}</strong>.`,
    `Accusations flew until only one name remained. <strong>${votedOut}</strong> was cast out, their mask finally removed. They were the <strong>${role}</strong> all along.`,
    `By vote, the town chose <strong>${votedOut}</strong>. As the crowd dispersed, their role was revealed for all to see: <strong>${role}</strong>.`,
  ]);
}

const ROLE_CONFIG = {
  4:  { mafia: 1, doctor: 0, detective: 1 },
  5:  { mafia: 1, doctor: 1, detective: 0 },
  6:  { mafia: 1, doctor: 1, detective: 1 },
  7:  { mafia: 2, doctor: 1, detective: 1 },
  8:  { mafia: 2, doctor: 1, detective: 1 },
  9:  { mafia: 2, doctor: 1, detective: 1 },
  10: { mafia: 3, doctor: 1, detective: 1 },
  11: { mafia: 3, doctor: 1, detective: 1 },
  12: { mafia: 3, doctor: 1, detective: 2 },
};

function assignRoles(count) {
  const cfg = ROLE_CONFIG[Math.min(Math.max(count, 4), 12)];
  const roles = [];
  for (let i = 0; i < cfg.mafia; i++) roles.push('Mafia');
  for (let i = 0; i < cfg.doctor; i++) roles.push('Doctor');
  for (let i = 0; i < cfg.detective; i++) roles.push('Detective');
  while (roles.length < count) roles.push('Civilian');
  return shuffle(roles);
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

  function civiliansAlive() {
    return state.players.filter(p => p.alive && p.role !== 'Mafia');
  }

  function checkWin() {
    const m = mafiaAlive().length;
    const c = civiliansAlive().length;
    if (m === 0) return 'civilians';
    if (m >= c) return 'mafia';
    return null;
  }

  function renderSetup() {
    state.playerCount = state.playerCount || 6;
    state.playerNames = state.playerNames || Array.from({ length: state.playerCount }, (_, i) => `Player ${i + 1}`);

    container.innerHTML = `
      ${ui.header('Mafia', goHome)}
      <div class="panel">
        <h2>How to Play</h2>
        <ul>
          <li><strong>Mafia</strong> eliminate civilians at night</li>
          <li><strong>Doctor</strong> saves one person each night</li>
          <li><strong>Detective</strong> investigates one person each night</li>
          <li>Daytime: discuss and vote someone out. Civilians win when all Mafia are gone.</li>
        </ul>
      </div>
      <div class="panel">
        <h2>Players</h2>
        <div class="form-group">
          <label>Number of players (4–12)</label>
          <div class="form-row">
            <button class="btn-stepper" data-action="dec">−</button>
            <span class="stepper-value">${state.playerCount}</span>
            <button class="btn-stepper" data-action="inc">+</button>
          </div>
        </div>
        <div class="form-group">
          <label>Player names</label>
          ${state.playerNames.map((name, i) => `
            <input type="text" data-player="${i}" value="${name}" style="margin-bottom:0.5rem">
          `).join('')}
        </div>
      </div>
      <button class="btn btn-primary" data-action="start">Begin the Night</button>
    `;

    container.querySelector('[data-action="dec"]')?.addEventListener('click', () => {
      if (state.playerCount > 4) { state.playerCount--; state.playerNames = state.playerNames.slice(0, state.playerCount); renderSetup(); }
    });
    container.querySelector('[data-action="inc"]')?.addEventListener('click', () => {
      if (state.playerCount < 12) {
        state.playerCount++;
        while (state.playerNames.length < state.playerCount) state.playerNames.push(`Player ${state.playerNames.length + 1}`);
        renderSetup();
      }
    });
    container.querySelectorAll('[data-player]').forEach(input => {
      input.addEventListener('input', e => { state.playerNames[+e.target.dataset.player] = e.target.value; });
    });
    container.querySelector('[data-action="start"]')?.addEventListener('click', startGame);
  }

  function startGame() {
    const roles = assignRoles(state.playerCount);
    state.players = state.playerNames.map((name, i) => ({ name, role: roles[i], alive: true }));
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
      Mafia: 'Eliminate civilians at night. Don\'t get caught during the day. If multiple Mafia, you know each other.',
      Doctor: 'Each night, choose someone to protect from elimination.',
      Detective: 'Each night, investigate one player — you\'ll learn if they are Mafia or not.',
      Civilian: 'Find and vote out the Mafia during the day. You have no night power.',
    };
    return desc[role];
  }

  function roleLabel(role) {
    const labels = {
      Mafia: '🔪 Mafia',
      Doctor: '💊 Doctor',
      Detective: '🔍 Detective',
      Civilian: '🏘️ Civilian',
    };
    return labels[role];
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
      const mafiaPartners = state.players.filter(p => p.role === 'Mafia' && p.name !== player.name).map(p => p.name);
      let extra = '';
      if (player.role === 'Mafia' && mafiaPartners.length) {
        extra = `<p class="reveal-detail" style="margin-top:0.75rem">Your partners: <strong>${mafiaPartners.join(', ')}</strong></p>`;
      }

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
            ${state.currentPlayer < state.players.length - 1 ? 'Pass to Next Player' : 'Begin Night 1'}
          </button>
        </div>
      `;
      container.querySelector('[data-action="next"]')?.addEventListener('click', () => {
        if (state.currentPlayer < state.players.length - 1) {
          state.currentPlayer++;
          state.revealed = false;
          renderReveal();
        } else {
          state.nightActions = {};
          state.phase = 'night-intro';
          render();
        }
      });
    }
  }

  function startNightRound() {
    state.nightActions = {};
    state.nightPlayerIndex = 0;
    state.phase = 'night-action';
    render();
  }

  function renderNightIntro() {
    container.innerHTML = `
      ${ui.header('Mafia', goHome)}
      <div class="phase-banner night">Night ${state.round}</div>
      <div class="panel">
        <p>Everyone close your eyes. The phone will go around — pass it to each player when it's their turn.</p>
      </div>
      <button class="btn btn-primary" data-action="start-night">Begin</button>
    `;
    container.querySelector('[data-action="start-night"]')?.addEventListener('click', startNightRound);
  }

  function advanceNightTurn() {
    state.nightPlayerIndex++;
    renderNightAction();
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
        <div class="panel">
          <p>Choose someone.</p>
        </div>
        <ul class="player-list">
          ${targets.map(p => `<li class="player-item" data-target="${p.name}">${p.name}</li>`).join('')}
        </ul>
        <button class="btn btn-secondary" data-action="skip">Skip</button>
      `;
      container.querySelectorAll('[data-target]').forEach(el => {
        el.addEventListener('click', () => {
          state.nightActions.mafia = el.dataset.target;
          finishSpecialTurn();
        });
      });
      container.querySelector('[data-action="skip"]')?.addEventListener('click', finishSpecialTurn);
    } else if (player.role === 'Doctor') {
      container.innerHTML = `
        ${ui.header('Mafia', goHome)}
        <div class="phase-banner night">Night ${state.round}</div>
        <div class="panel">
          <p>Choose someone to protect.</p>
        </div>
        <ul class="player-list">
          ${alivePlayers().map(p => `<li class="player-item" data-target="${p.name}">${p.name}</li>`).join('')}
        </ul>
      `;
      container.querySelectorAll('[data-target]').forEach(el => {
        el.addEventListener('click', () => {
          state.nightActions.doctor = el.dataset.target;
          finishSpecialTurn();
        });
      });
    } else if (player.role === 'Detective') {
      container.innerHTML = `
        ${ui.header('Mafia', goHome)}
        <div class="phase-banner night">Night ${state.round}</div>
        <div class="panel">
          <p>Choose someone to investigate.</p>
        </div>
        <ul class="player-list">
          ${alivePlayers().filter(p => p.name !== player.name).map(p => `
            <li class="player-item" data-target="${p.name}">${p.name}</li>
          `).join('')}
        </ul>
      `;
      container.querySelectorAll('[data-target]').forEach(el => {
        el.addEventListener('click', () => {
          const target = state.players.find(p => p.name === el.dataset.target);
          state.nightActions.detectiveResult = {
            name: target.name,
            isMafia: target.role === 'Mafia',
          };
          finishSpecialTurn();
        });
      });
    }
  }

  function finishSpecialTurn() {
    state.nightSubPhase = undefined;
    advanceNightTurn();
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
    state.dawnStory = buildDawnStory({
      target,
      saved,
      victim: state.lastVictim,
      round: state.round,
    });
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
      ${state.nightActions.detectiveResult ? `
        <div class="panel panel-private">
          <h2>Detective result (private)</h2>
          <p>Show this only to the Detective: <strong>${state.nightActions.detectiveResult.name}</strong> is ${state.nightActions.detectiveResult.isMafia ? 'Mafia' : 'not Mafia'}.</p>
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
      <div class="panel"><p>Discuss and agree on one person to vote out.</p></div>
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
      state.nightPlayerIndex = 0;
      state.nightSubPhase = undefined;
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
        <p class="result-sub">${civiliansWon ? 'All Mafia have been eliminated.' : 'The Mafia now outnumber the civilians.'}</p>
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
