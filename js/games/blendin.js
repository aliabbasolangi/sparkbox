import { supabase, makeCode, makeId } from '../online/client.js';
import { seated, present, leaveRoom, markAbsent, reclaimPlayer, castHoldVote, settleHold, holdMarkup, watchPresence, holdSql } from '../online/hold.js';
import { pickTwoPrompts, ROUNDS_TO_PLAY, PICK_SECONDS, DISCUSS_SECONDS } from '../data/blendin-prompts.js';
import { PFPS, pfpImg, pfpPicker } from '../data/pfps.js';

export const BLENDIN_SESSION = 'sparkbox.blendin';

function escape(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/"/g, '&quot;');
}

function secondsLeft(deadline) {
  if (!deadline) return 0;
  return Math.max(0, Math.ceil((new Date(deadline).getTime() - Date.now()) / 1000));
}

export function createBlendIn(container, { ui, roster, setResume, setCleanup, setLeave }) {
  let me = { id: null, token: null, name: '', avatar: PFPS[0].id };
  let room = null;
  let players = [];
  let round = null;
  let picks = [];
  let votes = [];
  let holdVotes = [];
  let usedCrew = new Set();
  let stopPresence = null;
  let error = '';
  let joining = false;
  let busy = false;
  let channel = null;
  let refreshing = false;
  let refreshQueued = false;
  let tick = null;
  let setup = {
    name: roster.names?.find(n => n.trim()) || '',
    code: '',
    rounds: 5,
    avatar: PFPS[0].id,
  };

  function isHost() {
    return room && me.id && room.host_id === me.id;
  }

  function totalRounds() {
    return room?.points_to_win || 5;
  }

  function iAmImpostor() {
    return round && me.id && round.impostor_id === me.id;
  }

  function myPrompt() {
    if (!round) return '';
    return iAmImpostor() ? round.impostor_prompt : round.prompt;
  }

  function myPick() {
    return picks.find(p => p.player_id === me.id);
  }

  function myVote() {
    return votes.find(v => v.voter_id === me.id);
  }

  function playerById(id) {
    return players.find(p => p.id === id);
  }

  function inPlay() {
    return seated(players);
  }

  function saveSession() {
    if (!room || !me.id) return;
    sessionStorage.setItem(BLENDIN_SESSION, JSON.stringify({
      roomId: room.id,
      playerId: me.id,
      token: me.token,
      name: me.name,
      avatar: me.avatar,
    }));
  }

  function stopTick() {
    if (tick) { clearInterval(tick); tick = null; }
  }

  function startTick() {
    stopTick();
    tick = setInterval(() => {
      const el = container.querySelector('[data-count]');
      if (el && round) {
        const deadline = room.status === 'picking' ? round.pick_deadline : round.discuss_deadline;
        el.textContent = secondsLeft(deadline);
      }
      maybeAdvance();
    }, 400);
  }

  async function restoreSession() {
    let saved;
    try {
      saved = JSON.parse(sessionStorage.getItem(BLENDIN_SESSION) || 'null');
    } catch {
      saved = null;
    }
    if (!saved?.roomId || !saved.playerId) return false;
    const { data: found } = await supabase.from('rooms').select('*').eq('id', saved.roomId).eq('game', 'blendin').maybeSingle();
    if (!found) {
      sessionStorage.removeItem(BLENDIN_SESSION);
      return false;
    }
    const { data: player } = await supabase
      .from('players')
      .select('*')
      .eq('id', saved.playerId)
      .eq('token', saved.token)
      .maybeSingle();
    if (!player) {
      sessionStorage.removeItem(BLENDIN_SESSION);
      return false;
    }
    me = { id: player.id, token: saved.token, name: player.name, avatar: player.avatar || saved.avatar || PFPS[0].id };
    setup.avatar = me.avatar;
    room = found;
    await supabase.from('players').update({ connected: true }).eq('id', me.id);
    await subscribe();
    await refresh();
    return true;
  }

  async function refresh() {
    if (!room) return;
    if (refreshing) { refreshQueued = true; return; }
    refreshing = true;
    try {
      const [{ data: r }, { data: p }] = await Promise.all([
        supabase.from('rooms').select('*').eq('id', room.id).single(),
        supabase.from('players').select('*').eq('room_id', room.id).order('joined_at'),
      ]);
      if (r) room = r;
      if (p) players = p;
      if (room.status === 'holding') {
        const { data: hv, error: hvErr } = await supabase.from('hold_votes').select('*').eq('room_id', room.id);
        if (hvErr) error = holdSql(hvErr.message);
        holdVotes = hv || [];
      } else {
        holdVotes = [];
      }
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
          usedCrew.add(round.prompt);
          const [{ data: pk }, { data: v }] = await Promise.all([
            supabase.from('blend_picks').select('*').eq('round_id', round.id),
            supabase.from('blend_votes').select('*').eq('round_id', round.id),
          ]);
          picks = pk || [];
          votes = v || [];
        } else {
          picks = [];
          votes = [];
        }
      } else {
        round = null;
        picks = [];
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

  async function fillMissingVotes() {
    const sitting = inPlay();
    for (const player of sitting) {
      if (votes.some(v => v.voter_id === player.id)) continue;
      const options = sitting.filter(p => p.id !== player.id);
      if (!options.length) continue;
      const suspect = options[Math.floor(Math.random() * options.length)];
      const { error: vErr } = await supabase.from('blend_votes').insert({
        round_id: round.id,
        voter_id: player.id,
        suspect_id: suspect.id,
      });
      if (vErr && vErr.code !== '23505') return false;
      votes.push({ voter_id: player.id, suspect_id: suspect.id });
    }
    return true;
  }

  async function maybeAdvance() {
    if (!room) return;
    if (room.status === 'holding') {
      try {
        const next = await settleHold(supabase, { room, players, votes: holdVotes });
        if (next) room = next;
      } catch (err) {
        error = holdSql(err.message);
      }
      return;
    }
    if (!round || inPlay().length < 3) return;

    if (room.status === 'picking') {
      const timedOut = round.pick_deadline && Date.now() >= new Date(round.pick_deadline).getTime();
      if (picks.length >= inPlay().length || timedOut) {
        const discussUntil = new Date(Date.now() + DISCUSS_SECONDS * 1000).toISOString();
        await supabase.from('rounds').update({ discuss_deadline: discussUntil }).eq('id', round.id).is('discuss_deadline', null);
        const { data } = await supabase
          .from('rooms')
          .update({ status: 'discuss' })
          .eq('id', room.id)
          .eq('status', 'picking')
          .select('id')
          .maybeSingle();
        if (data) room = { ...room, status: 'discuss' };
      }
      return;
    }

    if (room.status === 'discuss') {
      const sitting = inPlay();
      const allVoted = sitting.every(p => votes.some(v => v.voter_id === p.id));
      const timedOut = round.discuss_deadline && Date.now() >= new Date(round.discuss_deadline).getTime();
      if (!allVoted && !timedOut) return;
      if (!allVoted && !(await fillMissingVotes())) return;
      const { data } = await supabase
        .from('rooms')
        .update({ status: 'voting' })
        .eq('id', room.id)
        .eq('status', 'discuss')
        .select('id')
        .maybeSingle();
      if (data) room = { ...room, status: 'voting' };
      return;
    }

    if (room.status === 'voting' && votes.length >= inPlay().length) {
      const tally = {};
      for (const v of votes) tally[v.suspect_id] = (tally[v.suspect_id] || 0) + 1;
      const top = Math.max(0, ...Object.values(tally));
      const accused = Object.keys(tally).filter(id => tally[id] === top);
      const caught = top > 0 && accused.length === 1 && accused[0] === round.impostor_id;
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
      if (caught) {
        for (const pl of inPlay()) {
          if (pl.id === round.impostor_id) continue;
          const nextScore = pl.score + 1;
          await supabase.from('players').update({ score: nextScore }).eq('id', pl.id);
          pl.score = nextScore;
        }
      } else {
        const imp = inPlay().find(p => p.id === round.impostor_id);
        if (imp) {
          const nextScore = imp.score + 1;
          await supabase.from('players').update({ score: nextScore }).eq('id', imp.id);
          imp.score = nextScore;
        }
      }
    }
  }

  async function subscribe() {
    if (channel) supabase.removeChannel(channel);
    channel = supabase
      .channel(`blend:${room.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'rooms', filter: `id=eq.${room.id}` }, refresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'players', filter: `room_id=eq.${room.id}` }, refresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'rounds', filter: `room_id=eq.${room.id}` }, refresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'blend_picks' }, refresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'blend_votes' }, refresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'hold_votes', filter: `room_id=eq.${room.id}` }, refresh);
    stopPresence?.();
    stopPresence = watchPresence(channel, {
      meId: me.id,
      getRoom: () => room,
      getPlayers: () => players,
      onAbsent: (playerId) => markAbsent(supabase, { room, playerId }),
    });
    channel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') await channel.track({ player_id: me.id });
    });
  }

  function sqlHint(detail) {
    const text = detail || '';
    if (/does not exist|schema cache|column|blend_/i.test(text)) {
      return 'Need one more SQL step. In Supabase → SQL Editor, new snippet, paste supabase/blendin.sql, and Run.';
    }
    return text;
  }

  async function hostRoom() {
    const name = setup.name.trim();
    if (!name) { error = 'Put your name in first.'; render(); return; }
    joining = true;
    error = '';
    render();
    me = { id: makeId(), token: makeId(), name, avatar: setup.avatar };
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
        game: 'blendin',
      }).select().single();
      created = res.data;
      roomErr = res.error;
      if (!roomErr || roomErr.code !== '23505') break;
    }
    if (roomErr || !created) {
      joining = false;
      error = sqlHint(roomErr?.message);
      render();
      return;
    }
    room = created;
    const { error: pErr } = await supabase.from('players').insert({
      id: me.id,
      room_id: room.id,
      name,
      avatar: setup.avatar,
      token: me.token,
      score: 0,
    });
    if (pErr) {
      joining = false;
      error = sqlHint(pErr.message);
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
    const { data: found, error: findErr } = await supabase
      .from('rooms')
      .select('*')
      .eq('code', code)
      .eq('game', 'blendin')
      .maybeSingle();
    if (findErr || !found) {
      joining = false;
      error = findErr ? sqlHint(findErr.message) : 'No Blend In room with that code.';
      render();
      return;
    }
    if (found.status !== 'lobby') {
      if (found.status === 'finished') {
        joining = false;
        error = 'That room already finished.';
        render();
        return;
      }
      try {
        const reclaimed = await reclaimPlayer(supabase, { room: found, name, avatar: setup.avatar });
        if (!reclaimed) {
          joining = false;
          error = 'That room already started. Rejoin with the same name only if they are waiting for you.';
          render();
          return;
        }
        me = { id: reclaimed.id, token: reclaimed.token, name: reclaimed.name, avatar: reclaimed.avatar };
        room = found;
        roster.savePlayers([name, ...(roster.names || []).filter(n => n && n !== name)]);
        joining = false;
        saveSession();
        await subscribe();
        await refresh();
        return;
      } catch (err) {
        joining = false;
        error = holdSql(err.message);
        render();
        return;
      }
    }
    me = { id: makeId(), token: makeId(), name, avatar: setup.avatar };
    const { error: pErr } = await supabase.from('players').insert({
      id: me.id,
      room_id: found.id,
      name,
      avatar: setup.avatar,
      token: me.token,
      score: 0,
    });
    if (pErr) {
      joining = false;
      error = sqlHint(pErr.message);
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

  async function setAvatar(id) {
    if (!PFPS.some(p => p.id === id)) return;
    setup.avatar = id;
    if (!me.id || !room) {
      renderSetup();
      return;
    }
    me.avatar = id;
    await supabase.from('players').update({ avatar: id }).eq('id', me.id);
    saveSession();
    await refresh();
  }

  async function startRound() {
    if (!isHost() || inPlay().length < 3 || busy) return;
    busy = true;
    error = '';
    const pair = pickTwoPrompts(usedCrew);
    const impostor = inPlay()[Math.floor(Math.random() * inPlay().length)];
    const next = room.round + 1;
    const pickUntil = new Date(Date.now() + PICK_SECONDS * 1000).toISOString();
    const { error: rErr } = await supabase.from('rounds').insert({
      room_id: room.id,
      number: next,
      prompt: pair.crew,
      impostor_prompt: pair.impostor,
      impostor_id: impostor.id,
      pick_deadline: pickUntil,
    });
    if (rErr) {
      busy = false;
      error = sqlHint(rErr.message);
      render();
      return;
    }
    usedCrew.add(pair.crew);
    usedCrew.add(pair.impostor);
    await supabase.from('rooms').update({ status: 'picking', round: next }).eq('id', room.id);
    busy = false;
  }

  async function submitPick(targetId) {
    if (!round || myPick() || targetId === me.id || busy) return;
    busy = true;
    const { error: pErr } = await supabase.from('blend_picks').insert({
      round_id: round.id,
      player_id: me.id,
      target_id: targetId,
    });
    busy = false;
    if (pErr) { error = sqlHint(pErr.message); render(); return; }
    await refresh();
  }

  async function submitVote(suspectId) {
    if (!round || myVote() || suspectId === me.id || busy) return;
    if (room.status !== 'discuss' && room.status !== 'voting') return;
    busy = true;
    const { error: vErr } = await supabase.from('blend_votes').insert({
      round_id: round.id,
      voter_id: me.id,
      suspect_id: suspectId,
    });
    busy = false;
    if (vErr) { error = sqlHint(vErr.message); render(); return; }
    await refresh();
  }

  async function nextRound() {
    if (!isHost() || room.status !== 'results') return;
    await startRound();
  }

  async function playAgain() {
    if (!isHost() || busy) return;
    busy = true;
    usedCrew = new Set();
    await supabase.from('players').update({ score: 0, dropped: false, connected: true }).eq('room_id', room.id);
    await supabase.from('hold_votes').delete().eq('room_id', room.id);
    await supabase.from('rooms').update({ status: 'lobby', round: 0, resume_status: null }).eq('id', room.id);
    busy = false;
  }

  function render() {
    if (!room) {
      stopTick();
      renderSetup();
      return;
    }
    if (room.status === 'picking' || room.status === 'discuss') startTick();
    else stopTick();

    switch (room.status) {
      case 'lobby': renderLobby(); break;
      case 'holding': renderHolding(); break;
      case 'picking': renderPick(); break;
      case 'discuss': renderDiscuss(); break;
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

  function renderHolding() {
    container.innerHTML = `
      ${ui.header('Blend In')}
      ${banner()}
      ${holdMarkup({ players, votes: holdVotes, meId: me.id, escape, pfpImg })}
    `;
    container.querySelectorAll('[data-hold]').forEach(btn => {
      btn.addEventListener('click', async () => {
        try {
          await castHoldVote(supabase, { roomId: room.id, voterId: me.id, choice: btn.dataset.hold });
          await refresh();
        } catch (err) {
          error = holdSql(err.message);
          render();
        }
      });
    });
  }

  function scoreboard() {
    const sorted = [...inPlay()].sort((a, b) => b.score - a.score);
    return `
      <div class="panel">
        <h2>${room.status === 'finished' ? 'Final scores' : `Scores · round ${room.round} of ${totalRounds()}`}</h2>
        <ul class="score-rows">
          ${sorted.map((p, i) => `
            <li class="score-row ${p.id === me.id ? 'is-you' : ''}">
              <span class="score-row-place">${i + 1}</span>
              ${pfpImg(p.avatar, 'pfp--sm')}
              <span class="score-row-name">${escape(p.name)}${p.id === me.id ? ' · you' : ''}</span>
              <span class="score-row-pts">${p.score}</span>
            </li>
          `).join('')}
        </ul>
      </div>
    `;
  }

  function playerButtons(action, excludeId, mineId) {
    return `
      <div class="pick-list">
        ${inPlay().filter(p => p.id !== excludeId).map(p => `
          <button type="button" class="pick-person ${mineId === p.id ? 'is-on' : ''}" data-${action}="${p.id}">
            ${pfpImg(p.avatar)}
            <span>${escape(p.name)}</span>
          </button>
        `).join('')}
      </div>
    `;
  }

  function renderSetup() {
    container.innerHTML = `
      ${ui.header('Blend In')}
      ${ui.howTo([
        'Everyone gets a prompt and picks who in the room it fits best. One person secretly receives a different prompt',
        'Once everyone has picked, the main prompt appears and you can vote straight away. The timer only auto-votes for anyone who has not picked',
        'Catch the odd prompt and everyone else scores. Miss them and they score',
      ], roster.howToOpen !== false)}
      ${banner()}
      <div class="panel">
        <h2>Your name</h2>
        <div class="form-group">
          <input type="text" data-field="name" value="${escape(setup.name)}" placeholder="Name" autocomplete="off">
        </div>
        <div class="form-group">
          <label>Your face</label>
          ${pfpPicker(setup.avatar)}
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
    container.querySelectorAll('[data-pfp]').forEach(btn => {
      btn.addEventListener('click', () => setAvatar(btn.dataset.pfp));
    });
    container.querySelector('[data-action="host"]')?.addEventListener('click', hostRoom);
    container.querySelector('[data-action="join"]')?.addEventListener('click', joinRoom);
  }

  function renderLobby() {
    container.innerHTML = `
      ${ui.header('Blend In')}
      ${banner()}
      <div class="room-code-card">
        <p class="room-code-label">Room code</p>
        <p class="room-code">${escape(room.code)}</p>
        <p class="helper-text">Others open Sparkbox → Blend In → type this code</p>
      </div>
      <div class="panel">
        <h2>In the room · ${present(players).length}</h2>
        <div class="player-pills">
          ${present(players).map(p => `
            <span class="player-pill ${p.id === room.host_id ? 'is-host' : ''}${p.id === me.id ? ' is-you' : ''}">
              ${pfpImg(p.avatar, 'pfp--sm')}
              ${escape(p.name)}${p.id === me.id ? ' · you' : ''}
            </span>
          `).join('')}
        </div>
        <div class="form-group" style="margin:1rem 0 0">
          <label>Your face</label>
          ${pfpPicker(me.avatar || setup.avatar)}
        </div>
        <p class="helper-text">${present(players).length < 3 ? 'Need at least 3 people to start.' : `${totalRounds()} rounds. Highest score at the end wins.`}</p>
      </div>
      ${isHost()
        ? `<button class="btn btn-primary" data-action="start" ${present(players).length < 3 ? 'disabled' : ''}>Start the game</button>`
        : `<p class="hint-text">Waiting for the host to start…</p>`}
    `;
    container.querySelector('[data-action="start"]')?.addEventListener('click', startRound);
    container.querySelectorAll('[data-pfp]').forEach(btn => {
      btn.addEventListener('click', () => setAvatar(btn.dataset.pfp));
    });
  }

  function renderPick() {
    const left = secondsLeft(round?.pick_deadline);
    container.innerHTML = `
      ${ui.header('Blend In')}
      ${banner()}
      <div class="phase-banner">Round ${room.round} of ${totalRounds()} · <span data-count>${left}</span>s</div>
      <div class="panel challenge-panel">
        <p class="challenge-prompt">${escape(myPrompt() || '…')}</p>
      </div>
      ${myPick()
        ? `<div class="panel"><p>Locked in: ${escape(playerById(myPick().target_id)?.name || '?')}. Waiting on the room.</p></div>`
        : `<p class="hint-text" style="margin-bottom:0.75rem">Who is this most like?</p>
           ${playerButtons('pick', me.id)}`}
    `;
    container.querySelectorAll('[data-pick]').forEach(el => {
      el.addEventListener('click', () => submitPick(el.dataset.pick));
    });
  }

  function renderDiscuss() {
    const left = secondsLeft(round?.discuss_deadline);
    container.innerHTML = `
      ${ui.header('Blend In')}
      ${banner()}
      <div class="phase-banner">Talk it out · <span data-count>${left}</span>s</div>
      <div class="panel challenge-panel">
        <h2>The main prompt</h2>
        <p class="challenge-prompt">${escape(round?.prompt || '…')}</p>
        <p class="helper-text">Someone saw something different. Vote now. If the timer ends first, a vote is cast for anyone who has not picked.</p>
      </div>
      <div class="panel">
        <h2>The picks</h2>
        <ul class="pick-log">
          ${picks.map(pk => {
            const from = playerById(pk.player_id);
            const to = playerById(pk.target_id);
            return `<li>
              ${pfpImg(from?.avatar, 'pfp--sm')}
              <span><strong>${escape(from?.name || '?')}</strong> pointed at <strong>${escape(to?.name || '?')}</strong></span>
            </li>`;
          }).join('') || '<li>Nobody locked a pick in time.</li>'}
        </ul>
      </div>
      ${myVote()
        ? `<div class="panel"><p>Vote in. Waiting on ${inPlay().filter(p => !votes.some(v => v.voter_id === p.id)).map(p => escape(p.name)).join(', ') || 'the timer'}.</p></div>`
        : playerButtons('vote', me.id)}
    `;
    container.querySelectorAll('[data-vote]').forEach(el => {
      el.addEventListener('click', () => submitVote(el.dataset.vote));
    });
  }

  function renderVote() {
    container.innerHTML = `
      ${ui.header('Blend In')}
      ${banner()}
      <div class="phase-banner">Round ${room.round} of ${totalRounds()} · vote who blended in</div>
      <div class="panel">
        <p>Who got the different prompt?</p>
      </div>
      ${myVote()
        ? `<div class="panel"><p>Vote in. Waiting on ${inPlay().filter(p => !votes.some(v => v.voter_id === p.id)).map(p => escape(p.name)).join(', ') || 'results'}.</p></div>`
        : playerButtons('vote', me.id)}
    `;
    container.querySelectorAll('[data-vote]').forEach(el => {
      el.addEventListener('click', () => submitVote(el.dataset.vote));
    });
  }

  function renderResults() {
    const tally = {};
    for (const v of votes) tally[v.suspect_id] = (tally[v.suspect_id] || 0) + 1;
    const top = Math.max(0, ...Object.values(tally), 0);
    const accusedIds = Object.keys(tally).filter(id => tally[id] === top && top > 0);
    const caught = accusedIds.length === 1 && accusedIds[0] === round?.impostor_id;
    const impostor = playerById(round?.impostor_id);
    const finished = room.status === 'finished';
    container.innerHTML = `
      ${ui.header('Blend In')}
      ${banner()}
      <div class="result-box">
        <p class="result-title">${finished ? 'That’s the game' : caught ? 'Caught them' : 'They blended in'}</p>
        <p class="result-sub">${pfpImg(impostor?.avatar, 'pfp--sm')} ${escape(impostor?.name || '?')} had the odd prompt</p>
      </div>
      <div class="panel">
        <h2>The prompts</h2>
        <p><strong>Everyone else:</strong> ${escape(round?.prompt || '')}</p>
        <p style="margin-top:0.6rem"><strong>Impostor:</strong> ${escape(round?.impostor_prompt || '')}</p>
      </div>
      <div class="panel">
        <h2>The picks</h2>
        <ul class="pick-log">
          ${picks.map(pk => {
            const from = playerById(pk.player_id);
            const to = playerById(pk.target_id);
            return `<li>
              ${pfpImg(from?.avatar, 'pfp--sm')}
              <span>${escape(from?.name || '?')} → ${escape(to?.name || '?')}</span>
            </li>`;
          }).join('')}
        </ul>
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
  setLeave?.(async () => {
    sessionStorage.removeItem(BLENDIN_SESSION);
    await leaveRoom(supabase, { room, me, players });
  });
  setCleanup?.(() => {
    stopTick();
    stopPresence?.();
    if (channel) supabase.removeChannel(channel);
  });

  restoreSession().then(ok => { if (!ok) render(); });
}
