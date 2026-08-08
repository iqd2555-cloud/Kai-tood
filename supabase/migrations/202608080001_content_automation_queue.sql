-- Content automation is intentionally isolated from the existing Cash Flow LINE webhook.
-- It consumes media that has already been accepted by the employee KPI workflow.

create table if not exists public.content_automation_queue (
  id uuid primary key default gen_random_uuid(),
  media_id uuid not null,
  source_type text not null check (source_type in ('image','video')),
  aspect_ratio text,
  source_work_date date,
  selection_status text not null default 'candidate' check (selection_status in ('candidate','selected','rejected')),
  owner_status text not null default 'pending' check (owner_status in ('pending','approved','rejected')),
  caption_status text not null default 'not_started' check (caption_status in ('not_started','pending','ready','failed')),
  owner_reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint content_automation_queue_media_unique unique (media_id)
);

create index if not exists content_automation_queue_owner_pending_idx
  on public.content_automation_queue (owner_status, created_at desc);

alter table public.content_automation_queue enable row level security;

-- Owners/admins can review the queue from the authenticated application.
drop policy if exists "owners manage content automation queue" on public.content_automation_queue;
create policy "owners manage content automation queue"
on public.content_automation_queue
for all
to authenticated
using (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and p.role in ('owner','admin')
  )
)
with check (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and p.role in ('owner','admin')
  )
);

-- The KPI ingestion service should insert with the service-role client only.
-- No public/anon insert policy is intentionally provided.

comment on table public.content_automation_queue is
'Owner review queue for employee media that has already passed KPI. Kept separate from Cash Flow LINE webhook.';
