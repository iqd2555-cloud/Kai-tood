-- Production repair for MINI Starter applications.
-- Safe to run repeatedly: creates the canonical public table if a previous deployment
-- missed migration 202607240001, preserves existing rows, and reloads PostgREST schema.

create extension if not exists pgcrypto;

create table if not exists public.mini_franchise_applications (
  id uuid primary key default gen_random_uuid(),
  reference_code text not null unique default ('MINI-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8))),
  application_type text not null default 'mini' check (application_type = 'mini'),
  source text not null default 'apply-mini',
  full_name text not null,
  age integer not null check (age between 15 and 100),
  phone text not null,
  line_id text,
  current_occupation text not null,
  residence_province text not null,
  residence_district text not null,
  opening_province text not null,
  opening_district text not null,
  opening_subdistrict text not null,
  location_address text not null,
  location_description text not null,
  google_maps_url text,
  location_type text not null,
  monthly_rent text,
  planned_opening_period text not null,
  nearby_competitors text,
  location_photo_paths text[] not null default '{}',
  has_location text not null,
  actual_seller text not null,
  ready_to_open text not null,
  food_business_experience text not null,
  experience_details text,
  can_follow_online_course boolean not null default false,
  extra_budget_range text not null,
  terms_acknowledged jsonb not null default '{}'::jsonb,
  submission_token text,
  internal_note text,
  status text not null default 'new',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint mini_franchise_applications_status_check check (status in ('new', 'area_conflict', 'awaiting_location_info', 'prequalified', 'appointment_scheduled', 'approved', 'rejected', 'paid', 'delivered', 'opened'))
);

alter table public.mini_franchise_applications
  add column if not exists location_description text,
  add column if not exists submission_token text,
  add column if not exists opening_subdistrict text;

create table if not exists public.mini_franchise_application_status_history (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.mini_franchise_applications(id) on delete cascade,
  old_status text,
  new_status text not null,
  internal_note text,
  changed_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

create index if not exists mini_franchise_applications_created_at_idx on public.mini_franchise_applications(created_at desc);
create index if not exists mini_franchise_applications_status_idx on public.mini_franchise_applications(status);
create index if not exists mini_franchise_applications_location_idx on public.mini_franchise_applications(opening_province, opening_district, opening_subdistrict);
create unique index if not exists mini_franchise_applications_submission_token_uidx on public.mini_franchise_applications(submission_token) where submission_token is not null;

alter table public.mini_franchise_applications enable row level security;
alter table public.mini_franchise_application_status_history enable row level security;

drop policy if exists "Anyone can submit mini franchise applications" on public.mini_franchise_applications;
create policy "Anyone can submit mini franchise applications" on public.mini_franchise_applications for insert to anon, authenticated with check (application_type = 'mini' and source in ('apply-mini', 'campaign-mini') and status = 'new' and internal_note is null);

drop policy if exists "Owners can manage mini franchise applications" on public.mini_franchise_applications;
create policy "Owners can manage mini franchise applications" on public.mini_franchise_applications for all to authenticated using (exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'owner')) with check (exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'owner'));

notify pgrst, 'reload schema';
