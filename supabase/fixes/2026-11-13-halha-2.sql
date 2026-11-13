-- Fix ሀልሀ (2026-11-13, second part). Run in the Supabase SQL editor. Safe to run twice.
--
-- Entry 4146 "ሀልሀ/ሃልሀ" duplicated ሃልሀ (151) and carried a misreading: "ባረከ" (the
-- book's class mark ባ·ረ for the ባረከ head) had been taken as a meaning, giving
-- am "ባረከ ፣ ወደረ (የከብት፡-አሰረ)", en "bless", ti "ባረኸ". It becomes the clean entry for
-- the other spelling the books print, ሀልሀ (the ቀተለ reading), with the same meanings
-- as ሃልሀ. "bless" and "ባረኸ" are shared with two real ባረከ verbs, so they are only
-- unlinked from 4146, never deleted.

begin;

-- 1. The spelling: ሀልሀ (ሃልሀ is 151).
update public.words set word = 'ሀልሀ'
where word_id = 4146 and language_code = 'gz' and word = 'ሀልሀ/ሃልሀ';

-- 2. Amharic and English, as for ሃልሀ (each linked to 4146 alone).
update public.words set word = 'ወደረ (የከብት)'
where word_id = 4296 and language_code = 'am' and word = 'ባረከ ፣ ወደረ (የከብት፡-አሰረ)';
update public.words set word = 'to tie up a cow for milking'
where word_id = 8660 and language_code = 'en' and word = 'tie (cattle)';

-- 3. Unlink "bless" (10753) and "ባረኸ" (11342) from 4146, both directions.
delete from public.translationmappings
where (word_id = 4146 and related_word_id in (10753, 11342))
   or (related_word_id = 4146 and word_id in (10753, 11342));

-- Check: ሀልሀ with am ወደረ (የከብት), en to tie up a cow for milking, ti ኣሰረ (ከብቲ).
select g.word_id, g.word, t.language_code, t.word as meaning
from public.words g
join public.translationmappings m on m.word_id = g.word_id
join public.words t on t.word_id = m.related_word_id
where g.word_id = 4146
order by t.language_code;

commit;
