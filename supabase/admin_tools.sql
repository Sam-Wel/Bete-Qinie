-- Bete Qinie: admin tools — roles (admin, editor), a change log, dictionary editing,
-- learner stats, mistake reports, searches with no result, and app settings
-- (the announcement banner and the dictionary version).
--
-- Run this once in the Supabase SQL editor, after lexicon.sql. Safe to run again.
--
-- Who can do what:
--   learner (role 'user')  report a mistake on a word; searches that find nothing are
--                          counted, with no account attached
--   editor                 dictionary, ሰዋሰው, mistake reports, missed searches, blog, meters
--   admin                  everything, plus learners, access, change log, data releases,
--                          and the announcement
--
-- Every function the admin pages call runs as the table owner, checks the caller's
-- role first, and does its whole change in one transaction. Changes to content tables
-- are written to admin_log by triggers, whoever makes them (pages, scripts, this editor).

-- =====================================================================
-- 1. Roles
-- =====================================================================

-- Replace the role check, whatever it is called, so 'editor' is allowed.
do $$
declare c record;
begin
  for c in
    select con.conname
    from pg_constraint con
    where con.conrelid = 'public.profiles'::regclass
      and con.contype = 'c'
      and pg_get_constraintdef(con.oid) ilike '%role%'
  loop
    execute format('alter table public.profiles drop constraint %I', c.conname);
  end loop;
end $$;

alter table public.profiles
  add constraint profiles_role_check check (role in ('user', 'editor', 'admin'));

create or replace function public.app_is_admin()
returns boolean
language sql
stable
security invoker
set search_path = public
as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;

create or replace function public.app_can_edit()
returns boolean
language sql
stable
security invoker
set search_path = public
as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role in ('editor', 'admin'));
$$;

-- Editors manage the blog and the meter tables too. Policies are OR'ed, so the
-- existing admin policies stay as they are.
drop policy if exists "Editors manage every post" on public.blog_posts;
create policy "Editors manage every post"
  on public.blog_posts for all
  using (public.app_can_edit()) with check (public.app_can_edit());

drop policy if exists "Kene measures are insertable by editors" on public.kene_measures;
create policy "Kene measures are insertable by editors"
  on public.kene_measures for insert with check (public.app_can_edit());
drop policy if exists "Kene measures are updatable by editors" on public.kene_measures;
create policy "Kene measures are updatable by editors"
  on public.kene_measures for update using (public.app_can_edit()) with check (public.app_can_edit());
drop policy if exists "Kene measures are deletable by editors" on public.kene_measures;
create policy "Kene measures are deletable by editors"
  on public.kene_measures for delete using (public.app_can_edit());

-- Shared guards for the functions below.
create or replace function public.app_require_editor()
returns void
language plpgsql
stable
set search_path = public
as $$
begin
  if not public.app_can_edit() then
    raise exception 'Only editors and admins can do this.' using errcode = '42501';
  end if;
end;
$$;

create or replace function public.app_require_admin()
returns void
language plpgsql
stable
set search_path = public
as $$
begin
  if not public.app_is_admin() then
    raise exception 'Only admins can do this.' using errcode = '42501';
  end if;
end;
$$;

-- =====================================================================
-- 2. App settings: the announcement banner and the dictionary version
-- =====================================================================

create table if not exists public.app_settings (
  key text primary key,          -- 'announcement' | 'dictionary_version'
  value jsonb not null,
  updated_at timestamptz not null default now(),
  updated_by uuid default auth.uid()
);

alter table public.app_settings enable row level security;

drop policy if exists "App settings are viewable by everyone" on public.app_settings;
create policy "App settings are viewable by everyone"
  on public.app_settings for select using (true);

drop policy if exists "App settings are managed by admins" on public.app_settings;
create policy "App settings are managed by admins"
  on public.app_settings for all
  using (public.app_is_admin()) with check (public.app_is_admin());

grant select on public.app_settings to anon, authenticated;

-- Any change to the dictionary moves its version on, and the app refetches its
-- verb bank the next time it opens (src/hooks/useVerbBank.js).
create or replace function public.bump_dictionary_version()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.app_settings (key, value, updated_at, updated_by)
  values ('dictionary_version', jsonb_build_object('at', now()), now(), auth.uid())
  on conflict (key) do update
    set value = excluded.value, updated_at = excluded.updated_at, updated_by = excluded.updated_by;
  return null;
end;
$$;

drop trigger if exists bump_version_words on public.words;
create trigger bump_version_words after insert or update or delete on public.words
  for each statement execute function public.bump_dictionary_version();
drop trigger if exists bump_version_translationmappings on public.translationmappings;
create trigger bump_version_translationmappings after insert or update or delete on public.translationmappings
  for each statement execute function public.bump_dictionary_version();
drop trigger if exists bump_version_sewasew on public.sewasew;
create trigger bump_version_sewasew after insert or update or delete on public.sewasew
  for each statement execute function public.bump_dictionary_version();

insert into public.app_settings (key, value)
values ('dictionary_version', jsonb_build_object('at', now()))
on conflict (key) do nothing;

