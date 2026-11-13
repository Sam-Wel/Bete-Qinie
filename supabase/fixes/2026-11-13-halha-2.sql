-- Fix ሀልሀ (2026-11-13, second part). Run in the Supabase SQL editor. Safe to run twice.
--
-- Entry 4146 "ሀልሀ/ሃልሀ" duplicated ሃልሀ (151) and carried a misreading: "ባረከ" (the
-- book's class mark ባ·ረ for the ባረከ head) had been taken as a meaning, giving
-- am "ባረከ ፣ ወደረ (የከብት፡-አሰረ)", en "bless", ti "ባረኸ". It becomes the clean entry for
-- the other spelling the books print, ሀልሀ (the ቀተለ reading), linked to the same
-- Amharic and English words as ሃልሀ (each meaning exists once per language).
-- "bless" and "ባረኸ" are shared with two real ባረከ verbs, so they are only unlinked.

begin;

-- 1. The spelling: ሀልሀ (ሃልሀ is 151).
update public.words set word = 'ሀልሀ'
where word_id = 4146 and language_code = 'gz' and word = 'ሀልሀ/ሃልሀ';

-- 2. Link ሀልሀ to ሃልሀ's Amharic (11574 ወደረ (የከብት)) and English (8801), both directions.
insert into public.translationmappings (word_id, related_word_id)
select a, b from (values (4146, 11574), (11574, 4146), (4146, 8801), (8801, 4146)) as v(a, b)
where not exists (select 1 from public.translationmappings m where m.word_id = v.a and m.related_word_id = v.b);

-- 3. Unlink the old Amharic (4296), English (8660), "bless" (10753) and "ባረኸ" (11342).
delete from public.translationmappings
where (word_id = 4146 and related_word_id in (4296, 8660, 10753, 11342))
   or (related_word_id = 4146 and word_id in (4296, 8660, 10753, 11342));

-- 4. The old Amharic and English were used by 4146 alone: remove them once unlinked.
delete from public.words w
where w.word_id in (4296, 8660)
  and not exists (select 1 from public.translationmappings m where m.word_id = w.word_id or m.related_word_id = w.word_id);

-- Check: ሀልሀ with am ወደረ (የከብት), en to tie up a cow for milking, ti ኣሰረ (ከብቲ).
select g.word_id, g.word, t.language_code, t.word as meaning
from public.words g
join public.translationmappings m on m.word_id = g.word_id
join public.words t on t.word_id = m.related_word_id
where g.word_id = 4146
order by t.language_code;

commit;
