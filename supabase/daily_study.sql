-- Bete Qinie: daily study plan (ዛሬ)
--
-- Run this in the Supabase SQL editor. Safe to run more than once, and safe to
-- run before or after deploying: until the column exists the app keeps each
-- word's study record on the device and copies it in at the next sign-in.
--
-- word_progress.study holds the daily-plan state for a word, written by the
-- app (src/lib/verbQuiz.js):
--   intro    the day (ms, local midnight) the word joined a daily set
--   right    right answers while learning   kinds  the kinds of question answered
--   learned  the day it was learned          skipped  the day it was skipped as known
--   moved / dropped  the last day it moved up / down a box (once a day each)
-- Rows without it predate daily sets.

alter table public.word_progress add column if not exists study jsonb;
