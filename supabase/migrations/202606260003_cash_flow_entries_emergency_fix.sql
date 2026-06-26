-- Emergency Cash Flow contract fix.
-- Run this in Supabase SQL Editor if PostgREST says:
-- "Could not find the table 'public.cash_flow_entries' in the schema cache".

create extension if not exists pgcrypto;

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

-- Projects that previously ran the old Cash Flow migration created enum/uuid columns.
-- Normalize the live table to the text-based contract the frontend writes to.
alter table public.cash_flow_entries add column if not exists due_date date;
alter table public.cash_flow_entries add column if not exists category text;
alter table public.cash_flow_entries add column if not exists payment_method text;
alter table public.cash_flow_entries add column if not exists branch_id text;
alter table public.cash_flow_entries add column if not exists department text;
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
alter table public.cash_flow_entries alter column type type text using type::text;
alter table public.cash_flow_entries alter column status type text using case status::text when 'pending_in' then 'pending_receive' when 'pending_out' then 'pending_pay' else status::text end;
alter table public.cash_flow_entries alter column source type text using case source::text when 'auto' then 'other' else source::text end;
alter table public.cash_flow_entries alter column amount set default 0;
alter table public.cash_flow_entries alter column source set default 'manual';

alter table public.cash_flow_entries drop constraint if exists cash_flow_entries_type_check;
alter table public.cash_flow_entries add constraint cash_flow_entries_type_check check (type in ('income', 'expense'));
alter table public.cash_flow_entries drop constraint if exists cash_flow_entries_status_check;
alter table public.cash_flow_entries add constraint cash_flow_entries_status_check check (status in ('pending_receive', 'received', 'pending_pay', 'paid', 'cancelled', 'overdue'));
alter table public.cash_flow_entries alter column type set not null;
alter table public.cash_flow_entries alter column status set not null;
alter table public.cash_flow_entries alter column source set not null;

create unique index if not exists cash_flow_entries_source_unique
on public.cash_flow_entries (source, source_ref_id)
where source_ref_id is not null;

-- Keep a full unique index as well because Supabase upsert(onConflict: 'source,source_ref_id')
-- requires a non-partial arbiter index.
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
drop trigger if exists cash_flow_entries_touch_updated_at on public.cash_flow_entries;

create trigger trg_cash_flow_updated_at
before update on public.cash_flow_entries
for each row
execute function public.set_cash_flow_updated_at();

alter table public.cash_flow_entries enable row level security;

drop policy if exists "cash_flow_select" on public.cash_flow_entries;
drop policy if exists "cash_flow_insert" on public.cash_flow_entries;
drop policy if exists "cash_flow_update" on public.cash_flow_entries;
drop policy if exists "cash_flow_delete" on public.cash_flow_entries;
drop policy if exists "cash flow entries owner all" on public.cash_flow_entries;

create policy "cash_flow_select"
on public.cash_flow_entries
for select
to authenticated
using (true);

create policy "cash_flow_insert"
on public.cash_flow_entries
for insert
to authenticated
with check (true);

create policy "cash_flow_update"
on public.cash_flow_entries
for update
to authenticated
using (true)
with check (true);

create policy "cash_flow_delete"
on public.cash_flow_entries
for delete
to authenticated
using (true);

notify pgrst, 'reload schema';
