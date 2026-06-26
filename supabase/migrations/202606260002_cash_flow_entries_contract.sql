-- Align Cash Flow Center with the production contract used by the app.
-- Safe to run on fresh projects and projects that already ran 202606260001_cash_flow_center.sql.

do $$ begin
  create type public.cash_flow_entry_type as enum ('income', 'expense');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.cash_flow_entry_status as enum ('pending_receive', 'received', 'pending_pay', 'paid', 'cancelled', 'overdue');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.cash_flow_entry_source as enum ('manual', 'sales', 'stock', 'marinade', 'franchise', 'other');
exception when duplicate_object then null;
end $$;

create table if not exists public.cash_flow_entries (
  id uuid primary key default gen_random_uuid(),
  transaction_date date not null,
  due_date date,
  type public.cash_flow_entry_type not null default 'income',
  status public.cash_flow_entry_status not null default 'received',
  category text,
  description text not null,
  amount numeric(12,2) not null check (amount >= 0),
  payment_method text,
  branch_id uuid references public.branches(id) on delete set null,
  department text,
  source public.cash_flow_entry_source not null default 'manual',
  source_ref_id text,
  attachment_url text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  note text
);

alter table public.cash_flow_entries add column if not exists type public.cash_flow_entry_type;
alter table public.cash_flow_entries add column if not exists category text;
alter table public.cash_flow_entries add column if not exists payment_method text;
alter table public.cash_flow_entries add column if not exists department text;
alter table public.cash_flow_entries add column if not exists source_ref_id text;
alter table public.cash_flow_entries add column if not exists note text;
alter table public.cash_flow_entries add column if not exists attachment_url text;
alter table public.cash_flow_entries add column if not exists created_by uuid references public.profiles(id) on delete set null;
alter table public.cash_flow_entries add column if not exists created_at timestamptz not null default now();
alter table public.cash_flow_entries add column if not exists updated_at timestamptz not null default now();

do $$
begin
  if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'cash_flow_entries' and column_name = 'direction') then
    execute $sql$update public.cash_flow_entries
      set type = case when direction::text = 'out' then 'expense'::public.cash_flow_entry_type else 'income'::public.cash_flow_entry_type end
      where type is null$sql$;
  end if;
end $$;

update public.cash_flow_entries
set type = coalesce(type, 'income'::public.cash_flow_entry_type);

do $$
begin
  if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'cash_flow_entries' and column_name = 'category_id') then
    execute $sql$update public.cash_flow_entries e set category = c.name
      from public.cash_flow_categories c
      where e.category is null and e.category_id = c.id$sql$;
  end if;
end $$;

do $$
begin
  if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'cash_flow_entries' and column_name = 'money_channel_id') then
    execute $sql$update public.cash_flow_entries e set payment_method = m.name
      from public.cash_flow_money_channels m
      where e.payment_method is null and e.money_channel_id = m.id$sql$;
  end if;
end $$;

do $$
begin
  if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'cash_flow_entries' and column_name = 'source_ref') then
    execute $sql$update public.cash_flow_entries
      set source_ref_id = source_ref
      where source_ref_id is null and source_ref is not null$sql$;
  end if;
end $$;

alter table public.cash_flow_entries alter column type set not null;
alter table public.cash_flow_entries alter column type set default 'income';
alter table public.cash_flow_entries alter column status type public.cash_flow_entry_status using case status::text when 'pending_in' then 'pending_receive' when 'pending_out' then 'pending_pay' else status::text end::public.cash_flow_entry_status;
alter table public.cash_flow_entries alter column source type public.cash_flow_entry_source using case source::text when 'auto' then 'other' else source::text end::public.cash_flow_entry_source;
alter table public.cash_flow_entries alter column source set default 'manual';

create unique index if not exists cash_flow_entries_source_ref_id_unique on public.cash_flow_entries(source, source_ref_id);
create index if not exists cash_flow_entries_type_status_date_idx on public.cash_flow_entries(type, status, transaction_date);
create index if not exists cash_flow_entries_due_type_status_idx on public.cash_flow_entries(due_date, type, status);
create index if not exists cash_flow_entries_branch_idx on public.cash_flow_entries(branch_id);

create or replace function public.touch_cash_flow_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists cash_flow_entries_touch_updated_at on public.cash_flow_entries;
create trigger cash_flow_entries_touch_updated_at
before update on public.cash_flow_entries
for each row execute function public.touch_cash_flow_updated_at();

create or replace function public.sync_daily_report_cash_flow()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if coalesce(new.total_sales, 0) > 0 then
    insert into public.cash_flow_entries (
      transaction_date, due_date, type, status, category, description, amount,
      payment_method, branch_id, department, source, source_ref_id, created_by, note
    ) values (
      new.report_date, new.report_date, 'income', 'received', 'sales_revenue',
      'ยอดขายหน้าร้านประจำวันที่ ' || new.report_date::text || case when new.branch_name is null then '' else ' (' || new.branch_name || ')' end, new.total_sales,
      'cash_or_transfer', new.branch_id, 'หน้าร้าน', 'sales', new.id::text, new.submitted_by,
      'สร้างอัตโนมัติจาก daily_reports'
    )
    on conflict (source, source_ref_id) do update set
      transaction_date = excluded.transaction_date,
      due_date = excluded.due_date,
      status = excluded.status,
      category = excluded.category,
      description = excluded.description,
      amount = excluded.amount,
      payment_method = excluded.payment_method,
      branch_id = excluded.branch_id,
      department = excluded.department,
      note = excluded.note,
      updated_at = now();
  end if;
  return new;
end;
$$;

drop trigger if exists daily_reports_cash_flow_sync on public.daily_reports;
create trigger daily_reports_cash_flow_sync
after insert or update of report_date, branch_id, branch_name, total_sales, submitted_by on public.daily_reports
for each row execute function public.sync_daily_report_cash_flow();

alter table public.cash_flow_entries enable row level security;
drop policy if exists "cash flow entries owner all" on public.cash_flow_entries;
create policy "cash flow entries owner all" on public.cash_flow_entries for all using (public.current_profile_role() = 'owner') with check (public.current_profile_role() = 'owner');

notify pgrst, 'reload schema';
