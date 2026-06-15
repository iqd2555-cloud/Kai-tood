create table if not exists public.franchise_leads (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  phone text not null,
  line_id text,
  province text not null,
  district text,
  has_location text not null,
  location_type text not null,
  budget_range text not null,
  working_capital text not null default 'ยังไม่แน่ใจ',
  available_time_per_day text not null,
  business_experience text not null,
  expected_daily_income text not null,
  understanding_confirmed boolean not null default false,
  note text,
  internal_note text,
  status text not null default 'new' check (status in ('new', 'contacted', 'qualified', 'not_qualified', 'pending_payment', 'converted')),
  source text not null default 'website',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.franchise_leads
  add column if not exists working_capital text,
  add column if not exists understanding_confirmed boolean not null default false;

update public.franchise_leads
set
  working_capital = coalesce(working_capital, 'ยังไม่แน่ใจ ต้องการทราบรายละเอียดก่อน'),
  location_type = coalesce(nullif(location_type, ''), 'ยังไม่แน่ใจ'),
  available_time_per_day = coalesce(nullif(available_time_per_day, ''), 'ยังไม่แน่ใจ'),
  business_experience = coalesce(nullif(business_experience, ''), 'ไม่เคยขายมาก่อน'),
  expected_daily_income = coalesce(nullif(expected_daily_income, ''), 'ยังไม่แน่ใจ'),
  understanding_confirmed = coalesce(understanding_confirmed, false)
where working_capital is null
  or location_type is null
  or location_type = ''
  or available_time_per_day is null
  or available_time_per_day = ''
  or business_experience is null
  or business_experience = ''
  or expected_daily_income is null
  or expected_daily_income = '';

alter table public.franchise_leads
  alter column location_type set not null,
  alter column working_capital set not null,
  alter column available_time_per_day set not null,
  alter column business_experience set not null,
  alter column expected_daily_income set not null,
  alter column understanding_confirmed set default false,
  alter column understanding_confirmed set not null;

alter table public.franchise_leads
  drop constraint if exists franchise_leads_status_check,
  add constraint franchise_leads_status_check check (status in ('new', 'contacted', 'qualified', 'not_qualified', 'pending_payment', 'converted'));

create index if not exists franchise_leads_status_idx on public.franchise_leads(status);
create index if not exists franchise_leads_created_at_idx on public.franchise_leads(created_at desc);
create index if not exists franchise_leads_search_idx on public.franchise_leads(full_name, phone, province);

create or replace function public.set_franchise_leads_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_franchise_leads_updated_at on public.franchise_leads;
create trigger set_franchise_leads_updated_at
before update on public.franchise_leads
for each row execute function public.set_franchise_leads_updated_at();

alter table public.franchise_leads enable row level security;

drop policy if exists "Anyone can submit franchise leads" on public.franchise_leads;
drop policy if exists "Owners can view franchise leads" on public.franchise_leads;
drop policy if exists "Owners can update franchise leads" on public.franchise_leads;

create policy "Anyone can submit franchise leads"
on public.franchise_leads
for insert
to anon, authenticated
with check (
  status = 'new'
  and source = 'website'
  and internal_note is null
  and understanding_confirmed = true
);

create policy "Owners can view franchise leads"
on public.franchise_leads
for select
to authenticated
using (
  exists (
    select 1 from public.profiles
    where profiles.id = auth.uid()
      and profiles.role = 'owner'
  )
);

create policy "Owners can update franchise leads"
on public.franchise_leads
for update
to authenticated
using (
  exists (
    select 1 from public.profiles
    where profiles.id = auth.uid()
      and profiles.role = 'owner'
  )
)
with check (
  exists (
    select 1 from public.profiles
    where profiles.id = auth.uid()
      and profiles.role = 'owner'
  )
);
