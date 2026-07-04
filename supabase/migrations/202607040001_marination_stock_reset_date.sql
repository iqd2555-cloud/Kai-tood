-- Stock Reset Date for marination stock.
-- Movements before the active reset date remain stored for audit/history, but
-- application ledger replay ignores them for current stock calculations.
create table if not exists public.marination_stock_resets (
  id uuid primary key default gen_random_uuid(),
  reset_date date not null,
  branch_id uuid null,
  note text null,
  created_at timestamptz not null default now(),
  created_by uuid null references auth.users(id),
  is_active boolean not null default true
);

create index if not exists marination_stock_resets_active_date_idx
on public.marination_stock_resets(is_active, reset_date desc, created_at desc);

create index if not exists marination_stock_resets_branch_active_date_idx
on public.marination_stock_resets(branch_id, is_active, reset_date desc, created_at desc);

alter table public.marination_stock_resets enable row level security;

create policy "marination stock resets read authenticated" on public.marination_stock_resets
for select using (auth.role() = 'authenticated');

create policy "marination stock resets owners insert" on public.marination_stock_resets
for insert with check (public.current_profile_role() = 'owner');

create policy "marination stock resets owners update" on public.marination_stock_resets
for update using (public.current_profile_role() = 'owner')
with check (public.current_profile_role() = 'owner');

create policy "marination stock resets owners delete" on public.marination_stock_resets
for delete using (public.current_profile_role() = 'owner');

insert into public.marination_stock_resets (reset_date, branch_id, note, is_active)
select date '2026-07-03', null, 'ตั้งต้นสต๊อกโรงหมักใหม่: ตัด movement ก่อนวันที่ 03/07/2026 ออกจากยอดปัจจุบัน', true
where not exists (
  select 1
  from public.marination_stock_resets
  where reset_date = date '2026-07-03'
    and branch_id is null
    and is_active = true
);
