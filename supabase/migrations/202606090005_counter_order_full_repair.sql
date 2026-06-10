-- Emergency full repair for Counter Order production objects.
-- This migration is intentionally idempotent so it can be applied to a
-- production database where earlier Counter Order migrations were skipped.
-- It creates every required Counter Order table and RPC, verifies their exact
-- names/signatures, then reloads the PostgREST schema cache.

create extension if not exists "pgcrypto";


do $$
begin
  if not exists (select 1 from pg_type where typnamespace = 'public'::regnamespace and typname = 'counter_order_status') then
    create type public.counter_order_status as enum ('success', 'cancelled');
  end if;

  if not exists (select 1 from pg_type where typnamespace = 'public'::regnamespace and typname = 'counter_print_status') then
    create type public.counter_print_status as enum ('pending', 'printed', 'reprinted');
  end if;

  if not exists (select 1 from pg_type where typnamespace = 'public'::regnamespace and typname = 'counter_print_type') then
    create type public.counter_print_type as enum ('print', 'reprint');
  end if;
end $$;

create sequence if not exists public.counter_order_number_seq start 1;

create table if not exists public.counter_price_items (
  id uuid primary key default gen_random_uuid(),
  item_name text not null,
  price numeric not null check (price > 0),
  status text not null default 'active' check (status in ('active', 'inactive')),
  created_at timestamptz not null default now(),
  unique (price)
);

create table if not exists public.counter_orders (
  id uuid primary key default gen_random_uuid(),
  order_number text not null unique default ('ORD-' || lpad(nextval('public.counter_order_number_seq')::text, 6, '0')),
  branch_id uuid not null references public.branches(id),
  user_id uuid not null references public.profiles(id),
  order_date date not null default ((now() at time zone 'Asia/Bangkok')::date),
  order_time time not null default ((now() at time zone 'Asia/Bangkok')::time(0)),
  status public.counter_order_status not null default 'success',
  total_amount numeric not null check (total_amount >= 0),
  print_status public.counter_print_status not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.counter_order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.counter_orders(id) on delete restrict,
  item_name text not null,
  price numeric not null check (price > 0),
  quantity integer not null check (quantity > 0),
  line_total numeric not null check (line_total >= 0)
);

create table if not exists public.counter_cancellations (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null unique references public.counter_orders(id) on delete restrict,
  cancelled_by uuid not null references public.profiles(id),
  cancelled_at timestamptz not null default now(),
  reason text not null,
  original_total numeric not null check (original_total >= 0)
);

create table if not exists public.counter_print_logs (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.counter_orders(id) on delete restrict,
  printed_by uuid not null references public.profiles(id),
  printed_at timestamptz not null default now(),
  print_type public.counter_print_type not null,
  status text not null default 'queued'
);

create index if not exists counter_price_items_status_idx on public.counter_price_items(status, price);
create index if not exists counter_orders_branch_date_idx on public.counter_orders(branch_id, order_date desc, created_at desc);
create index if not exists counter_orders_user_date_idx on public.counter_orders(user_id, order_date desc, created_at desc);
create index if not exists counter_orders_status_idx on public.counter_orders(status);
create index if not exists counter_cancellations_cancelled_at_idx on public.counter_cancellations(cancelled_at desc);
create index if not exists counter_print_logs_order_idx on public.counter_print_logs(order_id, printed_at desc);

