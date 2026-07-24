-- Align MINI Starter applications with the public /apply-mini form and Owner page.
-- Keeps mini_franchise_applications as the source of truth while allowing applicants
-- to provide a plain Thai place description instead of a Google Maps URL.

alter table public.mini_franchise_applications
  add column if not exists location_description text,
  add column if not exists submission_token text;

update public.mini_franchise_applications
set location_description = coalesce(nullif(location_description, ''), nullif(google_maps_url, ''), location_address)
where location_description is null or location_description = '';

alter table public.mini_franchise_applications
  alter column location_description set not null,
  alter column google_maps_url drop not null;

alter table public.mini_franchise_applications
  drop constraint if exists mini_franchise_applications_location_description_length_check,
  add constraint mini_franchise_applications_location_description_length_check check (char_length(location_description) between 1 and 500),
  drop constraint if exists mini_franchise_applications_google_maps_url_length_check,
  add constraint mini_franchise_applications_google_maps_url_length_check check (google_maps_url is null or char_length(google_maps_url) <= 500),
  drop constraint if exists mini_franchise_applications_submission_token_length_check,
  add constraint mini_franchise_applications_submission_token_length_check check (submission_token is null or char_length(submission_token) between 20 and 80);

create unique index if not exists mini_franchise_applications_submission_token_uidx
on public.mini_franchise_applications(submission_token)
where submission_token is not null;

drop policy if exists "Anyone can submit mini franchise applications" on public.mini_franchise_applications;
create policy "Anyone can submit mini franchise applications"
on public.mini_franchise_applications
for insert
to anon, authenticated
with check (
  application_type = 'mini'
  and source in ('apply-mini', 'campaign-mini')
  and status = 'new'
  and internal_note is null
);

notify pgrst, 'reload schema';
