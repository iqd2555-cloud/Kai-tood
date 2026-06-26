-- Cash Flow Center: operational cash tracking for owner decisions, not tax accounting.
create type public.cash_flow_direction as enum ('in', 'out');
create type public.cash_flow_status as enum ('pending_in', 'received', 'pending_out', 'paid', 'cancelled', 'overdue');
create type public.cash_flow_source as enum ('auto', 'manual');

create table public.cash_flow_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  direction text not null check (direction in ('in', 'out', 'both')),
  sort_order integer not null default 100,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.cash_flow_money_channels (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  opening_balance numeric not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.cash_flow_entries (
  id uuid primary key default gen_random_uuid(),
  transaction_date date not null,
  due_date date,
  direction public.cash_flow_direction not null,
  status public.cash_flow_status not null,
  category_id uuid references public.cash_flow_categories(id),
  description text not null,
  amount numeric not null check (amount > 0),
  money_channel_id uuid references public.cash_flow_money_channels(id),
  branch_id uuid references public.branches(id),
  source public.cash_flow_source not null default 'manual',
  source_ref text,
  attachment_url text,
  created_by uuid references public.profiles(id),
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (source, source_ref)
);

create table public.cash_flow_entry_audit_logs (
  id uuid primary key default gen_random_uuid(),
  entry_id uuid not null references public.cash_flow_entries(id) on delete cascade,
  action text not null,
  old_data jsonb,
  new_data jsonb,
  changed_by uuid default auth.uid(),
  changed_at timestamptz not null default now()
);

create index cash_flow_entries_transaction_date_idx on public.cash_flow_entries(transaction_date desc);
create index cash_flow_entries_due_date_idx on public.cash_flow_entries(due_date);
create index cash_flow_entries_branch_idx on public.cash_flow_entries(branch_id);
create index cash_flow_entries_status_idx on public.cash_flow_entries(status);
create index cash_flow_entries_category_idx on public.cash_flow_entries(category_id);
create index cash_flow_entries_channel_idx on public.cash_flow_entries(money_channel_id);

create or replace function public.touch_cash_flow_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger cash_flow_entries_touch_updated_at
before update on public.cash_flow_entries
for each row execute function public.touch_cash_flow_updated_at();

create or replace function public.audit_cash_flow_entries()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    insert into public.cash_flow_entry_audit_logs(entry_id, action, new_data) values (new.id, 'insert', to_jsonb(new));
    return new;
  elsif tg_op = 'UPDATE' then
    insert into public.cash_flow_entry_audit_logs(entry_id, action, old_data, new_data) values (new.id, 'update', to_jsonb(old), to_jsonb(new));
    return new;
  elsif tg_op = 'DELETE' then
    insert into public.cash_flow_entry_audit_logs(entry_id, action, old_data) values (old.id, 'delete', to_jsonb(old));
    return old;
  end if;
  return null;
end;
$$;

create trigger cash_flow_entries_audit
after insert or update or delete on public.cash_flow_entries
for each row execute function public.audit_cash_flow_entries();

alter table public.cash_flow_categories enable row level security;
alter table public.cash_flow_money_channels enable row level security;
alter table public.cash_flow_entries enable row level security;
alter table public.cash_flow_entry_audit_logs enable row level security;

create policy "cash flow categories owner read" on public.cash_flow_categories for select using (public.current_profile_role() = 'owner');
create policy "cash flow channels owner read" on public.cash_flow_money_channels for select using (public.current_profile_role() = 'owner');
create policy "cash flow entries owner all" on public.cash_flow_entries for all using (public.current_profile_role() = 'owner') with check (public.current_profile_role() = 'owner');
create policy "cash flow audit owner read" on public.cash_flow_entry_audit_logs for select using (public.current_profile_role() = 'owner');

insert into public.cash_flow_categories (name, direction, sort_order) values
('ยอดขายหน้าร้าน','in',10),('รายรับแฟรนไชส์','in',20),('ขายวัตถุดิบให้สาขา','in',30),('คอร์ส/หนังสือ/บริการ','in',40),('เติมเงินเข้ากิจการ','in',50),('รับเงินคืน','in',60),
('ซื้อไก่สด','out',110),('ซื้อวัตถุดิบ','out',120),('โรงหมัก','out',130),('ขนส่ง','out',140),('ค่าแรง','out',150),('ซื้ออุปกรณ์','out',160),('หน้าร้าน','out',170),('ส่วนกลาง','out',180),('ค่าเช่า','out',190),('ค่าไฟ','out',200),('ค่าน้ำ','out',210),('ค่าโทรศัพท์/อินเทอร์เน็ต','out',220),('ค่าเดินทาง','out',230),('ค่าโฆษณา','out',240),('ค่าซ่อมอุปกรณ์','out',250),('จ่ายหนี้','out',260),('ถอนเงินออกจากกิจการ','out',270),('ค่าใช้จ่ายจิปาถะ','out',280),('รายการอื่น ๆ','both',999)
on conflict (name) do update set direction = excluded.direction, sort_order = excluded.sort_order;

insert into public.cash_flow_money_channels (name, opening_balance) values
('เงินสด',0),('ธนาคาร',0),('โอน',0),('อื่น ๆ',0)
on conflict (name) do nothing;