alter table public.counter_price_items enable row level security;
alter table public.counter_orders enable row level security;
alter table public.counter_order_items enable row level security;
alter table public.counter_cancellations enable row level security;
alter table public.counter_print_logs enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'counter_price_items' and policyname = 'counter price items read authenticated') then
    create policy "counter price items read authenticated" on public.counter_price_items
    for select using (auth.uid() is not null);
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'counter_price_items' and policyname = 'counter price items owners manage') then
    create policy "counter price items owners manage" on public.counter_price_items
    for all using (public.current_profile_role() = 'owner')
    with check (public.current_profile_role() = 'owner');
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'counter_orders' and policyname = 'counter orders read by role') then
    create policy "counter orders read by role" on public.counter_orders
    for select using (public.current_profile_role() = 'owner' or branch_id = public.current_profile_branch_id());
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'counter_orders' and policyname = 'counter orders insert by role') then
    create policy "counter orders insert by role" on public.counter_orders
    for insert with check (public.current_profile_role() = 'owner' or branch_id = public.current_profile_branch_id());
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'counter_orders' and policyname = 'counter orders update owners or branch staff') then
    create policy "counter orders update owners or branch staff" on public.counter_orders
    for update using (public.current_profile_role() = 'owner' or branch_id = public.current_profile_branch_id())
    with check (public.current_profile_role() = 'owner' or branch_id = public.current_profile_branch_id());
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'counter_order_items' and policyname = 'counter order items read by role') then
    create policy "counter order items read by role" on public.counter_order_items
    for select using (
      exists (
        select 1 from public.counter_orders o
        where o.id = order_id
          and (public.current_profile_role() = 'owner' or o.branch_id = public.current_profile_branch_id())
      )
    );
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'counter_order_items' and policyname = 'counter order items insert by role') then
    create policy "counter order items insert by role" on public.counter_order_items
    for insert with check (
      exists (
        select 1 from public.counter_orders o
        where o.id = order_id
          and (public.current_profile_role() = 'owner' or o.branch_id = public.current_profile_branch_id())
      )
    );
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'counter_cancellations' and policyname = 'counter cancellations read by role') then
    create policy "counter cancellations read by role" on public.counter_cancellations
    for select using (
      exists (
        select 1 from public.counter_orders o
        where o.id = order_id
          and (public.current_profile_role() = 'owner' or o.branch_id = public.current_profile_branch_id())
      )
    );
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'counter_cancellations' and policyname = 'counter cancellations insert by role') then
    create policy "counter cancellations insert by role" on public.counter_cancellations
    for insert with check (
      exists (
        select 1 from public.counter_orders o
        where o.id = order_id
          and (public.current_profile_role() = 'owner' or o.branch_id = public.current_profile_branch_id())
      )
    );
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'counter_print_logs' and policyname = 'counter print logs read by role') then
    create policy "counter print logs read by role" on public.counter_print_logs
    for select using (
      exists (
        select 1 from public.counter_orders o
        where o.id = order_id
          and (public.current_profile_role() = 'owner' or o.branch_id = public.current_profile_branch_id())
      )
    );
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'counter_print_logs' and policyname = 'counter print logs insert by role') then
    create policy "counter print logs insert by role" on public.counter_print_logs
    for insert with check (
      exists (
        select 1 from public.counter_orders o
        where o.id = order_id
          and (public.current_profile_role() = 'owner' or o.branch_id = public.current_profile_branch_id())
      )
    );
  end if;
end $$;

insert into public.counter_price_items (item_name, price, status)
values
  ('ไก่ทอดห่อ 20 บาท', 20, 'active'),
  ('ไก่ทอดห่อ 25 บาท', 25, 'active'),
  ('ไก่ทอดห่อ 30 บาท', 30, 'active')
on conflict (price) do update
set item_name = excluded.item_name,
    status = excluded.status;

create or replace function public.get_counter_price_items()
returns table(item_name text, price numeric)
language sql
security definer
set search_path = public
as $$
  select cpi.item_name, cpi.price
  from public.counter_price_items cpi
  where cpi.status = 'active'
  order by cpi.price;
$$;

create or replace function public.can_use_counter_branch(target_branch_id uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and (p.role = 'owner' or p.branch_id = target_branch_id)
  );
$$;

create or replace function public.create_counter_order(
  p_branch_id uuid,
  p_price numeric,
  p_quantity integer
)
returns public.counter_orders
language plpgsql
security definer
set search_path = public
as $$
declare
  profile_row public.profiles;
  item_row public.counter_price_items;
  order_row public.counter_orders;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  select * into profile_row from public.profiles where id = auth.uid();
  if not found then
    raise exception 'Profile not found';
  end if;

  if profile_row.role <> 'owner' and profile_row.branch_id <> p_branch_id then
    raise exception 'Branch is not allowed for this user';
  end if;

  if p_price is null or p_price <= 0 then
    raise exception 'Price is invalid';
  end if;

  if p_quantity is null or p_quantity <= 0 or p_quantity > 999 then
    raise exception 'Quantity is invalid';
  end if;

  select * into item_row
  from public.counter_price_items
  where price = p_price and status = 'active'
  limit 1;

  if not found then
    raise exception 'Price item is not active';
  end if;

  insert into public.counter_orders (branch_id, user_id, total_amount)
  values (p_branch_id, auth.uid(), item_row.price * p_quantity)
  returning * into order_row;

  insert into public.counter_order_items (order_id, item_name, price, quantity, line_total)
  values (order_row.id, item_row.item_name, item_row.price, p_quantity, item_row.price * p_quantity);

  return order_row;
end;
$$;

