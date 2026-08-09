-- Bete Qinie: personal study lists with spaced repetition (SM-2)
--
-- Run this in the Supabase SQL editor, after user_accounts_and_game_progress.sql.
-- Adds public.study_items: one row per (user, saved word), scheduled with
-- the classic SM-2 algorithm (same one Anki/SuperMemo use), simplified to a
-- binary "Got it" / "Didn't know it" response rather than a 0-5 quality
-- scale. Scheduling math itself lives client-side in useStudyList.js,
-- matching how game_sessions scoring is also computed client-side.

create table if not exists public.study_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  word text not null,
  language_code text not null default 'gz',
  repetitions int not null default 0,
  interval_days int not null default 0,
  ease_factor numeric not null default 2.5,
  next_review_date date not null default current_date,
  last_reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  unique (user_id, word, language_code)
);

alter table public.study_items enable row level security;

create policy "Users manage their own study items"
  on public.study_items for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index if not exists study_items_user_due_idx
  on public.study_items (user_id, next_review_date);
