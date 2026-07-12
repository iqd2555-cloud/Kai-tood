-- Production repair for the public franchise application flow and owner lead dashboard.
-- Ensures the dashboard table exists with the canonical name public.franchise_leads,
-- includes the fields used by the public form and owner dashboard, and reloads PostgREST schema cache.

create table if not exists public.franchise_leads (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  phone text not null,
  line_id text,
  province text not null,
  district text,
  has_capital text,
  budget_range text not null,
  preferred_model text,
  available_area text,
  location_type text,
  experience text,
  note text,
  status text not null default 'new',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.franchise_leads
  add column if not exists full_name text,
  add column if not exists phone text,
  add column if not exists line_id text,
  add column if not exists province text,
  add column if not exists district text,
  add column if not exists has_capital text,
  add column if not exists budget_range text,
  add column if not exists preferred_model text,
  add column if not exists available_area text,
  add column if not exists location_type text,
  add column if not exists experience text,
  add column if not exists note text,
  add column if not exists status text,
  add column if not exists created_at timestamptz,
  add column if not exists updated_at timestamptz,
  -- Columns used by the existing production form/dashboard.
  add column if not exists has_location text,
  add column if not exists working_capital text,
  add column if not exists available_time_per_day text,
  add column if not exists business_experience text,
  add column if not exists expected_daily_income text,
  add column if not exists understanding_confirmed boolean,
  add column if not exists internal_note text,
  add column if not exists source text;

update public.franchise_leads
set
  full_name = coalesce(nullif(full_name, ''), 'ไม่ระบุชื่อ'),
  phone = coalesce(nullif(phone, ''), 'ไม่ระบุเบอร์โทร'),
  province = coalesce(nullif(province, ''), 'ไม่ระบุจังหวัด'),
  budget_range = coalesce(nullif(budget_range, ''), 'ยังไม่แน่ใจ'),
  status = coalesce(nullif(status, ''), 'new'),
  created_at = coalesce(created_at, now()),
  updated_at = coalesce(updated_at, now()),
  source = coalesce(nullif(source, ''), 'website'),
  has_location = coalesce(nullif(has_location, ''), nullif(available_area, ''), 'ยังไม่ระบุ'),
  available_area = coalesce(nullif(available_area, ''), nullif(has_location, ''), 'ยังไม่ระบุ'),
  working_capital = coalesce(nullif(working_capital, ''), nullif(has_capital, ''), 'ยังไม่แน่ใจ'),
  has_capital = coalesce(nullif(has_capital, ''), nullif(working_capital, ''), 'ยังไม่แน่ใจ'),
  business_experience = coalesce(nullif(business_experience, ''), nullif(experience, ''), 'ไม่เคยขายมาก่อน'),
  experience = coalesce(nullif(experience, ''), nullif(business_experience, ''), 'ไม่เคยขายมาก่อน'),
  preferred_model = coalesce(nullif(preferred_model, ''), 'ยังไม่ระบุ'),
  location_type = coalesce(nullif(location_type, ''), 'ยังไม่แน่ใจ'),
  available_time_per_day = coalesce(nullif(available_time_per_day, ''), 'ยังไม่แน่ใจ'),
  expected_daily_income = coalesce(nullif(expected_daily_income, ''), 'ยังไม่แน่ใจ'),
  understanding_confirmed = coalesce(understanding_confirmed, false);

alter table public.franchise_leads
  alter column full_name set not null,
  alter column phone set not null,
  alter column province set not null,
  alter column budget_range set not null,
  alter column status set default 'new',
  alter column status set not null,
  alter column created_at set default now(),
  alter column created_at set not null,
  alter column updated_at set default now(),
  alter column updated_at set not null,
  alter column has_location set not null,
  alter column working_capital set not null,
  alter column location_type set not null,
  alter column available_time_per_day set not null,
  alter column business_experience set not null,
  alter column expected_daily_income set not null,
  alter column understanding_confirmed set default false,
  alter column understanding_confirmed set not null,
  alter column source set default 'website',
  alter column source set not null;

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

notify pgrst, 'reload schema';
