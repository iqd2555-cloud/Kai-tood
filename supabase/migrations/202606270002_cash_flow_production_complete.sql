-- Complete production Cash Flow repair for Supabase projects that missed the Cash Flow tables.
-- Run in the same project configured by NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY.

create extension if not exists pgcrypto;

create table if not exists public.cash_flow_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  type text check (type in ('income', 'expense')),
  direction text check (direction in ('income', 'expense', 'in', 'out', 'both')),
  code text unique,
  sort_order integer not null default 100,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.cash_flow_categories add column if not exists type text;
alter table public.cash_flow_categories add column if not exists direction text;
alter table public.cash_flow_categories add column if not exists code text;
alter table public.cash_flow_categories add column if not exists sort_order integer not null default 100;
alter table public.cash_flow_categories add column if not exists is_active boolean not null default true;
alter table public.cash_flow_categories add column if not exists created_at timestamptz not null default now();

alter table public.cash_flow_categories drop constraint if exists cash_flow_categories_type_check;
alter table public.cash_flow_categories add constraint cash_flow_categories_type_check check (type is null or type in ('income', 'expense'));
alter table public.cash_flow_categories drop constraint if exists cash_flow_categories_direction_check;
alter table public.cash_flow_categories add constraint cash_flow_categories_direction_check check (direction is null or direction in ('income', 'expense', 'in', 'out', 'both'));
create unique index if not exists cash_flow_categories_code_unique on public.cash_flow_categories (code);

