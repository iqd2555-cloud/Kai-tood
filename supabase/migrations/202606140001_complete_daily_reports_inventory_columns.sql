-- Complete daily_reports inventory flow columns used by the staff daily report form.
-- Covers all required inventory groups for all items:
-- opening stock, received stock, used stock, and closing stock.

alter table public.daily_reports
  add column if not exists opening_original_chicken numeric not null default 0 check (opening_original_chicken >= 0),
  add column if not exists opening_spicy_chicken numeric not null default 0 check (opening_spicy_chicken >= 0),
  add column if not exists opening_ground_chicken numeric not null default 0 check (opening_ground_chicken >= 0),
  add column if not exists opening_drumstick numeric not null default 0 check (opening_drumstick >= 0),
  add column if not exists opening_offal numeric not null default 0 check (opening_offal >= 0),
  add column if not exists opening_chicken_skin numeric not null default 0 check (opening_chicken_skin >= 0),
  add column if not exists opening_sticky_rice numeric not null default 0 check (opening_sticky_rice >= 0),
  add column if not exists opening_oil numeric not null default 0 check (opening_oil >= 0),
  add column if not exists received_original_chicken numeric not null default 0 check (received_original_chicken >= 0),
  add column if not exists received_spicy_chicken numeric not null default 0 check (received_spicy_chicken >= 0),
  add column if not exists received_ground_chicken numeric not null default 0 check (received_ground_chicken >= 0),
  add column if not exists received_drumstick numeric not null default 0 check (received_drumstick >= 0),
  add column if not exists received_offal numeric not null default 0 check (received_offal >= 0),
  add column if not exists received_chicken_skin numeric not null default 0 check (received_chicken_skin >= 0),
  add column if not exists received_sticky_rice numeric not null default 0 check (received_sticky_rice >= 0),
  add column if not exists received_oil numeric not null default 0 check (received_oil >= 0),
  add column if not exists used_bl numeric not null default 0 check (used_bl >= 0),
  add column if not exists used_bb numeric not null default 0 check (used_bb >= 0),
  add column if not exists used_chopped_chicken numeric not null default 0 check (used_chopped_chicken >= 0),
  add column if not exists used_drumstick numeric not null default 0 check (used_drumstick >= 0),
  add column if not exists used_offal numeric not null default 0 check (used_offal >= 0),
  add column if not exists used_chicken_skin numeric not null default 0 check (used_chicken_skin >= 0),
  add column if not exists used_sticky_rice numeric not null default 0 check (used_sticky_rice >= 0),
  add column if not exists used_oil numeric not null default 0 check (used_oil >= 0),
  add column if not exists remaining_original_chicken numeric not null default 0 check (remaining_original_chicken >= 0),
  add column if not exists remaining_spicy_chicken numeric not null default 0 check (remaining_spicy_chicken >= 0),
  add column if not exists remaining_ground_chicken numeric not null default 0 check (remaining_ground_chicken >= 0),
  add column if not exists remaining_drumstick numeric not null default 0 check (remaining_drumstick >= 0),
  add column if not exists remaining_offal numeric not null default 0 check (remaining_offal >= 0),
  add column if not exists remaining_chicken_skin numeric not null default 0 check (remaining_chicken_skin >= 0),
  add column if not exists remaining_sticky_rice numeric not null default 0 check (remaining_sticky_rice >= 0),
  add column if not exists remaining_oil numeric not null default 0 check (remaining_oil >= 0);

-- Normalize any legacy nullable columns that may have been created by earlier partial migrations.
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
  received_original_chicken = coalesce(received_original_chicken, received_chicken, 0),
  received_spicy_chicken = coalesce(received_spicy_chicken, 0),
  received_ground_chicken = coalesce(received_ground_chicken, 0),
  received_drumstick = coalesce(received_drumstick, 0),
  received_offal = coalesce(received_offal, 0),
  received_chicken_skin = coalesce(received_chicken_skin, 0),
  received_sticky_rice = coalesce(received_sticky_rice, 0),
  received_oil = coalesce(received_oil, 0),
  used_bl = coalesce(used_bl, 0),
  used_bb = coalesce(used_bb, 0),
  used_chopped_chicken = coalesce(used_chopped_chicken, 0),
  used_drumstick = coalesce(used_drumstick, 0),
  used_offal = coalesce(used_offal, 0),
  used_chicken_skin = coalesce(used_chicken_skin, 0),
  used_sticky_rice = coalesce(used_sticky_rice, 0),
  used_oil = coalesce(used_oil, 0),
  remaining_original_chicken = coalesce(remaining_original_chicken, remaining_chicken, 0),
  remaining_spicy_chicken = coalesce(remaining_spicy_chicken, 0),
  remaining_ground_chicken = coalesce(remaining_ground_chicken, 0),
  remaining_drumstick = coalesce(remaining_drumstick, 0),
  remaining_offal = coalesce(remaining_offal, 0),
  remaining_chicken_skin = coalesce(remaining_chicken_skin, 0),
  remaining_sticky_rice = coalesce(remaining_sticky_rice, 0),
  remaining_oil = coalesce(remaining_oil, 0);