create or replace function public.cancel_latest_counter_order(
  p_branch_id uuid,
  p_reason text
)
returns public.counter_orders
language plpgsql
security definer
set search_path = public
as $$
declare
  profile_row public.profiles;
  order_row public.counter_orders;
  normalized_reason text;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  select * into profile_row from public.profiles where id = auth.uid();
  if not found then
    raise exception 'Profile not found';
  end if;

  if profile_row.role <> 'owner' and profile_row.branch_id <> p_branch_id then
    raise exception 'Branch is not allowed for this user';
  end if;

  normalized_reason := nullif(trim(coalesce(p_reason, '')), '');
  if normalized_reason is null then
    raise exception 'Cancellation reason is required';
  end if;

  select * into order_row
  from public.counter_orders
  where branch_id = p_branch_id and status = 'success'
  order by created_at desc
  limit 1
  for update;

  if not found then
    raise exception 'No successful order to cancel';
  end if;

  update public.counter_orders
  set status = 'cancelled', updated_at = now()
  where id = order_row.id
  returning * into order_row;

  insert into public.counter_cancellations (order_id, cancelled_by, reason, original_total)
  values (order_row.id, auth.uid(), normalized_reason, order_row.total_amount);

  return order_row;
end;
$$;

create or replace function public.mark_order_printed(p_order_id uuid)
returns public.counter_orders
language plpgsql
security definer
set search_path = public
as $$
declare
  order_row public.counter_orders;
begin
  select * into order_row from public.counter_orders where id = p_order_id for update;
  if not found then
    raise exception 'Order not found';
  end if;
  if not public.can_use_counter_branch(order_row.branch_id) then
    raise exception 'Order is not allowed for this user';
  end if;

  update public.counter_orders
  set print_status = 'printed', updated_at = now()
  where id = p_order_id
  returning * into order_row;

  insert into public.counter_print_logs (order_id, printed_by, print_type, status)
  values (p_order_id, auth.uid(), 'print', 'queued');

  return order_row;
end;
$$;

create or replace function public.reprint_order(p_order_id uuid)
returns public.counter_orders
language plpgsql
security definer
set search_path = public
as $$
declare
  order_row public.counter_orders;
begin
  select * into order_row from public.counter_orders where id = p_order_id for update;
  if not found then
    raise exception 'Order not found';
  end if;
  if not public.can_use_counter_branch(order_row.branch_id) then
    raise exception 'Order is not allowed for this user';
  end if;

  update public.counter_orders
  set print_status = 'reprinted', updated_at = now()
  where id = p_order_id
  returning * into order_row;

  insert into public.counter_print_logs (order_id, printed_by, print_type, status)
  values (p_order_id, auth.uid(), 'reprint', 'queued');

  return order_row;
end;
$$;


grant usage, select on sequence public.counter_order_number_seq to authenticated;
grant select on table public.counter_price_items to authenticated;
grant select, insert, update on table public.counter_orders to authenticated;
grant select, insert on table public.counter_order_items to authenticated;
grant select, insert on table public.counter_cancellations to authenticated;
grant select, insert on table public.counter_print_logs to authenticated;
grant execute on function public.get_counter_price_items() to authenticated;
grant execute on function public.can_use_counter_branch(uuid) to authenticated;
grant execute on function public.create_counter_order(uuid, numeric, integer) to authenticated;
grant execute on function public.cancel_latest_counter_order(uuid, text) to authenticated;
grant execute on function public.mark_order_printed(uuid) to authenticated;
grant execute on function public.reprint_order(uuid) to authenticated;


do $$
declare
  missing_tables text[];
  missing_functions text[];
begin
  select coalesce(array_agg(name), '{}') into missing_tables
  from unnest(array[
    'public.counter_price_items',
    'public.counter_orders',
    'public.counter_order_items',
    'public.counter_cancellations',
    'public.counter_print_logs'
  ]) as required_table(name)
  where to_regclass(name) is null;

  if array_length(missing_tables, 1) is not null then
    raise exception 'Counter Order full repair failed. Missing tables: %', array_to_string(missing_tables, ', ');
  end if;

  select coalesce(array_agg(signature), '{}') into missing_functions
  from unnest(array[
    'public.get_counter_price_items()',
    'public.can_use_counter_branch(uuid)',
    'public.create_counter_order(uuid,numeric,integer)',
    'public.cancel_latest_counter_order(uuid,text)',
    'public.mark_order_printed(uuid)',
    'public.reprint_order(uuid)'
  ]) as required_function(signature)
  where to_regprocedure(signature) is null;

  if array_length(missing_functions, 1) is not null then
    raise exception 'Counter Order full repair failed. Missing RPC functions: %', array_to_string(missing_functions, ', ');
  end if;
end $$;

notify pgrst, 'reload schema';
