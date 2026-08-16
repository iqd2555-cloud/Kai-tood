create table if not exists public.customer_feedback (
  id uuid primary key default gen_random_uuid(),
  case_number text not null unique,
  branch_id uuid references public.branches(id) on delete set null,
  branch_name text not null,
  service_date date not null,
  service_time time,
  feedback_type text not null check (feedback_type in ('complaint','suggestion','compliment')),
  details text not null check (char_length(details) between 5 and 3000),
  customer_name text,
  customer_contact text,
  status text not null default 'received' check (status in ('received','investigating','resolved','closed')),
  admin_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists customer_feedback_created_at_idx on public.customer_feedback(created_at desc);
create index if not exists customer_feedback_branch_date_idx on public.customer_feedback(branch_id, service_date desc);
create index if not exists customer_feedback_status_idx on public.customer_feedback(status);

alter table public.customer_feedback enable row level security;

-- No public RLS policies are intentionally created. Public submissions and owner reads
-- go through trusted server-side code using the service-role client.
