-- Reporting and performance hardening for production dashboards.
-- Safe to run after supabase/schema.sql on an existing project.

create index if not exists daily_reports_submitted_by_date_idx
  on public.daily_reports(submitted_by, report_date desc);

create index if not exists daily_reports_updated_at_idx
  on public.daily_reports(updated_at desc);

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
    count(distinct dr.branch_id)::integer as branch_count,
    count(*)::integer as report_count
  from public.daily_reports dr
  where dr.report_date between p_from and p_to;
$$;

grant execute on function public.owner_dashboard_totals(date, date) to authenticated;
notify pgrst, 'reload schema';
