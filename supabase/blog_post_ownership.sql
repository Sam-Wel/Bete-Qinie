-- Bete Qinie: ownership and visibility for blog_posts
--
-- Run in the Supabase SQL editor, after replacing the email below.
--
-- Until now every post was visible to everyone. This splits them in two:
--
--   is_public = true   public ቅኔ አበው, readable signed out, managed by admins
--   is_public = false  private to user_id, readable only by that account
--
-- The existing 65 posts become private to the named account, which empties
-- the public blog until public posts are added. That is intentional.

-- 1. Columns. Defaulting is_public to false means anything created without
--    thinking about it stays private rather than leaking.
alter table public.blog_posts
  add column if not exists user_id uuid references auth.users (id) on delete cascade,
  add column if not exists is_public boolean not null default false;

create index if not exists blog_posts_user_id_idx on public.blog_posts (user_id);

-- 2. Hand the existing posts to one account. Only touches rows with no owner,
--    so re-running this is safe.
update public.blog_posts
set user_id = (select id from auth.users where email = 'REPLACE@WITH.YOUR.EMAIL'),
    is_public = false
where user_id is null;

-- 3. RLS.
--
-- NOTE: check whether blog_posts had RLS enabled before this. The anon key
-- ships inside the client, so if RLS was off, anyone could have written to
-- this table. Enabling it below closes that either way.
alter table public.blog_posts enable row level security;

drop policy if exists "Blog posts are viewable by everyone" on public.blog_posts;
drop policy if exists "Posts are visible when public or owned" on public.blog_posts;
drop policy if exists "Users insert their own posts" on public.blog_posts;
drop policy if exists "Owners update their own posts" on public.blog_posts;
drop policy if exists "Owners delete their own posts" on public.blog_posts;
drop policy if exists "Admins manage every post" on public.blog_posts;

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

-- Admins manage everything, including publishing.
create policy "Admins manage every post"
  on public.blog_posts for all
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid() and profiles.role = 'admin'
    )
  )
  with check (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid() and profiles.role = 'admin'
    )
  );

-- 4. Check. Expect 65 private rows owned by one account, 0 public.
select is_public, count(*), count(distinct user_id) as owners
from public.blog_posts
group by is_public;
