-- Split end-of-day remaining inventory into product-level columns for manual stock checks.
-- Safe to run in Supabase SQL Editor on an existing project.

alter table public.daily_reports
  add column if not exists remaining_original_chicken numeric default 0,
  add column if not exists remaining_spicy_chicken numeric default 0,
  add column if not exists remaining_chicken_skin numeric default 0,
  add column if not exists remaining_offal numeric default 0,
  add column if not exists remaining_chopped_chicken numeric default 0,
  add column if not exists remaining_drumstick numeric default 0;

update public.daily_reports
set
  remaining_original_chicken = coalesce(nullif(remaining_original_chicken, 0), remaining_chicken, 0),
  remaining_spicy_chicken = coalesce(remaining_spicy_chicken, 0),
  remaining_chicken_skin = coalesce(remaining_chicken_skin, 0),
  remaining_offal = coalesce(remaining_offal, 0),
  remaining_chopped_chicken = coalesce(remaining_chopped_chicken, 0),
  remaining_drumstick = coalesce(remaining_drumstick, 0);

alter table public.daily_reports
  alter column remaining_original_chicken set default 0,
  alter column remaining_original_chicken set not null,
  alter column remaining_spicy_chicken set default 0,
  alter column remaining_spicy_chicken set not null,
  alter column remaining_chicken_skin set default 0,
  alter column remaining_chicken_skin set not null,
  alter column remaining_offal set default 0,
  alter column remaining_offal set not null,
  alter column remaining_chopped_chicken set default 0,
  alter column remaining_chopped_chicken set not null,
  alter column remaining_drumstick set default 0,
  alter column remaining_drumstick set not null;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'daily_reports_remaining_original_chicken_nonnegative') then
    alter table public.daily_reports add constraint daily_reports_remaining_original_chicken_nonnegative check (remaining_original_chicken >= 0);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'daily_reports_remaining_spicy_chicken_nonnegative') then
    alter table public.daily_reports add constraint daily_reports_remaining_spicy_chicken_nonnegative check (remaining_spicy_chicken >= 0);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'daily_reports_remaining_chicken_skin_nonnegative') then
    alter table public.daily_reports add constraint daily_reports_remaining_chicken_skin_nonnegative check (remaining_chicken_skin >= 0);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'daily_reports_remaining_offal_nonnegative') then
    alter table public.daily_reports add constraint daily_reports_remaining_offal_nonnegative check (remaining_offal >= 0);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'daily_reports_remaining_chopped_chicken_nonnegative') then
    alter table public.daily_reports add constraint daily_reports_remaining_chopped_chicken_nonnegative check (remaining_chopped_chicken >= 0);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'daily_reports_remaining_drumstick_nonnegative') then
    alter table public.daily_reports add constraint daily_reports_remaining_drumstick_nonnegative check (remaining_drumstick >= 0);
  end if;
end $$;

drop view if exists public.daily_report_rollups;

create or replace view public.daily_report_rollups
with (security_invoker = true)
as
select
  dr.report_date,
  dr.branch_id,
  b.name as branch_name,
  b.code as branch_code,
  sum(dr.cash_sales)::numeric as cash_sales,
  sum(dr.transfer_sales)::numeric as transfer_sales,
  sum(dr.total_sales)::numeric as total_sales,
  sum(dr.received_chicken)::numeric as received_chicken,
  sum(dr.received_rice)::numeric as received_rice,
  sum(dr.received_sticky_rice)::numeric as received_sticky_rice,
  sum(dr.received_oil)::numeric as received_oil,
  sum(dr.received_sugar)::numeric as received_sugar,
  sum(dr.used_bl)::numeric as used_bl,
  sum(dr.used_bb)::numeric as used_bb,
  sum(dr.used_chicken_skin)::numeric as used_chicken_skin,
  sum(dr.used_oil)::numeric as used_oil,
  sum(dr.used_sticky_rice)::numeric as used_sticky_rice,
  sum(dr.used_chopped_chicken)::numeric as used_chopped_chicken,
  sum(dr.used_drumstick)::numeric as used_drumstick,
  sum(dr.order_original_chicken)::numeric as order_original_chicken,
  sum(dr.order_spicy_chicken)::numeric as order_spicy_chicken,
  sum(dr.order_offal)::numeric as order_offal,
  sum(dr.order_chopped_chicken)::numeric as order_chopped_chicken,
  sum(dr.order_drumstick)::numeric as order_drumstick,
  sum(dr.order_chicken_skin)::numeric as order_chicken_skin,
  sum(dr.order_sticky_rice)::numeric as order_sticky_rice,
  sum(dr.order_oil)::numeric as order_oil,
  sum(dr.order_palm_sugar)::numeric as order_palm_sugar,
  min(dr.remaining_chicken)::numeric as remaining_chicken,
  min(dr.remaining_original_chicken)::numeric as remaining_original_chicken,
  min(dr.remaining_spicy_chicken)::numeric as remaining_spicy_chicken,
  min(dr.remaining_chicken_skin)::numeric as remaining_chicken_skin,
  min(dr.remaining_offal)::numeric as remaining_offal,
  min(dr.remaining_chopped_chicken)::numeric as remaining_chopped_chicken,
  min(dr.remaining_drumstick)::numeric as remaining_drumstick,
  min(dr.remaining_sticky_rice)::numeric as remaining_sticky_rice,
  min(dr.remaining_oil)::numeric as remaining_oil,
  count(*)::integer as report_count
from public.daily_reports dr
join public.branches b on b.id = dr.branch_id
group by dr.report_date, dr.branch_id, b.name, b.code;

grant select on public.daily_report_rollups to authenticated;
notify pgrst, 'reload schema';
