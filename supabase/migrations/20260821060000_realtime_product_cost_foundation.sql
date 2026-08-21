-- Real-time product costing foundation.
-- Photo bills remain the source of truth for current ingredient prices.
-- This migration is additive: it does not change existing Cash Flow or marination tables.

create table if not exists public.cost_ingredients (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  category text not null check (category in ('chicken','seasoning','other')),
  base_unit text not null check (base_unit in ('g','ml','each')),
  aliases text[] not null default '{}',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.cost_ingredients(code,name,category,base_unit,aliases)
values
  ('chicken_bl_scrap','เศษไก่ BL','chicken','g',array['เศษ bl','เศษไก่ bl','bl','bl scrap','เศษบีแอล']),
  ('chicken_bb_scrap','เศษไก่ BB','chicken','g',array['เศษ bb','เศษไก่ bb','bb','bb scrap','เศษบีบี']),
  ('chicken_skin_scrap','เศษหนังไก่','chicken','g',array['เศษหนังไก่','หนังไก่','หนัง','chicken skin']),
  ('soy_sauce','ซอสถั่วเหลือง','seasoning','ml',array['ซอสถั่วเหลือง','ซีอิ๊วขาว','soy sauce']),
  ('green_cap_sauce','ซอสฝาเขียว','seasoning','ml',array['ซอสฝาเขียว','ฝาเขียว']),
  ('sugar','น้ำตาล','seasoning','g',array['น้ำตาล','น้ำตาลทราย','sugar']),
  ('salt','เกลือ','seasoning','g',array['เกลือ','salt']),
  ('rosdee','รสดี','seasoning','g',array['รสดี','ผงรสดี','rosdee']),
  ('rice_flour','แป้งข้าวเจ้า','seasoning','g',array['แป้งข้าวเจ้า','rice flour']),
  ('crispy_flour','แป้งทอดกรอบ','seasoning','g',array['แป้งทอดกรอบ','แป้งกรอบ','crispy flour'])
on conflict (code) do update
set name=excluded.name,
    category=excluded.category,
    base_unit=excluded.base_unit,
    aliases=excluded.aliases,
    is_active=true,
    updated_at=now();

create table if not exists public.purchase_document_items (
  id uuid primary key default gen_random_uuid(),
  line_bill_receipt_id uuid not null references public.line_bill_receipts(id) on delete cascade,
  cash_flow_entry_id uuid references public.cash_flow_entries(id) on delete set null,
  line_no integer not null check (line_no > 0),
  raw_name text not null,
  ingredient_id uuid references public.cost_ingredients(id) on delete set null,
  quantity numeric,
  unit text,
  package_size numeric,
  package_unit text,
  normalized_quantity numeric,
  normalized_unit text check (normalized_unit is null or normalized_unit in ('g','ml','each')),
  unit_price numeric,
  line_total numeric,
  unit_cost_base numeric,
  confidence numeric not null default 0 check (confidence between 0 and 1),
  status text not null default 'needs_review' check (status in ('verified','needs_review','ignored')),
  source_date date,
  merchant_name text,
  raw_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(line_bill_receipt_id,line_no)
);

create index if not exists purchase_document_items_ingredient_date_idx
  on public.purchase_document_items(ingredient_id,source_date desc,created_at desc)
  where status='verified';
create index if not exists purchase_document_items_receipt_idx
  on public.purchase_document_items(line_bill_receipt_id);

create table if not exists public.product_recipes (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  output_quantity numeric not null check (output_quantity > 0),
  output_unit text not null check (output_unit in ('g','ml','each')),
  effective_from date not null default current_date,
  is_active boolean not null default true,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.product_recipe_components (
  id uuid primary key default gen_random_uuid(),
  recipe_id uuid not null references public.product_recipes(id) on delete cascade,
  ingredient_id uuid not null references public.cost_ingredients(id) on delete restrict,
  quantity_base numeric not null check (quantity_base > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(recipe_id,ingredient_id)
);

-- Do not seed recipe quantities. Actual ratios must come from the owner; no inferred recipe is allowed.
insert into public.product_recipes(code,name,output_quantity,output_unit,is_active,note)
values ('marinated_chicken_ready_to_fry','ไก่หมักพร้อมทอด',1000,'g',false,'รอสูตรและสัดส่วนจริงจาก Owner ก่อนเปิดคำนวณต้นทุน')
on conflict (code) do nothing;

create or replace view public.ingredient_latest_verified_cost as
select distinct on (i.id)
  i.id as ingredient_id,
  i.code,
  i.name,
  i.category,
  i.base_unit,
  p.unit_cost_base,
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
    lc.unit_cost_base,
    lc.source_date,
    (c.quantity_base * lc.unit_cost_base) as component_cost
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
  count(*) filter (where unit_cost_base is null) as missing_cost_count,
  case when count(*) filter (where unit_cost_base is null)=0
       then sum(component_cost) else null end as batch_cost,
  case when count(*) filter (where unit_cost_base is null)=0
       then sum(component_cost)/output_quantity else null end as cost_per_base_unit,
  min(source_date) filter (where unit_cost_base is not null) as oldest_price_date,
  max(source_date) filter (where unit_cost_base is not null) as newest_price_date
from component_costs
group by recipe_id,recipe_code,recipe_name,output_quantity,output_unit,is_active;

alter table public.cost_ingredients enable row level security;
alter table public.purchase_document_items enable row level security;
alter table public.product_recipes enable row level security;
alter table public.product_recipe_components enable row level security;

-- Server/service-role owns ingestion and costing. No direct client mutation is granted.
revoke all on public.cost_ingredients from anon, authenticated;
revoke all on public.purchase_document_items from anon, authenticated;
revoke all on public.product_recipes from anon, authenticated;
revoke all on public.product_recipe_components from anon, authenticated;
grant select,insert,update,delete on public.cost_ingredients to service_role;
grant select,insert,update,delete on public.purchase_document_items to service_role;
grant select,insert,update,delete on public.product_recipes to service_role;
grant select,insert,update,delete on public.product_recipe_components to service_role;
grant select on public.ingredient_latest_verified_cost to service_role;
grant select on public.product_live_cost to service_role;

notify pgrst, 'reload schema';
