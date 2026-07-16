alter table public.daily_reports
  add column if not exists status text not null default 'submitted',
  add column if not exists submitted_at timestamptz;

alter table public.daily_reports
  drop constraint if exists daily_reports_status_check;

alter table public.daily_reports
  add constraint daily_reports_status_check
  check (status in ('draft', 'submitted', 'completed', 'pending'));

update public.daily_reports
set
  status = 'submitted',
  submitted_at = coalesce(submitted_at, updated_at, created_at, now())
where status is null or status = '' or submitted_at is null;

create index if not exists daily_reports_status_date_branch_idx
  on public.daily_reports(status, report_date desc, branch_id);

create or replace view public.daily_report_submission_audit as
select
  dr.id,
  dr.report_date,
  dr.branch_id,
  b.name as branch_name,
  b.code as branch_code,
  dr.submitted_by as user_id,
  p.email as user_email,
  p.role as user_role,
  p.branch_id as profile_branch_id,
  dr.status,
  dr.submitted_at,
  dr.created_at,
  dr.updated_at
from public.daily_reports dr
join public.branches b on b.id = dr.branch_id
left join public.profiles p on p.id = dr.submitted_by;
