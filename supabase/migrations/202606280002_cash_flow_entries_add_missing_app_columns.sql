-- Safe schema sync for columns currently referenced by the application.
-- This migration only adds missing columns and defaults; it does not drop tables or delete data.

alter table public.cash_flow_entries
add column if not exists document_type text default 'no_document';

alter table public.cash_flow_entries
add column if not exists accountant_note text default '';

alter table public.cash_flow_entries
add column if not exists has_attachment boolean default false;
