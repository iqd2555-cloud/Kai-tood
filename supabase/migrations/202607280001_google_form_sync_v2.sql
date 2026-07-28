-- Google Form sync V2:
-- - records optional email as a secondary identity signal
-- - keeps phone_normalized as the canonical business key for Google Form leads
-- - leaves the UUID primary key intact to preserve all existing relations
-- - allows a stable sheet row to be reconciled after edits

alter table public.franchise_leads
  add column if not exists email text,
  add column if not exists email_normalized text
    generated always as (lower(btrim(coalesce(email, '')))) stored;

alter table public.franchise_leads
  drop constraint if exists franchise_leads_source_check,
  add constraint franchise_leads_source_check
    check (source in ('website', 'google_form'));

create index if not exists franchise_leads_email_normalized_idx
  on public.franchise_leads(email_normalized)
  where email_normalized <> '';

-- The website currently contains legitimate repeated submissions. Restricting
-- this unique business key to imported rows prevents a breaking migration while
-- still making concurrent/repeated Google Form syncs database-safe.
create unique index if not exists franchise_leads_google_form_phone_uidx
  on public.franchise_leads(phone_normalized)
  where source = 'google_form' and phone_normalized <> '';

grant select, insert, update, delete
  on table public.franchise_leads
  to service_role;

notify pgrst, 'reload schema';
