-- Mini Starter franchise applications, isolated from standard franchise leads.
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
  google_maps_url text not null,
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
  internal_note text,
  status text not null default 'new',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint mini_franchise_applications_status_check check (status in ('new', 'area_conflict', 'awaiting_location_info', 'prequalified', 'appointment_scheduled', 'approved', 'rejected', 'paid', 'delivered', 'opened'))
);

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

create or replace function public.set_mini_franchise_applications_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

drop trigger if exists set_mini_franchise_applications_updated_at on public.mini_franchise_applications;
create trigger set_mini_franchise_applications_updated_at before update on public.mini_franchise_applications for each row execute function public.set_mini_franchise_applications_updated_at();

create or replace function public.record_mini_franchise_status_history()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    insert into public.mini_franchise_application_status_history(application_id, old_status, new_status, internal_note, changed_by)
    values (new.id, null, new.status, new.internal_note, auth.uid());
  elsif old.status is distinct from new.status then
    insert into public.mini_franchise_application_status_history(application_id, old_status, new_status, internal_note, changed_by)
    values (new.id, old.status, new.status, new.internal_note, auth.uid());
  end if;
  return new;
end;
$$;

drop trigger if exists record_mini_franchise_status_history on public.mini_franchise_applications;
create trigger record_mini_franchise_status_history after insert or update of status on public.mini_franchise_applications for each row execute function public.record_mini_franchise_status_history();

alter table public.mini_franchise_applications enable row level security;
alter table public.mini_franchise_application_status_history enable row level security;

drop policy if exists "Anyone can submit mini franchise applications" on public.mini_franchise_applications;
create policy "Anyone can submit mini franchise applications" on public.mini_franchise_applications for insert to anon, authenticated with check (application_type = 'mini' and source in ('apply-mini', 'campaign-mini') and status = 'new' and internal_note is null);

drop policy if exists "Owners can manage mini franchise applications" on public.mini_franchise_applications;
create policy "Owners can manage mini franchise applications" on public.mini_franchise_applications for all to authenticated using (exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'owner')) with check (exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'owner'));

drop policy if exists "Owners can view mini franchise status history" on public.mini_franchise_application_status_history;
create policy "Owners can view mini franchise status history" on public.mini_franchise_application_status_history for select to authenticated using (exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'owner'));

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('mini-location-photos', 'mini-location-photos', false, 5242880, array['image/jpeg','image/png','image/webp'])
on conflict (id) do update set public = excluded.public, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Anyone can upload mini location photos" on storage.objects;
create policy "Anyone can upload mini location photos" on storage.objects for insert to anon, authenticated with check (bucket_id = 'mini-location-photos' and (storage.foldername(name))[1] = 'applications');

drop policy if exists "Owners can read mini location photos" on storage.objects;
create policy "Owners can read mini location photos" on storage.objects for select to authenticated using (bucket_id = 'mini-location-photos' and exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'owner'));

notify pgrst, 'reload schema';
