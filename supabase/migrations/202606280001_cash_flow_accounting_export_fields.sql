alter table public.cash_flow_entries
add column if not exists document_type text,
add column if not exists accountant_note text,
add column if not exists has_attachment boolean default false;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'cash_flow_entries_document_type_check'
  ) then
    alter table public.cash_flow_entries
    add constraint cash_flow_entries_document_type_check
    check (document_type is null or document_type in ('receipt', 'tax_invoice', 'transfer_slip', 'cash_bill', 'no_document', 'other'))
    not valid;
  end if;
end $$;

update public.cash_flow_entries
set has_attachment = true
where coalesce(attachment_url, '') <> '' and coalesce(has_attachment, false) = false;
