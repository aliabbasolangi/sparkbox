-- Blend In: rooms.game, odd-one-out picks, accusation votes.

alter table rooms add column if not exists game text not null default 'hottakes';

alter table rounds add column if not exists impostor_id uuid;
alter table rounds add column if not exists impostor_prompt text;
alter table rounds add column if not exists pick_deadline timestamptz;
alter table rounds add column if not exists discuss_deadline timestamptz;

create table if not exists blend_picks (
  id uuid primary key default gen_random_uuid(),
  round_id uuid not null references rounds(id) on delete cascade,
  player_id uuid not null references players(id) on delete cascade,
  target_id uuid not null references players(id) on delete cascade,
  unique (round_id, player_id)
);

create table if not exists blend_votes (
  id uuid primary key default gen_random_uuid(),
  round_id uuid not null references rounds(id) on delete cascade,
  voter_id uuid not null references players(id) on delete cascade,
  suspect_id uuid not null references players(id) on delete cascade,
  unique (round_id, voter_id)
);

create index if not exists blend_picks_round_id_idx on blend_picks (round_id);
create index if not exists blend_votes_round_id_idx on blend_votes (round_id);
create index if not exists rooms_game_idx on rooms (game);

alter table blend_picks enable row level security;
alter table blend_votes enable row level security;

drop policy if exists blend_picks_all on blend_picks;
drop policy if exists blend_votes_all on blend_votes;

create policy blend_picks_all on blend_picks for all to anon, authenticated
  using (true) with check (true);

create policy blend_votes_all on blend_votes for all to anon, authenticated
  using (true) with check (true);

grant all on table blend_picks, blend_votes to anon, authenticated;

alter table blend_picks replica identity full;
alter table blend_votes replica identity full;

do $$
begin
  begin
    alter publication supabase_realtime add table blend_picks;
  exception when duplicate_object then null;
  end;
  begin
    alter publication supabase_realtime add table blend_votes;
  exception when duplicate_object then null;
  end;
end $$;
