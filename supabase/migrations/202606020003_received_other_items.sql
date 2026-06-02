-- Store miscellaneous received-inventory items entered from the daily form.
-- RLS for daily_reports remains branch-scoped by the existing insert/update policies.

alter table public.daily_reports
  add column if not exists received_other_items jsonb not null default '[]'::jsonb;

update public.daily_reports
set received_other_items = coalesce(received_other_items, '[]'::jsonb);

create index if not exists daily_reports_received_other_items_idx
  on public.daily_reports using gin (received_other_items);
