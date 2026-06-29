-- Ensure Cash Flow deletion is observable and permitted for authenticated app users.
-- The app still restricts this action to owner profiles before issuing DELETE.
alter table public.cash_flow_entries enable row level security;

drop policy if exists "cash_flow_delete" on public.cash_flow_entries;
drop policy if exists "cash_flow_entries_delete" on public.cash_flow_entries;

create policy "cash_flow_delete"
on public.cash_flow_entries
for delete
to authenticated
using (true);

notify pgrst, 'reload schema';
