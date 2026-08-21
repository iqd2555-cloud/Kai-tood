-- Keep a last-known-good cost for every recipe ingredient so CEO Today can continue to show a cost
-- even when a newly received bill is incomplete or still awaiting review.
-- A newer verified bill always overrides this fallback automatically.

create table if not exists public.ingredient_fallback_costs (
  ingredient_id uuid primary key references public.cost_ingredients(id) on delete cascade,
  unit_cost_base numeric not null check (unit_cost_base > 0),
  source_label text not null default 'ราคาครั้งล่าสุดที่ยืนยัน',
  source_date date,
  updated_at timestamptz not null default now()
);

-- Baseline prices confirmed by Owner from the latest supplied purchase documents on 2026-08-21.
-- Chicken values below are invoice price only; +2 THB/kg landed freight remains a separate rule.
insert into public.ingredient_fallback_costs(ingredient_id,unit_cost_base,source_label,source_date)
select id, v.unit_cost_base, 'ราคาล่าสุดที่ Owner ยืนยันก่อนเปิด OCR Costing', date '2026-08-21'
from public.cost_ingredients i
join (values
  ('chicken_bl_scrap', 0.039::numeric),
  ('chicken_bb_scrap', 0.046::numeric),
  ('chicken_skin_scrap', 0.022::numeric),
  ('crispy_flour', 0.033::numeric),
  ('rice_flour', 0.027::numeric),
  ('salt', (59::numeric / (12::numeric * 520::numeric))),
  ('rosdee', 0.080::numeric),
  ('sugar', 0.028::numeric),
  ('green_cap_sauce', (26::numeric / 600::numeric)),
  ('light_soy_sauce', (28::numeric / 700::numeric))
) as v(code,unit_cost_base) on v.code=i.code
on conflict (ingredient_id) do update
set unit_cost_base=excluded.unit_cost_base,
    source_label=excluded.source_label,
    source_date=excluded.source_date,
    updated_at=now();

-- Latest verified OCR/bill price wins. If none exists for an ingredient, use its last-known-good fallback.
create or replace view public.ingredient_current_cost as
select
  i.id as ingredient_id,
  i.code,
  i.name,
  i.category,
  i.base_unit,
  coalesce(v.unit_cost_base, f.unit_cost_base) as bill_unit_cost_base,
  i.landed_extra_cost_per_base,
  case
    when coalesce(v.unit_cost_base, f.unit_cost_base) is null then null
    else coalesce(v.unit_cost_base, f.unit_cost_base) + i.landed_extra_cost_per_base
  end as effective_unit_cost_base,
  case when v.unit_cost_base is not null then 'verified_bill' else 'last_known' end as cost_source,
  coalesce(v.source_date, f.source_date) as source_date,
  v.merchant_name,
  v.confidence,
  f.source_label as fallback_source_label
from public.cost_ingredients i
left join public.ingredient_latest_verified_cost v on v.ingredient_id=i.id
left join public.ingredient_fallback_costs f on f.ingredient_id=i.id
where i.is_active=true;

create or replace view public.product_live_cost as
with component_costs as (
  select
    r.id as recipe_id,
    r.code as recipe_code,
    r.name as recipe_name,
    r.output_quantity,
    r.output_unit,
    r.is_active,
    c.ingredient_id,
    c.quantity_base,
    cc.bill_unit_cost_base,
    cc.landed_extra_cost_per_base,
    cc.effective_unit_cost_base,
    cc.cost_source,
    cc.source_date,
    (c.quantity_base * cc.effective_unit_cost_base) as component_cost
  from public.product_recipes r
  join public.product_recipe_components c on c.recipe_id=r.id
  left join public.ingredient_current_cost cc on cc.ingredient_id=c.ingredient_id
)
select
  recipe_id,
  recipe_code,
  recipe_name,
  output_quantity,
  output_unit,
  is_active,
  count(*) as component_count,
  count(*) filter (where effective_unit_cost_base is null) as missing_cost_count,
  count(*) filter (where cost_source='last_known') as fallback_component_count,
  case when count(*) filter (where effective_unit_cost_base is null)=0
       then sum(component_cost) else null end as batch_cost,
  case when count(*) filter (where effective_unit_cost_base is null)=0
       then sum(component_cost)/output_quantity else null end as cost_per_base_unit,
  min(source_date) filter (where effective_unit_cost_base is not null) as oldest_price_date,
  max(source_date) filter (where effective_unit_cost_base is not null) as newest_price_date
from component_costs
group by recipe_id,recipe_code,recipe_name,output_quantity,output_unit,is_active;

alter table public.ingredient_fallback_costs enable row level security;
revoke all on public.ingredient_fallback_costs from anon, authenticated;
grant select,insert,update,delete on public.ingredient_fallback_costs to service_role;
grant select on public.ingredient_current_cost to service_role;
grant select on public.product_live_cost to service_role;
notify pgrst, 'reload schema';
