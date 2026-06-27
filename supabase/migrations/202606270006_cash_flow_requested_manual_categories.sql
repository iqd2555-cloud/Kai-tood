-- Add owner-requested manual Cash Flow categories.
-- Safe to run repeatedly and keeps existing rows active without touching entries.
insert into public.cash_flow_categories (name, type, code, is_active)
values
('ขายไก่หมัก', 'income', 'marinated_chicken_sales', true),
('ขายสมาชิก VIP', 'income', 'vip_member_sales', true),
('ขายไก่สด', 'income', 'fresh_chicken_sales', true),
('จ่ายค่าเช่าที่', 'expense', 'rent_payment', true),
('จ่ายค่าอินเตอร์เน็ต', 'expense', 'internet_payment', true)
on conflict (code) do update
set name = excluded.name,
    type = excluded.type,
    is_active = true;

notify pgrst, 'reload schema';
