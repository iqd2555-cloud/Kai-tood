-- Ensure the dedicated fuel category exists and keep fuel expenses out of labor/transport
-- even when OCR or text analysis misclassifies them.
insert into public.cash_flow_categories (name, type, code, is_active)
values ('ค่าน้ำมันเชื้อเพลิง', 'expense', 'fuel_cost', true)
on conflict (code) do update
set name = excluded.name,
    type = excluded.type,
    is_active = true;

create or replace function public.normalize_fuel_expense_category()
returns trigger
language plpgsql
as $$
declare
  normalized_description text := lower(regexp_replace(coalesce(new.description, ''), '\s+', '', 'g'));
begin
  if new.type = 'expense' and (
    normalized_description like '%บริษัทปตท.น้ำมันและการค้าปลีก%'
    or normalized_description like '%pttoilandretail%'
    or normalized_description like '%ค่าน้ำมันเชื้อเพลิง%'
    or normalized_description like '%น้ำมันเชื้อเพลิง%'
    or normalized_description like '%เติมน้ำมัน%'
    or normalized_description like '%ค่าน้ำมันรถ%'
    or normalized_description like '%น้ำมันรถยนต์%'
    or normalized_description like '%แก๊สโซฮอล์%'
    or normalized_description like '%gasohol%'
    or normalized_description like '%เบนซิน%'
    or normalized_description like '%diesel%'
    or normalized_description like '%ดีเซล%'
  ) then
    new.category := 'fuel_cost';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_normalize_fuel_expense_category on public.cash_flow_entries;
create trigger trg_normalize_fuel_expense_category
before insert or update of type, description, category
on public.cash_flow_entries
for each row
execute function public.normalize_fuel_expense_category();
