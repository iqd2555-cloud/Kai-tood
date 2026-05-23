-- Ensure all newly provisioned users are staff and auto-linked to MAIN/default branch

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

  selected_role := 'staff';

  insert into public.profiles (id, email, full_name, role, branch_id)
  values (
    user_id,
    normalized_email,
    display_name,
    selected_role,
    default_branch_id
  )
  returning * into profile_row;

  return profile_row;
end;
$$;

grant execute on function public.ensure_login_profile(text, text, uuid) to authenticated;
