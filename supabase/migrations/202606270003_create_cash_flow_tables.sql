create extension if not exists pgcrypto;

create table if not exists public.cash_flow_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  type text not null check (type in ('income', 'expense')),
  code text unique,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.cash_flow_entries (
  id uuid primary key default gen_random_uuid(),

  transaction_date date not null,
  due_date date,

  type text not null check (type in ('income', 'expense')),
  status text not null check (status in (
    'pending_receive',
    'received',
    'pending_pay',
    'paid',
    'cancelled',
    'overdue'
  )),

  category text,
  category_id uuid references public.cash_flow_categories(id),

  description text not null,
  amount numeric(12,2) not null default 0,

  payment_method text,
  branch_id text,
  department text,

  source text not null default 'manual',
  source_ref_id text,

  attachment_url text,
  created_by text,
  note text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists cash_flow_entries_source_unique
on public.cash_flow_entries (source, source_ref_id)
where source_ref_id is not null;

create unique index if not exists cash_flow_entries_source_ref_id_unique
on public.cash_flow_entries (source, source_ref_id);

create index if not exists cash_flow_entries_transaction_date_idx
on public.cash_flow_entries (transaction_date);

create index if not exists cash_flow_entries_type_status_idx
on public.cash_flow_entries (type, status);

create or replace function public.set_cash_flow_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_cash_flow_updated_at on public.cash_flow_entries;

create trigger trg_cash_flow_updated_at
before update on public.cash_flow_entries
for each row
execute function public.set_cash_flow_updated_at();

alter table public.cash_flow_categories enable row level security;
alter table public.cash_flow_entries enable row level security;

drop policy if exists "cash_flow_categories_select" on public.cash_flow_categories;
drop policy if exists "cash_flow_categories_insert" on public.cash_flow_categories;
drop policy if exists "cash_flow_categories_update" on public.cash_flow_categories;

create policy "cash_flow_categories_select"
on public.cash_flow_categories
for select
to authenticated
using (true);

create policy "cash_flow_categories_insert"
on public.cash_flow_categories
for insert
to authenticated
with check (true);

create policy "cash_flow_categories_update"
on public.cash_flow_categories
for update
to authenticated
using (true)
with check (true);

drop policy if exists "cash_flow_entries_select" on public.cash_flow_entries;
drop policy if exists "cash_flow_entries_insert" on public.cash_flow_entries;
drop policy if exists "cash_flow_entries_update" on public.cash_flow_entries;
drop policy if exists "cash_flow_entries_delete" on public.cash_flow_entries;

create policy "cash_flow_entries_select"
on public.cash_flow_entries
for select
to authenticated
using (true);

create policy "cash_flow_entries_insert"
on public.cash_flow_entries
for insert
to authenticated
with check (true);

create policy "cash_flow_entries_update"
on public.cash_flow_entries
for update
to authenticated
using (true)
with check (true);

create policy "cash_flow_entries_delete"
on public.cash_flow_entries
for delete
to authenticated
using (true);

insert into public.cash_flow_categories (name, type, code)
values
('ยอดขายหน้าร้าน', 'income', 'sales_revenue'),
('รายรับแฟรนไชส์', 'income', 'franchise_income'),
('รายรับคอร์ส/หนังสือ', 'income', 'course_book_income'),
('เติมเงินเข้ากิจการ', 'income', 'owner_fund_in'),
('รับเงินอื่น ๆ', 'income', 'other_income'),
('ซื้อไก่สด', 'expense', 'chicken_purchase'),
('ซื้อวัตถุดิบ', 'expense', 'ingredient_purchase'),
('ค่าแรง', 'expense', 'labor_cost'),
('ค่าเช่า', 'expense', 'rent'),
('ค่าขนส่ง', 'expense', 'transport'),
('ค่าโฆษณา', 'expense', 'advertising'),
('ค่าอุปกรณ์', 'expense', 'equipment'),
('ค่าใช้จ่ายจิปาถะ', 'expense', 'misc_expense')
on conflict (code) do nothing;

notify pgrst, 'reload schema';
