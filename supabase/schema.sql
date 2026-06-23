-- SMAD Simulator — Supabase schema (SPEC §10 verbatim).
-- Apply against the project's Postgres via the Supabase SQL editor or
-- `supabase db push` once linked.

-- Profiles (linked to the user id issued by Privy).
create table if not exists profiles (
  id uuid primary key default gen_random_uuid(),
  privy_user_id text unique not null,
  email text,
  full_name text,
  created_at timestamptz default now()
);

-- Missions designed by the user.
create table if not exists missions (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references profiles(id) on delete cascade,
  name text not null,
  module text not null check (module in ('orbit','timeline','payload_link','users_demand','reliability')),
  parameters jsonb not null,      -- inputs the user fixed
  results jsonb not null,         -- outputs computed, persisted as snapshot
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Row Level Security: each user only sees / edits their own missions.
alter table profiles enable row level security;
alter table missions enable row level security;

drop policy if exists "profiles_self" on profiles;
create policy "profiles_self" on profiles
  for all using (privy_user_id = auth.jwt() ->> 'sub');

drop policy if exists "missions_self" on missions;
create policy "missions_self" on missions
  for all using (
    profile_id in (select id from profiles where privy_user_id = auth.jwt() ->> 'sub')
  );

-- Auto-update timestamp on missions.updated_at.
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists missions_set_updated_at on missions;
create trigger missions_set_updated_at
  before update on missions
  for each row execute function set_updated_at();
