-- Bete Qinie: enable RLS on public.conjugations
--
-- Run this in the Supabase SQL editor. Fixes the Supabase linter finding
-- "Table public.conjugations is public, but RLS has not been enabled" --
-- with RLS off, the anon key (shipped in the client) has unrestricted
-- read/write access to the table.
--
-- conjugations is dictionary reference content (like words/sewasew/
-- translationmappings): readable by anyone, but only writable by admins
-- through the CMS, matching the profiles.role convention from
-- user_accounts_and_game_progress.sql.

alter table public.conjugations enable row level security;

create policy "Conjugations are viewable by everyone"
  on public.conjugations for select
  using (true);

create policy "Conjugations are managed by admins"
  on public.conjugations for insert
  with check (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid() and profiles.role = 'admin'
    )
  );

create policy "Conjugations are updatable by admins"
  on public.conjugations for update
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid() and profiles.role = 'admin'
    )
  );

create policy "Conjugations are deletable by admins"
  on public.conjugations for delete
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid() and profiles.role = 'admin'
    )
  );
