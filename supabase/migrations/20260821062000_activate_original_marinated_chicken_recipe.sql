-- Activate the verified current original-marinated-chicken recipe.
-- Chicken purchase prices come from photo bills, then +2 THB/kg outside-bill delivery cost is applied as landed cost.
-- Recipe: 50 kg raw chicken -> 62.65 kg marinated output.

alter table public.cost_ingredients
  add column if not exists landed_extra_cost_per_base numeric not null default 0;

-- Correct ingredient identity based on the owner's current recipe terminology.
-- ซอสถั่วเหลือง = ซอสฝาเขียว, while ซีอิ๊วขาว = เด็กสมบูรณ์สูตร 5.
update public.cost_ingredients
set code='light_soy_sauce',
    name='ซีอิ๊วขาว เด็กสมบูรณ์ สูตร 5',
    aliases=array['ซีอิ๊วขาว','ซีอิ๊วขาวสูตร 5','เด็กสมบูรณ์สูตร 5','สูตร 5','light soy sauce'],
    updated_at=now()
where code='soy_sauce';

update public.cost_ingredients
set name='ซอสถั่วเหลือง / ซอสฝาเขียว',
    aliases=array['ซอสถั่วเหลือง','ซอสฝาเขียว','ฝาเขียว','ซอสปรุงรสฝาเขียว'],
    updated_at=now()
where code='green_cap_sauce';

-- 2 THB/kg = 0.002 THB/g landed delivery cost for every chicken raw material.
update public.cost_ingredients
set landed_extra_cost_per_base=0.002,
    updated_at=now()
where category='chicken';

-- Rebuild latest-cost view with landed/effective cost separated from bill price.
create or replace view public.ingredient_latest_verified_cost as
select distinct on (i.id)
  i.id as ingredient_id,
  i.code,
  i.name,
  i.category,
  i.base_unit,
  p.unit_cost_base,
  i.landed_extra_cost_per_base,
  case when p.unit_cost_base is not null
       then p.unit_cost_base + i.landed_extra_cost_per_base
       else null end as effective_unit_cost_base,
  p.source_date,
  p.merchant_name,
  p.line_bill_receipt_id,
  p.cash_flow_entry_id,
  p.raw_name,
  p.normalized_quantity,
  p.normalized_unit,
  p.line_total,
  p.confidence,
  p.updated_at as price_updated_at
from public.cost_ingredients i
left join public.purchase_document_items p
  on p.ingredient_id=i.id
 and p.status='verified'
 and p.unit_cost_base is not null
where i.is_active=true
order by i.id,p.source_date desc nulls last,p.created_at desc nulls last;

-- Seed/activate the owner's verified current original recipe.
insert into public.product_recipes(code,name,output_quantity,output_unit,effective_from,is_active,note)
values (
  'marinated_chicken_ready_to_fry',
  'ไก่หมักดั้งเดิมพร้อมทอด',
  62650,
  'g',
  current_date,
  true,
  'สูตรปัจจุบัน: ไก่สด 50 กก. (BL 20, BB 10, หนัง 20) + เครื่องปรุงตามสูตร ได้ไก่หมักประมาณ 62.65 กก.'
)
on conflict (code) do update
set name=excluded.name,
    output_quantity=excluded.output_quantity,
    output_unit=excluded.output_unit,
    effective_from=excluded.effective_from,
    is_active=true,
    note=excluded.note,
    updated_at=now();

-- Replace recipe components atomically from the verified formula.
delete from public.product_recipe_components
where recipe_id=(select id from public.product_recipes where code='marinated_chicken_ready_to_fry');

insert into public.product_recipe_components(recipe_id,ingredient_id,quantity_base)
select r.id,i.id,x.quantity_base
from public.product_recipes r
cross join (values
  ('chicken_bl_scrap',20000::numeric),
  ('chicken_bb_scrap',10000::numeric),
  ('chicken_skin_scrap',20000::numeric),
  ('crispy_flour',5000::numeric),
  ('rice_flour',1500::numeric),
  ('salt',250::numeric),
  ('rosdee',400::numeric),
  ('sugar',3000::numeric),
  ('green_cap_sauce',1250::numeric),
  ('light_soy_sauce',1250::numeric)
) as x(code,quantity_base)
join public.cost_ingredients i on i.code=x.code
where r.code='marinated_chicken_ready_to_fry';

-- Product live cost uses effective landed cost, not raw invoice price.
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
    lc.unit_cost_base as bill_unit_cost_base,
    lc.landed_extra_cost_per_base,
    lc.effective_unit_cost_base,
    lc.source_date,
    (c.quantity_base * lc.effective_unit_cost_base) as component_cost
  from public.product_recipes r
  join public.product_recipe_components c on c.recipe_id=r.id
  left join public.ingredient_latest_verified_cost lc on lc.ingredient_id=c.ingredient_id
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
  case when count(*) filter (where effective_unit_cost_base is null)=0
       then sum(component_cost) else null end as batch_cost,
  case when count(*) filter (where effective_unit_cost_base is null)=0
       then sum(component_cost)/output_quantity else null end as cost_per_base_unit,
  min(source_date) filter (where effective_unit_cost_base is not null) as oldest_price_date,
  max(source_date) filter (where effective_unit_cost_base is not null) as newest_price_date
from component_costs
group by recipe_id,recipe_code,recipe_name,output_quantity,output_unit,is_active;

grant select on public.ingredient_latest_verified_cost to service_role;
grant select on public.product_live_cost to service_role;
notify pgrst, 'reload schema';
