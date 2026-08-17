create table if not exists public.marinated_orders (
  id uuid primary key default gen_random_uuid(),
  order_number text not null unique default (
    'MO-' || to_char(clock_timestamp(), 'YYYYMMDD-HH24MISS') || '-' ||
    upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 4))
  ),
  source text not null default 'manual_parser' check (source in ('manual_parser', 'line_parser')),
  customer_master_id text not null,
  customer_name text not null,
  customer_group text not null check (customer_group in ('A', 'B', 'C')),
  customer_phone text,
  customer_address text,
  shipping_instruction text,
  raw_message text not null,
  delivery_date date not null,
  status text not null default 'draft'
    check (status in ('draft', 'confirmed', 'sent_to_production', 'completed', 'cancelled')),
  price_per_kg numeric(10, 2) not null check (price_per_kg > 0),
  total_kg numeric(10, 2) not null check (total_kg > 0),
  total_amount numeric(12, 2) not null check (total_amount >= 0),
  needs_review boolean not null default false,
  note text,
  created_by uuid not null references public.profiles(id),
  confirmed_by uuid references public.profiles(id),
  confirmed_at timestamptz,
  sent_to_production_by uuid references public.profiles(id),
  sent_to_production_at timestamptz,
  completed_by uuid references public.profiles(id),
  completed_at timestamptz,
  cancelled_by uuid references public.profiles(id),
  cancelled_at timestamptz,
  cancel_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.marinated_order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.marinated_orders(id) on delete cascade,
  product_code text not null check (product_code in ('original', 'spicy', 'skin', 'offal', 'drumstick')),
  product_name text not null,
  quantity_kg numeric(10, 2) not null check (quantity_kg > 0),
  unit_price numeric(10, 2) not null check (unit_price > 0),
  line_total numeric(12, 2) generated always as (quantity_kg * unit_price) stored,
  created_at timestamptz not null default now(),
  unique (order_id, product_code)
);

create table if not exists public.marinated_order_status_history (
  id bigint generated always as identity primary key,
  order_id uuid not null references public.marinated_orders(id) on delete cascade,
  old_status text,
  new_status text not null
    check (new_status in ('draft', 'confirmed', 'sent_to_production', 'completed', 'cancelled')),
  note text,
  changed_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now()
);

create index if not exists marinated_orders_status_delivery_idx
  on public.marinated_orders(status, delivery_date, created_at desc);
create index if not exists marinated_orders_customer_idx
  on public.marinated_orders(customer_master_id, created_at desc);
create index if not exists marinated_order_items_order_idx
  on public.marinated_order_items(order_id);
create index if not exists marinated_order_history_order_idx
  on public.marinated_order_status_history(order_id, created_at desc);

create or replace function public.set_marinated_order_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists marinated_orders_set_updated_at on public.marinated_orders;
create trigger marinated_orders_set_updated_at
before update on public.marinated_orders
for each row execute function public.set_marinated_order_updated_at();

alter table public.marinated_orders enable row level security;
alter table public.marinated_order_items enable row level security;
alter table public.marinated_order_status_history enable row level security;

drop policy if exists "owners read marinated orders" on public.marinated_orders;
create policy "owners read marinated orders" on public.marinated_orders
for select to authenticated
using (public.current_profile_role() = 'owner');

drop policy if exists "owners create marinated orders" on public.marinated_orders;
create policy "owners create marinated orders" on public.marinated_orders
for insert to authenticated
with check (
  public.current_profile_role() = 'owner'
  and created_by = (select auth.uid())
  and status = 'draft'
);

drop policy if exists "owners update marinated orders" on public.marinated_orders;
create policy "owners update marinated orders" on public.marinated_orders
for update to authenticated
using (public.current_profile_role() = 'owner')
with check (public.current_profile_role() = 'owner');

drop policy if exists "owners read marinated order items" on public.marinated_order_items;
create policy "owners read marinated order items" on public.marinated_order_items
for select to authenticated
using (public.current_profile_role() = 'owner');

drop policy if exists "owners create draft marinated order items" on public.marinated_order_items;
create policy "owners create draft marinated order items" on public.marinated_order_items
for insert to authenticated
with check (
  public.current_profile_role() = 'owner'
  and exists (
    select 1 from public.marinated_orders orders
    where orders.id = order_id and orders.status = 'draft'
  )
);

drop policy if exists "owners update draft marinated order items" on public.marinated_order_items;
create policy "owners update draft marinated order items" on public.marinated_order_items
for update to authenticated
using (
  public.current_profile_role() = 'owner'
  and exists (
    select 1 from public.marinated_orders orders
    where orders.id = order_id and orders.status = 'draft'
  )
)
with check (
  public.current_profile_role() = 'owner'
  and exists (
    select 1 from public.marinated_orders orders
    where orders.id = order_id and orders.status = 'draft'
  )
);

drop policy if exists "owners delete draft marinated order items" on public.marinated_order_items;
create policy "owners delete draft marinated order items" on public.marinated_order_items
for delete to authenticated
using (
  public.current_profile_role() = 'owner'
  and exists (
    select 1 from public.marinated_orders orders
    where orders.id = order_id and orders.status = 'draft'
  )
);

drop policy if exists "owners read marinated order history" on public.marinated_order_status_history;
create policy "owners read marinated order history" on public.marinated_order_status_history
for select to authenticated
using (public.current_profile_role() = 'owner');

drop policy if exists "owners create marinated order history" on public.marinated_order_status_history;
create policy "owners create marinated order history" on public.marinated_order_status_history
for insert to authenticated
with check (
  public.current_profile_role() = 'owner'
  and changed_by = (select auth.uid())
);

