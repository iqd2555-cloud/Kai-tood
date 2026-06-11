-- Create or promote the second owner profile for Kai Tood Manager.
-- Safe to run multiple times in Supabase SQL Editor.
--
-- Owner profile requirement:
--   email       = koykoykoy9783@gmail.com
--   role        = owner
--   branch_id   = null
--   branch_name = null
--
-- Note: public.profiles.id references auth.users(id), so this migration can
-- immediately upsert the profile only when the Supabase Auth user already
-- exists. The ensure_login_profile RPC below guarantees the same owner access
-- is applied automatically when this email signs in for the first time.

alter table public.profiles add column if not exists email text;
alter table public.profiles add column if not exists branch_name text;

drop function if exists public.ensure_login_profile(text, text, uuid);

create or replace function public.ensure_login_profile(
  user_email text default null,
  user_full_name text default null,
  user_id uuid default auth.uid()
)
returns public.profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  selected_role public.user_role;
  selected_branch_id uuid;
  selected_branch_name text;
  profile_row public.profiles;
  display_name text;
  normalized_email text;
  second_owner_email constant text := 'koykoykoy9783@gmail.com';
begin
  if auth.uid() is null or auth.uid() <> user_id then
    raise exception 'Cannot create profile for another user';
  end if;

  normalized_email := nullif(lower(trim(coalesce(user_email, ''))), '');
  display_name := nullif(trim(coalesce(user_full_name, split_part(coalesce(normalized_email, ''), '@', 1), '')), '');

  if display_name is null then
    display_name := 'ผู้ใช้งาน';
  end if;

  if normalized_email = second_owner_email then
    selected_role := 'owner';
    selected_branch_id := null;
    selected_branch_name := null;
  else
    selected_role := 'staff';
    selected_branch_id := null;
    selected_branch_name := null;
  end if;

  select p.* into profile_row from public.profiles p where p.id = user_id;

  if found then
    update public.profiles
    set
      full_name = coalesce(nullif(profile_row.full_name, ''), display_name),
      email = coalesce(normalized_email, profile_row.email),
      role = case when normalized_email = second_owner_email then 'owner'::public.user_role else profile_row.role end,
      branch_id = case when normalized_email = second_owner_email then null else profile_row.branch_id end,
      branch_name = case when normalized_email = second_owner_email then null else profile_row.branch_name end
    where id = user_id
    returning * into profile_row;

    return profile_row;
  end if;

  insert into public.profiles (id, email, full_name, role, branch_id, branch_name)
  values (
    user_id,
    normalized_email,
    display_name,
    selected_role,
    selected_branch_id,
    selected_branch_name
  )
  returning * into profile_row;

  return profile_row;
end;
$$;

grant execute on function public.ensure_login_profile(text, text, uuid) to authenticated;

-- Promote/update the target profile now if the Auth user or profile already exists.
with target_auth_user as (
  select u.id, lower(trim(u.email)) as email
  from auth.users u
  where lower(trim(u.email)) = 'koykoykoy9783@gmail.com'
  limit 1
), updated_existing_profile as (
  update public.profiles p
  set
    email = 'koykoykoy9783@gmail.com',
    role = 'owner'::public.user_role,
    branch_id = null,
    branch_name = null
  where lower(trim(coalesce(p.email, ''))) = 'koykoykoy9783@gmail.com'
     or p.id in (select id from target_auth_user)
  returning p.id
)
insert into public.profiles (id, email, full_name, role, branch_id, branch_name)
select
  u.id,
  'koykoykoy9783@gmail.com',
  split_part('koykoykoy9783@gmail.com', '@', 1),
  'owner'::public.user_role,
  null,
  null
from target_auth_user u
where not exists (select 1 from updated_existing_profile)
  and not exists (select 1 from public.profiles p where p.id = u.id);

-- Verification SQL:
select
  email,
  role,
  branch_id,
  branch_name
from public.profiles
where lower(email) = 'koykoykoy9783@gmail.com';
