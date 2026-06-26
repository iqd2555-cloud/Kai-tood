-- Cash Flow entries table required by the frontend.
-- This migration intentionally keeps the public contract simple (text values + checks)
-- so PostgREST/Supabase can refresh schema cache and the app can read/write directly.

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

do $$
declare
  constraint_record record;
begin
  for constraint_record in
    select conname
    from pg_constraint
    where conrelid = 'public.cash_flow_entries'::regclass
      and contype = 'f'
      and exists (
        select 1
        from unnest(conkey) as column_number
        join pg_attribute on pg_attribute.attrelid = conrelid and pg_attribute.attnum = column_number
        where pg_attribute.attname in ('branch_id', 'created_by')
      )
  loop
    execute format('alter table public.cash_flow_entries drop constraint if exists %I', constraint_record.conname);
  end loop;
end $$;

alter table public.cash_flow_entries add column if not exists transaction_date date;
alter table public.cash_flow_entries add column if not exists due_date date;
alter table public.cash_flow_entries add column if not exists type text;
alter table public.cash_flow_entries add column if not exists status text;
alter table public.cash_flow_entries add column if not exists category text;
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
alter table public.cash_flow_entries add column if not exists created_at timestamptz default now();
alter table public.cash_flow_entries add column if not exists updated_at timestamptz default now();

update public.cash_flow_entries
set type = case
    when type::text in ('expense', 'out') then 'expense'
    else 'income'
  end,
  status = case status::text
    when 'pending_in' then 'pending_receive'
    when 'pending_out' then 'pending_pay'
    when 'paid' then 'paid'
    when 'pending_pay' then 'pending_pay'
    when 'received' then 'received'
    when 'pending_receive' then 'pending_receive'
    when 'cancelled' then 'cancelled'
    when 'overdue' then 'overdue'
    else 'received'
  end,
  source = case source::text
    when 'auto' then 'other'
    when 'manual' then 'manual'
    when 'sales' then 'sales'
    when 'stock' then 'stock'
    when 'marinade' then 'marinade'
    when 'franchise' then 'franchise'
    else 'other'
  end,
  description = coalesce(description, 'รายการ Cash Flow'),
  amount = coalesce(amount, 0),
  transaction_date = coalesce(transaction_date, current_date),
  created_at = coalesce(created_at, now()),
  updated_at = coalesce(updated_at, now());

alter table public.cash_flow_entries alter column type type text using type::text;
alter table public.cash_flow_entries alter column status type text using status::text;
alter table public.cash_flow_entries alter column source type text using source::text;
alter table public.cash_flow_entries alter column branch_id type text using branch_id::text;
alter table public.cash_flow_entries alter column created_by type text using created_by::text;
alter table public.cash_flow_entries alter column amount type numeric(12,2) using amount::numeric(12,2);

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

alter table public.cash_flow_entries drop constraint if exists cash_flow_entries_type_check;
alter table public.cash_flow_entries add constraint cash_flow_entries_type_check check (type in ('income', 'expense'));
alter table public.cash_flow_entries drop constraint if exists cash_flow_entries_status_check;
alter table public.cash_flow_entries add constraint cash_flow_entries_status_check check (status in ('pending_receive', 'received', 'pending_pay', 'paid', 'cancelled', 'overdue'));

create unique index if not exists cash_flow_source_unique
on public.cash_flow_entries (source, source_ref_id)
where source_ref_id is not null;

-- Supabase upsert requires a non-partial conflict target; NULL source_ref_id values still do not conflict.
create unique index if not exists cash_flow_entries_source_ref_id_unique
on public.cash_flow_entries (source, source_ref_id);

create index if not exists cash_flow_entries_transaction_date_idx on public.cash_flow_entries(transaction_date desc);
create index if not exists cash_flow_entries_branch_idx on public.cash_flow_entries(branch_id);

alter table public.cash_flow_entries enable row level security;

drop policy if exists "cash_flow_select" on public.cash_flow_entries;
create policy "cash_flow_select"
on public.cash_flow_entries
for select
to authenticated
using (true);

drop policy if exists "cash_flow_insert" on public.cash_flow_entries;
create policy "cash_flow_insert"
on public.cash_flow_entries
for insert
to authenticated
with check (true);

drop policy if exists "cash_flow_update" on public.cash_flow_entries;
create policy "cash_flow_update"
on public.cash_flow_entries
for update
to authenticated
using (true)
with check (true);

notify pgrst, 'reload schema';
