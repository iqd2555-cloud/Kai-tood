-- Store LINE Official Account bill receipt events without changing existing data.
-- Safe to run more than once in Supabase SQL Editor, including after a partial run.

create or replace function public.current_profile_role()
returns public.user_role
language sql
stable
security definer
set search_path = public
as $$ select role from public.profiles where id = auth.uid() $$;

grant execute on function public.current_profile_role() to authenticated;

create table if not exists public.line_bill_receipts (
  id uuid primary key default gen_random_uuid(),
  message_id text,
  line_user_id text,
  message_type text,
  event_at timestamptz,
  processing_status text,
  image_storage_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.line_bill_receipts add column if not exists id uuid default gen_random_uuid();
alter table public.line_bill_receipts add column if not exists message_id text;
alter table public.line_bill_receipts add column if not exists line_user_id text;
alter table public.line_bill_receipts add column if not exists message_type text;
alter table public.line_bill_receipts add column if not exists event_at timestamptz;
alter table public.line_bill_receipts add column if not exists processing_status text;
alter table public.line_bill_receipts add column if not exists image_storage_path text;
alter table public.line_bill_receipts add column if not exists created_at timestamptz not null default now();
alter table public.line_bill_receipts add column if not exists updated_at timestamptz not null default now();

alter table public.line_bill_receipts alter column id set default gen_random_uuid();
alter table public.line_bill_receipts alter column created_at set default now();
alter table public.line_bill_receipts alter column updated_at set default now();
alter table public.line_bill_receipts alter column processing_status set default 'message_received';

update public.line_bill_receipts set id = gen_random_uuid() where id is null;
update public.line_bill_receipts set message_type = 'unknown' where message_type is null;
update public.line_bill_receipts set event_at = created_at where event_at is null;
update public.line_bill_receipts set event_at = now() where event_at is null;
update public.line_bill_receipts set processing_status = 'message_received' where processing_status is null or processing_status = 'received';
update public.line_bill_receipts set created_at = now() where created_at is null;
update public.line_bill_receipts set updated_at = now() where updated_at is null;

alter table public.line_bill_receipts alter column id set not null;
alter table public.line_bill_receipts alter column message_id set not null;
alter table public.line_bill_receipts alter column message_type set not null;
alter table public.line_bill_receipts alter column event_at set not null;
alter table public.line_bill_receipts alter column processing_status set not null;
alter table public.line_bill_receipts alter column created_at set not null;
alter table public.line_bill_receipts alter column updated_at set not null;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'line_bill_receipts_pkey'
      and conrelid = 'public.line_bill_receipts'::regclass
  ) then
    alter table public.line_bill_receipts add constraint line_bill_receipts_pkey primary key (id);
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'line_bill_receipts_message_id_unique'
      and conrelid = 'public.line_bill_receipts'::regclass
  ) then
    alter table public.line_bill_receipts add constraint line_bill_receipts_message_id_unique unique (message_id);
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'line_bill_receipts_message_type_check'
      and conrelid = 'public.line_bill_receipts'::regclass
  ) then
    alter table public.line_bill_receipts add constraint line_bill_receipts_message_type_check
      check (message_type in ('text', 'image', 'unknown'));
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'line_bill_receipts_processing_status_check'
      and conrelid = 'public.line_bill_receipts'::regclass
  ) then
    alter table public.line_bill_receipts add constraint line_bill_receipts_processing_status_check
      check (processing_status in ('message_received', 'image_received', 'processing_failed', 'processed'));
  end if;
end $$;

create index if not exists line_bill_receipts_event_at_idx on public.line_bill_receipts(event_at desc);
create index if not exists line_bill_receipts_line_user_id_idx on public.line_bill_receipts(line_user_id);
create index if not exists line_bill_receipts_processing_status_idx on public.line_bill_receipts(processing_status);

alter table public.line_bill_receipts enable row level security;

drop policy if exists "owners read line bill receipts" on public.line_bill_receipts;
create policy "owners read line bill receipts" on public.line_bill_receipts
for select to authenticated
using (public.current_profile_role() = 'owner'::public.user_role);

drop policy if exists "service role manages line bill receipts" on public.line_bill_receipts;
create policy "service role manages line bill receipts" on public.line_bill_receipts
for all to service_role
using (auth.role() = 'service_role')
with check (auth.role() = 'service_role');

insert into storage.buckets (id, name, public)
values ('line-bill-receipts', 'line-bill-receipts', false)
on conflict (id) do update set public = excluded.public;

drop policy if exists "service role manages line bill receipt images" on storage.objects;
create policy "service role manages line bill receipt images" on storage.objects
for all to service_role
using (bucket_id = 'line-bill-receipts' and auth.role() = 'service_role')
with check (bucket_id = 'line-bill-receipts' and auth.role() = 'service_role');

notify pgrst, 'reload schema';
