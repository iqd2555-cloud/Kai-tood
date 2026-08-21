-- Prevent clearly implausible OCR dates from placing LINE bill entries in the wrong Cash Flow day.
-- The OCR document date remains preserved inside line_bill_receipts.extracted_data for audit.

create or replace function public.guard_line_ocr_transaction_date()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  line_message_id text;
  receipt_event_date date;
  receipt_document_type text;
  day_gap integer;
begin
  if new.source_ref_id is null or new.source_ref_id not like 'line:%' then
    return new;
  end if;

  line_message_id := substring(new.source_ref_id from 6);

  select
    (r.event_at at time zone 'Asia/Bangkok')::date,
    coalesce(r.extracted_data ->> 'documentType', '')
  into receipt_event_date, receipt_document_type
  from public.line_bill_receipts r
  where r.message_id = line_message_id
  order by r.created_at desc
  limit 1;

  if receipt_event_date is null then
    return new;
  end if;

  if new.transaction_date is null then
    new.transaction_date := receipt_event_date;
    return new;
  end if;

  day_gap := abs(new.transaction_date - receipt_event_date);

  -- Keep plausible historical documents, but stop obvious OCR month/year mistakes.
  if receipt_document_type in ('invoice_receipt', 'other') then
    if new.transaction_date > receipt_event_date + 1
       or day_gap > 120
       or (extract(day from new.transaction_date) = extract(day from receipt_event_date) and day_gap > 31)
    then
      new.transaction_date := receipt_event_date;
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_guard_line_ocr_transaction_date on public.cash_flow_entries;
create trigger trg_guard_line_ocr_transaction_date
before insert or update of transaction_date, source_ref_id
on public.cash_flow_entries
for each row
execute function public.guard_line_ocr_transaction_date();

revoke all on function public.guard_line_ocr_transaction_date() from public;
grant execute on function public.guard_line_ocr_transaction_date() to service_role;

notify pgrst, 'reload schema';
