-- Restrict marination stock tables to the approved marination user allowlist.
-- These policies intentionally replace the broader Phase 1 authenticated/owner policies.

drop policy if exists "chicken parts read authenticated" on public.chicken_parts;
drop policy if exists "chicken parts owners manage" on public.chicken_parts;
drop policy if exists "marination movements read by authenticated" on public.marination_stock_movements;
drop policy if exists "marination movements staff insert own" on public.marination_stock_movements;
drop policy if exists "marination movements owners update" on public.marination_stock_movements;

drop policy if exists "Allowed marination users can read chicken parts" on public.chicken_parts;
drop policy if exists "Allowed marination users can insert chicken parts" on public.chicken_parts;
drop policy if exists "Allowed marination users can update chicken parts" on public.chicken_parts;
drop policy if exists "Allowed marination users can read movements" on public.marination_stock_movements;
drop policy if exists "Allowed marination users can insert movements" on public.marination_stock_movements;
drop policy if exists "Allowed marination users can update movements" on public.marination_stock_movements;

create policy "Allowed marination users can read chicken parts"
on public.chicken_parts
for select
to authenticated
using (lower((auth.jwt() ->> 'email')) in (
  'sorrawisaaemprathom20mar2530@gmail.com',
  'iqd2555@gmail.com',
  'kommuangkham@gmail.com'
));

create policy "Allowed marination users can insert chicken parts"
on public.chicken_parts
for insert
to authenticated
with check (lower((auth.jwt() ->> 'email')) in (
  'sorrawisaaemprathom20mar2530@gmail.com',
  'iqd2555@gmail.com',
  'kommuangkham@gmail.com'
));

create policy "Allowed marination users can update chicken parts"
on public.chicken_parts
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

create policy "Allowed marination users can read movements"
on public.marination_stock_movements
for select
to authenticated
using (lower((auth.jwt() ->> 'email')) in (
  'sorrawisaaemprathom20mar2530@gmail.com',
  'iqd2555@gmail.com',
  'kommuangkham@gmail.com'
));

create policy "Allowed marination users can insert movements"
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
);

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
