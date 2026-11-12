-- Bete Qinie: Ge'ez lexicon releases (verb heads, ርባታ forms, head tables)
--
-- Run this once in the Supabase SQL editor. Safe to run again.
--
-- The lexicon lives in its own repo (~/Projects/geez-lexicon) and is published as
-- numbered releases (data-v0.3.0, …). scripts/import-lexicon.mjs loads a release
-- into these tables while signed in as an admin. Every release keeps its own rows,
-- and exactly one is marked current: going live, or rolling back, is one call to
-- lexicon_set_current(tag), with no re-import and no app deploy.
--
-- The app only reads the two views, lexicon_current_words and lexicon_current_forms.
-- Until this file is run, the app simply hides the features that use the lexicon.
--
-- Reference data like words/kene_measures: readable by anyone, writable only by
-- admins (profiles.role = 'admin').

-- ---------------------------------------------------------------------
-- Admin check, shared by the policies below
-- ---------------------------------------------------------------------
create or replace function public.lexicon_is_admin()
returns boolean
language sql
stable
security invoker
set search_path = public
as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;

-- ---------------------------------------------------------------------
-- Releases: one row per imported release; at most one is current
-- ---------------------------------------------------------------------
create table if not exists public.lexicon_releases (
  tag text primary key,                                   -- data-v0.3.0
  version text not null,                                  -- 0.3.0
  profile text not null check (profile in ('core')),      -- the app takes core releases only
  released_on date not null,
  source_commit text,                                     -- geez-lexicon commit the release was cut from
  words int not null,
  forms int not null,
  heads jsonb,                                            -- the 8 head tables (አርእስት and their ርባታ)
  manifest jsonb not null,                                -- the release's manifest.json, as published
  imported_at timestamptz not null default now(),
  imported_by uuid references auth.users (id) default auth.uid(),
  is_current boolean not null default false
);

create unique index if not exists lexicon_releases_one_current
  on public.lexicon_releases ((true)) where is_current;

comment on table public.lexicon_releases is
  'Ge''ez lexicon releases imported by scripts/import-lexicon.mjs. The current one is what the app shows.';

-- ---------------------------------------------------------------------
-- Words: one row per verb per release
-- ---------------------------------------------------------------------
create table if not exists public.lexicon_words (
  release_tag text not null references public.lexicon_releases (tag) on delete cascade,
  lex_id text not null,                                   -- the lexicon's own id (e.g. lahha)
  headword text not null,
  spellings text[] not null,                              -- headword + spelling variants
  heads jsonb not null,                                   -- [{form, class, book_label, src, book}]
  senses jsonb not null default '[]',                     -- [{n, gloss: {am:[…], ti:[…], en:[…]}}]
  open_questions jsonb not null default '[]',             -- [{id, kinds}] still open in the lexicon's review
  sources jsonb not null default '[]',                    -- [{book, page}]
  status text,
  primary key (release_tag, lex_id)
);

create index if not exists lexicon_words_spellings on public.lexicon_words using gin (spellings);

-- ---------------------------------------------------------------------
-- Forms: the printed forms of each word, with their ርባታ slot
-- ---------------------------------------------------------------------
create table if not exists public.lexicon_forms (
  release_tag text not null,
  lex_id text not null,
  n int not null,                                         -- order within the word, as printed
  form text not null,
  slot text,                                              -- perfect, imperfect, …, wusta_m_sg, baed_qitsl, …
  category text,
  features jsonb,
  traditional_name text,
  book_label text,
  book text,                                              -- set when the form comes from a second book
  primary key (release_tag, lex_id, n),
  foreign key (release_tag, lex_id) references public.lexicon_words (release_tag, lex_id) on delete cascade
);

create index if not exists lexicon_forms_slot on public.lexicon_forms (release_tag, slot);

-- ---------------------------------------------------------------------
-- Row level security: everyone reads, admins write
-- ---------------------------------------------------------------------
alter table public.lexicon_releases enable row level security;
alter table public.lexicon_words enable row level security;
alter table public.lexicon_forms enable row level security;

drop policy if exists "Lexicon releases are viewable by everyone" on public.lexicon_releases;
create policy "Lexicon releases are viewable by everyone"
  on public.lexicon_releases for select using (true);
drop policy if exists "Lexicon releases are managed by admins" on public.lexicon_releases;
create policy "Lexicon releases are managed by admins"
  on public.lexicon_releases for all
  using (public.lexicon_is_admin()) with check (public.lexicon_is_admin());

drop policy if exists "Lexicon words are viewable by everyone" on public.lexicon_words;
create policy "Lexicon words are viewable by everyone"
  on public.lexicon_words for select using (true);
drop policy if exists "Lexicon words are managed by admins" on public.lexicon_words;
create policy "Lexicon words are managed by admins"
  on public.lexicon_words for all
  using (public.lexicon_is_admin()) with check (public.lexicon_is_admin());

drop policy if exists "Lexicon forms are viewable by everyone" on public.lexicon_forms;
create policy "Lexicon forms are viewable by everyone"
  on public.lexicon_forms for select using (true);
drop policy if exists "Lexicon forms are managed by admins" on public.lexicon_forms;
create policy "Lexicon forms are managed by admins"
  on public.lexicon_forms for all
  using (public.lexicon_is_admin()) with check (public.lexicon_is_admin());

-- ---------------------------------------------------------------------
-- Going live / rolling back: make one imported release current
-- ---------------------------------------------------------------------
create or replace function public.lexicon_set_current(p_tag text)
returns void
language plpgsql
security invoker
set search_path = public
as $$
begin
  if not public.lexicon_is_admin() then
    raise exception 'Only admins can change the live lexicon release.';
  end if;
  if not exists (select 1 from public.lexicon_releases where tag = p_tag) then
    raise exception 'Release % has not been imported.', p_tag;
  end if;
  -- Two statements, so the "one current release" index never sees two at once.
  update public.lexicon_releases set is_current = false where is_current and tag <> p_tag;
  update public.lexicon_releases set is_current = true where tag = p_tag;
end;
$$;

revoke execute on function public.lexicon_set_current(text) from anon;
grant execute on function public.lexicon_set_current(text) to authenticated;

-- ---------------------------------------------------------------------
-- What the app reads: the current release only
-- ---------------------------------------------------------------------
create or replace view public.lexicon_current_words
with (security_invoker = true) as
select w.release_tag, w.lex_id, w.headword, w.spellings, w.heads, w.senses, w.open_questions, w.sources, w.status
from public.lexicon_words w
join public.lexicon_releases r on r.tag = w.release_tag and r.is_current;

create or replace view public.lexicon_current_forms
with (security_invoker = true) as
select f.release_tag, f.lex_id, f.n, f.form, f.slot, f.category, f.features, f.traditional_name, f.book_label, f.book
from public.lexicon_forms f
join public.lexicon_releases r on r.tag = f.release_tag and r.is_current;

grant select on public.lexicon_current_words, public.lexicon_current_forms to anon, authenticated;
