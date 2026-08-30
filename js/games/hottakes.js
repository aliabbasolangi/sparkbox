import { supabase, makeCode, makeId } from '../online/client.js';
import { HOT_TAKES_PROMPTS, ROUNDS_TO_PLAY } from '../data/hottakes-prompts.js';

export const HOTTAKES_SESSION = 'sparkbox.hottakes';

function pickPrompt(names) {
  const raw = HOT_TAKES_PROMPTS[Math.floor(Math.random() * HOT_TAKES_PROMPTS.length)];
  const name = names[Math.floor(Math.random() * names.length)] || 'them';
  return raw.replaceAll('{name}', name);
}

function escape(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/"/g, '&quot;');
}

export function createHotTakes(container, { ui, roster, setResume, setCleanup }) {
  let me = { id: null, token: null, name: '' };
  let room = null;
  let players = [];
  let round = null;
  let answers = [];
  let votes = [];
  let draft = '';
  let error = '';
  let joining = false;
  let busy = false;
  let channel = null;
  let refreshing = false;
  let refreshQueued = false;
  let setup = {
    name: roster.names?.find(n => n.trim()) || '',
    code: '',
    rounds: 5,
  };

  function isHost() {
    return room && me.id && room.host_id === me.id;
  }

  function myAnswer() {
    return answers.find(a => a.player_id === me.id);
  }

  function myVote() {
    return votes.find(v => v.voter_id === me.id);
  }

  function othersWriting() {
    return players.filter(p => !answers.some(a => a.player_id === p.id));
  }

  function othersVoting() {
    return players.filter(p => !votes.some(v => v.voter_id === p.id));
  }

  function totalRounds() {
    return room?.points_to_win || 5;
  }

  function voteTally() {
    const tally = {};
    for (const v of votes) tally[v.answer_id] = (tally[v.answer_id] || 0) + 1;
    return tally;
  }

  function roundWinners(tally) {
    const top = Math.max(0, ...answers.map(a => tally[a.id] || 0));
    if (top <= 0) return [];
    return answers.filter(a => (tally[a.id] || 0) === top);
  }

  function saveSession() {
    if (!room || !me.id) return;
    sessionStorage.setItem(HOTTAKES_SESSION, JSON.stringify({
      roomId: room.id,
      playerId: me.id,
      token: me.token,
      name: me.name,
    }));
  }

  async function restoreSession() {
    let saved;
    try {
      saved = JSON.parse(sessionStorage.getItem(HOTTAKES_SESSION) || 'null');
    } catch {
      saved = null;
    }
    if (!saved?.roomId || !saved.playerId) return false;
    const { data: found } = await supabase.from('rooms').select('*').eq('id', saved.roomId).maybeSingle();
    if (!found) {
      sessionStorage.removeItem(HOTTAKES_SESSION);
      return false;
    }
    const { data: player } = await supabase
      .from('players')
      .select('*')
      .eq('id', saved.playerId)
      .eq('token', saved.token)
      .maybeSingle();
    if (!player) {
      sessionStorage.removeItem(HOTTAKES_SESSION);
      return false;
    }
    me = { id: player.id, token: saved.token, name: player.name };
    room = found;
    await subscribe();
    await refresh();
    return true;
  }

  async function refresh() {
    if (!room) return;
    if (refreshing) {
      refreshQueued = true;
      return;
    }
    refreshing = true;
    try {
      const [{ data: r }, { data: p }] = await Promise.all([
        supabase.from('rooms').select('*').eq('id', room.id).single(),
        supabase.from('players').select('*').eq('room_id', room.id).order('joined_at'),
      ]);
      if (r) room = r;
      if (p) players = p;
      saveSession();

      if (room.round > 0) {
        const { data: rnd } = await supabase
          .from('rounds')
          .select('*')
          .eq('room_id', room.id)
          .eq('number', room.round)
          .maybeSingle();
        round = rnd;
        if (round) {
          const [{ data: a }, { data: v }] = await Promise.all([
            supabase.from('answers').select('*').eq('round_id', round.id),
            supabase.from('votes').select('*').eq('round_id', round.id),
          ]);
          answers = a || [];
          votes = v || [];
        } else {
          answers = [];
          votes = [];
        }
      } else {
        round = null;
        answers = [];
        votes = [];
      }

      await maybeAdvance();
      render();
    } finally {
      refreshing = false;
      if (refreshQueued) {
        refreshQueued = false;
        await refresh();
      }
    }
  }

  async function maybeAdvance() {
    if (!room || players.length < 3) return;

    if (room.status === 'writing' && round && answers.length >= players.length) {
      const { data } = await supabase
        .from('rooms')
        .update({ status: 'voting' })
        .eq('id', room.id)
        .eq('status', 'writing')
        .select('id')
        .maybeSingle();
      if (data) room = { ...room, status: 'voting' };
      return;
    }

    if (room.status === 'voting' && round && votes.length >= players.length) {
      const tally = voteTally();
      const winners = roundWinners(tally);
      const lastRound = room.round >= totalRounds();
      const nextStatus = lastRound ? 'finished' : 'results';
      const { data: claimed } = await supabase
        .from('rooms')
        .update({ status: nextStatus })
        .eq('id', room.id)
        .eq('status', 'voting')
        .select('id')
        .maybeSingle();
      if (!claimed) return;

      room = { ...room, status: nextStatus };
      for (const a of winners) {
        const pl = players.find(p => p.id === a.player_id);
        if (!pl) continue;
        const nextScore = pl.score + 1;
        await supabase.from('players').update({ score: nextScore }).eq('id', pl.id);
        pl.score = nextScore;
      }
    }
  }

  async function subscribe() {
    if (channel) supabase.removeChannel(channel);
    channel = supabase
      .channel(`room:${room.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'rooms', filter: `id=eq.${room.id}` }, refresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'players', filter: `room_id=eq.${room.id}` }, refresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'rounds', filter: `room_id=eq.${room.id}` }, refresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'answers' }, refresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'votes' }, refresh)
      .subscribe();
  }

  async function hostRoom() {
    const name = setup.name.trim();
    if (!name) { error = 'Put your name in first.'; render(); return; }
    joining = true;
    error = '';
    render();
    me = { id: makeId(), token: makeId(), name };
    let created = null;
    let roomErr = null;
    for (let attempt = 0; attempt < 2; attempt++) {
      const res = await supabase.from('rooms').insert({
        id: makeId(),
        code: makeCode(),
        host_id: me.id,
        status: 'lobby',
        round: 0,
        points_to_win: setup.rounds,
      }).select().single();
      created = res.data;
      roomErr = res.error;
      if (!roomErr || roomErr.code !== '23505') break;
    }
    if (roomErr || !created) {
      joining = false;
      const detail = roomErr?.message || 'unknown error';
      const needsSchema = /does not exist|schema cache|permission denied|row-level security/i.test(detail);
      error = needsSchema
        ? 'Could not create a room. In Supabase, open SQL Editor, paste supabase/schema.sql, and Run — then try again.'
        : `Could not create a room. ${detail}`;
      render();
      return;
    }
    room = created;
    const { error: pErr } = await supabase.from('players').insert({
      id: me.id,
      room_id: room.id,
      name,
      token: me.token,
      score: 0,
    });
    if (pErr) {
      joining = false;
      error = pErr.message;
      render();
      return;
    }
    roster.savePlayers([name, ...(roster.names || []).filter(n => n && n !== name)]);
    joining = false;
    saveSession();
    await subscribe();
    await refresh();
  }

  async function joinRoom() {
    const name = setup.name.trim();
    const code = setup.code.trim().toUpperCase();
    if (!name) { error = 'Put your name in first.'; render(); return; }
    if (code.length < 4) { error = 'Enter the 4-letter room code.'; render(); return; }
    joining = true;
    error = '';
    render();
    const { data: found, error: findErr } = await supabase.from('rooms').select('*').eq('code', code).maybeSingle();
    if (findErr || !found) {
      joining = false;
      error = 'No room with that code. Check it and try again.';
      render();
      return;
    }
    if (found.status !== 'lobby') {
      joining = false;
      error = found.status === 'finished'
        ? 'That room already finished.'
        : 'That room already started. Wait for the next lobby.';
      render();
      return;
    }
    me = { id: makeId(), token: makeId(), name };
    const { error: pErr } = await supabase.from('players').insert({
      id: me.id,
      room_id: found.id,
      name,
      token: me.token,
      score: 0,
    });
    if (pErr) {
      joining = false;
      error = pErr.message;
      render();
      return;
    }
    room = found;
    roster.savePlayers([name, ...(roster.names || []).filter(n => n && n !== name)]);
    joining = false;
    saveSession();
    await subscribe();
    await refresh();
  }

  async function startRound() {
    if (!isHost() || players.length < 3 || busy) return;
    busy = true;
    error = '';
    const prompt = pickPrompt(players.map(p => p.name));
    const next = room.round + 1;
    const { error: rErr } = await supabase.from('rounds').insert({
      room_id: room.id,
      number: next,
      prompt,
    });
    if (rErr) {
      busy = false;
      error = rErr.message;
      render();
      return;
    }
    await supabase.from('rooms').update({ status: 'writing', round: next }).eq('id', room.id);
    busy = false;
  }

  async function submitAnswer() {
    const text = draft.trim();
    if (!text || !round || myAnswer() || busy) return;
    busy = true;
    const { error: aErr } = await supabase.from('answers').insert({
      round_id: round.id,
      player_id: me.id,
      text,
    });
    busy = false;
    if (aErr) { error = aErr.message; render(); return; }
    draft = '';
    await refresh();
  }

  async function submitVote(answerId) {
    const mine = myAnswer();
    if (!round || myVote() || (mine && mine.id === answerId) || busy) return;
    busy = true;
    const { error: vErr } = await supabase.from('votes').insert({
      round_id: round.id,
      voter_id: me.id,
      answer_id: answerId,
    });
    busy = false;
    if (vErr) { error = vErr.message; render(); return; }
    await refresh();
  }

  async function nextRound() {
    if (!isHost() || room.status !== 'results') return;
    await startRound();
  }

  async function playAgain() {
    if (!isHost() || busy) return;
    busy = true;
    await supabase.from('players').update({ score: 0 }).eq('room_id', room.id);
    await supabase.from('rooms').update({ status: 'lobby', round: 0 }).eq('id', room.id);
    busy = false;
  }

  function render() {
    if (!room) {
      renderSetup();
      return;
    }
    switch (room.status) {
      case 'lobby': renderLobby(); break;
      case 'writing': renderWrite(); break;
      case 'voting': renderVote(); break;
      case 'results':
      case 'finished': renderResults(); break;
      default: renderLobby();
    }
  }

  function banner() {
    if (!error) return '';
    return `<div class="panel" style="background:var(--danger-bg)"><p>${escape(error)}</p></div>`;
  }

  function scoreboard() {
    const sorted = [...players].sort((a, b) => b.score - a.score);
    return `
      <div class="panel">
        <h2>${room.status === 'finished' ? 'Final scores' : `Scores · round ${room.round} of ${totalRounds()}`}</h2>
        <ul class="score-rows">
          ${sorted.map((p, i) => `
            <li class="score-row ${p.id === me.id ? 'is-you' : ''}">
              <span class="score-row-place">${i + 1}</span>
              <span class="score-row-name">${escape(p.name)}${p.id === me.id ? ' · you' : ''}</span>
              <span class="score-row-pts">${p.score}</span>
            </li>
          `).join('')}
        </ul>
      </div>
    `;
  }

  function renderSetup() {
    container.innerHTML = `
      ${ui.header('Allegedly')}
      ${ui.howTo([
        'One person <strong>hosts</strong>. Everyone else joins with the room code on their own phone',
        'Each round is a prompt about someone in the room. Write the funniest or most true answer in secret',
        'Vote for the best line. The winner of the vote gets the point. After the rounds you picked, highest score wins',
      ], roster.howToOpen !== false)}
      ${banner()}
      <div class="panel">
        <h2>Your name</h2>
        <div class="form-group">
          <input type="text" data-field="name" value="${escape(setup.name)}" placeholder="Name" autocomplete="off">
        </div>
        <div class="form-group" style="margin-bottom:0">
          <label>Rounds</label>
          <div class="chip-group">
            ${ROUNDS_TO_PLAY.map(n => `
              <span class="chip ${setup.rounds === n ? 'active' : ''}" data-rounds="${n}">${n}</span>
            `).join('')}
          </div>
        </div>
      </div>
      <button class="btn btn-primary" data-action="host" ${joining ? 'disabled' : ''}>Host a room</button>
      <div class="panel" style="margin-top:1rem">
        <h2>Have a code?</h2>
        <div class="form-group">
          <input type="text" data-field="code" value="${escape(setup.code)}" placeholder="ABCD" autocomplete="off" maxlength="6" class="room-code-input">
        </div>
        <button class="btn btn-secondary" data-action="join" ${joining ? 'disabled' : ''}>Join room</button>
      </div>
    `;
    ui.bindHowTo(container, roster);
    container.querySelector('[data-field="name"]')?.addEventListener('input', e => { setup.name = e.target.value; });
    container.querySelector('[data-field="code"]')?.addEventListener('input', e => { setup.code = e.target.value.toUpperCase(); });
    container.querySelectorAll('[data-rounds]').forEach(chip => {
      chip.addEventListener('click', () => { setup.rounds = +chip.dataset.rounds; renderSetup(); });
    });
    container.querySelector('[data-action="host"]')?.addEventListener('click', hostRoom);
    container.querySelector('[data-action="join"]')?.addEventListener('click', joinRoom);
  }

  function renderLobby() {
    container.innerHTML = `
      ${ui.header('Allegedly')}
      ${banner()}
      <div class="room-code-card">
        <p class="room-code-label">Room code</p>
        <p class="room-code">${escape(room.code)}</p>
        <p class="helper-text">Others open Sparkbox → Allegedly → type this code</p>
      </div>
      <div class="panel">
        <h2>In the room · ${players.length}</h2>
        <div class="player-pills">
          ${players.map(p => `
            <span class="player-pill ${p.id === room.host_id ? 'is-host' : ''}${p.id === me.id ? ' is-you' : ''}">${escape(p.name)}${p.id === me.id ? ' · you' : ''}</span>
          `).join('')}
        </div>
        <p class="helper-text">${players.length < 3 ? 'Need at least 3 people to start.' : `${totalRounds()} rounds. Highest score at the end wins.`}</p>
      </div>
      ${isHost()
        ? `<button class="btn btn-primary" data-action="start" ${players.length < 3 ? 'disabled' : ''}>Start the game</button>`
        : `<p class="hint-text">Waiting for the host to start…</p>`}
    `;
    container.querySelector('[data-action="start"]')?.addEventListener('click', startRound);
  }

  function renderWrite() {
    const waiting = othersWriting();
    container.innerHTML = `
      ${ui.header('Allegedly')}
      ${banner()}
      <div class="phase-banner">Round ${room.round} of ${totalRounds()} · write in secret</div>
      <div class="panel challenge-panel">
        <p class="challenge-prompt">${escape(round?.prompt || '…')}</p>
      </div>
      ${myAnswer()
        ? `<div class="panel"><p>You’re in. Waiting on ${waiting.length ? waiting.map(p => escape(p.name)).join(', ') : 'the room'}.</p></div>`
        : `
          <div class="panel">
            <div class="form-group" style="margin-bottom:0">
              <textarea data-draft rows="3" maxlength="140" placeholder="Funniest or most true">${escape(draft)}</textarea>
            </div>
          </div>
          <button class="btn btn-primary" data-action="send">Lock it in</button>
        `}
    `;
    const ta = container.querySelector('[data-draft]');
    ta?.addEventListener('input', e => { draft = e.target.value; });
    ta?.focus();
    container.querySelector('[data-action="send"]')?.addEventListener('click', submitAnswer);
  }

  function renderVote() {
    const mine = myAnswer();
    const shuffled = [...answers].sort((a, b) => a.id.localeCompare(b.id));
    container.innerHTML = `
      ${ui.header('Allegedly')}
      ${banner()}
      <div class="phase-banner">Round ${room.round} of ${totalRounds()} · vote the best</div>
      <div class="panel">
        <p>${escape(round?.prompt || '')}</p>
        <p class="helper-text">Funniest or most true. You can’t vote for yourself. Votes stay anonymous.</p>
      </div>
      ${myVote()
        ? `<div class="panel"><p>Vote in. Waiting on ${othersVoting().map(p => escape(p.name)).join(', ') || 'results'}.</p></div>`
        : `<div class="take-list">
            ${shuffled.map(a => `
              <button type="button" class="take-card ${mine && mine.id === a.id ? 'is-mine' : ''}" data-vote="${a.id}" ${mine && mine.id === a.id ? 'disabled' : ''}>
                <span class="take-card-text">${escape(a.text)}</span>
                ${mine && mine.id === a.id ? '<span class="take-card-tag">yours</span>' : ''}
              </button>
            `).join('')}
          </div>`}
    `;
    container.querySelectorAll('[data-vote]').forEach(el => {
      el.addEventListener('click', () => submitVote(el.dataset.vote));
    });
  }

  function renderResults() {
    const tally = voteTally();
    const winners = roundWinners(tally);
    const winnerNames = winners.map(a => players.find(p => p.id === a.player_id)?.name).filter(Boolean);
    const ranked = [...answers].sort((a, b) => (tally[b.id] || 0) - (tally[a.id] || 0));
    const finished = room.status === 'finished';
    const winnerLine = !winnerNames.length
      ? 'No votes in'
      : winnerNames.length === 1
        ? `${winnerNames[0]} takes the round`
        : `${winnerNames.join(' & ')} share the round`;
    container.innerHTML = `
      ${ui.header('Allegedly')}
      ${banner()}
      <div class="result-box">
        <p class="result-title">${finished ? 'That’s the game' : winnerLine}</p>
        <p class="result-sub">${finished ? winnerLine : `Round ${room.round} of ${totalRounds()}`} · ${escape(round?.prompt || '')}</p>
      </div>
      <div class="panel">
        <h2>The lines</h2>
        <div class="take-list">
          ${ranked.map(a => {
            const author = players.find(p => p.id === a.player_id);
            const n = tally[a.id] || 0;
            return `<div class="take-card is-result ${winners.some(w => w.id === a.id) ? 'is-winner' : ''}">
              <span class="take-card-text">${escape(a.text)}</span>
              <span class="take-card-meta">${escape(author?.name || '?')} · ${n} vote${n === 1 ? '' : 's'}</span>
            </div>`;
          }).join('')}
        </div>
      </div>
      ${scoreboard()}
      ${isHost()
        ? `<button class="btn btn-primary" data-action="${finished ? 'again' : 'next'}">${finished ? 'Play again' : 'Next round'}</button>`
        : `<p class="hint-text">Waiting for the host…</p>`}
    `;
    container.querySelector('[data-action="next"]')?.addEventListener('click', nextRound);
    container.querySelector('[data-action="again"]')?.addEventListener('click', playAgain);
  }

  setResume?.(() => { if (room) refresh(); else render(); });
  setCleanup?.(() => { if (channel) supabase.removeChannel(channel); });

  restoreSession().then(ok => { if (!ok) render(); });
}
