-- Align Cash Flow income categories with current Kai-tood business revenue channels.
-- The cash_flow_categories table is the source of truth used by the dropdown,
-- server-side validation, filters, and reports through category codes.
insert into public.cash_flow_categories (name, type, code, is_active)
values
  ('ขายไก่หมัก', 'income', 'marinated_chicken_sales', true),
  ('ขายไก่สด', 'income', 'fresh_chicken_sales', true),
  ('ขายหนังสือสูตร', 'income', 'book_sales', true),
  ('ขายคอร์สออนไลน์', 'income', 'online_course_sales', true),
  ('ขายคอร์สสอนสด', 'income', 'live_course_sales', true)
on conflict (code) do update
set name = excluded.name,
    type = excluded.type,
    is_active = true;

-- This previous income option is not part of the requested Cash Flow business categories.
update public.cash_flow_categories
set is_active = false
where code = 'vip_member_sales';

notify pgrst, 'reload schema';
