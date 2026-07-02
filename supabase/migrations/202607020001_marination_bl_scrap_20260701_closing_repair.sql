-- Safe data repair for Calculation Audit 2026-07-02: เศษ BL opening balance.
-- Do not delete historical movements. If the replayed closing balance for
-- 2026-07-01 is not 80 kg, append a target-balance adjustment after all
-- 2026-07-01 เศษ BL movements (including late-created same-business-date
-- entries) so 2026-07-02 carries forward 80 kg.
do $$
declare
  bl_scrap_part_id uuid;
  repair_user_id uuid;
  replay_balance numeric := 0;
  item record;
begin
  select id into bl_scrap_part_id
  from public.chicken_parts
  where name = 'เศษ BL'
  order by sort_order nulls last, created_at
  limit 1;

  if bl_scrap_part_id is null then
    raise notice 'Skipping เศษ BL repair: chicken part not found.';
    return;
  end if;

  if exists (
    select 1
    from public.marination_stock_movements
    where chicken_part_id = bl_scrap_part_id
      and movement_date = date '2026-07-01'
      and movement_type = 'adjustment'
      and quantity_kg = 80
      and note ilike 'System correction: corrected closing balance for 01/07/2026%'
  ) then
    raise notice 'Skipping เศษ BL repair: correction movement already exists.';
    return;
  end if;

  for item in
    select movement_type, quantity_kg
    from public.marination_stock_movements
    where chicken_part_id = bl_scrap_part_id
      and movement_date <= date '2026-07-01'
    order by movement_date asc, created_at asc, id asc
  loop
    if item.movement_type = 'received' then
      replay_balance := replay_balance + coalesce(item.quantity_kg, 0);
    elsif item.movement_type = 'used' then
      replay_balance := replay_balance - coalesce(item.quantity_kg, 0);
    elsif item.movement_type = 'adjustment' then
      replay_balance := coalesce(item.quantity_kg, 0);
    end if;
  end loop;

  if replay_balance = 80 then
    raise notice 'Skipping เศษ BL repair: 2026-07-01 closing is already 80 kg.';
    return;
  end if;

  select id into repair_user_id
  from public.profiles
  where role = 'owner'
  order by created_at asc
  limit 1;

  if repair_user_id is null then
    select id into repair_user_id
    from public.profiles
    order by created_at asc
    limit 1;
  end if;

  if repair_user_id is null then
    raise notice 'Skipping เศษ BL repair: no profile found for created_by.';
    return;
  end if;

  insert into public.marination_stock_movements (
    movement_date,
    chicken_part_id,
    movement_type,
    quantity_kg,
    note,
    created_by,
    created_at
  ) values (
    date '2026-07-01',
    bl_scrap_part_id,
    'adjustment',
    80,
    'System correction: corrected closing balance for 01/07/2026 before carrying forward to 02/07/2026. Expected opening on 02/07/2026 = 80 kg. Previous replayed closing before this correction = ' || replay_balance || ' kg. Historical movements were preserved for audit.',
    repair_user_id,
    timestamptz '2026-07-02 23:59:59+00'
  );
end $$;
