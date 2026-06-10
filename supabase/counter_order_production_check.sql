-- Counter Order production status check.
-- Paste into Supabase SQL Editor after applying migrations, or run with psql.
-- It verifies tables, RPC functions, migration history, and reloads PostgREST.

with required_tables(name) as (
  values
    ('public.counter_price_items'),
    ('public.counter_orders'),
    ('public.counter_order_items'),
    ('public.counter_cancellations'),
    ('public.counter_print_logs')
), table_status as (
  select name, to_regclass(name) is not null as exists
  from required_tables
), required_functions(signature) as (
  values
    ('public.get_counter_price_items()'),
    ('public.can_use_counter_branch(uuid)'),
    ('public.create_counter_order(uuid,numeric,integer)'),
    ('public.cancel_latest_counter_order(uuid,text)'),
    ('public.mark_order_printed(uuid)'),
    ('public.reprint_order(uuid)')
), function_status as (
  select signature, to_regprocedure(signature) is not null as exists
  from required_functions
), migration_status as (
  select version, name
  from supabase_migrations.schema_migrations
  where version in (
    '202606090001',
    '202606090002',
    '202606090003',
    '202606090004',
    '202606090005'
  )
  order by version, name
)
select 'table' as check_type, name as object_name, exists::text as status, null::timestamptz as applied_at
from table_status
union all
select 'function' as check_type, signature as object_name, exists::text as status, null::timestamptz as applied_at
from function_status
union all
select 'migration' as check_type, version || coalesce(' ' || name, '') as object_name, 'applied' as status, null::timestamptz as applied_at
from migration_status
order by check_type, object_name;

notify pgrst, 'reload schema';
