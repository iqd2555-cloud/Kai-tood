-- Structured ingredient usage and order request fields for Kai Tood reports.
-- Safe to run in Supabase SQL Editor on an existing project.

alter table public.daily_reports
  add column if not exists used_chopped_chicken numeric not null default 0 check (used_chopped_chicken >= 0),
  add column if not exists used_drumstick numeric not null default 0 check (used_drumstick >= 0),
  add column if not exists order_wrapping_paper numeric not null default 0 check (order_wrapping_paper >= 0),
  add column if not exists order_plastic_bag numeric not null default 0 check (order_plastic_bag >= 0),
  add column if not exists order_tom_yum_powder numeric not null default 0 check (order_tom_yum_powder >= 0),
  add column if not exists order_cheese_powder numeric not null default 0 check (order_cheese_powder >= 0),
  add column if not exists order_paprika_powder numeric not null default 0 check (order_paprika_powder >= 0),
  add column if not exists order_wing_zabb_powder numeric not null default 0 check (order_wing_zabb_powder >= 0),
  add column if not exists order_hot_spicy_powder numeric not null default 0 check (order_hot_spicy_powder >= 0);

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
  sum(dr.used_bl)::numeric as used_bl,
  sum(dr.used_bb)::numeric as used_bb,
  sum(dr.used_chicken_skin)::numeric as used_chicken_skin,
  sum(dr.used_oil)::numeric as used_oil,
  sum(dr.used_sticky_rice)::numeric as used_sticky_rice,
  sum(dr.used_chopped_chicken)::numeric as used_chopped_chicken,
  sum(dr.used_drumstick)::numeric as used_drumstick,
  sum(dr.order_wrapping_paper)::numeric as order_wrapping_paper,
  sum(dr.order_plastic_bag)::numeric as order_plastic_bag,
  sum(dr.order_tom_yum_powder)::numeric as order_tom_yum_powder,
  sum(dr.order_cheese_powder)::numeric as order_cheese_powder,
  sum(dr.order_paprika_powder)::numeric as order_paprika_powder,
  sum(dr.order_wing_zabb_powder)::numeric as order_wing_zabb_powder,
  sum(dr.order_hot_spicy_powder)::numeric as order_hot_spicy_powder,
  min(dr.remaining_chicken)::numeric as remaining_chicken,
  min(dr.remaining_sticky_rice)::numeric as remaining_sticky_rice,
  min(dr.remaining_oil)::numeric as remaining_oil,
  count(*)::integer as report_count
from public.daily_reports dr
join public.branches b on b.id = dr.branch_id
group by dr.report_date, dr.branch_id, b.name, b.code;

grant select on public.daily_report_rollups to authenticated;

create or replace function public.owner_dashboard_totals(p_from date, p_to date)
returns table (
  cash_sales numeric,
  transfer_sales numeric,
  total_sales numeric,
  used_bl numeric,
  used_bb numeric,
  used_chicken_skin numeric,
  used_oil numeric,
  used_sticky_rice numeric,
  used_chopped_chicken numeric,
  used_drumstick numeric,
  order_wrapping_paper numeric,
  order_plastic_bag numeric,
  order_tom_yum_powder numeric,
  order_cheese_powder numeric,
  order_paprika_powder numeric,
  order_wing_zabb_powder numeric,
  order_hot_spicy_powder numeric,
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
    coalesce(sum(dr.used_bl), 0)::numeric as used_bl,
    coalesce(sum(dr.used_bb), 0)::numeric as used_bb,
    coalesce(sum(dr.used_chicken_skin), 0)::numeric as used_chicken_skin,
    coalesce(sum(dr.used_oil), 0)::numeric as used_oil,
    coalesce(sum(dr.used_sticky_rice), 0)::numeric as used_sticky_rice,
    coalesce(sum(dr.used_chopped_chicken), 0)::numeric as used_chopped_chicken,
    coalesce(sum(dr.used_drumstick), 0)::numeric as used_drumstick,
    coalesce(sum(dr.order_wrapping_paper), 0)::numeric as order_wrapping_paper,
    coalesce(sum(dr.order_plastic_bag), 0)::numeric as order_plastic_bag,
    coalesce(sum(dr.order_tom_yum_powder), 0)::numeric as order_tom_yum_powder,
    coalesce(sum(dr.order_cheese_powder), 0)::numeric as order_cheese_powder,
    coalesce(sum(dr.order_paprika_powder), 0)::numeric as order_paprika_powder,
    coalesce(sum(dr.order_wing_zabb_powder), 0)::numeric as order_wing_zabb_powder,
    coalesce(sum(dr.order_hot_spicy_powder), 0)::numeric as order_hot_spicy_powder,
    count(distinct dr.branch_id)::integer as branch_count,
    count(*)::integer as report_count
  from public.daily_reports dr
  where dr.report_date between p_from and p_to;
$$;

grant execute on function public.owner_dashboard_totals(date, date) to authenticated;
notify pgrst, 'reload schema';
