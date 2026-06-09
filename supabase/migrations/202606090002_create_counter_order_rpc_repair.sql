-- Repair missing Staff Counter Order RPC in production databases.
-- This migration is safe to run after the counter order tables already exist.
-- It recreates the exact PostgREST signature used by the frontend:
-- public.create_counter_order(p_branch_id uuid, p_price numeric, p_quantity integer)

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

grant execute on function public.create_counter_order(uuid, numeric, integer) to authenticated;

-- Force PostgREST/Supabase API to reload the schema cache so the RPC is available immediately.
notify pgrst, 'reload schema';
