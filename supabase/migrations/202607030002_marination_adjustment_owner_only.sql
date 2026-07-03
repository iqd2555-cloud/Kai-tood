-- Restrict marination stock adjustments to Owner users only.
-- Staff can still record received, used, and counted movements.

create or replace function public.is_marination_owner_user()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.current_profile_role() = 'owner', false)
    or lower(coalesce(auth.jwt() ->> 'email', '')) in (
      'kommuangkham@gmail.com',
      'iqd2555@gmail.com'
    )
$$;

create or replace function public.prevent_non_owner_marination_adjustment()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (tg_op = 'INSERT' and new.movement_type = 'adjustment')
    or (tg_op = 'UPDATE' and (old.movement_type = 'adjustment' or new.movement_type = 'adjustment')) then
    if not public.is_marination_owner_user() then
      raise exception 'Only owner can create or edit marination stock adjustment';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists prevent_non_owner_marination_adjustment on public.marination_stock_movements;
create trigger prevent_non_owner_marination_adjustment
before insert or update on public.marination_stock_movements
for each row execute function public.prevent_non_owner_marination_adjustment();
