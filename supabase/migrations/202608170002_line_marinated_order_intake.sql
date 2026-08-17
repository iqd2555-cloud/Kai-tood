create table if not exists public.marinated_order_line_sources (
  id uuid primary key default gen_random_uuid(),
  source_type text not null check (source_type in ('user', 'group', 'room')),
  source_id text not null,
  line_user_id text,
  display_name text,
  customer_master_id text not null,
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (source_type, source_id)
);

create table if not exists public.marinated_order_line_inbox (
  id uuid primary key default gen_random_uuid(),
  webhook_event_id text not null unique,
  message_id text not null unique,
  source_type text not null check (source_type in ('user', 'group', 'room')),
  source_id text not null,
  line_user_id text,
  display_name text,
  raw_message text not null,
  event_at timestamptz not null,
  processing_status text not null default 'unmatched_customer'
    check (processing_status in ('unmatched_customer', 'needs_review', 'draft_created', 'ignored', 'error')),
  customer_master_id text,
  parser_errors text[] not null default '{}',
  parser_warnings text[] not null default '{}',
  marinated_order_id uuid references public.marinated_orders(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  processed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists marinated_order_line_inbox_status_idx
  on public.marinated_order_line_inbox(processing_status, event_at desc);
create index if not exists marinated_order_line_inbox_source_idx
  on public.marinated_order_line_inbox(source_type, source_id, event_at desc);
create index if not exists marinated_order_line_sources_customer_idx
  on public.marinated_order_line_sources(customer_master_id);

drop trigger if exists marinated_order_line_sources_set_updated_at on public.marinated_order_line_sources;
create trigger marinated_order_line_sources_set_updated_at
before update on public.marinated_order_line_sources
for each row execute function public.set_marinated_order_updated_at();

drop trigger if exists marinated_order_line_inbox_set_updated_at on public.marinated_order_line_inbox;
create trigger marinated_order_line_inbox_set_updated_at
before update on public.marinated_order_line_inbox
for each row execute function public.set_marinated_order_updated_at();

alter table public.marinated_order_line_sources enable row level security;
alter table public.marinated_order_line_inbox enable row level security;

drop policy if exists "owners manage line order sources" on public.marinated_order_line_sources;
create policy "owners manage line order sources" on public.marinated_order_line_sources
for all to authenticated
using (public.current_profile_role() = 'owner')
with check (public.current_profile_role() = 'owner');

drop policy if exists "owners read line order inbox" on public.marinated_order_line_inbox;
create policy "owners read line order inbox" on public.marinated_order_line_inbox
for select to authenticated
using (public.current_profile_role() = 'owner');

drop policy if exists "owners update line order inbox" on public.marinated_order_line_inbox;
create policy "owners update line order inbox" on public.marinated_order_line_inbox
for update to authenticated
using (public.current_profile_role() = 'owner')
with check (public.current_profile_role() = 'owner');

grant select, insert, update, delete on public.marinated_order_line_sources to authenticated;
grant select, update on public.marinated_order_line_inbox to authenticated;
grant all on public.marinated_order_line_sources to service_role;
grant all on public.marinated_order_line_inbox to service_role;

create or replace function public.create_marinated_order_draft_from_line(
  p_inbox_id uuid,
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
security definer
set search_path = ''
as $$
declare
  v_order_id uuid;
  v_existing_order_id uuid;
  v_total_kg numeric(10, 2);
  v_actor_id uuid;
begin
  if (select auth.role()) not in ('authenticated', 'service_role') then
    raise exception 'authenticated access required';
  end if;

  if (select auth.role()) = 'authenticated' then
    if public.current_profile_role() <> 'owner' then
      raise exception 'owner access required';
    end if;
    v_actor_id := (select auth.uid());
  else
    select profile.id into v_actor_id
    from public.profiles profile
    where profile.role = 'owner'
    order by profile.id
    limit 1;
  end if;

  if v_actor_id is null then
    raise exception 'owner profile is required for automated order creation';
  end if;

  select inbox.marinated_order_id
  into v_existing_order_id
  from public.marinated_order_line_inbox inbox
  where inbox.id = p_inbox_id
  for update;

  if not found then
    raise exception 'LINE order inbox message not found';
  end if;

  if v_existing_order_id is not null then
    return v_existing_order_id;
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
    source, customer_master_id, customer_name, customer_group, customer_phone,
    customer_address, shipping_instruction, raw_message, delivery_date,
    price_per_kg, total_kg, total_amount, created_by
  ) values (
    'line_parser', p_customer_master_id, p_customer_name, p_customer_group,
    nullif(p_customer_phone, ''), nullif(p_customer_address, ''),
    nullif(p_shipping_instruction, ''), p_raw_message, p_delivery_date,
    p_price_per_kg, v_total_kg, v_total_kg * p_price_per_kg, v_actor_id
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
    v_order_id, null, 'draft', 'รับอัตโนมัติจาก LINE OA และรอ Owner ยืนยัน', v_actor_id
  );

  update public.marinated_order_line_inbox
  set
    processing_status = 'draft_created',
    customer_master_id = p_customer_master_id,
    marinated_order_id = v_order_id,
    parser_errors = '{}',
    processed_at = now()
  where id = p_inbox_id;

  return v_order_id;
end;
$$;

revoke all on function public.create_marinated_order_draft_from_line(
  uuid, text, text, text, text, text, text, text, date, numeric, jsonb
) from public, anon;
grant execute on function public.create_marinated_order_draft_from_line(
  uuid, text, text, text, text, text, text, text, date, numeric, jsonb
) to authenticated, service_role;
