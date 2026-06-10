-- Fix staff branch mapping so daily reports use the profile branch, not MAIN/default.

insert into public.branches (name, code, low_chicken_threshold, low_sticky_rice_threshold, low_oil_threshold)
values ('สาขาที่ 1 ร.ร.นวมินทร์', 'NAVAMIN', 5, 5, 2)
on conflict (code) do update set name = excluded.name;

with navamin_branch as (
  select id, name from public.branches where code = 'NAVAMIN' limit 1
)
update public.profiles p
set
  branch_id = navamin_branch.id,
  branch_name = navamin_branch.name
from navamin_branch
where p.role = 'staff'
  and (
    p.branch_name ilike '%นวมิน%'
    or p.branch_name ilike '%navamin%'
    or p.email ilike '%นวมิน%'
    or p.email ilike '%navamin%'
    or p.full_name ilike '%นวมิน%'
    or p.full_name ilike '%navamin%'
  );

update public.profiles p
set branch_name = b.name
from public.branches b
where p.branch_id = b.id
  and p.branch_name is distinct from b.name;

update public.daily_reports dr
set branch_name = b.name
from public.branches b
where dr.branch_id = b.id
  and dr.branch_name is distinct from b.name;

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
  profile_row public.profiles;
  display_name text;
  normalized_email text;
begin
  if auth.uid() is null or auth.uid() <> user_id then
    raise exception 'Cannot create profile for another user';
  end if;

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
      email = coalesce(profile_row.email, normalized_email)
    where id = user_id
    returning * into profile_row;

    return profile_row;
  end if;

  selected_role := 'staff';

  insert into public.profiles (id, email, full_name, role, branch_id, branch_name)
  values (
    user_id,
    normalized_email,
    display_name,
    selected_role,
    null,
    null
  )
  returning * into profile_row;

  return profile_row;
end;
$$;

grant execute on function public.ensure_login_profile(text, text, uuid) to authenticated;
