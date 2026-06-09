-- Production verification for Counter Order rollout.
-- Run after all Counter Order repair migrations. It fails fast if any required
-- table/RPC is missing, then reloads the PostgREST schema cache.

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
    raise exception 'Counter Order verification failed. Missing tables: %', array_to_string(missing_tables, ', ');
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
    raise exception 'Counter Order verification failed. Missing RPC functions: %', array_to_string(missing_functions, ', ');
  end if;
end $$;

notify pgrst, 'reload schema';
