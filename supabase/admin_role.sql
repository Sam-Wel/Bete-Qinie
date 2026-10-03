-- Bete Qinie: granting admin, and closing a hole that lets users grant it to themselves
--
-- Run in the Supabase SQL editor, which bypasses RLS.

-- 1. Make an account an admin. Handles the case where the profile row is
--    missing (e.g. the account predates the handle_new_user trigger).
insert into public.profiles (id, role)
select id, 'admin' from auth.users where email = 'REPLACE@WITH.YOUR.EMAIL'
on conflict (id) do update set role = 'admin';

-- 2. Check it took. role should read 'admin'.
select u.email, p.role
from public.profiles p
join auth.users u on u.id = p.id
order by p.role desc, u.email;


-- 3. SECURITY FIX — apply this regardless of the above.
--
-- user_accounts_and_game_progress.sql grants:
--
--     create policy "Profiles are updatable by owner"
--       on public.profiles for update
--       using (auth.uid() = id);
--
-- There is no restriction on which columns the owner may change, and `role`
-- lives in that same row. Any signed-in user can therefore promote themselves
-- with nothing but the anon key, which ships in the client:
--
--     update profiles set role = 'admin' where id = auth.uid();
--
-- That is enough to reach every admin policy in the database — the CMS, the
-- dictionary, and the መዐቀኒ tables. Replace the policy with one that lets a
-- user edit their own profile but not their own role.

drop policy if exists "Profiles are updatable by owner" on public.profiles;

create policy "Profiles are updatable by owner"
  on public.profiles for update
  using (auth.uid() = id)
  with check (
    auth.uid() = id
    and role = (select role from public.profiles where id = auth.uid())
  );

-- Admins stay able to change roles, but only through the SQL editor or a
-- service-role key — never from the browser.
