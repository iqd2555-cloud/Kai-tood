-- Creates/updates the login provisioning RPC used by the app after Supabase Auth sign-in.
-- Safe to run multiple times in Supabase SQL Editor.

create extension if not exists "pgcrypto";

alter table public.profiles
  add column if not exists email text;

create or replace function public.ensure_default_branch()
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  default_branch_id uuid;
begin
  insert into public.branches (name, code, low_chicken_threshold, low_sticky_rice_threshold, low_oil_threshold)
  values ('สาขาหลัก', 'MAIN', 5, 5, 2)
  on conflict (code) do update
  set name = excluded.name
  returning id into default_branch_id;

  return default_branch_id;
end;
$$;

create or replace function public.ensure_login_profile(
  user_id uuid,
  user_email text default null,
  user_full_name text default null
)
returns public.profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  default_branch_id uuid;
  selected_role public.user_role;
  profile_row public.profiles;
  display_name text;
  normalized_email text;
begin
  if auth.uid() is null or auth.uid() <> user_id then
    raise exception 'Cannot create profile for another user';
  end if;

  default_branch_id := public.ensure_default_branch();
  normalized_email := nullif(lower(trim(coalesce(user_email, ''))), '');
  display_name := nullif(trim(coalesce(user_full_name, split_part(coalesce(normalized_email, ''), '@', 1), '')), '');

  if display_name is null then
    display_name := 'ผู้ใช้งาน';
  end if;

  select p.* into profile_row from public.profiles p where p.id = user_id;

  if found then
    update public.profiles
    set
      full_name = coalesce(nullif(profile_row.full_name, ''), display_name),
      email = coalesce(profile_row.email, normalized_email),
      branch_id = case
        when profile_row.role = 'staff' and profile_row.branch_id is null then default_branch_id
        else profile_row.branch_id
      end
    where id = user_id
    returning * into profile_row;

    return profile_row;
  end if;

  if exists (select 1 from public.profiles) then
    selected_role := 'staff';
  else
    selected_role := 'owner';
  end if;

  insert into public.profiles (id, email, full_name, role, branch_id)
  values (
    user_id,
    normalized_email,
    display_name,
    selected_role,
    case when selected_role = 'staff' then default_branch_id else null end
  )
  returning * into profile_row;

  return profile_row;
end;
$$;

grant execute on function public.ensure_default_branch() to authenticated;
grant execute on function public.ensure_login_profile(uuid, text, text) to authenticated;

notify pgrst, 'reload schema';
