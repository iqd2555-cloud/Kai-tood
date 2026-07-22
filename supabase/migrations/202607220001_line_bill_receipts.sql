-- Store LINE Official Account bill receipt events without changing existing data.
create table if not exists public.line_bill_receipts (
  id uuid primary key default gen_random_uuid(),
  message_id text not null,
  line_user_id text,
  message_type text not null,
  event_at timestamptz not null,
  processing_status text not null default 'received',
  image_storage_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint line_bill_receipts_message_id_unique unique (message_id),
  constraint line_bill_receipts_message_type_check check (message_type in ('text', 'image', 'unknown')),
  constraint line_bill_receipts_processing_status_check check (
    processing_status in ('message_received', 'image_received', 'processing_failed', 'processed')
  )
);

create index if not exists line_bill_receipts_event_at_idx on public.line_bill_receipts(event_at desc);
create index if not exists line_bill_receipts_line_user_id_idx on public.line_bill_receipts(line_user_id);
create index if not exists line_bill_receipts_processing_status_idx on public.line_bill_receipts(processing_status);

alter table public.line_bill_receipts enable row level security;

create policy "owners read line bill receipts" on public.line_bill_receipts
for select using (public.current_profile_role() = 'owner');

create policy "service role manages line bill receipts" on public.line_bill_receipts
for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');

insert into storage.buckets (id, name, public)
values ('line-bill-receipts', 'line-bill-receipts', false)
on conflict (id) do nothing;

create policy "service role manages line bill receipt images" on storage.objects
for all using (bucket_id = 'line-bill-receipts' and auth.role() = 'service_role')
with check (bucket_id = 'line-bill-receipts' and auth.role() = 'service_role');
