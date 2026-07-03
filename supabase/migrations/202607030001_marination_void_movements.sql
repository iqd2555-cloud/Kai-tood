-- Add soft-void fields for incorrect marination movements.
alter table public.marination_stock_movements
  add column if not exists is_voided boolean not null default false,
  add column if not exists voided_at timestamptz,
  add column if not exists voided_by uuid references auth.users(id),
  add column if not exists void_reason text;

create index if not exists marination_stock_movements_active_date_idx
  on public.marination_stock_movements(movement_date desc, created_at desc)
  where is_voided = false;

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
    if public.current_profile_role() <> 'owner' then
      raise exception 'Only owner can void marination stock movement';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists prevent_non_owner_marination_void on public.marination_stock_movements;
create trigger prevent_non_owner_marination_void
before update on public.marination_stock_movements
for each row execute function public.prevent_non_owner_marination_void();
