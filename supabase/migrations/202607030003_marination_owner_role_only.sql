-- Enforce marination privileged actions by the real profile role only.
-- Email allowlists may grant page access, but only profiles.role = 'owner'
-- can create/edit adjustments or void incorrect movements.

create or replace function public.is_marination_owner_user()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.current_profile_role() = 'owner', false)
$$;

create or replace function public.prevent_non_owner_marination_void()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if coalesce(old.is_voided, false) is distinct from coalesce(new.is_voided, false)
    or old.voided_at is distinct from new.voided_at
    or old.voided_by is distinct from new.voided_by
    or old.void_reason is distinct from new.void_reason then
    if not public.is_marination_owner_user() then
      raise exception 'Only owner can void marination stock movement';
    end if;
  end if;
  return new;
end;
$$;