alter table public.daily_reports
  alter column opening_original_chicken set default 0,
  alter column opening_original_chicken set not null,
  alter column opening_spicy_chicken set default 0,
  alter column opening_spicy_chicken set not null,
  alter column opening_ground_chicken set default 0,
  alter column opening_ground_chicken set not null,
  alter column opening_drumstick set default 0,
  alter column opening_drumstick set not null,
  alter column opening_offal set default 0,
  alter column opening_offal set not null,
  alter column opening_chicken_skin set default 0,
  alter column opening_chicken_skin set not null,
  alter column opening_sticky_rice set default 0,
  alter column opening_sticky_rice set not null,
  alter column opening_oil set default 0,
  alter column opening_oil set not null,
  alter column received_original_chicken set default 0,
  alter column received_original_chicken set not null,
  alter column received_spicy_chicken set default 0,
  alter column received_spicy_chicken set not null,
  alter column received_ground_chicken set default 0,
  alter column received_ground_chicken set not null,
  alter column received_drumstick set default 0,
  alter column received_drumstick set not null,
  alter column received_offal set default 0,
  alter column received_offal set not null,
  alter column received_chicken_skin set default 0,
  alter column received_chicken_skin set not null,
  alter column received_sticky_rice set default 0,
  alter column received_sticky_rice set not null,
  alter column received_oil set default 0,
  alter column received_oil set not null,
  alter column used_bl set default 0,
  alter column used_bl set not null,
  alter column used_bb set default 0,
  alter column used_bb set not null,
  alter column used_chopped_chicken set default 0,
  alter column used_chopped_chicken set not null,
  alter column used_drumstick set default 0,
  alter column used_drumstick set not null,
  alter column used_offal set default 0,
  alter column used_offal set not null,
  alter column used_chicken_skin set default 0,
  alter column used_chicken_skin set not null,
  alter column used_sticky_rice set default 0,
  alter column used_sticky_rice set not null,
  alter column used_oil set default 0,
  alter column used_oil set not null,
  alter column remaining_original_chicken set default 0,
  alter column remaining_original_chicken set not null,
  alter column remaining_spicy_chicken set default 0,
  alter column remaining_spicy_chicken set not null,
  alter column remaining_ground_chicken set default 0,
  alter column remaining_ground_chicken set not null,
  alter column remaining_drumstick set default 0,
  alter column remaining_drumstick set not null,
  alter column remaining_offal set default 0,
  alter column remaining_offal set not null,
  alter column remaining_chicken_skin set default 0,
  alter column remaining_chicken_skin set not null,
  alter column remaining_sticky_rice set default 0,
  alter column remaining_sticky_rice set not null,
  alter column remaining_oil set default 0,
  alter column remaining_oil set not null;


-- Ensure non-negative checks also exist for columns created by earlier partial migrations.
do $$
declare
  column_name text;
begin
  foreach column_name in array array[
    'opening_original_chicken', 'opening_spicy_chicken', 'opening_ground_chicken', 'opening_drumstick',
    'opening_offal', 'opening_chicken_skin', 'opening_sticky_rice', 'opening_oil',
    'received_original_chicken', 'received_spicy_chicken', 'received_ground_chicken', 'received_drumstick',
    'received_offal', 'received_chicken_skin', 'received_sticky_rice', 'received_oil',
    'used_bl', 'used_bb', 'used_chopped_chicken', 'used_drumstick',
    'used_offal', 'used_chicken_skin', 'used_sticky_rice', 'used_oil',
    'remaining_original_chicken', 'remaining_spicy_chicken', 'remaining_ground_chicken', 'remaining_drumstick',
    'remaining_offal', 'remaining_chicken_skin', 'remaining_sticky_rice', 'remaining_oil'
  ] loop
    if not exists (select 1 from pg_constraint where conname = 'daily_reports_' || column_name || '_nonnegative') then
      execute format('alter table public.daily_reports add constraint %I check (%I >= 0)', 'daily_reports_' || column_name || '_nonnegative', column_name);
    end if;
  end loop;
end $$;

-- Schema verification: fail the migration if any form inventory column is still missing.
do $$
declare
  missing_columns text[];
begin
  with required_columns(column_name) as (
    values
      ('opening_original_chicken'), ('opening_spicy_chicken'), ('opening_ground_chicken'), ('opening_drumstick'),
      ('opening_offal'), ('opening_chicken_skin'), ('opening_sticky_rice'), ('opening_oil'),
      ('received_original_chicken'), ('received_spicy_chicken'), ('received_ground_chicken'), ('received_drumstick'),
      ('received_offal'), ('received_chicken_skin'), ('received_sticky_rice'), ('received_oil'),
      ('used_bl'), ('used_bb'), ('used_chopped_chicken'), ('used_drumstick'),
      ('used_offal'), ('used_chicken_skin'), ('used_sticky_rice'), ('used_oil'),
      ('remaining_original_chicken'), ('remaining_spicy_chicken'), ('remaining_ground_chicken'), ('remaining_drumstick'),
      ('remaining_offal'), ('remaining_chicken_skin'), ('remaining_sticky_rice'), ('remaining_oil')
  )
  select coalesce(array_agg(rc.column_name order by rc.column_name), '{}')
  into missing_columns
  from required_columns rc
  left join information_schema.columns c
    on c.table_schema = 'public'
   and c.table_name = 'daily_reports'
   and c.column_name = rc.column_name
  where c.column_name is null;

  if array_length(missing_columns, 1) is not null then
    raise exception 'daily_reports missing inventory columns: %', array_to_string(missing_columns, ', ');
  end if;

  raise notice 'daily_reports inventory schema verification passed: all 32 required inventory columns exist.';
end $$;

notify pgrst, 'reload schema';
