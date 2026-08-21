-- Keep the production stock-movement constraint in sync with the fresh-chicken
-- sale feature. A fresh sale is a stock-out movement separate from marination use.
alter table public.marination_stock_movements
  drop constraint if exists marination_stock_movements_type_check;

alter table public.marination_stock_movements
  add constraint marination_stock_movements_type_check
  check (
    movement_type = any (
      array[
        'received'::text,
        'used'::text,
        'counted'::text,
        'adjustment'::text,
        'fresh_sale'::text
      ]
    )
  );
