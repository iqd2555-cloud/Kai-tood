-- Supabase schema for เหนียวไก่เยอะโคตร ระบบบริหารร้านและแฟรนไชส์
create extension if not exists "pgcrypto";

create type public.user_role as enum ('owner', 'staff');

create table public.branches (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  code text not null unique,
  low_chicken_threshold numeric not null default 5,
  low_sticky_rice_threshold numeric not null default 5,
  low_oil_threshold numeric not null default 2,
  created_at timestamptz not null default now()
);

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text not null,
  role public.user_role not null default 'staff',
  branch_id uuid references public.branches(id),
  branch_name text,
  created_at timestamptz not null default now(),
  constraint staff_must_have_branch check (role = 'owner' or branch_id is not null)
);

create table public.daily_reports (
  id uuid primary key default gen_random_uuid(),
  report_date date not null,
  branch_id uuid not null references public.branches(id) on delete cascade,
  cash_sales numeric not null default 0 check (cash_sales >= 0),
  transfer_sales numeric not null default 0 check (transfer_sales >= 0),
  total_sales numeric generated always as (cash_sales + transfer_sales) stored,
  opening_original_chicken numeric not null default 0 check (opening_original_chicken >= 0),
  opening_spicy_chicken numeric not null default 0 check (opening_spicy_chicken >= 0),
  opening_ground_chicken numeric not null default 0 check (opening_ground_chicken >= 0),
  opening_drumstick numeric not null default 0 check (opening_drumstick >= 0),
  opening_offal numeric not null default 0 check (opening_offal >= 0),
  opening_chicken_skin numeric not null default 0 check (opening_chicken_skin >= 0),
  opening_sticky_rice numeric not null default 0 check (opening_sticky_rice >= 0),
  opening_oil numeric not null default 0 check (opening_oil >= 0),
  received_original_chicken numeric not null default 0 check (received_original_chicken >= 0),
  received_spicy_chicken numeric not null default 0 check (received_spicy_chicken >= 0),
  received_ground_chicken numeric not null default 0 check (received_ground_chicken >= 0),
  received_drumstick numeric not null default 0 check (received_drumstick >= 0),
  received_offal numeric not null default 0 check (received_offal >= 0),
  received_chicken_skin numeric not null default 0 check (received_chicken_skin >= 0),
  received_chicken numeric not null default 0 check (received_chicken >= 0),
  received_rice numeric not null default 0 check (received_rice >= 0),
  received_sticky_rice numeric not null default 0 check (received_sticky_rice >= 0),
  received_oil numeric not null default 0 check (received_oil >= 0),
  received_sugar numeric not null default 0 check (received_sugar >= 0),
  used_bl numeric not null default 0 check (used_bl >= 0),
  used_bb numeric not null default 0 check (used_bb >= 0),
  used_chicken_skin numeric not null default 0 check (used_chicken_skin >= 0),
  used_oil numeric not null default 0 check (used_oil >= 0),
  used_sticky_rice numeric not null default 0 check (used_sticky_rice >= 0),
  used_chopped_chicken numeric not null default 0 check (used_chopped_chicken >= 0),
  used_drumstick numeric not null default 0 check (used_drumstick >= 0),
  used_offal numeric not null default 0 check (used_offal >= 0),
  remaining_chicken numeric not null default 0 check (remaining_chicken >= 0),
  remaining_original_chicken numeric not null default 0 check (remaining_original_chicken >= 0),
  remaining_spicy_chicken numeric not null default 0 check (remaining_spicy_chicken >= 0),
  remaining_chicken_skin numeric not null default 0 check (remaining_chicken_skin >= 0),
  remaining_offal numeric not null default 0 check (remaining_offal >= 0),
  remaining_ground_chicken numeric not null default 0 check (remaining_ground_chicken >= 0),
  remaining_drumstick numeric not null default 0 check (remaining_drumstick >= 0),
  remaining_sticky_rice numeric not null default 0 check (remaining_sticky_rice >= 0),
  remaining_oil numeric not null default 0 check (remaining_oil >= 0),
  order_original_chicken numeric not null default 0 check (order_original_chicken >= 0),
  order_spicy_chicken numeric not null default 0 check (order_spicy_chicken >= 0),
  order_offal numeric not null default 0 check (order_offal >= 0),
  order_chopped_chicken numeric not null default 0 check (order_chopped_chicken >= 0),
  order_drumstick numeric not null default 0 check (order_drumstick >= 0),
  order_chicken_skin numeric not null default 0 check (order_chicken_skin >= 0),
  order_sticky_rice numeric not null default 0 check (order_sticky_rice >= 0),
  order_oil numeric not null default 0 check (order_oil >= 0),
  order_palm_sugar numeric not null default 0 check (order_palm_sugar >= 0),
  order_other_items jsonb not null default '[]'::jsonb,
  requested_items text not null default '',
  note text not null default '',
  submitted_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (branch_id, report_date)
);

