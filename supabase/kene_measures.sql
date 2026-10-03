-- Bete Qinie: editable መዐቀኒ measures
--
-- Run this in the Supabase SQL editor.
--
-- The ሰንጠረዥ tab and the መስፈሪያ checker are both generated from one set of
-- rules, which until now lived only in src/lib/keneMeters.js. This table lets
-- an admin correct those rules from the CMS without a deploy.
--
-- A row overrides one bundled piece by id. Anything not stored here falls back
-- to the version compiled into the app, so an empty table behaves exactly as
-- before and a bad row can be fixed by deleting it.
--
--   kind = 'table'  -> payload { examples, medeb, mewqe }   ids: qana, manderderya, lewut
--   kind = 'hareg'  -> payload { options }                  ids: opening, closing
--
-- Reference content like words/conjugations: readable by anyone, writable only
-- by admins, matching the profiles.role convention used elsewhere.

create table if not exists public.kene_measures (
  id text primary key,
  kind text not null check (kind in ('table', 'hareg')),
  name text not null,
  payload jsonb not null,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users (id)
);

comment on table public.kene_measures is
  'Overrides for the መዐቀኒ measure tables. Absent ids fall back to the bundled defaults.';

alter table public.kene_measures enable row level security;

create policy "Kene measures are viewable by everyone"
  on public.kene_measures for select
  using (true);

create policy "Kene measures are insertable by admins"
  on public.kene_measures for insert
  with check (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid() and profiles.role = 'admin'
    )
  );

create policy "Kene measures are updatable by admins"
  on public.kene_measures for update
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid() and profiles.role = 'admin'
    )
  );

-- Deleting a row reverts that piece to the bundled default, which is the
-- "reset" the editor offers.
create policy "Kene measures are deletable by admins"
  on public.kene_measures for delete
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid() and profiles.role = 'admin'
    )
  );
