-- Bete Qinie: general user accounts + game progress
--
-- Run this in the Supabase SQL editor. Adds:
--   1. public.profiles       - one row per auth user, tracks role + display name
--   2. public.game_sessions  - flexible per-game progress/score storage
--
-- Prerequisite: confirm "Enable email signups" is on under
-- Project Settings -> Authentication -> Providers -> Email.

-- ---------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  role text not null default 'user' check (role in ('user', 'admin')),
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "Profiles are viewable by owner"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Profiles are updatable by owner"
  on public.profiles for update
  using (auth.uid() = id);

-- Auto-create a profile row whenever someone signs up. display_name
-- comes from supabase.auth.signUp({ options: { data: { display_name } } }).
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, new.raw_user_meta_data->>'display_name');
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- The trigger above only fires for NEW signups -- it will NOT create a
-- profile row for an admin account that already existed before this
-- migration ran. Run this once to create (or promote) that row directly:
--
-- insert into public.profiles (id, role)
-- values (
--   (select id from auth.users where email = 'YOUR_ADMIN_EMAIL_HERE'),
--   'admin'
-- )
-- on conflict (id) do update set role = 'admin';

-- ---------------------------------------------------------------------
-- game_sessions
-- One table for every game, current and future. `state` (jsonb) holds
-- whatever a given game_type needs to resume; `status` distinguishes an
-- in-progress session (drives "Continue") from a completed one (drives
-- score history). A new game just picks a new game_type string --
-- no schema change required.
-- ---------------------------------------------------------------------
create table if not exists public.game_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  game_type text not null,
  status text not null default 'in_progress' check (status in ('in_progress', 'completed')),
  score int not null default 0,
  total_questions int,
  state jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.game_sessions enable row level security;

create policy "Users manage their own game sessions"
  on public.game_sessions for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index if not exists game_sessions_user_game_idx
  on public.game_sessions (user_id, game_type, status);
