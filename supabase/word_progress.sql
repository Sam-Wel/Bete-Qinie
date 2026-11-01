-- Bete Qinie: one progress record per word (ክለሳ + ግሲ ፈተና + games)
--
-- Run this in the Supabase SQL editor BEFORE deploying the app version that
-- reads public.word_progress. It is safe to run more than once.
--
-- Until now ክለሳ kept saved words in public.study_items (SM-2, by word text)
-- and ግሲ ፈተና / ቀስት kept answers in public.verb_quiz_word_stats (by word_id).
-- This creates public.word_progress, one row per (user, word), copies both in,
-- and leaves the two old tables untouched as a backup (to drop in a later
-- release). Scheduling itself lives in the app (src/lib/verbQuiz.js): a right
-- answer moves a word up a box, due again in 1, 3, 7, 21 or 60 days; a wrong
-- one drops it to box 1, due tomorrow.

create table if not exists public.word_progress (
  user_id uuid not null references auth.users(id) on delete cascade,
  word_id bigint not null,
  seen int not null default 0,
  correct int not null default 0,
  streak int not null default 0,
  box int not null default 0,
  last_correct boolean,
  last_seen_at timestamptz,
  last_wrong_at timestamptz,
  due_at timestamptz,
  saved boolean not null default false, -- added to ክለሳ by hand
  primary key (user_id, word_id)
);

alter table public.word_progress enable row level security;

drop policy if exists "Users manage their own word progress" on public.word_progress;
create policy "Users manage their own word progress"
  on public.word_progress for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index if not exists word_progress_due_idx on public.word_progress (user_id, due_at);

-- ---------------------------------------------------------------------
-- 1. ግሲ ፈተና / ቀስት answers, as they are, now with a due date from their box.
-- ---------------------------------------------------------------------
insert into public.word_progress
  (user_id, word_id, seen, correct, streak, box, last_correct, last_seen_at, last_wrong_at, due_at)
select
  user_id, word_id, seen, correct, streak, box, last_correct, last_seen_at, last_wrong_at,
  date_trunc('day', coalesce(last_seen_at, now()))
    + make_interval(days => case
        when last_correct is false then 1
        else (array[1, 1, 3, 7, 21, 60])[least(box, 5) + 1]
      end)
from public.verb_quiz_word_stats
on conflict (user_id, word_id) do nothing;

-- ---------------------------------------------------------------------
-- 2. ክለሳ's saved words, matched to their word_id by text and language. The
-- SM-2 interval becomes the nearest box; the next review date carries over.
-- Where the quiz already has the word, the further box and earlier date win.
-- ---------------------------------------------------------------------
insert into public.word_progress
  (user_id, word_id, seen, correct, streak, box, last_correct, last_seen_at, due_at, saved)
select
  s.user_id,
  w.word_id,
  case when s.last_reviewed_at is null then 0 else greatest(s.repetitions, 1) end,
  s.repetitions,
  s.repetitions,
  case
    when s.last_reviewed_at is null then 0
    when s.interval_days <= 1 then 1
    when s.interval_days <= 3 then 2
    when s.interval_days <= 7 then 3
    when s.interval_days <= 21 then 4
    else 5
  end,
  case when s.last_reviewed_at is null then null else s.repetitions > 0 end,
  s.last_reviewed_at,
  s.next_review_date::timestamptz,
  true
from public.study_items s
join lateral (
  select min(words.word_id) as word_id
  from public.words
  where btrim(words.word) = btrim(s.word) and words.language_code = s.language_code
) w on w.word_id is not null
on conflict (user_id, word_id) do update set
  saved = true,
  seen = greatest(public.word_progress.seen, excluded.seen),
  correct = greatest(public.word_progress.correct, excluded.correct),
  box = greatest(public.word_progress.box, excluded.box),
  due_at = least(coalesce(public.word_progress.due_at, excluded.due_at), excluded.due_at);
