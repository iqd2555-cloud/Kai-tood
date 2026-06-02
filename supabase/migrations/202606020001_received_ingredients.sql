-- Add morning received ingredient fields for stock-flow reporting.
-- Safe to run in Supabase SQL Editor on an existing project.

alter table public.daily_reports
  add column if not exists received_chicken numeric not null default 0 check (received_chicken >= 0),
  add column if not exists received_sticky_rice numeric not null default 0 check (received_sticky_rice >= 0),
  add column if not exists received_oil numeric not null default 0 check (received_oil >= 0);

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
  sum(dr.received_sticky_rice)::numeric as received_sticky_rice,
  sum(dr.received_oil)::numeric as received_oil,
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
  min(dr.remaining_sticky_rice)::numeric as remaining_sticky_rice,
  min(dr.remaining_oil)::numeric as remaining_oil,
  count(*)::integer as report_count
from public.daily_reports dr
join public.branches b on b.id = dr.branch_id
group by dr.report_date, dr.branch_id, b.name, b.code;

grant select on public.daily_report_rollups to authenticated;

drop function if exists public.owner_dashboard_totals(date, date);

create or replace function public.owner_dashboard_totals(p_from date, p_to date)
returns table (
  cash_sales numeric,
  transfer_sales numeric,
  total_sales numeric,
  received_chicken numeric,
  received_sticky_rice numeric,
  received_oil numeric,
  used_bl numeric,
  used_bb numeric,
  used_chicken_skin numeric,
  used_oil numeric,
  used_sticky_rice numeric,
  used_chopped_chicken numeric,
  used_drumstick numeric,
  order_original_chicken numeric,
  order_spicy_chicken numeric,
  order_offal numeric,
  order_chopped_chicken numeric,
  order_drumstick numeric,
  order_chicken_skin numeric,
  order_sticky_rice numeric,
  order_oil numeric,
  order_palm_sugar numeric,
  branch_count integer,
  report_count integer
)
language sql
stable
security invoker
as $$
  select
    coalesce(sum(dr.cash_sales), 0)::numeric as cash_sales,
    coalesce(sum(dr.transfer_sales), 0)::numeric as transfer_sales,
    coalesce(sum(dr.total_sales), 0)::numeric as total_sales,
    coalesce(sum(dr.received_chicken), 0)::numeric as received_chicken,
    coalesce(sum(dr.received_sticky_rice), 0)::numeric as received_sticky_rice,
    coalesce(sum(dr.received_oil), 0)::numeric as received_oil,
    coalesce(sum(dr.used_bl), 0)::numeric as used_bl,
    coalesce(sum(dr.used_bb), 0)::numeric as used_bb,
    coalesce(sum(dr.used_chicken_skin), 0)::numeric as used_chicken_skin,
    coalesce(sum(dr.used_oil), 0)::numeric as used_oil,
    coalesce(sum(dr.used_sticky_rice), 0)::numeric as used_sticky_rice,
    coalesce(sum(dr.used_chopped_chicken), 0)::numeric as used_chopped_chicken,
    coalesce(sum(dr.used_drumstick), 0)::numeric as used_drumstick,
    coalesce(sum(dr.order_original_chicken), 0)::numeric as order_original_chicken,
    coalesce(sum(dr.order_spicy_chicken), 0)::numeric as order_spicy_chicken,
    coalesce(sum(dr.order_offal), 0)::numeric as order_offal,
    coalesce(sum(dr.order_chopped_chicken), 0)::numeric as order_chopped_chicken,
    coalesce(sum(dr.order_drumstick), 0)::numeric as order_drumstick,
    coalesce(sum(dr.order_chicken_skin), 0)::numeric as order_chicken_skin,
    coalesce(sum(dr.order_sticky_rice), 0)::numeric as order_sticky_rice,
    coalesce(sum(dr.order_oil), 0)::numeric as order_oil,
    coalesce(sum(dr.order_palm_sugar), 0)::numeric as order_palm_sugar,
    count(distinct dr.branch_id)::integer as branch_count,
    count(*)::integer as report_count
  from public.daily_reports dr
  where dr.report_date between p_from and p_to;
$$;

grant execute on function public.owner_dashboard_totals(date, date) to authenticated;
notify pgrst, 'reload schema';
