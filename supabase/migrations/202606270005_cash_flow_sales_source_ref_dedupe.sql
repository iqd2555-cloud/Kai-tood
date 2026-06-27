-- Canonicalize sales Cash Flow source references and enforce one sales entry per branch/day.
-- Standard source_ref_id for sales is: report_date || '_' || branch_id.

-- Existing unique indexes may use the wrong source_ref_id values, so remove them before normalization.
drop index if exists public.cash_flow_entries_source_unique;
drop index if exists public.cash_flow_entries_source_ref_id_unique;

update public.cash_flow_entries
set source_ref_id = transaction_date::text || '_' || branch_id,
    updated_at = now()
where source = 'sales'
  and transaction_date is not null
  and branch_id is not null
  and source_ref_id is distinct from transaction_date::text || '_' || branch_id;

with ranked_sales as (
  select
    id,
    row_number() over (
      partition by transaction_date, branch_id, source
      order by
        case when source_ref_id = transaction_date::text || '_' || branch_id then 0 else 1 end,
        updated_at desc nulls last,
        created_at desc nulls last,
        id desc
    ) as keep_rank
  from public.cash_flow_entries
  where source = 'sales'
    and transaction_date is not null
    and branch_id is not null
)
delete from public.cash_flow_entries e
using ranked_sales r
where e.id = r.id
  and r.keep_rank > 1;

create unique index cash_flow_entries_source_ref_id_unique
on public.cash_flow_entries (source, source_ref_id);

notify pgrst, 'reload schema';
