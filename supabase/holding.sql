-- Mid-game dropouts for Allegedly and Blend In.
-- Run once in the Supabase SQL editor after schema.sql.

alter table players add column if not exists dropped boolean not null default false;
alter table rooms add column if not exists resume_status text;

create table if not exists hold_votes (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references rooms(id) on delete cascade,
  voter_id uuid not null references players(id) on delete cascade,
  choice text not null,
  unique (room_id, voter_id)
);

create index if not exists hold_votes_room_id_idx on hold_votes (room_id);

alter table hold_votes enable row level security;

drop policy if exists hold_votes_all on hold_votes;
create policy hold_votes_all on hold_votes for all to anon, authenticated
  using (true) with check (true);

grant all on table hold_votes to anon, authenticated;

alter table hold_votes replica identity full;

do $$
begin
  begin
    alter publication supabase_realtime add table hold_votes;
  exception when duplicate_object then null;
  end;
end $$;
