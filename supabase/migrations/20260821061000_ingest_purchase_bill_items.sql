-- Materialize photo-bill line items from LINE OCR into the costing ledger.
-- Only high-confidence, mapped, priced lines become verified price sources.

create or replace function public.normalize_cost_text(value text)
returns text
language sql
immutable
as $$
  select lower(regexp_replace(coalesce(value,''), '[^0-9a-zA-Zก-๙]+', '', 'g'));
$$;

create or replace function public.refresh_purchase_document_items_from_receipt()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  item jsonb;
  idx integer := 0;
  raw_name text;
  raw_unit text;
  package_unit_value text;
  qty numeric;
  package_size_value numeric;
  line_total_value numeric;
  unit_price_value numeric;
  confidence_value numeric;
  ingredient_record public.cost_ingredients%rowtype;
  normalized_qty numeric;
  normalized_unit_value text;
  source_date_value date;
  eligible boolean;
  status_value text;
begin
  if jsonb_typeof(new.extracted_data -> 'purchaseItems') is distinct from 'array' then
    return new;
  end if;

  delete from public.purchase_document_items where line_bill_receipt_id = new.id;

  begin
    source_date_value := nullif(new.extracted_data ->> 'transactionDate','')::date;
  exception when others then
    source_date_value := null;
  end;
  eligible := coalesce((new.extracted_data ->> 'costingEligible')::boolean,false);

  for item in select value from jsonb_array_elements(new.extracted_data -> 'purchaseItems') loop
    idx := idx + 1;
    raw_name := btrim(coalesce(item ->> 'rawName',''));
    raw_unit := btrim(coalesce(item ->> 'unit',''));
    package_unit_value := btrim(coalesce(item ->> 'packageUnit',''));
    qty := greatest(coalesce(nullif(item ->> 'quantity','')::numeric,0),0);
    package_size_value := greatest(coalesce(nullif(item ->> 'packageSize','')::numeric,0),0);
    line_total_value := greatest(coalesce(nullif(item ->> 'lineTotal','')::numeric,0),0);
    unit_price_value := greatest(coalesce(nullif(item ->> 'unitPrice','')::numeric,0),0);
    confidence_value := least(1,greatest(0,coalesce(nullif(item ->> 'confidence','')::numeric,0)));

    ingredient_record := null;
    select i.* into ingredient_record
    from public.cost_ingredients i
    where i.is_active
      and (
        public.normalize_cost_text(raw_name)=public.normalize_cost_text(i.name)
        or exists (
          select 1 from unnest(i.aliases) a
          where length(public.normalize_cost_text(a)) >= 2
            and (
              public.normalize_cost_text(raw_name)=public.normalize_cost_text(a)
              or public.normalize_cost_text(raw_name) like '%' || public.normalize_cost_text(a) || '%'
            )
        )
      )
    order by case when public.normalize_cost_text(raw_name)=public.normalize_cost_text(i.name) then 0 else 1 end,
             length(i.name) desc
    limit 1;

    normalized_qty := null;
    normalized_unit_value := null;

    if public.normalize_cost_text(raw_unit) in ('กก','kg','kgs','kilogram','kilograms','กิโล','กิโลกรัม') then
      normalized_qty := qty * 1000;
      normalized_unit_value := 'g';
    elsif public.normalize_cost_text(raw_unit) in ('กรัม','g','gram','grams') then
      normalized_qty := qty;
      normalized_unit_value := 'g';
    elsif public.normalize_cost_text(raw_unit) in ('ลิตร','l','liter','litre','liters','litres') then
      normalized_qty := qty * 1000;
      normalized_unit_value := 'ml';
    elsif public.normalize_cost_text(raw_unit) in ('มล','ml','milliliter','millilitre') then
      normalized_qty := qty;
      normalized_unit_value := 'ml';
    elsif package_size_value > 0 then
      if public.normalize_cost_text(package_unit_value) in ('กก','kg','kgs','kilogram','kilograms','กิโล','กิโลกรัม') then
        normalized_qty := qty * package_size_value * 1000;
        normalized_unit_value := 'g';
      elsif public.normalize_cost_text(package_unit_value) in ('กรัม','g','gram','grams') then
        normalized_qty := qty * package_size_value;
        normalized_unit_value := 'g';
      elsif public.normalize_cost_text(package_unit_value) in ('ลิตร','l','liter','litre','liters','litres') then
        normalized_qty := qty * package_size_value * 1000;
        normalized_unit_value := 'ml';
      elsif public.normalize_cost_text(package_unit_value) in ('มล','ml','milliliter','millilitre') then
        normalized_qty := qty * package_size_value;
        normalized_unit_value := 'ml';
      end if;
    elsif public.normalize_cost_text(raw_unit) in ('ชิ้น','each','ea') then
      normalized_qty := qty;
      normalized_unit_value := 'each';
    end if;

    status_value := case
      when eligible
       and ingredient_record.id is not null
       and confidence_value >= 0.90
       and normalized_qty is not null and normalized_qty > 0
       and normalized_unit_value = ingredient_record.base_unit
       and line_total_value > 0
      then 'verified'
      else 'needs_review'
    end;

    insert into public.purchase_document_items(
      line_bill_receipt_id,cash_flow_entry_id,line_no,raw_name,ingredient_id,
      quantity,unit,package_size,package_unit,normalized_quantity,normalized_unit,
      unit_price,line_total,unit_cost_base,confidence,status,source_date,merchant_name,raw_payload
    ) values (
      new.id,new.cash_flow_entry_id,idx,raw_name,ingredient_record.id,
      nullif(qty,0),nullif(raw_unit,''),nullif(package_size_value,0),nullif(package_unit_value,''),
      normalized_qty,normalized_unit_value,nullif(unit_price_value,0),nullif(line_total_value,0),
      case when normalized_qty > 0 and line_total_value > 0 then line_total_value/normalized_qty else null end,
      confidence_value,status_value,source_date_value,nullif(new.extracted_data ->> 'merchant',''),item
    );
  end loop;

  return new;
end;
$$;

drop trigger if exists trg_refresh_purchase_document_items on public.line_bill_receipts;
create trigger trg_refresh_purchase_document_items
after insert or update of extracted_data,cash_flow_entry_id on public.line_bill_receipts
for each row execute function public.refresh_purchase_document_items_from_receipt();

revoke all on function public.normalize_cost_text(text) from public;
revoke all on function public.refresh_purchase_document_items_from_receipt() from public;
grant execute on function public.normalize_cost_text(text) to service_role;
grant execute on function public.refresh_purchase_document_items_from_receipt() to service_role;

notify pgrst, 'reload schema';
