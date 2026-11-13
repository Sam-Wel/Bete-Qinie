-- Fix ሃልሀ (2026-11-13). Run in the Supabase SQL editor. Safe to run twice.
--
-- Both verb books print this verb as ሃልሀ (ባ·ረ) and ሀልሀ (ቀ·ተ), glossed ወደረ (የከብት):
-- to tie up a cow when it is ready to be milked. The dictionary had it as
--   151  ሐልሀ  (spelled with ሐ)  ti ሓለኸ ናይ ላም · am አገሣ (የላም) · en low (of a cow)
--   4141 ሃልሀ  (no meanings at all)
-- The Amharic and English on 151 were wrong (added on 2026-11-03), and each of them
-- is linked to 151 alone, so they are corrected in place. 151 keeps its id (and any
-- study progress on it) and takes the books' spelling; the empty duplicate 4141 goes.

begin;

-- 1. The empty duplicate first (a spelling can be used by only one Ge'ez word),
--    and only if it still has no translations.
delete from public.words w
where w.word_id = 4141 and w.language_code = 'gz' and w.word = 'ሃልሀ'
  and not exists (select 1 from public.translationmappings m where m.word_id = 4141 or m.related_word_id = 4141);

-- 2. The books' spelling.
update public.words set word = 'ሃልሀ'
where word_id = 151 and language_code = 'gz' and word = 'ሐልሀ';

-- 3. Amharic, as both books print it.
update public.words set word = 'ወደረ (የከብት)'
where word_id = 11574 and language_code = 'am' and word = 'አገሣ (የላም)';

-- 4. English.
update public.words set word = 'to tie up a cow for milking'
where word_id = 8801 and language_code = 'en' and word = 'low (of a cow)';

-- Check: one ሃልሀ, with ti ሓለኸ ናይ ላም, am ወደረ (የከብት), en to tie up a cow for milking.
select g.word_id, g.word, t.language_code, t.word as meaning
from public.words g
join public.translationmappings m on m.word_id = g.word_id
join public.words t on t.word_id = m.related_word_id
where g.language_code = 'gz' and g.word in ('ሃልሀ', 'ሐልሀ')
order by t.language_code;

commit;
