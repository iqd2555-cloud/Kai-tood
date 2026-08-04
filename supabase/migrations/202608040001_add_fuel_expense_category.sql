-- Add a dedicated Cash Flow category for vehicle fuel receipts.
-- Safe to run repeatedly and keeps any existing category row active.
insert into public.cash_flow_categories (name, type, code, is_active)
values ('ค่าน้ำมันเชื้อเพลิง', 'expense', 'fuel_cost', true)
on conflict (code) do update
set name = excluded.name,
    type = excluded.type,
    is_active = true;

notify pgrst, 'reload schema';
