-- Cash Flow production repair for the Supabase project used by Vercel.
-- Safe for fresh databases and for older Cash Flow schemas that used direction/status enums.

create extension if not exists pgcrypto;

create table if not exists public.cash_flow_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  type text,
  code text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.cash_flow_categories add column if not exists type text;
alter table public.cash_flow_categories add column if not exists code text;
alter table public.cash_flow_categories add column if not exists is_active boolean not null default true;
alter table public.cash_flow_categories add column if not exists created_at timestamptz not null default now();

do $$
begin
  if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'cash_flow_categories' and column_name = 'direction') then
    update public.cash_flow_categories
    set type = case when type in ('income', 'expense') then type when direction::text = 'out' then 'expense' else 'income' end
    where type is null or type not in ('income', 'expense');
  else
    update public.cash_flow_categories
    set type = case when type in ('income', 'expense') then type else 'income' end
    where type is null or type not in ('income', 'expense');
  end if;
end $$;

update public.cash_flow_categories
set code = id::text
where code is null or btrim(code) = '';

alter table public.cash_flow_categories drop constraint if exists cash_flow_categories_type_check;
alter table public.cash_flow_categories add constraint cash_flow_categories_type_check check (type in ('income', 'expense'));
alter table public.cash_flow_categories alter column type set not null;

create unique index if not exists cash_flow_categories_code_unique
on public.cash_flow_categories (code);

create table if not exists public.cash_flow_entries (
  id uuid primary key default gen_random_uuid(),
  transaction_date date,
  due_date date,
  type text,
  status text,
  category text,
  description text,
  amount numeric(12,2) default 0,
  payment_method text,
  branch_id text,
  department text,
  source text default 'manual',
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
alter table public.cash_flow_entries add column if not exists category_id uuid;
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
alter table public.cash_flow_entries drop constraint if exists cash_flow_entries_category_id_fkey;

alter table public.cash_flow_entries alter column branch_id type text using branch_id::text;
alter table public.cash_flow_entries alter column created_by type text using created_by::text;
alter table public.cash_flow_entries alter column type type text using type::text;
alter table public.cash_flow_entries alter column status type text using case status::text when 'pending_in' then 'pending_receive' when 'pending_out' then 'pending_pay' else status::text end;
alter table public.cash_flow_entries alter column source type text using case source::text when 'auto' then 'other' else source::text end;

do $$
begin
  if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'cash_flow_entries' and column_name = 'direction') then
    update public.cash_flow_entries
    set
      transaction_date = coalesce(transaction_date, due_date, created_at::date, now()::date),
      due_date = coalesce(due_date, transaction_date, created_at::date, now()::date),
      type = case when type in ('income', 'expense') then type when direction::text = 'out' then 'expense' else 'income' end,
      status = case
        when status in ('pending_receive', 'received', 'pending_pay', 'paid', 'cancelled', 'overdue') then status
        when status = 'pending_in' then 'pending_receive'
        when status = 'pending_out' then 'pending_pay'
        else case when direction::text = 'out' then 'paid' else 'received' end
      end,
      category = coalesce(category, 'ไม่ระบุ'),
      description = coalesce(description, 'รายการ Cash Flow'),
      amount = coalesce(amount, 0),
      source = coalesce(source, 'manual');
  else
    update public.cash_flow_entries
    set
      transaction_date = coalesce(transaction_date, due_date, created_at::date, now()::date),
      due_date = coalesce(due_date, transaction_date, created_at::date, now()::date),
      type = case when type in ('income', 'expense') then type else 'income' end,
      status = case
        when status in ('pending_receive', 'received', 'pending_pay', 'paid', 'cancelled', 'overdue') then status
        when status = 'pending_in' then 'pending_receive'
        when status = 'pending_out' then 'pending_pay'
        else 'received'
      end,
      category = coalesce(category, 'ไม่ระบุ'),
      description = coalesce(description, 'รายการ Cash Flow'),
      amount = coalesce(amount, 0),
      source = coalesce(source, 'manual');
  end if;
end $$;

alter table public.cash_flow_entries add constraint cash_flow_entries_category_id_fkey
foreign key (category_id) references public.cash_flow_categories(id);

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

create unique index if not exists cash_flow_entries_source_unique
on public.cash_flow_entries (source, source_ref_id)
where source_ref_id is not null;

create index if not exists cash_flow_entries_transaction_date_idx on public.cash_flow_entries (transaction_date);
create index if not exists cash_flow_entries_type_status_idx on public.cash_flow_entries (type, status);

alter table public.cash_flow_categories enable row level security;
alter table public.cash_flow_entries enable row level security;

drop policy if exists "cash_flow_categories_select" on public.cash_flow_categories;
drop policy if exists "cash_flow_categories_insert" on public.cash_flow_categories;
drop policy if exists "cash_flow_entries_select" on public.cash_flow_entries;
drop policy if exists "cash_flow_entries_insert" on public.cash_flow_entries;
drop policy if exists "cash_flow_entries_update" on public.cash_flow_entries;

create policy "cash_flow_categories_select" on public.cash_flow_categories for select to authenticated using (true);
create policy "cash_flow_categories_insert" on public.cash_flow_categories for insert to authenticated with check (true);
create policy "cash_flow_entries_select" on public.cash_flow_entries for select to authenticated using (true);
create policy "cash_flow_entries_insert" on public.cash_flow_entries for insert to authenticated with check (true);
create policy "cash_flow_entries_update" on public.cash_flow_entries for update to authenticated using (true) with check (true);

insert into public.cash_flow_categories (name, type, code)
values
('ยอดขายหน้าร้าน', 'income', 'sales_revenue'),
('รายรับแฟรนไชส์', 'income', 'franchise_income'),
('เติมเงินเข้ากิจการ', 'income', 'owner_fund_in'),
('รับเงินอื่น ๆ', 'income', 'other_income'),
('ซื้อไก่สด', 'expense', 'chicken_purchase'),
('ซื้อวัตถุดิบ', 'expense', 'ingredient_purchase'),
('ค่าแรง', 'expense', 'labor_cost'),
('ค่าเช่า', 'expense', 'rent'),
('ค่าขนส่ง', 'expense', 'transport'),
('ค่าโฆษณา', 'expense', 'advertising'),
('ค่าใช้จ่ายจิปาถะ', 'expense', 'misc_expense')
on conflict (code) do nothing;

notify pgrst, 'reload schema';
