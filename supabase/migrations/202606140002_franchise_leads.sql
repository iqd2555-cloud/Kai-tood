create table if not exists public.franchise_leads (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  phone text not null,
  line_id text,
  province text not null,
  district text,
  current_job text,
  available_time_per_day text,
  budget_range text not null,
  has_location text not null,
  location_type text,
  expected_daily_income text,
  business_experience text,
  note text,
  internal_note text,
  status text not null default 'new' check (status in ('new', 'contacted', 'qualified', 'not_qualified', 'pending_payment', 'converted')),
  source text not null default 'website',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists franchise_leads_status_idx on public.franchise_leads(status);
create index if not exists franchise_leads_created_at_idx on public.franchise_leads(created_at desc);

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
