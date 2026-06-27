-- Add owner-requested manual Cash Flow categories.
-- Safe to run repeatedly and keeps existing rows active without touching entries.
insert into public.cash_flow_categories (name, type, code)
values
('ขายไก่หมัก', 'income', 'marinated_chicken_sales'),
('ขายสมาชิก VIP', 'income', 'vip_member_sales'),
('ขายไก่สด', 'income', 'fresh_chicken_sales'),
('จ่ายค่าเช่าที่', 'expense', 'rent_payment'),
('จ่ายค่าอินเตอร์เน็ต', 'expense', 'internet_payment')
on conflict (code) do update
set name = excluded.name,
    type = excluded.type,
    is_active = true;

notify pgrst, 'reload schema';
