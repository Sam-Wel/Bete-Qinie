-- Bete Qinie: ግሲ ፈተና (verb quiz)
--
-- Run this in the Supabase SQL editor, after user_accounts_and_game_progress.sql.
-- Adds:
--   1. public.verb_quiz_bank        - every Ge'ez verb with its ti/am/en meanings, in one row
--   2. public.verb_quiz_word_stats  - how each user is doing on each verb
--
-- Quiz runs themselves are kept in public.game_sessions under game_type 'verb_quiz',
-- so no table is needed for them. Until this file is run the app still works: it
-- assembles the bank from words/translationmappings itself and keeps progress on the
-- device only.

-- ---------------------------------------------------------------------
-- verb_quiz_bank
-- A verb is a Ge'ez word ending in a first-order (ግዕዝ) letter. security_invoker
-- makes the view read words/translationmappings with the caller's own rights,
-- so it is exactly as public as those tables already are.
-- ---------------------------------------------------------------------
create or replace view public.verb_quiz_bank
with (security_invoker = true) as
select
  g.word_id,
  btrim(g.word) as word,
  coalesce(array_agg(distinct btrim(t.word)) filter (where t.language_code = 'ti'), '{}') as ti,
  coalesce(array_agg(distinct btrim(t.word)) filter (where t.language_code = 'am'), '{}') as am,
  coalesce(array_agg(distinct btrim(t.word)) filter (where t.language_code = 'en'), '{}') as en
from public.words g
left join public.translationmappings m on m.word_id = g.word_id
left join public.words t on t.word_id = m.related_word_id
where g.language_code = 'gz'
  and right(btrim(g.word), 1) = any (array[
    'ሀ','ለ','ሐ','መ','ሠ','ረ','ሰ','ቀ','ቈ','በ','ተ','ኀ','ነ','አ','ከ','ኰ',
    'ወ','ዐ','ዘ','የ','ደ','ገ','ጠ','ጰ','ጸ','ፀ','ፈ','ፐ'
  ])
group by g.word_id, g.word;

grant select on public.verb_quiz_bank to anon, authenticated;

-- ---------------------------------------------------------------------
-- verb_quiz_word_stats
-- One row per (user, verb). box is a 0-5 Leitner box: a right answer moves
-- the word up one, a wrong one drops it to 1; box >= 3 counts as known.
-- The scoring itself lives client-side in src/lib/verbQuiz.js.
-- ---------------------------------------------------------------------
create table if not exists public.verb_quiz_word_stats (
  user_id uuid not null references auth.users(id) on delete cascade,
  word_id bigint not null,
  seen int not null default 0,
  correct int not null default 0,
  streak int not null default 0,
  box int not null default 0,
  last_correct boolean,
  last_seen_at timestamptz,
  last_wrong_at timestamptz,
  primary key (user_id, word_id)
);

alter table public.verb_quiz_word_stats enable row level security;

create policy "Users manage their own verb quiz stats"
  on public.verb_quiz_word_stats for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