create index daily_reports_report_date_idx on public.daily_reports(report_date desc);
create index daily_reports_branch_date_idx on public.daily_reports(branch_id, report_date desc);
create index daily_reports_submitted_by_date_idx on public.daily_reports(submitted_by, report_date desc);
create index daily_reports_updated_at_idx on public.daily_reports(updated_at desc);

alter table public.branches enable row level security;
alter table public.profiles enable row level security;
alter table public.daily_reports enable row level security;

create or replace function public.current_profile_role()
returns public.user_role
language sql
security definer
set search_path = public
as $$ select role from public.profiles where id = auth.uid() $$;

create or replace function public.current_profile_branch_id()
returns uuid
language sql
security definer
set search_path = public
as $$ select branch_id from public.profiles where id = auth.uid() $$;

create policy "owners read all branches staff own branch" on public.branches
for select using (public.current_profile_role() = 'owner' or id = public.current_profile_branch_id());

create policy "profiles read own or owner" on public.profiles
for select using (id = auth.uid() or public.current_profile_role() = 'owner');

create policy "daily reports read by role" on public.daily_reports
for select using (public.current_profile_role() = 'owner' or branch_id = public.current_profile_branch_id());

create policy "daily reports insert by role" on public.daily_reports
for insert with check (public.current_profile_role() = 'owner' or branch_id = public.current_profile_branch_id());

create policy "daily reports update by role" on public.daily_reports
for update using (public.current_profile_role() = 'owner' or branch_id = public.current_profile_branch_id())
with check (public.current_profile_role() = 'owner' or branch_id = public.current_profile_branch_id());

alter publication supabase_realtime add table public.daily_reports;

insert into public.branches (name, code, low_chicken_threshold, low_sticky_rice_threshold, low_oil_threshold)
values ('สาขาหลัก', 'MAIN', 5, 5, 2)
on conflict (code) do nothing;

insert into public.branches (name, code, low_chicken_threshold, low_sticky_rice_threshold, low_oil_threshold)
values
  ('สาขาที่ 1 ร.ร.นวมินทร์', 'NAVAMIN', 5, 5, 2),
  ('สาขาที่ 2 โลตัสป้อม 1', 'LOTUS-POM1', 5, 5, 2)
on conflict (code) do update set name = excluded.name;

create or replace function public.ensure_default_branch()
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  default_branch_id uuid;
begin
  insert into public.branches (name, code, low_chicken_threshold, low_sticky_rice_threshold, low_oil_threshold)
  values ('สาขาหลัก', 'MAIN', 5, 5, 2)
  on conflict (code) do update
  set name = excluded.name
  returning id into default_branch_id;

  return default_branch_id;
end;
$$;

grant execute on function public.ensure_default_branch() to authenticated;

drop function if exists public.ensure_login_profile(uuid, text, text);

create or replace function public.ensure_login_profile(
  user_email text default null,
  user_full_name text default null,
  user_id uuid default auth.uid()
)
returns public.profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  default_branch_id uuid;
  selected_role public.user_role;
  selected_branch_id uuid;
  selected_branch_name text;
  profile_row public.profiles;
  display_name text;
  normalized_email text;
  second_owner_email constant text := 'koykoykoy9783@gmail.com';
