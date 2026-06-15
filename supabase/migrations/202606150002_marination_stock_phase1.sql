-- Phase 1: ระบบโรงหมักไก่ สำหรับควบคุมยอดไก่สดรายวัน
create table if not exists public.chicken_parts (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  sort_order int,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.marination_stock_movements (
  id uuid primary key default gen_random_uuid(),
  movement_date date not null,
  chicken_part_id uuid not null references public.chicken_parts(id),
  movement_type text not null check (movement_type in ('received', 'used', 'counted', 'adjustment')),
  quantity_kg numeric(10,2) not null check (movement_type = 'adjustment' or quantity_kg >= 0),
  note text,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now()
);

create index if not exists chicken_parts_sort_order_idx on public.chicken_parts(sort_order, name);
create index if not exists marination_stock_movements_date_idx on public.marination_stock_movements(movement_date desc, created_at desc);
create index if not exists marination_stock_movements_part_date_idx on public.marination_stock_movements(chicken_part_id, movement_date desc);
create index if not exists marination_stock_movements_created_by_idx on public.marination_stock_movements(created_by);

alter table public.chicken_parts enable row level security;
alter table public.marination_stock_movements enable row level security;

create policy "chicken parts read authenticated" on public.chicken_parts
for select using (auth.role() = 'authenticated');

create policy "chicken parts owners manage" on public.chicken_parts
for all using (public.current_profile_role() = 'owner')
with check (public.current_profile_role() = 'owner');

create policy "marination movements read by authenticated" on public.marination_stock_movements
for select using (auth.role() = 'authenticated');

create policy "marination movements staff insert own" on public.marination_stock_movements
for insert with check (public.current_profile_role() in ('owner', 'staff') and created_by = auth.uid());

create policy "marination movements owners update" on public.marination_stock_movements
for update using (public.current_profile_role() = 'owner')
with check (public.current_profile_role() = 'owner');

insert into public.chicken_parts (name, sort_order)
values
  ('เศษ BL', 1),
  ('เศษ BB', 2),
  ('หนังไก่', 3),
  ('เครื่องใน', 4),
  ('เครื่องในไม่ผ่า', 5),
  ('น่องเล็ก', 6),
  ('ไก่สับ', 7)
on conflict (name) do update set sort_order = excluded.sort_order, is_active = true;

do $$
begin
  alter publication supabase_realtime add table public.marination_stock_movements;
exception
  when duplicate_object then null;
  when undefined_object then null;
end $$;
