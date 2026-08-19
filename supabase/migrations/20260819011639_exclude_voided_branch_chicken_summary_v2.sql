-- Keep one live production shipment per branch and sale date, and ensure
-- voided shipments never contribute to operational totals.

create unique index if not exists uq_branch_chicken_one_live_production_per_day
  on public.branch_chicken_shipments (branch_id, sale_date)
  where voided_at is null and is_test = false;

create or replace view public.branch_chicken_shipment_summary
with (security_invoker = true)
as
select
  s.id,
  s.shipment_no,
  s.sale_date,
  s.branch_id,
  b.name as branch_name,
  s.status,
  s.prepared_at,
  s.transported_at,
  s.received_at,
  s.locked_at,
  coalesce(sum(i.prepared_qty), 0::numeric) as prepared_total,
  coalesce(sum(i.transport_qty), 0::numeric) as transport_total,
  coalesce(sum(i.received_qty), 0::numeric) as received_total,
  coalesce(
    sum(abs(coalesce(i.received_qty, 0::numeric) - coalesce(i.transport_qty, i.prepared_qty))),
    0::numeric
  ) as discrepancy_total,
  s.is_test
from public.branch_chicken_shipments s
join public.branches b on b.id = s.branch_id
left join public.branch_chicken_shipment_items i on i.shipment_id = s.id
where s.voided_at is null
  and s.status <> 'voided'
group by s.id, b.name;

revoke all on public.branch_chicken_shipment_summary from anon;
grant select on public.branch_chicken_shipment_summary to authenticated;
