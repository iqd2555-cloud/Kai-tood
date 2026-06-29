-- Ensure the manual Cash Flow dropdown contains the exact owner-requested categories.
-- Safe to run repeatedly and keeps existing cash_flow_entries untouched.
insert into public.cash_flow_categories (name, type, code, is_active)
values
  ('ยอดขายหน้าร้าน', 'income', 'sales_revenue', true),
  ('ขายไก่หมัก', 'income', 'marinated_chicken_sales', true),
  ('ขายไก่สด', 'income', 'fresh_chicken_sales', true),
  ('ขายหนังสือสูตร', 'income', 'book_sales', true),
  ('ขายคอร์สออนไลน์', 'income', 'online_course_sales', true),
  ('ขายคอร์สสอนสด', 'income', 'live_course_sales', true),
  ('รายรับแฟรนไชส์', 'income', 'franchise_income', true),
  ('รับเงินอื่น ๆ', 'income', 'other_income', true),
  ('ซื้อไก่สด', 'expense', 'chicken_purchase', true),
  ('ซื้อวัตถุดิบ', 'expense', 'ingredient_purchase', true),
  ('ค่าแรง', 'expense', 'labor_cost', true),
  ('ค่าเช่า', 'expense', 'rent', true),
  ('จ่ายค่าเช่าที่', 'expense', 'rent_payment', true),
  ('ค่าขนส่ง', 'expense', 'transport', true),
  ('ค่าน้ำแข็ง', 'expense', 'ice_cost', true),
  ('ค่าเครื่องปรุง', 'expense', 'seasoning_cost', true),
  ('จ่ายค่าอินเตอร์เน็ต', 'expense', 'internet_payment', true),
  ('ค่าใช้จ่ายจิปาถะ', 'expense', 'misc_expense', true)
on conflict (code) do update
set name = excluded.name,
    type = excluded.type,
    is_active = true;

notify pgrst, 'reload schema';
