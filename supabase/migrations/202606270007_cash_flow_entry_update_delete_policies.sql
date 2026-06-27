-- Ensure authenticated users can edit/delete Cash Flow entries through RLS.
alter table public.cash_flow_entries enable row level security;

drop policy if exists "cash_flow_entries_update" on public.cash_flow_entries;
create policy "cash_flow_entries_update"
on public.cash_flow_entries
for update
to authenticated
using (true)
with check (true);

drop policy if exists "cash_flow_entries_delete" on public.cash_flow_entries;
create policy "cash_flow_entries_delete"
on public.cash_flow_entries
for delete
to authenticated
using (true);
