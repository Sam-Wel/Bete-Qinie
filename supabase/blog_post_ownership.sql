-- Bete Qinie: ownership and visibility for blog_posts
--
-- Run in the Supabase SQL editor. Set the email on the next line first.
--
--   is_public = true   public ቅኔ አበው, readable signed out, managed by admins
--   is_public = false  private to user_id, readable only by that account
--
-- Safe to re-run.

\set owner_email 'REPLACE@WITH.YOUR.EMAIL'

-- 1. Columns. Defaulting is_public to false means anything created without
--    thinking about it stays private rather than leaking.
alter table public.blog_posts
  add column if not exists user_id uuid references auth.users (id) on delete cascade,
  add column if not exists is_public boolean not null default false;

create index if not exists blog_posts_user_id_idx on public.blog_posts (user_id);

-- 2. Hand the existing posts to one account.
--
-- This refuses rather than silently doing nothing if the email matches no
-- user — the previous version of this file quietly set user_id to null when
-- the placeholder was left in, which left every post ownerless.
do $$
declare
  target uuid;
  touched int;
begin
  select id into target from auth.users where email = :'owner_email';

  if target is null then
    raise exception 'No auth.users row for %. Set owner_email at the top of this file.', :'owner_email';
  end if;

  update public.blog_posts
  set user_id = target, is_public = false
  where user_id is null;

  get diagnostics touched = row_count;
  raise notice 'Assigned % post(s) to %', touched, :'owner_email';
end $$;

-- 3. RLS.
--
-- Postgres ORs permissive policies together, so one leftover "viewable by
-- everyone" policy keeps the table world-readable no matter what is added
-- beside it. Dropping by guessed name is not enough; this clears whatever is
-- actually there before recreating.
do $$
declare
  p record;
begin
  for p in select policyname from pg_policies
           where schemaname = 'public' and tablename = 'blog_posts'
  loop
    execute format('drop policy %I on public.blog_posts', p.policyname);
  end loop;
end $$;

alter table public.blog_posts enable row level security;

create policy "Posts are visible when public or owned"
  on public.blog_posts for select
  using (is_public or user_id = auth.uid());

-- A signed-in user may only create posts under their own id, and may not
-- publish them — is_public is an admin decision.
create policy "Users insert their own posts"
  on public.blog_posts for insert
  with check (user_id = auth.uid() and is_public = false);

create policy "Owners update their own posts"
  on public.blog_posts for update
  using (user_id = auth.uid() and is_public = false)
  with check (user_id = auth.uid() and is_public = false);

create policy "Owners delete their own posts"
  on public.blog_posts for delete
  using (user_id = auth.uid() and is_public = false);

create policy "Admins manage every post"
  on public.blog_posts for all
  using (
    exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'admin')
  )
  with check (
    exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'admin')
  );

-- 4. Verify. Expect rls_enabled = true, 5 policies, and 65 owned private rows.
select relrowsecurity as rls_enabled
from pg_class where oid = 'public.blog_posts'::regclass;

select policyname, cmd from pg_policies
where schemaname = 'public' and tablename = 'blog_posts' order by policyname;

select is_public, count(*) as posts, count(user_id) as with_owner
from public.blog_posts group by is_public;