grant select, insert, update on public.marinated_orders to authenticated;
grant select, insert, update, delete on public.marinated_order_items to authenticated;
grant select, insert on public.marinated_order_status_history to authenticated;
grant usage, select on sequence public.marinated_order_status_history_id_seq to authenticated;

create or replace function public.create_marinated_order_draft(
  p_customer_master_id text,
  p_customer_name text,
  p_customer_group text,
  p_customer_phone text,
  p_customer_address text,
  p_shipping_instruction text,
  p_raw_message text,
  p_delivery_date date,
  p_price_per_kg numeric,
  p_items jsonb
)
returns uuid
language plpgsql
set search_path = ''
as $$
declare
  v_order_id uuid;
  v_total_kg numeric(10, 2);
begin
  if public.current_profile_role() <> 'owner' then
    raise exception 'owner access required';
  end if;

  if p_customer_group not in ('A', 'B', 'C') then
    raise exception 'invalid customer group';
  end if;

  if p_delivery_date is null or coalesce(trim(p_raw_message), '') = '' then
    raise exception 'delivery date and raw message are required';
  end if;

  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'at least one order item is required';
  end if;

  select sum((item ->> 'kg')::numeric)
  into v_total_kg
  from jsonb_array_elements(p_items) item;

  if v_total_kg is null or v_total_kg <= 0 or p_price_per_kg <= 0 then
    raise exception 'invalid order totals';
  end if;

  insert into public.marinated_orders (
    customer_master_id, customer_name, customer_group, customer_phone,
    customer_address, shipping_instruction, raw_message, delivery_date,
    price_per_kg, total_kg, total_amount, created_by
  ) values (
    p_customer_master_id, p_customer_name, p_customer_group, nullif(p_customer_phone, ''),
    nullif(p_customer_address, ''), nullif(p_shipping_instruction, ''), p_raw_message,
    p_delivery_date, p_price_per_kg, v_total_kg, v_total_kg * p_price_per_kg,
    (select auth.uid())
  ) returning id into v_order_id;

  insert into public.marinated_order_items (
    order_id, product_code, product_name, quantity_kg, unit_price
  )
  select
    v_order_id,
    item ->> 'product',
    item ->> 'name',
    (item ->> 'kg')::numeric,
    p_price_per_kg
  from jsonb_array_elements(p_items) item;

  insert into public.marinated_order_status_history (
    order_id, old_status, new_status, note, changed_by
  ) values (
    v_order_id, null, 'draft', 'สร้างจาก Order Parser และรอ Owner ยืนยัน', (select auth.uid())
  );

  return v_order_id;
end;
$$;

create or replace function public.transition_marinated_order(
  p_order_id uuid,
  p_new_status text,
  p_note text default null
)
returns table (id uuid, order_number text, status text)
language plpgsql
set search_path = ''
as $$
declare
  v_old_status text;
begin
  if public.current_profile_role() <> 'owner' then
    raise exception 'owner access required';
  end if;

  select orders.status
  into v_old_status
  from public.marinated_orders orders
  where orders.id = p_order_id
  for update;

  if v_old_status is null then
    raise exception 'order not found';
  end if;

  if not (
    (v_old_status = 'draft' and p_new_status in ('confirmed', 'cancelled'))
    or (v_old_status = 'confirmed' and p_new_status in ('sent_to_production', 'cancelled'))
    or (v_old_status = 'sent_to_production' and p_new_status in ('completed', 'cancelled'))
  ) then
    raise exception 'invalid status transition from % to %', v_old_status, p_new_status;
  end if;

  if p_new_status = 'cancelled' and coalesce(trim(p_note), '') = '' then
    raise exception 'cancel reason is required';
  end if;

  update public.marinated_orders orders
  set
    status = p_new_status,
    confirmed_by = case when p_new_status = 'confirmed' then (select auth.uid()) else orders.confirmed_by end,
    confirmed_at = case when p_new_status = 'confirmed' then now() else orders.confirmed_at end,
    sent_to_production_by = case when p_new_status = 'sent_to_production' then (select auth.uid()) else orders.sent_to_production_by end,
    sent_to_production_at = case when p_new_status = 'sent_to_production' then now() else orders.sent_to_production_at end,
    completed_by = case when p_new_status = 'completed' then (select auth.uid()) else orders.completed_by end,
    completed_at = case when p_new_status = 'completed' then now() else orders.completed_at end,
    cancelled_by = case when p_new_status = 'cancelled' then (select auth.uid()) else orders.cancelled_by end,
    cancelled_at = case when p_new_status = 'cancelled' then now() else orders.cancelled_at end,
    cancel_reason = case when p_new_status = 'cancelled' then trim(p_note) else orders.cancel_reason end
  where orders.id = p_order_id;

  insert into public.marinated_order_status_history (
    order_id, old_status, new_status, note, changed_by
  ) values (
    p_order_id, v_old_status, p_new_status, nullif(trim(p_note), ''), (select auth.uid())
  );

  return query
  select orders.id, orders.order_number, orders.status
  from public.marinated_orders orders
  where orders.id = p_order_id;
end;
$$;

revoke all on function public.create_marinated_order_draft(
  text, text, text, text, text, text, text, date, numeric, jsonb
) from public, anon;
grant execute on function public.create_marinated_order_draft(
  text, text, text, text, text, text, text, date, numeric, jsonb
) to authenticated;

revoke all on function public.transition_marinated_order(uuid, text, text) from public, anon;
grant execute on function public.transition_marinated_order(uuid, text, text) to authenticated;
