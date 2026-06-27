-- Align Cash Flow categories with real operational income/expense usage.
-- Safe to run repeatedly: updates existing category rows by code and never deletes entries.
insert into public.cash_flow_categories (name, type, direction, code, sort_order)
values
  ('ค่าไก่สด', 'expense', 'expense', 'chicken_purchase', 110),
  ('ค่าข้าวเหนียว', 'expense', 'expense', 'sticky_rice_purchase', 120),
  ('ค่าเครื่องปรุง', 'expense', 'expense', 'seasoning_purchase', 130),
  ('ค่าแรง', 'expense', 'expense', 'labor_cost', 140),
  ('ค่าน้ำแข็ง', 'expense', 'expense', 'ice_cost', 150),
  ('ค่าขนส่ง', 'expense', 'expense', 'transport', 160),
  ('อื่น ๆ ระบุเอง', 'expense', 'expense', 'other_expense', 999),
  ('ยอดขายหน้าร้าน', 'income', 'income', 'sales_revenue', 10),
  ('ค่าขายไก่หมัก', 'income', 'income', 'marinated_chicken_sales', 20),
  ('ค่าหนังสือ', 'income', 'income', 'book_sales', 30),
  ('ค่าคอร์สออนไลน์', 'income', 'income', 'online_course_sales', 40),
  ('ค่าคอร์สสอนสด', 'income', 'income', 'live_course_sales', 50),
  ('รายได้อื่นระบุเอง', 'income', 'income', 'other_income', 999)
on conflict (code) do update
set name = excluded.name,
    type = excluded.type,
    direction = excluded.direction,
    sort_order = excluded.sort_order,
    is_active = true;

-- Normalize previously synced sales rows to the current contract without duplicating.
update public.cash_flow_entries
set category = 'sales_revenue',
    payment_method = 'mixed',
    department = coalesce(department, 'หน้าร้าน'),
    type = 'income',
    status = 'received'
where source = 'sales';

notify pgrst, 'reload schema';
