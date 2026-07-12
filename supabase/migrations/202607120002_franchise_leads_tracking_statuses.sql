-- Expand franchise lead tracking statuses to match the owner follow-up workflow.
alter table public.franchise_leads
  drop constraint if exists franchise_leads_status_check;

update public.franchise_leads
set status = 'interested'
where status = 'qualified';

update public.franchise_leads
set status = 'converted'
where status = 'pending_payment';

alter table public.franchise_leads
  add constraint franchise_leads_status_check check (status in ('new', 'contacted', 'awaiting_info', 'interested', 'appointment_scheduled', 'not_ready', 'not_qualified', 'converted'));
