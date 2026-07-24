insert into public.cash_flow_categories (name, type, code, is_active)
values
  ('ขายไก่หมัก', 'income', 'marinated_chicken_sales', true),
  ('ขายหนังสือ', 'income', 'recipe_book_sales', true),
  ('ขายคอร์ส', 'income', 'course_sales', true),
  ('ขายแฟรนไชส์', 'income', 'franchise_income', true)
on conflict (code) do update
set name = excluded.name,
    type = excluded.type,
    is_active = true;

update public.cash_flow_categories
set is_active = false
where code in ('online_course_sales', 'live_course_sales');

update public.cash_flow_entries
set category = 'course_sales'
where category in ('online_course_sales', 'live_course_sales');

notify pgrst, 'reload schema';
