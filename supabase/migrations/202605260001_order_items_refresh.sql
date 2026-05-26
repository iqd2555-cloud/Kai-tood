-- Add new order item fields for section 4: สั่งวัตถุดิบเพิ่ม
alter table public.daily_reports
  add column if not exists order_original_chicken numeric not null default 0 check (order_original_chicken >= 0),
  add column if not exists order_spicy_chicken numeric not null default 0 check (order_spicy_chicken >= 0),
  add column if not exists order_offal numeric not null default 0 check (order_offal >= 0),
  add column if not exists order_chopped_chicken numeric not null default 0 check (order_chopped_chicken >= 0),
  add column if not exists order_drumstick numeric not null default 0 check (order_drumstick >= 0),
  add column if not exists order_chicken_skin numeric not null default 0 check (order_chicken_skin >= 0),
  add column if not exists order_sticky_rice numeric not null default 0 check (order_sticky_rice >= 0),
  add column if not exists order_oil numeric not null default 0 check (order_oil >= 0),
  add column if not exists order_palm_sugar numeric not null default 0 check (order_palm_sugar >= 0),
  add column if not exists order_other_items jsonb not null default '[]'::jsonb;

create index if not exists daily_reports_order_other_items_idx on public.daily_reports using gin (order_other_items);

notify pgrst, 'reload schema';