begin
  if auth.uid() is null or auth.uid() <> user_id then
    raise exception 'Cannot create profile for another user';
  end if;

  default_branch_id := public.ensure_default_branch();
  normalized_email := nullif(lower(trim(coalesce(user_email, ''))), '');
  display_name := nullif(trim(coalesce(user_full_name, split_part(coalesce(normalized_email, ''), '@', 1), '')), '');

  if display_name is null then
    display_name := 'ผู้ใช้งาน';
  end if;

  if normalized_email = second_owner_email then
    selected_role := 'owner';
    selected_branch_id := null;
    selected_branch_name := null;
  else
    selected_role := 'staff';
    selected_branch_id := default_branch_id;
    selected_branch_name := null;
  end if;

  select p.* into profile_row from public.profiles p where p.id = user_id;

  if found then
    update public.profiles
    set
      full_name = coalesce(nullif(profile_row.full_name, ''), display_name),
      email = coalesce(normalized_email, profile_row.email),
      role = case when normalized_email = second_owner_email then 'owner'::public.user_role else profile_row.role end,
      branch_id = case
        when normalized_email = second_owner_email then null
        when profile_row.role = 'staff' and profile_row.branch_id is null then default_branch_id
        else profile_row.branch_id
      end,
      branch_name = case when normalized_email = second_owner_email then null else profile_row.branch_name end
    where id = user_id
    returning * into profile_row;

    return profile_row;
  end if;

  insert into public.profiles (id, email, full_name, role, branch_id, branch_name)
  values (
    user_id,
    normalized_email,
    display_name,
    selected_role,
    selected_branch_id,
    selected_branch_name
  )
  returning * into profile_row;

  return profile_row;
end;
$$;

grant execute on function public.ensure_login_profile(text, text, uuid) to authenticated;


create or replace view public.daily_report_rollups
with (security_invoker = true)
as
select
  dr.report_date,
  dr.branch_id,
  b.name as branch_name,
  b.code as branch_code,
  sum(dr.cash_sales)::numeric as cash_sales,
  sum(dr.transfer_sales)::numeric as transfer_sales,
  sum(dr.total_sales)::numeric as total_sales,
  sum(dr.received_chicken)::numeric as received_chicken,
  sum(dr.received_rice)::numeric as received_rice,
  sum(dr.received_sticky_rice)::numeric as received_sticky_rice,
  sum(dr.received_oil)::numeric as received_oil,
  sum(dr.received_sugar)::numeric as received_sugar,
  sum(dr.used_bl)::numeric as used_bl,
  sum(dr.used_bb)::numeric as used_bb,
  sum(dr.used_chicken_skin)::numeric as used_chicken_skin,
  sum(dr.used_oil)::numeric as used_oil,
  sum(dr.used_sticky_rice)::numeric as used_sticky_rice,
  sum(dr.used_chopped_chicken)::numeric as used_chopped_chicken,
  sum(dr.used_drumstick)::numeric as used_drumstick,
  sum(dr.order_original_chicken)::numeric as order_original_chicken,
  sum(dr.order_spicy_chicken)::numeric as order_spicy_chicken,
  sum(dr.order_offal)::numeric as order_offal,
  sum(dr.order_chopped_chicken)::numeric as order_chopped_chicken,
  sum(dr.order_drumstick)::numeric as order_drumstick,
  sum(dr.order_chicken_skin)::numeric as order_chicken_skin,
  sum(dr.order_sticky_rice)::numeric as order_sticky_rice,
  sum(dr.order_oil)::numeric as order_oil,
  sum(dr.order_palm_sugar)::numeric as order_palm_sugar,
  min(dr.remaining_chicken)::numeric as remaining_chicken,
  min(dr.remaining_original_chicken)::numeric as remaining_original_chicken,
  min(dr.remaining_spicy_chicken)::numeric as remaining_spicy_chicken,
  min(dr.remaining_chicken_skin)::numeric as remaining_chicken_skin,
  min(dr.remaining_offal)::numeric as remaining_offal,
  min(dr.remaining_ground_chicken)::numeric as remaining_ground_chicken,
  min(dr.remaining_drumstick)::numeric as remaining_drumstick,
  min(dr.remaining_sticky_rice)::numeric as remaining_sticky_rice,
  min(dr.remaining_oil)::numeric as remaining_oil,
  count(*)::integer as report_count
from public.daily_reports dr
join public.branches b on b.id = dr.branch_id
group by dr.report_date, dr.branch_id, b.name, b.code;

grant select on public.daily_report_rollups to authenticated;

