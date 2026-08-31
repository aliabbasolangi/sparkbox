-- Paste this entire file into Supabase → SQL Editor → Run.
-- One time. Then Allegedly can create rooms.

create table if not exists rooms (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  host_id uuid not null,
  status text not null default 'lobby',
  round int not null default 0,
  points_to_win int not null default 5, -- number of rounds to play
  game text not null default 'hottakes',
  created_at timestamptz not null default now()
);

create table if not exists players (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references rooms(id) on delete cascade,
  name text not null,
  avatar text,
  token text not null,
  score int not null default 0,
  connected boolean not null default true,
  joined_at timestamptz not null default now()
);

create table if not exists rounds (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references rooms(id) on delete cascade,
  number int not null,
  prompt text not null,
  impostor_id uuid,
  impostor_prompt text,
  pick_deadline timestamptz,
  discuss_deadline timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists answers (
  id uuid primary key default gen_random_uuid(),
  round_id uuid not null references rounds(id) on delete cascade,
  player_id uuid not null references players(id) on delete cascade,
  text text not null,
  unique (round_id, player_id)
);

create table if not exists votes (
  id uuid primary key default gen_random_uuid(),
  round_id uuid not null references rounds(id) on delete cascade,
  voter_id uuid not null references players(id) on delete cascade,
  answer_id uuid not null references answers(id) on delete cascade,
  unique (round_id, voter_id)
);

create index if not exists players_room_id_idx on players (room_id);
create index if not exists rounds_room_id_idx on rounds (room_id);
create unique index if not exists rounds_room_number_idx on rounds (room_id, number);
create index if not exists answers_round_id_idx on answers (round_id);
create index if not exists votes_round_id_idx on votes (round_id);

alter table rooms enable row level security;
alter table players enable row level security;
alter table rounds enable row level security;
alter table answers enable row level security;
alter table votes enable row level security;

drop policy if exists rooms_all on rooms;
drop policy if exists players_all on players;
drop policy if exists rounds_all on rounds;
drop policy if exists answers_all on answers;
drop policy if exists votes_all on votes;

create policy rooms_all on rooms for all to anon, authenticated
  using (created_at > now() - interval '12 hours')
  with check (true);

create policy players_all on players for all to anon, authenticated
  using (true) with check (true);

create policy rounds_all on rounds for all to anon, authenticated
  using (true) with check (true);

create policy answers_all on answers for all to anon, authenticated
  using (true) with check (true);

create policy votes_all on votes for all to anon, authenticated
  using (true) with check (true);

grant usage on schema public to anon, authenticated;
grant all on table rooms, players, rounds, answers, votes to anon, authenticated;

alter table rooms replica identity full;
alter table players replica identity full;
alter table rounds replica identity full;
alter table answers replica identity full;
alter table votes replica identity full;

do $$
begin
  begin
    alter publication supabase_realtime add table rooms;
  exception when duplicate_object then null;
  end;
  begin
    alter publication supabase_realtime add table players;
  exception when duplicate_object then null;
  end;
  begin
    alter publication supabase_realtime add table rounds;
  exception when duplicate_object then null;
  end;
  begin
    alter publication supabase_realtime add table answers;
  exception when duplicate_object then null;
  end;
  begin
    alter publication supabase_realtime add table votes;
  exception when duplicate_object then null;
  end;
end $$;
