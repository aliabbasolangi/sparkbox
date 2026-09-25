import { makeId } from './client.js';

export const HOLD_SQL = 'Need one more SQL step. In Supabase → SQL Editor, paste supabase/holding.sql, and Run.';
const GRACE_MS = 12000;

export function holdSql(detail) {
  const text = detail || '';
  if (/does not exist|schema cache|resume_status|dropped|hold_votes|column/i.test(text)) return HOLD_SQL;
  return text;
}

export function seated(players) {
  return players.filter(p => !p.dropped);
}

export function present(players) {
  return seated(players).filter(p => p.connected !== false);
}

export function away(players) {
  return seated(players).filter(p => p.connected === false);
}

export async function leaveRoom(supabase, { room, me, players }) {
  if (!room || !me?.id) return;
  if (room.status === 'finished') return;
  if (room.status === 'lobby') {
    await supabase.from('players').delete().eq('id', me.id);
    if (room.host_id === me.id) {
      const next = present(players).find(p => p.id !== me.id);
      if (next) await supabase.from('rooms').update({ host_id: next.id }).eq('id', room.id);
    }
    return;
  }
  const { error } = await supabase.from('players').update({ connected: false }).eq('id', me.id);
  if (error) throw new Error(error.message);
  if (room.status !== 'holding') {
    const { error: roomErr } = await supabase
      .from('rooms')
      .update({ status: 'holding', resume_status: room.status })
      .eq('id', room.id)
      .neq('status', 'holding');
    if (roomErr) throw new Error(roomErr.message);
  }
}

export async function markAbsent(supabase, { room, playerId }) {
  if (!room || !playerId || room.status === 'lobby' || room.status === 'finished') return;
  const { error } = await supabase.from('players').update({ connected: false }).eq('id', playerId);
  if (error) return;
  if (room.status === 'holding') return;
  await supabase
    .from('rooms')
    .update({ status: 'holding', resume_status: room.status })
    .eq('id', room.id)
    .neq('status', 'holding');
}

export async function reclaimPlayer(supabase, { room, name, avatar }) {
  const { data: rows, error } = await supabase.from('players').select('*').eq('room_id', room.id);
  if (error) throw new Error(error.message);
  const match = (rows || []).find(p =>
    !p.dropped &&
    p.connected === false &&
    p.name.trim().toLowerCase() === name.trim().toLowerCase()
  );
  if (!match) return null;
  const token = makeId();
  const { error: upErr } = await supabase
    .from('players')
    .update({ connected: true, token, avatar })
    .eq('id', match.id);
  if (upErr) throw new Error(upErr.message);
  return { ...match, token, avatar, connected: true };
}

export async function castHoldVote(supabase, { roomId, voterId, choice }) {
  const { error } = await supabase.from('hold_votes').upsert(
    { id: makeId(), room_id: roomId, voter_id: voterId, choice },
    { onConflict: 'room_id,voter_id' }
  );
  if (error) throw new Error(error.message);
}

function majority(votes, here) {
  const tally = { wait: 0, continue: 0, end: 0 };
  for (const vote of votes) {
    if (!here.some(p => p.id === vote.voter_id)) continue;
    if (tally[vote.choice] != null) tally[vote.choice] += 1;
  }
  const need = Math.max(1, Math.floor(here.length / 2) + 1);
  return { tally, need };
}

async function restoreRoom(supabase, room, here) {
  const patch = { status: room.resume_status, resume_status: null };
  if (here[0] && !here.some(p => p.id === room.host_id)) patch.host_id = here[0].id;
  await supabase.from('hold_votes').delete().eq('room_id', room.id);
  const { data } = await supabase
    .from('rooms')
    .update(patch)
    .eq('id', room.id)
    .eq('status', 'holding')
    .select('*')
    .maybeSingle();
  return data;
}

export async function settleHold(supabase, { room, players, votes }) {
  if (!room || room.status !== 'holding' || !room.resume_status) return null;
  const here = present(players);
  const gone = away(players);
  if (seated(players).length && gone.length === 0) {
    return restoreRoom(supabase, room, here);
  }
  const { tally, need } = majority(votes, here);
  if (here.length >= 3 && tally.continue >= need && gone.length) {
    await supabase.from('players').update({ dropped: true }).in('id', gone.map(p => p.id));
    return restoreRoom(supabase, room, here);
  }
  if (tally.end >= need) {
    await supabase.from('hold_votes').delete().eq('room_id', room.id);
    const patch = { status: 'finished', resume_status: null };
    if (here[0] && !here.some(p => p.id === room.host_id)) patch.host_id = here[0].id;
    const { data } = await supabase
      .from('rooms')
      .update(patch)
      .eq('id', room.id)
      .eq('status', 'holding')
      .select('*')
      .maybeSingle();
    return data;
  }
  return null;
}

export function holdMarkup({ players, votes, meId, escape, pfpImg }) {
  const sitting = seated(players);
  const here = present(players);
  const gone = away(players);
  const canContinue = here.length >= 3;
  const { tally, need } = majority(votes, here);
  const mine = votes.find(v => v.voter_id === meId);
  const names = gone.map(p => escape(p.name)).join(', ') || 'Someone';
  return `
    <div class="phase-banner discuss">${names} left</div>
    <div class="panel">
      <h2>${here.length} of ${sitting.length} still here</h2>
      <p>Vote on what the room does. A choice lands when ${need} of the people still here agree.</p>
      <div class="player-pills" style="margin-top:0.75rem">
        ${sitting.map(p => `
          <span class="player-pill ${p.connected === false ? 'is-away' : ''}${p.id === meId ? ' is-you' : ''}">
            ${pfpImg(p.avatar, 'pfp--sm')}
            ${escape(p.name)}${p.connected === false ? ' · away' : ''}
          </span>
        `).join('')}
      </div>
    </div>
    <div class="hold-actions">
      <button class="btn btn-primary" data-hold="wait">Wait for them</button>
      ${canContinue
        ? `<button class="btn btn-secondary" data-hold="continue">Continue without them</button>`
        : `<p class="helper-text">Continue shows up only when at least 3 people are still here.</p>`}
      <button class="btn btn-danger" data-hold="end">End the game</button>
    </div>
    <p class="hint-text">Wait ${tally.wait} · Continue ${tally.continue} · End ${tally.end}${mine ? ` · you picked ${mine.choice}` : ''}</p>
  `;
}

export function watchPresence(channel, { meId, getRoom, getPlayers, onAbsent }) {
  const missingSince = new Map();
  let readyAt = 0;
  channel.on('presence', { event: 'sync' }, () => {
    if (!readyAt) readyAt = Date.now();
  });
  const timer = setInterval(() => {
    const room = getRoom();
    if (!readyAt || Date.now() - readyAt < GRACE_MS || !room) return;
    if (room.status === 'lobby' || room.status === 'finished') return;
    const online = new Set();
    const state = channel.presenceState() || {};
    for (const metas of Object.values(state)) {
      for (const meta of metas) if (meta.player_id) online.add(meta.player_id);
    }
    const now = Date.now();
    for (const player of seated(getPlayers())) {
      if (player.id === meId || player.connected === false) {
        missingSince.delete(player.id);
        continue;
      }
      if (online.has(player.id)) {
        missingSince.delete(player.id);
        continue;
      }
      if (!missingSince.has(player.id)) missingSince.set(player.id, now);
      else if (now - missingSince.get(player.id) >= GRACE_MS) {
        missingSince.delete(player.id);
        onAbsent(player.id);
      }
    }
  }, 2000);
  return () => clearInterval(timer);
}