create or replace function public.owner_dashboard_totals(p_from date, p_to date)
returns table (
  cash_sales numeric,
  transfer_sales numeric,
  total_sales numeric,
  received_chicken numeric,
  received_rice numeric,
  received_sticky_rice numeric,
  received_oil numeric,
  received_sugar numeric,
  used_bl numeric,
  used_bb numeric,
  used_chicken_skin numeric,
  used_oil numeric,
  used_sticky_rice numeric,
  used_chopped_chicken numeric,
  used_drumstick numeric,
  order_original_chicken numeric,
  order_spicy_chicken numeric,
  order_offal numeric,
  order_chopped_chicken numeric,
  order_drumstick numeric,
  order_chicken_skin numeric,
  order_sticky_rice numeric,
  order_oil numeric,
  order_palm_sugar numeric,
  branch_count integer,
  report_count integer
)
language sql
stable
security invoker
as $$
  select
    coalesce(sum(dr.cash_sales), 0)::numeric as cash_sales,
    coalesce(sum(dr.transfer_sales), 0)::numeric as transfer_sales,
    coalesce(sum(dr.total_sales), 0)::numeric as total_sales,
    coalesce(sum(dr.received_chicken), 0)::numeric as received_chicken,
    coalesce(sum(dr.received_rice), 0)::numeric as received_rice,
    coalesce(sum(dr.received_sticky_rice), 0)::numeric as received_sticky_rice,
    coalesce(sum(dr.received_oil), 0)::numeric as received_oil,
    coalesce(sum(dr.received_sugar), 0)::numeric as received_sugar,
    coalesce(sum(dr.used_bl), 0)::numeric as used_bl,
    coalesce(sum(dr.used_bb), 0)::numeric as used_bb,
    coalesce(sum(dr.used_chicken_skin), 0)::numeric as used_chicken_skin,
    coalesce(sum(dr.used_oil), 0)::numeric as used_oil,
    coalesce(sum(dr.used_sticky_rice), 0)::numeric as used_sticky_rice,
    coalesce(sum(dr.used_chopped_chicken), 0)::numeric as used_chopped_chicken,
    coalesce(sum(dr.used_drumstick), 0)::numeric as used_drumstick,
    coalesce(sum(dr.order_original_chicken), 0)::numeric as order_original_chicken,
    coalesce(sum(dr.order_spicy_chicken), 0)::numeric as order_spicy_chicken,
    coalesce(sum(dr.order_offal), 0)::numeric as order_offal,
    coalesce(sum(dr.order_chopped_chicken), 0)::numeric as order_chopped_chicken,
    coalesce(sum(dr.order_drumstick), 0)::numeric as order_drumstick,
    coalesce(sum(dr.order_chicken_skin), 0)::numeric as order_chicken_skin,
    coalesce(sum(dr.order_sticky_rice), 0)::numeric as order_sticky_rice,
    coalesce(sum(dr.order_oil), 0)::numeric as order_oil,
    coalesce(sum(dr.order_palm_sugar), 0)::numeric as order_palm_sugar,
    count(distinct dr.branch_id)::integer as branch_count,
    count(*)::integer as report_count
  from public.daily_reports dr
  where dr.report_date between p_from and p_to;
$$;

grant execute on function public.owner_dashboard_totals(date, date) to authenticated;-- Owner Test Mode: front-counter order module for เหนียวไก่เยอะโคตร
create type public.counter_order_status as enum ('success', 'cancelled');
create type public.counter_print_status as enum ('pending', 'printed', 'reprinted');
create type public.counter_print_type as enum ('print', 'reprint');

create sequence if not exists public.counter_order_number_seq start 1;

create table public.counter_price_items (
  id uuid primary key default gen_random_uuid(),
  item_name text not null,
  price numeric not null check (price > 0),
  status text not null default 'active' check (status in ('active', 'inactive')),
  created_at timestamptz not null default now(),
  unique (price)
);

create table public.counter_orders (
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

create table public.counter_order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.counter_orders(id) on delete restrict,
  item_name text not null,
  price numeric not null check (price > 0),
  quantity integer not null check (quantity > 0),
  line_total numeric not null check (line_total >= 0)
);

create table public.counter_cancellations (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null unique references public.counter_orders(id) on delete restrict,
  cancelled_by uuid not null references public.profiles(id),
  cancelled_at timestamptz not null default now(),
  reason text not null,
  original_total numeric not null check (original_total >= 0)
);

create table public.counter_print_logs (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.counter_orders(id) on delete restrict,
  printed_by uuid not null references public.profiles(id),
  printed_at timestamptz not null default now(),
  print_type public.counter_print_type not null,
  status text not null default 'queued'
);

