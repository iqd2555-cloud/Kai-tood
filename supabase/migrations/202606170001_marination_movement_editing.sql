-- Add audit timestamp for editing existing marination stock movement records.
alter table public.marination_stock_movements
add column if not exists updated_at timestamptz;

-- Keep update access restricted to the approved marination users allowlist.
drop policy if exists "Allowed marination users can update movements" on public.marination_stock_movements;

create policy "Allowed marination users can update movements"
on public.marination_stock_movements
for update
to authenticated
using (lower((auth.jwt() ->> 'email')) in (
  'sorrawisaaemprathom20mar2530@gmail.com',
  'iqd2555@gmail.com',
  'kommuangkham@gmail.com'
))
with check (lower((auth.jwt() ->> 'email')) in (
  'sorrawisaaemprathom20mar2530@gmail.com',
  'iqd2555@gmail.com',
  'kommuangkham@gmail.com'
));