-- =====================================================================
-- 3. Mistake reports and searches with no result
-- =====================================================================

create table if not exists public.word_reports (
  id bigint generated always as identity primary key,
  word_id bigint,                                         -- the Ge'ez word reported
  word text not null,                                     -- as it was shown
  message text not null check (char_length(message) between 1 and 500),
  reporter uuid references auth.users (id) on delete set null,   -- null for guests
  status text not null default 'open' check (status in ('open', 'fixed', 'dismissed')),
  note text,
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  resolved_by uuid
);

create index if not exists word_reports_status on public.word_reports (status, created_at desc);
create index if not exists word_reports_word on public.word_reports (word_id);

alter table public.word_reports enable row level security;
drop policy if exists "Editors read reports" on public.word_reports;
create policy "Editors read reports"
  on public.word_reports for select using (public.app_can_edit());

-- Anyone can report, signed in or not; reports are only ever written through here.
create or replace function public.report_word(p_word_id bigint, p_word text, p_message text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_message text := btrim(coalesce(p_message, ''));
  v_word text;
begin
  if char_length(v_message) = 0 then
    raise exception 'Please say what is wrong.';
  end if;
  if char_length(v_message) > 500 then
    raise exception 'Please keep it under 500 characters.';
  end if;
  select btrim(word) into v_word from public.words where word_id = p_word_id;
  if v_word is null then
    raise exception 'That word is not in the dictionary.';
  end if;
  if (select count(*) from public.word_reports where created_at > now() - interval '1 hour') >= 30 then
    raise exception 'Too many reports right now. Please try again later.';
  end if;
  insert into public.word_reports (word_id, word, message, reporter)
  values (p_word_id, coalesce(nullif(left(btrim(coalesce(p_word, '')), 80), ''), v_word), v_message, auth.uid());
end;
$$;

create or replace function public.report_resolve(p_id bigint, p_status text, p_note text default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.app_require_editor();
  if p_status not in ('open', 'fixed', 'dismissed') then
    raise exception 'Unknown status %.', p_status;
  end if;
  update public.word_reports
     set status = p_status,
         note = coalesce(nullif(btrim(coalesce(p_note, '')), ''), note),
         resolved_at = case when p_status = 'open' then null else now() end,
         resolved_by = case when p_status = 'open' then null else auth.uid() end
   where id = p_id;
  if not found then
    raise exception 'No report #%.', p_id;
  end if;
end;
$$;

-- Reports, newest first. Admins also see who sent each one.
create or replace function public.reports_list(p_status text default 'open', p_limit int default 200)
returns table (id bigint, word_id bigint, word text, message text, status text, note text,
               created_at timestamptz, resolved_at timestamptz, reporter_email text, signed_in boolean)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  perform public.app_require_editor();
  return query
    select r.id, r.word_id, r.word, r.message, r.status, r.note, r.created_at, r.resolved_at,
           case when public.app_is_admin() then u.email::text end,
           r.reporter is not null
      from public.word_reports r
      left join auth.users u on u.id = r.reporter
     where p_status is null or r.status = p_status
     order by r.created_at desc
     limit least(greatest(p_limit, 1), 1000);
end;
$$;

create table if not exists public.search_misses (
  language text not null,
  term text not null,
  count int not null default 1,
  first_at timestamptz not null default now(),
  last_at timestamptz not null default now(),
  dismissed boolean not null default false,
  primary key (language, term)
);

alter table public.search_misses enable row level security;
drop policy if exists "Editors read missed searches" on public.search_misses;
create policy "Editors read missed searches"
  on public.search_misses for select using (public.app_can_edit());
drop policy if exists "Editors update missed searches" on public.search_misses;
create policy "Editors update missed searches"
  on public.search_misses for update using (public.app_can_edit()) with check (public.app_can_edit());
drop policy if exists "Editors delete missed searches" on public.search_misses;
create policy "Editors delete missed searches"
  on public.search_misses for delete using (public.app_can_edit());

-- Counts a search that found nothing. No account or device is recorded. Terms the
-- dictionary does find are ignored, so the list only ever holds real gaps.
create or replace function public.log_search_miss(p_term text, p_language text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_term text := regexp_replace(btrim(coalesce(p_term, '')), '\s+', ' ', 'g');
begin
  if p_language is null or p_language not in ('gz', 'ti', 'am', 'en') then
    return;
  end if;
  if p_language = 'en' then
    v_term := lower(v_term);
  end if;
  if char_length(v_term) = 0 or char_length(v_term) > 40 then
    return;
  end if;
  if v_term !~ '[A-Za-z]' and v_term !~ '[ሀ-፿]' then
    return;
  end if;
  if exists (select 1 from public.search_dictionary(v_term, p_language)) then
    return;
  end if;
  if not exists (select 1 from public.search_misses where language = p_language and term = v_term)
     and (select count(*) from public.search_misses) >= 5000 then
    return;
  end if;
  insert into public.search_misses as s (language, term)
  values (p_language, v_term)
  on conflict (language, term) do update set count = s.count + 1, last_at = now();
end;
$$;

-- =====================================================================
-- 4. Change log
-- =====================================================================

create table if not exists public.admin_log (
  id bigint generated always as identity primary key,
  at timestamptz not null default now(),
  actor uuid,                 -- who made the change; null for the SQL editor and scripts without a sign-in
  action text not null,       -- insert | update | delete
  table_name text not null,
  row_key text,
  before jsonb,
  after jsonb
);

create index if not exists admin_log_at on public.admin_log (at desc);
create index if not exists admin_log_table_at on public.admin_log (table_name, at desc);

alter table public.admin_log enable row level security;
drop policy if exists "Admins read the change log" on public.admin_log;
create policy "Admins read the change log"
  on public.admin_log for select using (public.app_is_admin());
-- No insert, update or delete policy: rows only come from log_change().

-- Row trigger: tg_argv[0] names the key column.
create or replace function public.log_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_old jsonb := case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) end;
  v_new jsonb := case when tg_op in ('INSERT', 'UPDATE') then to_jsonb(new) end;
begin
  if tg_table_name = 'app_settings' and coalesce(v_new, v_old) ->> 'key' = 'dictionary_version' then
    return null;
  end if;
  if tg_table_name = 'word_reports' and tg_op = 'INSERT' then
    return null;  -- a learner sending a report isn't an admin change; resolving it is
  end if;
  if tg_table_name = 'lexicon_releases' then
    -- The head tables and manifest are large and never change after import.
    v_old := v_old - 'heads' - 'manifest';
    v_new := v_new - 'heads' - 'manifest';
  end if;
  if tg_op = 'UPDATE' and v_old = v_new then
    return null;
  end if;
  insert into public.admin_log (actor, action, table_name, row_key, before, after)
  values (auth.uid(), lower(tg_op), tg_table_name, coalesce(v_new, v_old) ->> tg_argv[0], v_old, v_new);
  return null;
end;
$$;

do $$
declare
  t record;
begin
  for t in
    select * from (values
      ('words', 'word_id'),
      ('translationmappings', 'mapping_id'),
      ('sewasew', 'sewasew_id'),
      ('blog_posts', 'id'),
      ('kene_measures', 'id'),
      ('lexicon_releases', 'tag'),
      ('app_settings', 'key'),
      ('word_reports', 'id')
    ) as v(tbl, key_col)
  loop
    execute format('drop trigger if exists log_%1$s on public.%1$I', t.tbl);
    execute format(
      'create trigger log_%1$s after insert or update or delete on public.%1$I '
      'for each row execute function public.log_change(%2$L)', t.tbl, t.key_col);
  end loop;
end $$;

-- Role changes (and new accounts that start as editor or admin).
drop trigger if exists log_profile_roles on public.profiles;
create trigger log_profile_roles after update of role on public.profiles
  for each row when (old.role is distinct from new.role)
  execute function public.log_change('id');
drop trigger if exists log_profile_roles_new on public.profiles;
create trigger log_profile_roles_new after insert on public.profiles
  for each row when (new.role <> 'user')
  execute function public.log_change('id');

-- The log, newest first, with names: who made each change, the account a role change
-- was about, and the words a link or example points to.
create or replace function public.admin_log_list(
  p_tables text[] default null,
  p_since timestamptz default now() - interval '30 days',
  p_limit int default 200,
  p_before bigint default null
)
returns table (id bigint, at timestamptz, actor_email text, action text, table_name text, row_key text,
               before jsonb, after jsonb, subject_email text, words jsonb)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  perform public.app_require_admin();
  return query
    select l.id, l.at,
           coalesce(u.email::text, case when l.actor is null then 'SQL editor' end),
           l.action, l.table_name, l.row_key, l.before, l.after,
           case when l.table_name = 'profiles' then (select s.email::text from auth.users s where s.id::text = l.row_key) end,
           case when l.table_name in ('translationmappings', 'sewasew', 'word_reports') then (
             select jsonb_object_agg(w.word_id::text, jsonb_build_object('word', btrim(w.word), 'lang', w.language_code))
               from public.words w
              where w.word_id in (
                (coalesce(l.after, l.before) ->> 'word_id')::bigint,
                (coalesce(l.after, l.before) ->> 'related_word_id')::bigint)
           ) end
      from public.admin_log l
      left join auth.users u on u.id = l.actor
     where (p_tables is null or l.table_name = any (p_tables))
       and l.at >= p_since
       and (p_before is null or l.id < p_before)
     order by l.id desc
     limit least(greatest(p_limit, 1), 1000);
end;
$$;

-- =====================================================================
-- 5. Dictionary editing (editors and admins)
-- =====================================================================
-- Ge'ez words (language 'gz') are linked to their meanings (ti, am, en) in both
-- directions in translationmappings. A meaning word can be shared by several Ge'ez
-- words, so "change this meaning" is either a relink for one word (dict_relink) or a
-- rename for every word that shares it (dict_rename).

create or replace function public.dict_clean(p_text text)
returns text
language sql
immutable
as $$
  select regexp_replace(btrim(coalesce(p_text, '')), '\s+', ' ', 'g');
$$;

-- The word with this spelling in this language, made if it doesn't exist yet.
create or replace function public.dict_find_or_create(p_text text, p_lang text)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  v_text text := public.dict_clean(p_text);
  v_id bigint;
begin
  perform public.app_require_editor();
  if v_text = '' then
    raise exception 'The word is empty.';
  end if;
  if not exists (select 1 from public.languages where language_code = p_lang) then
    raise exception 'Unknown language %.', p_lang;
  end if;
  select w.word_id into v_id
    from public.words w
   where w.language_code = p_lang and btrim(w.word) = v_text
   order by w.word_id
   limit 1;
  if v_id is null then
    insert into public.words (word, language_code) values (v_text, p_lang) returning word_id into v_id;
  end if;
  return v_id;
end;
$$;

-- Links two words both ways, skipping a direction that is already there.
create or replace function public.dict_link_ids(p_a bigint, p_b bigint)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.app_require_editor();
  if p_a = p_b then
    raise exception 'A word cannot be its own meaning.';
  end if;
  insert into public.translationmappings (word_id, related_word_id)
  select v.a, v.b
    from (values (p_a, p_b), (p_b, p_a)) as v(a, b)
   where not exists (select 1 from public.translationmappings m where m.word_id = v.a and m.related_word_id = v.b);
end;
$$;

-- A meaning word left with no links and no examples is removed. Ge'ez words never are.
create or replace function public.dict_drop_orphan(p_id bigint)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.words w
   where w.word_id = p_id
     and w.language_code <> 'gz'
     and not exists (select 1 from public.translationmappings m where p_id in (m.word_id, m.related_word_id))
     and not exists (select 1 from public.sewasew s where s.word_id = p_id);
end;
$$;

-- One word, with its links (each meaning says how many other Ge'ez words share it),
-- its ሰዋሰው, how many learners have studied it, and its open reports.
create or replace function public.dict_word(p_id bigint)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v jsonb;
begin
  perform public.app_require_editor();
  select jsonb_build_object(
    'word_id', w.word_id,
    'word', btrim(w.word),
    'language_code', w.language_code,
    'links', coalesce((
      select jsonb_agg(jsonb_build_object(
               'word_id', o.word_id,
               'word', btrim(o.word),
               'language_code', o.language_code,
               'shared_with', (
                 select count(distinct g.word_id)
                   from public.translationmappings m2
                   join public.words g
                     on g.word_id = case when m2.word_id = o.word_id then m2.related_word_id else m2.word_id end
                  where o.word_id in (m2.word_id, m2.related_word_id)
                    and g.language_code = 'gz'
                    and g.word_id <> w.word_id)
             ) order by o.language_code, l.first_link)
        from (
          select case when m.word_id = w.word_id then m.related_word_id else m.word_id end as other_id,
                 min(m.mapping_id) as first_link
            from public.translationmappings m
           where w.word_id in (m.word_id, m.related_word_id)
           group by 1
        ) l
        join public.words o on o.word_id = l.other_id
    ), '[]'::jsonb),
    'examples', coalesce((
      select jsonb_agg(jsonb_build_object('sewasew_id', s.sewasew_id, 'text', s.sewasew_text) order by s.sewasew_id)
        from public.sewasew s
       where s.word_id = w.word_id
    ), '[]'::jsonb),
    'learners', (select count(*) from public.word_progress p where p.word_id = w.word_id and p.seen > 0),
    'open_reports', (select count(*) from public.word_reports r where r.word_id = w.word_id and r.status = 'open')
  )
  into v
  from public.words w
  where w.word_id = p_id;
  if v is null then
    raise exception 'No word #%.', p_id;
  end if;
  return v;
end;
$$;

-- A new Ge'ez word, or the existing one with that spelling.
create or replace function public.dict_create(p_text text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_text text := public.dict_clean(p_text);
  v_id bigint;
begin
  perform public.app_require_editor();
  if v_text = '' then
    raise exception 'The word is empty.';
  end if;
  select w.word_id into v_id from public.words w where w.language_code = 'gz' and btrim(w.word) = v_text order by w.word_id limit 1;
  if v_id is not null then
    return jsonb_build_object('word_id', v_id, 'existed', true);
  end if;
  insert into public.words (word, language_code) values (v_text, 'gz') returning word_id into v_id;
  return jsonb_build_object('word_id', v_id, 'existed', false);
end;
$$;

-- Adds a meaning (found or made) to a word.
create or replace function public.dict_link(p_word_id bigint, p_lang text, p_text text)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  v_other bigint;
begin
  perform public.app_require_editor();
  if not exists (select 1 from public.words where word_id = p_word_id) then
    raise exception 'No word #%.', p_word_id;
  end if;
  v_other := public.dict_find_or_create(p_text, p_lang);
  perform public.dict_link_ids(p_word_id, v_other);
  return v_other;
end;
$$;

-- Removes a link (both directions); a meaning left with nothing is removed with it.
create or replace function public.dict_unlink(p_word_id bigint, p_other_id bigint)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.app_require_editor();
  delete from public.translationmappings
   where (word_id = p_word_id and related_word_id = p_other_id)
      or (word_id = p_other_id and related_word_id = p_word_id);
  perform public.dict_drop_orphan(p_other_id);
end;
$$;

-- Changes one meaning for this word only: links the new spelling, unlinks the old one.
create or replace function public.dict_relink(p_word_id bigint, p_old_id bigint, p_text text)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  v_lang text;
  v_new bigint;
begin
  perform public.app_require_editor();
  select language_code into v_lang from public.words where word_id = p_old_id;
  if v_lang is null then
    raise exception 'No word #%.', p_old_id;
  end if;
  v_new := public.dict_find_or_create(p_text, v_lang);
  if v_new = p_old_id then
    return v_new;
  end if;
  perform public.dict_link_ids(p_word_id, v_new);
  delete from public.translationmappings
   where (word_id = p_word_id and related_word_id = p_old_id)
      or (word_id = p_old_id and related_word_id = p_word_id);
  perform public.dict_drop_orphan(p_old_id);
  return v_new;
end;
$$;

-- Renames a word everywhere it is used. If the new spelling already exists in that
-- language, nothing changes and the other word is returned, so the page can offer a merge.
create or replace function public.dict_rename(p_id bigint, p_text text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_text text := public.dict_clean(p_text);
  v_lang text;
  v_other bigint;
begin
  perform public.app_require_editor();
  select language_code into v_lang from public.words where word_id = p_id;
  if v_lang is null then
    raise exception 'No word #%.', p_id;
  end if;
  if v_text = '' then
    raise exception 'The word is empty.';
  end if;
  select w.word_id into v_other
    from public.words w
   where w.language_code = v_lang and btrim(w.word) = v_text and w.word_id <> p_id
   order by w.word_id
   limit 1;
  if v_other is not null then
    return jsonb_build_object('conflict', v_other, 'word', v_text);
  end if;
  update public.words set word = v_text where word_id = p_id and word is distinct from v_text;
  return jsonb_build_object('ok', true, 'word', v_text);
end;
$$;

-- Merges p_drop into p_keep (same language): links, ሰዋሰው, reports and learners'
-- progress move to p_keep, then p_drop is deleted. Where a learner has progress on
-- both, the further one (higher box) is kept.
create or replace function public.dict_merge(p_keep bigint, p_drop bigint)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_keep_lang text;
  v_drop_lang text;
  v_moved_progress int := 0;
begin
  perform public.app_require_editor();
  if p_keep = p_drop then
    raise exception 'Pick two different words.';
  end if;
  select language_code into v_keep_lang from public.words where word_id = p_keep;
  select language_code into v_drop_lang from public.words where word_id = p_drop;
  if v_keep_lang is null or v_drop_lang is null then
    raise exception 'Both words must exist.';
  end if;
  if v_keep_lang <> v_drop_lang then
    raise exception 'Only words in the same language can be merged.';
  end if;

  insert into public.translationmappings (word_id, related_word_id)
  select distinct p_keep, m.related_word_id
    from public.translationmappings m
   where m.word_id = p_drop and m.related_word_id not in (p_keep, p_drop)
     and not exists (select 1 from public.translationmappings k where k.word_id = p_keep and k.related_word_id = m.related_word_id);
  insert into public.translationmappings (word_id, related_word_id)
  select distinct m.word_id, p_keep
    from public.translationmappings m
   where m.related_word_id = p_drop and m.word_id not in (p_keep, p_drop)
     and not exists (select 1 from public.translationmappings k where k.word_id = m.word_id and k.related_word_id = p_keep);
  delete from public.translationmappings where p_drop in (word_id, related_word_id);

  update public.sewasew set word_id = p_keep where word_id = p_drop;
  update public.word_reports set word_id = p_keep where word_id = p_drop;

  delete from public.word_progress d
   using public.word_progress k
   where d.word_id = p_drop and k.word_id = p_keep and k.user_id = d.user_id and k.box >= d.box;
  delete from public.word_progress k
   using public.word_progress d
   where k.word_id = p_keep and d.word_id = p_drop and k.user_id = d.user_id;
  update public.word_progress set word_id = p_keep where word_id = p_drop;
  get diagnostics v_moved_progress = row_count;

  delete from public.words where word_id = p_drop;
  return jsonb_build_object('ok', true, 'kept', p_keep, 'moved_progress', v_moved_progress);
end;
$$;

-- Deletes a word with its links and ሰዋሰው; meanings left with nothing go too.
-- Learners' progress rows are left alone (they simply stop showing).
create or replace function public.dict_delete(p_id bigint)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_others bigint[];
  v_other bigint;
begin
  perform public.app_require_editor();
  if not exists (select 1 from public.words where word_id = p_id) then
    raise exception 'No word #%.', p_id;
  end if;
  with gone as (
    delete from public.translationmappings
     where p_id in (word_id, related_word_id)
    returning case when word_id = p_id then related_word_id else word_id end as other_id
  )
  select array_agg(distinct other_id) into v_others from gone;
  delete from public.sewasew where word_id = p_id;
  delete from public.words where word_id = p_id;
  foreach v_other in array coalesce(v_others, '{}'::bigint[]) loop
    perform public.dict_drop_orphan(v_other);
  end loop;
end;
$$;

create or replace function public.example_save(p_id bigint, p_word_id bigint, p_text text)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  v_text text := btrim(coalesce(p_text, ''));
  v_id bigint := p_id;
begin
  perform public.app_require_editor();
  if v_text = '' then
    raise exception 'The example is empty.';
  end if;
  if v_id is null then
    if not exists (select 1 from public.words where word_id = p_word_id) then
      raise exception 'No word #%.', p_word_id;
    end if;
    insert into public.sewasew (word_id, sewasew_text) values (p_word_id, v_text) returning sewasew_id into v_id;
  else
    update public.sewasew set sewasew_text = v_text where sewasew_id = v_id and sewasew_text is distinct from v_text;
  end if;
  return v_id;
end;
$$;

create or replace function public.example_delete(p_id bigint)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.app_require_editor();
  delete from public.sewasew where sewasew_id = p_id;
end;
$$;

-- Rows behind the dictionary filters.
create or replace function public.dict_issue_rows(p_kind text)
returns table (word_id bigint, word text, language_code text, other_id bigint, other_word text)
language sql
stable
security definer
set search_path = public
as $$
  with gz as (
    select w.word_id, btrim(w.word) as word from public.words w where w.language_code = 'gz'
  ),
  links as (
    select m.word_id as a, m.related_word_id as b from public.translationmappings m
    union all
    select m.related_word_id, m.word_id from public.translationmappings m
  ),
  langs as (
    select distinct l.a as gz_id, o.language_code from links l join public.words o on o.word_id = l.b
  )
  select g.word_id::bigint, g.word, 'gz'::text, null::bigint, null::text
    from gz g
   where p_kind in ('missing_en', 'missing_ti', 'missing_am')
     and not exists (select 1 from langs where langs.gz_id = g.word_id and langs.language_code = substr(p_kind, 9))
  union all
  select g.word_id::bigint, g.word, 'gz'::text, null::bigint, null::text
    from gz g
   where p_kind = 'no_meaning'
     and not exists (select 1 from links where links.a = g.word_id)
  union all
  select g.word_id::bigint, g.word, 'gz'::text, d.word_id::bigint, d.word
    from gz g
    join gz d on d.word_id > g.word_id and replace(d.word, ' ', '') = replace(g.word, ' ', '')
   where p_kind = 'duplicates'
  union all
  select o.word_id::bigint, btrim(o.word), o.language_code::text, null::bigint, null::text
    from public.words o
   where p_kind = 'orphans'
     and o.language_code <> 'gz'
     and not exists (select 1 from links where links.a = o.word_id)
     and not exists (select 1 from public.sewasew s where s.word_id = o.word_id)
  order by 1;
$$;

create or replace function public.dict_issues(p_kind text, p_limit int default 100, p_offset int default 0)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_rows jsonb;
  v_total int;
begin
  perform public.app_require_editor();
  select count(*) into v_total from public.dict_issue_rows(p_kind);
  select coalesce(jsonb_agg(to_jsonb(r)), '[]'::jsonb) into v_rows
    from (select * from public.dict_issue_rows(p_kind) limit least(greatest(p_limit, 1), 500) offset greatest(p_offset, 0)) r;
  return jsonb_build_object('total', v_total, 'rows', v_rows);
end;
$$;

create or replace function public.dict_issue_counts()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  perform public.app_require_editor();
  return jsonb_build_object(
    'missing_en', (select count(*) from public.dict_issue_rows('missing_en')),
    'missing_ti', (select count(*) from public.dict_issue_rows('missing_ti')),
    'missing_am', (select count(*) from public.dict_issue_rows('missing_am')),
    'no_meaning', (select count(*) from public.dict_issue_rows('no_meaning')),
    'duplicates', (select count(*) from public.dict_issue_rows('duplicates')),
    'orphans', (select count(*) from public.dict_issue_rows('orphans')),
    'reported', (select count(distinct word_id) from public.word_reports where status = 'open'),
    'missed_searches', (select count(*) from public.search_misses where not dismissed)
  );
end;
$$;

-- Deletes every orphan meaning (non-Ge'ez words with no links and no examples).
create or replace function public.dict_delete_orphans()
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count int;
begin
  perform public.app_require_editor();
  delete from public.words w
   where w.word_id in (select r.word_id from public.dict_issue_rows('orphans') r);
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

-- Words learners miss most (all learners together; no names). A word needs at
-- least p_min learners to be listed.
create or replace function public.dict_hard_words(p_min int default 3, p_limit int default 30)
returns table (word_id bigint, word text, learners int, seen int, wrong int, miss_rate numeric)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  perform public.app_require_editor();
  return query
    select w.word_id::bigint, btrim(w.word), count(*)::int, sum(p.seen)::int, sum(p.seen - p.correct)::int,
           round(sum(p.seen - p.correct)::numeric / nullif(sum(p.seen), 0), 3)
      from public.word_progress p
      join public.words w on w.word_id = p.word_id and w.language_code = 'gz'
     where p.seen > 0
     group by w.word_id, w.word
    having count(*) >= p_min and sum(p.seen - p.correct) > 0
     order by 6 desc, 5 desc
     limit least(greatest(p_limit, 1), 200);
end;
$$;

-- =====================================================================
-- 6. Learners (admins)
-- =====================================================================

create or replace function public.admin_overview()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_weeks date[] := array(select (current_date - 55 + 7 * i) from generate_series(0, 7) as i);
begin
  perform public.app_require_admin();
  return jsonb_build_object(
    'accounts', (select count(*) from auth.users),
    'new_7d', (select count(*) from auth.users where created_at > now() - interval '7 days'),
    'active_1d', (select count(*) from (
        select user_id from public.word_progress where last_seen_at > now() - interval '1 day'
        union select user_id from public.game_sessions where updated_at > now() - interval '1 day') a),
    'active_7d', (select count(*) from (
        select user_id from public.word_progress where last_seen_at > now() - interval '7 days'
        union select user_id from public.game_sessions where updated_at > now() - interval '7 days') a),
    'active_30d', (select count(*) from (
        select user_id from public.word_progress where last_seen_at > now() - interval '30 days'
        union select user_id from public.game_sessions where updated_at > now() - interval '30 days') a),
    'learned_7d', (select count(*) from public.word_progress
        where study ->> 'learned' ~ '^\d+$'
          and to_timestamp((study ->> 'learned')::bigint / 1000.0) > now() - interval '7 days'),
    'new_per_week', (
      select jsonb_agg(jsonb_build_object('start', wk, 'count', (
               select count(*) from auth.users u where u.created_at >= wk and u.created_at < wk + 7)) order by wk)
        from unnest(v_weeks) as wk),
    'learned_per_week', (
      select jsonb_agg(jsonb_build_object('start', wk, 'count', (
               select count(*) from public.word_progress p
                where p.study ->> 'learned' ~ '^\d+$'
                  and to_timestamp((p.study ->> 'learned')::bigint / 1000.0) >= wk
                  and to_timestamp((p.study ->> 'learned')::bigint / 1000.0) < wk + 7)) order by wk)
        from unnest(v_weeks) as wk),
    'games_30d', coalesce((
      select jsonb_agg(jsonb_build_object('game', g.game_type, 'count', g.n) order by g.n desc)
        from (select game_type, count(*) as n from public.game_sessions
               where status = 'completed' and updated_at > now() - interval '30 days'
               group by game_type) g), '[]'::jsonb),
    'reports_open', (select count(*) from public.word_reports where status = 'open'),
    'missed_7d', (select count(*) from public.search_misses where not dismissed and last_at > now() - interval '7 days'),
    'release', (select tag from public.lexicon_releases where is_current)
  );
end;
$$;

-- Every account with a few numbers, most recently active first.
--   known: 3 or more right reviews and not missed last time; mastered: passed the 3-week review.
create or replace function public.admin_learners()
returns table (user_id uuid, email text, display_name text, role text, joined timestamptz,
               last_sign_in timestamptz, last_active timestamptz, practised int, known int,
               mastered int, due int, games int)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  perform public.app_require_admin();
  return query
    select u.id, u.email::text, p.display_name, coalesce(p.role, 'user'), u.created_at, u.last_sign_in_at,
           greatest(wp.last_seen, gs.last_game),
           coalesce(wp.practised, 0)::int, coalesce(wp.known, 0)::int, coalesce(wp.mastered, 0)::int,
           coalesce(wp.due, 0)::int, coalesce(gs.games, 0)::int
      from auth.users u
      left join public.profiles p on p.id = u.id
      left join lateral (
        select max(x.last_seen_at) as last_seen,
               count(*) filter (where x.seen > 0) as practised,
               count(*) filter (where x.box between 3 and 4 and x.last_correct is not false) as known,
               count(*) filter (where x.box >= 5) as mastered,
               count(*) filter (where x.due_at <= now() and (x.box > 0 or x.saved)) as due
          from public.word_progress x
         where x.user_id = u.id
      ) wp on true
      left join lateral (
        select max(g.updated_at) as last_game, count(*) filter (where g.status = 'completed') as games
          from public.game_sessions g
         where g.user_id = u.id
      ) gs on true
     order by greatest(wp.last_seen, gs.last_game) desc nulls last, u.created_at desc;
end;
$$;

-- One learner: their account, every word_progress row (the app turns these into the
-- same view as their own Progress page), and their latest finished games.
create or replace function public.admin_learner(p_user uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v jsonb;
begin
  perform public.app_require_admin();
  select jsonb_build_object(
    'user', jsonb_build_object('user_id', u.id, 'email', u.email, 'display_name', p.display_name,
                               'role', coalesce(p.role, 'user'), 'joined', u.created_at,
                               'last_sign_in', u.last_sign_in_at),
    'progress', coalesce((select jsonb_agg(to_jsonb(w) - 'user_id') from public.word_progress w where w.user_id = u.id), '[]'::jsonb),
    'games', coalesce((
      select jsonb_agg(jsonb_build_object('game_type', g.game_type, 'score', g.score, 'total', g.total_questions,
                                          'at', g.updated_at) order by g.updated_at desc)
        from (select * from public.game_sessions s
               where s.user_id = u.id and s.status = 'completed'
               order by s.updated_at desc limit 50) g), '[]'::jsonb)
  )
  into v
  from auth.users u
  left join public.profiles p on p.id = u.id
  where u.id = p_user;
  if v is null then
    raise exception 'No such account.';
  end if;
  return v;
end;
$$;

-- =====================================================================
-- 7. Access (admins)
-- =====================================================================

create or replace function public.admin_staff()
returns table (user_id uuid, email text, role text, joined timestamptz, last_sign_in timestamptz)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  perform public.app_require_admin();
  return query
    select u.id, u.email::text, p.role, u.created_at, u.last_sign_in_at
      from public.profiles p
      join auth.users u on u.id = p.id
     where p.role in ('editor', 'admin')
     order by case p.role when 'admin' then 0 else 1 end, u.email;
end;
$$;

-- Gives an account a role ('user' takes access away). Never your own role, and never
-- the last admin.
create or replace function public.admin_set_role(p_email text, p_role text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid;
  v_email text;
  v_before text;
begin
  perform public.app_require_admin();
  if p_role is null or p_role not in ('user', 'editor', 'admin') then
    raise exception 'Unknown role %.', p_role;
  end if;
  select u.id, u.email::text into v_user, v_email
    from auth.users u
   where lower(u.email) = lower(btrim(coalesce(p_email, '')))
   limit 1;
  if v_user is null then
    raise exception 'No account uses %. They need to create an account first.', btrim(coalesce(p_email, ''));
  end if;
  if v_user = auth.uid() then
    raise exception 'You can''t change your own role.';
  end if;
  select role into v_before from public.profiles where id = v_user;
  if v_before = 'admin' and p_role <> 'admin'
     and (select count(*) from public.profiles where role = 'admin') <= 1 then
    raise exception 'That would leave no admin.';
  end if;
  insert into public.profiles (id, role) values (v_user, p_role)
  on conflict (id) do update set role = excluded.role;
  return jsonb_build_object('user_id', v_user, 'email', v_email, 'role', p_role, 'before', coalesce(v_before, 'user'));
end;
$$;

-- =====================================================================
-- 8. Who may call what
-- =====================================================================
-- Each function checks the caller's role itself; these grants keep guests away from
-- the admin ones as well, and keep the internal helpers internal.

revoke execute on function public.dict_issue_rows(text) from public, anon, authenticated;
revoke execute on function public.dict_drop_orphan(bigint) from public, anon, authenticated;
revoke execute on function public.dict_link_ids(bigint, bigint) from public, anon, authenticated;
revoke execute on function public.dict_find_or_create(text, text) from public, anon, authenticated;

do $$
declare
  f text;
begin
  foreach f in array array[
    'public.report_resolve(bigint, text, text)',
    'public.reports_list(text, int)',
    'public.admin_log_list(text[], timestamptz, int, bigint)',
    'public.dict_word(bigint)',
    'public.dict_create(text)',
    'public.dict_link(bigint, text, text)',
    'public.dict_unlink(bigint, bigint)',
    'public.dict_relink(bigint, bigint, text)',
    'public.dict_rename(bigint, text)',
    'public.dict_merge(bigint, bigint)',
    'public.dict_delete(bigint)',
    'public.example_save(bigint, bigint, text)',
    'public.example_delete(bigint)',
    'public.dict_issues(text, int, int)',
    'public.dict_issue_counts()',
    'public.dict_delete_orphans()',
    'public.dict_hard_words(int, int)',
    'public.admin_overview()',
    'public.admin_learners()',
    'public.admin_learner(uuid)',
    'public.admin_staff()',
    'public.admin_set_role(text, text)'
  ] loop
    execute format('revoke execute on function %s from public, anon', f);
    execute format('grant execute on function %s to authenticated', f);
  end loop;
end $$;

grant execute on function public.report_word(bigint, text, text) to anon, authenticated;
grant execute on function public.log_search_miss(text, text) to anon, authenticated;

-- =====================================================================
-- 9. Check
-- =====================================================================
-- Expect: your admin account(s) listed, the two settings rows (announcement appears
-- once you publish one), and 10 change-log triggers.
select u.email, p.role from public.profiles p join auth.users u on u.id = p.id
 where p.role in ('editor', 'admin') order by p.role, u.email;
select key, updated_at from public.app_settings order by key;
select count(*) as change_log_triggers from pg_trigger where tgname like 'log\_%' and not tgisinternal;
