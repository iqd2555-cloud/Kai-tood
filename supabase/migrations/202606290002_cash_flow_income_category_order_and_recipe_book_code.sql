-- Keep Cash Flow income categories aligned with the requested business revenue channels.
-- cash_flow_categories.code is stored on cash_flow_entries.category, so migrate the
-- earlier book_sales code to the requested recipe_book_sales code without losing data.
alter table public.cash_flow_categories add column if not exists sort_order integer not null default 100;

insert into public.cash_flow_categories (name, type, code, sort_order, is_active)
values
  ('ยอดขายหน้าร้าน', 'income', 'sales_revenue', 10, true),
  ('ขายไก่หมัก', 'income', 'marinated_chicken_sales', 20, true),
  ('ขายไก่สด', 'income', 'fresh_chicken_sales', 30, true),
  ('ขายหนังสือสูตร', 'income', 'recipe_book_sales', 40, true),
  ('ขายคอร์สออนไลน์', 'income', 'online_course_sales', 50, true),
  ('ขายคอร์สสอนสด', 'income', 'live_course_sales', 60, true),
  ('รายรับแฟรนไชส์', 'income', 'franchise_income', 70, true),
  ('รับเงินอื่น ๆ', 'income', 'other_income', 80, true)
on conflict (code) do update
set name = excluded.name,
    type = excluded.type,
    sort_order = excluded.sort_order,
    is_active = true;

update public.cash_flow_entries
set category = 'recipe_book_sales'
where category = 'book_sales';

update public.cash_flow_categories
set is_active = false
where code in ('book_sales', 'course_book_income', 'owner_fund_in', 'vip_member_sales');

notify pgrst, 'reload schema';