create table if not exists public.cash_flow_money_channels (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  opening_balance numeric not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.cash_flow_entries (
  id uuid primary key default gen_random_uuid(),
  transaction_date date not null,
  due_date date,
  type text not null check (type in ('income', 'expense')),
  status text not null check (status in ('pending_receive', 'received', 'pending_pay', 'paid', 'cancelled', 'overdue')),
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

alter table public.cash_flow_entries add column if not exists transaction_date date;
alter table public.cash_flow_entries add column if not exists due_date date;
alter table public.cash_flow_entries add column if not exists type text;
alter table public.cash_flow_entries add column if not exists status text;
alter table public.cash_flow_entries add column if not exists category text;
alter table public.cash_flow_entries add column if not exists category_id uuid references public.cash_flow_categories(id);
alter table public.cash_flow_entries add column if not exists description text;
alter table public.cash_flow_entries add column if not exists amount numeric(12,2) default 0;
alter table public.cash_flow_entries add column if not exists payment_method text;
alter table public.cash_flow_entries add column if not exists branch_id text;
alter table public.cash_flow_entries add column if not exists department text;
alter table public.cash_flow_entries add column if not exists source text default 'manual';
alter table public.cash_flow_entries add column if not exists source_ref_id text;
alter table public.cash_flow_entries add column if not exists attachment_url text;
alter table public.cash_flow_entries add column if not exists created_by text;
alter table public.cash_flow_entries add column if not exists note text;
alter table public.cash_flow_entries add column if not exists created_at timestamptz not null default now();
alter table public.cash_flow_entries add column if not exists updated_at timestamptz not null default now();

alter table public.cash_flow_entries drop constraint if exists cash_flow_entries_branch_id_fkey;
alter table public.cash_flow_entries drop constraint if exists cash_flow_entries_created_by_fkey;
alter table public.cash_flow_entries alter column branch_id type text using branch_id::text;
alter table public.cash_flow_entries alter column created_by type text using created_by::text;
alter table public.cash_flow_entries alter column type type text using case type::text when 'in' then 'income' when 'out' then 'expense' else type::text end;
alter table public.cash_flow_entries alter column status type text using case status::text when 'pending_in' then 'pending_receive' when 'pending_out' then 'pending_pay' else status::text end;
alter table public.cash_flow_entries alter column source type text using case source::text when 'auto' then 'sales' else source::text end;

update public.cash_flow_entries
set transaction_date = coalesce(transaction_date, current_date),
    type = case when type in ('expense', 'out') then 'expense' else 'income' end,
    status = case status when 'pending_receive' then 'pending_receive' when 'received' then 'received' when 'pending_pay' then 'pending_pay' when 'paid' then 'paid' when 'cancelled' then 'cancelled' when 'overdue' then 'overdue' else 'received' end,
    description = coalesce(description, 'รายการ Cash Flow'),
    amount = coalesce(amount, 0),
    source = coalesce(nullif(source, ''), 'manual'),
    created_at = coalesce(created_at, now()),
    updated_at = coalesce(updated_at, now());

alter table public.cash_flow_entries drop constraint if exists cash_flow_entries_type_check;
alter table public.cash_flow_entries add constraint cash_flow_entries_type_check check (type in ('income', 'expense'));
alter table public.cash_flow_entries drop constraint if exists cash_flow_entries_status_check;
alter table public.cash_flow_entries add constraint cash_flow_entries_status_check check (status in ('pending_receive', 'received', 'pending_pay', 'paid', 'cancelled', 'overdue'));
alter table public.cash_flow_entries alter column transaction_date set not null;
alter table public.cash_flow_entries alter column type set not null;
alter table public.cash_flow_entries alter column status set not null;
alter table public.cash_flow_entries alter column description set not null;
alter table public.cash_flow_entries alter column amount set not null;
alter table public.cash_flow_entries alter column amount set default 0;
alter table public.cash_flow_entries alter column source set not null;
alter table public.cash_flow_entries alter column source set default 'manual';
alter table public.cash_flow_entries alter column created_at set not null;
alter table public.cash_flow_entries alter column created_at set default now();
alter table public.cash_flow_entries alter column updated_at set not null;
alter table public.cash_flow_entries alter column updated_at set default now();

create unique index if not exists cash_flow_entries_source_unique on public.cash_flow_entries (source, source_ref_id) where source_ref_id is not null;
create unique index if not exists cash_flow_entries_source_ref_id_unique on public.cash_flow_entries (source, source_ref_id);
create index if not exists cash_flow_entries_transaction_date_idx on public.cash_flow_entries (transaction_date);
create index if not exists cash_flow_entries_type_status_idx on public.cash_flow_entries (type, status);

create or replace function public.set_cash_flow_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_cash_flow_updated_at on public.cash_flow_entries;
drop trigger if exists cash_flow_entries_touch_updated_at on public.cash_flow_entries;
create trigger trg_cash_flow_updated_at before update on public.cash_flow_entries for each row execute function public.set_cash_flow_updated_at();

alter table public.cash_flow_categories enable row level security;
alter table public.cash_flow_money_channels enable row level security;
alter table public.cash_flow_entries enable row level security;

drop policy if exists "cash_flow_categories_select" on public.cash_flow_categories;
drop policy if exists "cash_flow_categories_insert" on public.cash_flow_categories;
drop policy if exists "cash_flow_categories_update" on public.cash_flow_categories;
create policy "cash_flow_categories_select" on public.cash_flow_categories for select to authenticated using (true);
create policy "cash_flow_categories_insert" on public.cash_flow_categories for insert to authenticated with check (true);
create policy "cash_flow_categories_update" on public.cash_flow_categories for update to authenticated using (true) with check (true);

drop policy if exists "cash_flow_money_channels_select" on public.cash_flow_money_channels;
drop policy if exists "cash_flow_money_channels_insert" on public.cash_flow_money_channels;
drop policy if exists "cash_flow_money_channels_update" on public.cash_flow_money_channels;
create policy "cash_flow_money_channels_select" on public.cash_flow_money_channels for select to authenticated using (true);
create policy "cash_flow_money_channels_insert" on public.cash_flow_money_channels for insert to authenticated with check (true);
create policy "cash_flow_money_channels_update" on public.cash_flow_money_channels for update to authenticated using (true) with check (true);

drop policy if exists "cash_flow_entries_select" on public.cash_flow_entries;
drop policy if exists "cash_flow_entries_insert" on public.cash_flow_entries;
drop policy if exists "cash_flow_entries_update" on public.cash_flow_entries;
drop policy if exists "cash_flow_entries_delete" on public.cash_flow_entries;
drop policy if exists "cash_flow_select" on public.cash_flow_entries;
drop policy if exists "cash_flow_insert" on public.cash_flow_entries;
drop policy if exists "cash_flow_update" on public.cash_flow_entries;
drop policy if exists "cash_flow_delete" on public.cash_flow_entries;
drop policy if exists "cash flow entries owner all" on public.cash_flow_entries;
create policy "cash_flow_entries_select" on public.cash_flow_entries for select to authenticated using (true);
create policy "cash_flow_entries_insert" on public.cash_flow_entries for insert to authenticated with check (true);
create policy "cash_flow_entries_update" on public.cash_flow_entries for update to authenticated using (true) with check (true);
create policy "cash_flow_entries_delete" on public.cash_flow_entries for delete to authenticated using (true);

insert into public.cash_flow_categories (name, type, direction, code, sort_order)
values
('ยอดขายหน้าร้าน', 'income', 'income', 'sales_revenue', 10),
('รายรับแฟรนไชส์', 'income', 'income', 'franchise_income', 20),
('รายรับคอร์ส/หนังสือ', 'income', 'income', 'course_book_income', 30),
('เติมเงินเข้ากิจการ', 'income', 'income', 'owner_fund_in', 40),
('ซื้อไก่สด', 'expense', 'expense', 'chicken_purchase', 110),
('ซื้อวัตถุดิบ', 'expense', 'expense', 'ingredient_purchase', 120),
('ค่าแรง', 'expense', 'expense', 'labor_cost', 130),
('ค่าเช่า', 'expense', 'expense', 'rent', 140),
('ค่าขนส่ง', 'expense', 'expense', 'transport', 150),
('ค่าโฆษณา', 'expense', 'expense', 'advertising', 160),
('ค่าใช้จ่ายจิปาถะ', 'expense', 'expense', 'misc_expense', 999)
on conflict (code) do update set name = excluded.name, type = excluded.type, direction = excluded.direction, sort_order = excluded.sort_order, is_active = true;

insert into public.cash_flow_money_channels (name, opening_balance)
values ('เงินสด', 0), ('ธนาคาร', 0), ('โอน', 0), ('อื่น ๆ', 0)
on conflict (name) do nothing;

notify pgrst, 'reload schema';

-- Smoke tests after running this migration:
-- select * from public.cash_flow_categories limit 5;
-- select * from public.cash_flow_entries limit 5;
