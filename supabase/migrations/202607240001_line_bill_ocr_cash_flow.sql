-- Add auditable OCR results and a link to the automatically-created expense.
alter table public.line_bill_receipts
  add column if not exists extracted_data jsonb,
  add column if not exists confidence numeric(5,4),
  add column if not exists cash_flow_entry_id uuid,
  add column if not exists processing_error text;

alter table public.line_bill_receipts
  drop constraint if exists line_bill_receipts_processing_status_check;

alter table public.line_bill_receipts
  add constraint line_bill_receipts_processing_status_check
  check (processing_status in (
    'message_received',
    'image_received',
    'pending_review',
    'processing_failed',
    'processed'
  ));

create index if not exists line_bill_receipts_cash_flow_entry_id_idx
  on public.line_bill_receipts(cash_flow_entry_id);

-- Database-enforced idempotency for LINE retries. The partial index avoids
-- changing duplicate rules for entries created by other integrations.
create unique index if not exists cash_flow_entries_line_source_ref_id_unique
  on public.cash_flow_entries(source_ref_id)
  where source_ref_id like 'line:%';

notify pgrst, 'reload schema';
