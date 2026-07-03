-- Final marination ledger guard: staff may only create operational movements.
-- Owner-only actions are adjustment creation, any movement editing, and voiding.

drop policy if exists "Allowed marination users can insert movements" on public.marination_stock_movements;
drop policy if exists "Allowed marination users can update movements" on public.marination_stock_movements;

create policy "Allowed marination users can insert operational movements"
on public.marination_stock_movements
for insert
to authenticated
with check (
  created_by = auth.uid()
  and lower((auth.jwt() ->> 'email')) in (
    'sorrawisaaemprathom20mar2530@gmail.com',
    'iqd2555@gmail.com',
    'kommuangkham@gmail.com'
  )
  and (
    public.current_profile_role() = 'owner'
    or movement_type in ('received', 'used', 'counted')
  )
);

create policy "Marination movements owners update ledger"
on public.marination_stock_movements
for update
to authenticated
using (public.current_profile_role() = 'owner')
with check (public.current_profile_role() = 'owner');
