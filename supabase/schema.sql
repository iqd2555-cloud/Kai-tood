-- Supabase schema for Kai Tood Manager
create extension if not exists "pgcrypto";

create type public.user_role as enum ('owner', 'staff');

create table public.branches (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  code text not null unique,
  low_chicken_threshold numeric not null default 5,
  low_sticky_rice_threshold numeric not null default 5,
  low_oil_threshold numeric not null default 2,
  created_at timestamptz not null default now()
);

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  role public.user_role not null default 'staff',
  branch_id uuid references public.branches(id),
  created_at timestamptz not null default now(),
  constraint staff_must_have_branch check (role = 'owner' or branch_id is not null)
);

create table public.daily_reports (
  id uuid primary key default gen_random_uuid(),
  report_date date not null,
  branch_id uuid not null references public.branches(id) on delete cascade,
  cash_sales numeric not null default 0 check (cash_sales >= 0),
  transfer_sales numeric not null default 0 check (transfer_sales >= 0),
  total_sales numeric generated always as (cash_sales + transfer_sales) stored,
  used_bl numeric not null default 0 check (used_bl >= 0),
  used_bb numeric not null default 0 check (used_bb >= 0),
  used_chicken_skin numeric not null default 0 check (used_chicken_skin >= 0),
  used_oil numeric not null default 0 check (used_oil >= 0),
  used_sticky_rice numeric not null default 0 check (used_sticky_rice >= 0),
  remaining_chicken numeric not null default 0 check (remaining_chicken >= 0),
  remaining_sticky_rice numeric not null default 0 check (remaining_sticky_rice >= 0),
  remaining_oil numeric not null default 0 check (remaining_oil >= 0),
  requested_items text not null default '',
  note text not null default '',
  submitted_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (branch_id, report_date)
);

create index daily_reports_report_date_idx on public.daily_reports(report_date desc);
create index daily_reports_branch_date_idx on public.daily_reports(branch_id, report_date desc);

alter table public.branches enable row level security;
alter table public.profiles enable row level security;
alter table public.daily_reports enable row level security;

create or replace function public.current_profile_role()
returns public.user_role
language sql
security definer
set search_path = public
as $$ select role from public.profiles where id = auth.uid() $$;

create or replace function public.current_profile_branch_id()
returns uuid
language sql
security definer
set search_path = public
as $$ select branch_id from public.profiles where id = auth.uid() $$;

create policy "owners read all branches staff own branch" on public.branches
for select using (public.current_profile_role() = 'owner' or id = public.current_profile_branch_id());

create policy "profiles read own or owner" on public.profiles
for select using (id = auth.uid() or public.current_profile_role() = 'owner');

create policy "daily reports read by role" on public.daily_reports
for select using (public.current_profile_role() = 'owner' or branch_id = public.current_profile_branch_id());

create policy "daily reports insert by role" on public.daily_reports
for insert with check (public.current_profile_role() = 'owner' or branch_id = public.current_profile_branch_id());

create policy "daily reports update by role" on public.daily_reports
for update using (public.current_profile_role() = 'owner' or branch_id = public.current_profile_branch_id())
with check (public.current_profile_role() = 'owner' or branch_id = public.current_profile_branch_id());

alter publication supabase_realtime add table public.daily_reports;

insert into public.branches (name, code, low_chicken_threshold, low_sticky_rice_threshold, low_oil_threshold)
values ('สาขาหลัก', 'MAIN', 5, 5, 2)
on conflict (code) do nothing;