create index counter_price_items_status_idx on public.counter_price_items(status, price);
create index counter_orders_branch_date_idx on public.counter_orders(branch_id, order_date desc, created_at desc);
create index counter_orders_user_date_idx on public.counter_orders(user_id, order_date desc, created_at desc);
create index counter_orders_status_idx on public.counter_orders(status);
create index counter_cancellations_cancelled_at_idx on public.counter_cancellations(cancelled_at desc);
create index counter_print_logs_order_idx on public.counter_print_logs(order_id, printed_at desc);

alter table public.counter_price_items enable row level security;
alter table public.counter_orders enable row level security;
alter table public.counter_order_items enable row level security;
alter table public.counter_cancellations enable row level security;
alter table public.counter_print_logs enable row level security;

create policy "counter price items read authenticated" on public.counter_price_items
for select using (auth.uid() is not null);

create policy "counter price items owners manage" on public.counter_price_items
for all using (public.current_profile_role() = 'owner')
with check (public.current_profile_role() = 'owner');

create policy "counter orders read by role" on public.counter_orders
for select using (public.current_profile_role() = 'owner' or branch_id = public.current_profile_branch_id());

create policy "counter orders insert by role" on public.counter_orders
for insert with check (public.current_profile_role() = 'owner' or branch_id = public.current_profile_branch_id());

create policy "counter orders update owners or branch staff" on public.counter_orders
for update using (public.current_profile_role() = 'owner' or branch_id = public.current_profile_branch_id())
with check (public.current_profile_role() = 'owner' or branch_id = public.current_profile_branch_id());

create policy "counter order items read by role" on public.counter_order_items
for select using (
  exists (
    select 1 from public.counter_orders o
    where o.id = order_id
      and (public.current_profile_role() = 'owner' or o.branch_id = public.current_profile_branch_id())
  )
);

create policy "counter order items insert by role" on public.counter_order_items
for insert with check (
  exists (
    select 1 from public.counter_orders o
    where o.id = order_id
      and (public.current_profile_role() = 'owner' or o.branch_id = public.current_profile_branch_id())
  )
);

create policy "counter cancellations read by role" on public.counter_cancellations
for select using (
  exists (
    select 1 from public.counter_orders o
    where o.id = order_id
      and (public.current_profile_role() = 'owner' or o.branch_id = public.current_profile_branch_id())
  )
);

create policy "counter cancellations insert by role" on public.counter_cancellations
for insert with check (
  exists (
    select 1 from public.counter_orders o
    where o.id = order_id
      and (public.current_profile_role() = 'owner' or o.branch_id = public.current_profile_branch_id())
  )
);

create policy "counter print logs read by role" on public.counter_print_logs
for select using (
  exists (
    select 1 from public.counter_orders o
    where o.id = order_id
      and (public.current_profile_role() = 'owner' or o.branch_id = public.current_profile_branch_id())
  )
);

create policy "counter print logs insert by role" on public.counter_print_logs
for insert with check (
  exists (
    select 1 from public.counter_orders o
    where o.id = order_id
      and (public.current_profile_role() = 'owner' or o.branch_id = public.current_profile_branch_id())
  )
);

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

create or replace function public.print_order(p_order_id uuid)
returns public.counter_orders
language plpgsql
security definer
set search_path = public
as $$
declare
  order_row public.counter_orders;
begin
  select * into order_row from public.counter_orders where id = p_order_id for update;
  if not found or not public.can_use_counter_branch(order_row.branch_id) then
    raise exception 'Order not found';
  end if;

  insert into public.counter_print_logs (order_id, printed_by, print_type, status)
  values (p_order_id, auth.uid(), 'print', 'prepared');

  update public.counter_orders
  set print_status = 'printed', updated_at = now()
  where id = p_order_id
  returning * into order_row;

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
  if not found or not public.can_use_counter_branch(order_row.branch_id) then
    raise exception 'Order not found';
  end if;

  insert into public.counter_print_logs (order_id, printed_by, print_type, status)
  values (p_order_id, auth.uid(), 'reprint', 'prepared');

  update public.counter_orders
  set print_status = 'reprinted', updated_at = now()
  where id = p_order_id
  returning * into order_row;

  return order_row;
end;
$$;

grant execute on function public.get_counter_price_items() to authenticated;
grant execute on function public.can_use_counter_branch(uuid) to authenticated;
grant execute on function public.create_counter_order(uuid, numeric, integer) to authenticated;
grant execute on function public.cancel_latest_counter_order(uuid, text) to authenticated;
grant execute on function public.print_order(uuid) to authenticated;
grant execute on function public.reprint_order(uuid) to authenticated;
