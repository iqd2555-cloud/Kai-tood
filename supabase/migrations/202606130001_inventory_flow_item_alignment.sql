-- Align daily inventory fields so every item has opening, received, used, and actual closing values.
-- Safe to run on existing Supabase projects; existing columns and data are preserved.

alter table public.daily_reports
  add column if not exists opening_original_chicken numeric default 0,
  add column if not exists opening_spicy_chicken numeric default 0,
  add column if not exists opening_ground_chicken numeric default 0,
  add column if not exists opening_drumstick numeric default 0,
  add column if not exists opening_offal numeric default 0,
  add column if not exists opening_chicken_skin numeric default 0,
  add column if not exists opening_sticky_rice numeric default 0,
  add column if not exists opening_oil numeric default 0,
  add column if not exists received_original_chicken numeric default 0,
  add column if not exists received_spicy_chicken numeric default 0,
  add column if not exists received_ground_chicken numeric default 0,
  add column if not exists received_drumstick numeric default 0,
  add column if not exists received_offal numeric default 0,
  add column if not exists received_chicken_skin numeric default 0,
  add column if not exists used_offal numeric default 0;

update public.daily_reports
set
  opening_original_chicken = coalesce(opening_original_chicken, 0),
  opening_spicy_chicken = coalesce(opening_spicy_chicken, 0),
  opening_ground_chicken = coalesce(opening_ground_chicken, 0),
  opening_drumstick = coalesce(opening_drumstick, 0),
  opening_offal = coalesce(opening_offal, 0),
  opening_chicken_skin = coalesce(opening_chicken_skin, 0),
  opening_sticky_rice = coalesce(opening_sticky_rice, 0),
  opening_oil = coalesce(opening_oil, 0),
  received_original_chicken = coalesce(nullif(received_original_chicken, 0), received_chicken, 0),
  received_spicy_chicken = coalesce(received_spicy_chicken, 0),
  received_ground_chicken = coalesce(received_ground_chicken, 0),
  received_drumstick = coalesce(received_drumstick, 0),
  received_offal = coalesce(received_offal, 0),
  received_chicken_skin = coalesce(received_chicken_skin, 0),
  used_offal = coalesce(used_offal, 0);

alter table public.daily_reports
  alter column opening_original_chicken set not null,
  alter column opening_spicy_chicken set not null,
  alter column opening_ground_chicken set not null,
  alter column opening_drumstick set not null,
  alter column opening_offal set not null,
  alter column opening_chicken_skin set not null,
  alter column opening_sticky_rice set not null,
  alter column opening_oil set not null,
  alter column received_original_chicken set not null,
  alter column received_spicy_chicken set not null,
  alter column received_ground_chicken set not null,
  alter column received_drumstick set not null,
  alter column received_offal set not null,
  alter column received_chicken_skin set not null,
  alter column used_offal set not null;

do $$
declare
  column_name text;
begin
  foreach column_name in array array[
    'opening_original_chicken', 'opening_spicy_chicken', 'opening_ground_chicken', 'opening_drumstick',
    'opening_offal', 'opening_chicken_skin', 'opening_sticky_rice', 'opening_oil',
    'received_original_chicken', 'received_spicy_chicken', 'received_ground_chicken', 'received_drumstick',
    'received_offal', 'received_chicken_skin', 'used_offal'
  ] loop
    if not exists (select 1 from pg_constraint where conname = 'daily_reports_' || column_name || '_nonnegative') then
      execute format('alter table public.daily_reports add constraint %I check (%I >= 0)', 'daily_reports_' || column_name || '_nonnegative', column_name);
    end if;
  end loop;
end $$;

notify pgrst, 'reload schema';
