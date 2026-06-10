-- Fix Paphatraya's profile and move today's report from MAIN/wrong branch to NAVAMIN.
-- Safe to run in Supabase SQL Editor or through `supabase db push`.

create table if not exists public.branch_fix_audit (
  id uuid primary key default gen_random_uuid(),
  fix_key text not null,
  user_email text not null,
  user_id uuid,
  report_date date not null,
  before_branch_id uuid,
  before_branch_name text,
  after_branch_id uuid,
  after_branch_name text,
  moved_daily_report_count integer not null default 0,
  moved_daily_report_ids uuid[] not null default '{}'::uuid[],
  created_at timestamptz not null default now()
);

insert into public.branches (name, code, low_chicken_threshold, low_sticky_rice_threshold, low_oil_threshold)
values ('สาขาที่ 1 ร.ร.นวมินทร์', 'NAVAMIN', 5, 5, 2)
on conflict (code) do update
set name = excluded.name;

do $$
declare
  target_email constant text := 'paphatraya.6293@gmail.com';
  fix_key_value constant text := '202606100004_paphatraya_navamin_today';
  target_report_date constant date := (now() at time zone 'Asia/Bangkok')::date;
  navamin_branch record;
  target_profile record;
  before_branch record;
  wrong_reports public.daily_reports[];
  chosen_report public.daily_reports;
  wrong_report_ids uuid[] := '{}'::uuid[];
  moved_count integer := 0;
  target_report_exists boolean := false;
begin
  select b.id, b.name
    into navamin_branch
  from public.branches b
  where b.code = 'NAVAMIN'
  limit 1;

  if navamin_branch.id is null then
    raise exception 'NAVAMIN branch was not found or created';
  end if;

  select p.*
    into target_profile
  from public.profiles p
  where lower(trim(coalesce(p.email, ''))) = target_email
  limit 1;

  if target_profile.id is null then
    raise exception 'Profile with email % was not found', target_email;
  end if;

  select b.id, b.name
    into before_branch
  from public.branches b
  where b.id = target_profile.branch_id
  limit 1;

  select coalesce(array_agg(dr order by dr.updated_at desc, dr.created_at desc), '{}'::public.daily_reports[])
    into wrong_reports
  from public.daily_reports dr
  where dr.submitted_by = target_profile.id
    and dr.report_date = target_report_date
    and dr.branch_id is distinct from navamin_branch.id;

  moved_count := coalesce(array_length(wrong_reports, 1), 0);

  if moved_count > 0 then
    wrong_report_ids := array(select report_row.id from unnest(wrong_reports) as report_row);
    chosen_report := wrong_reports[1];

    select exists (
      select 1
      from public.daily_reports dr
      where dr.report_date = target_report_date
        and dr.branch_id = navamin_branch.id
    ) into target_report_exists;

    if target_report_exists then
      update public.daily_reports dr
      set
        cash_sales = chosen_report.cash_sales,
        transfer_sales = chosen_report.transfer_sales,
        received_chicken = chosen_report.received_chicken,
        received_rice = chosen_report.received_rice,
        received_sticky_rice = chosen_report.received_sticky_rice,
        received_oil = chosen_report.received_oil,
        received_sugar = chosen_report.received_sugar,
        used_bl = chosen_report.used_bl,
        used_bb = chosen_report.used_bb,
        used_chicken_skin = chosen_report.used_chicken_skin,
        used_oil = chosen_report.used_oil,
        used_sticky_rice = chosen_report.used_sticky_rice,
        used_chopped_chicken = chosen_report.used_chopped_chicken,
        used_drumstick = chosen_report.used_drumstick,
        remaining_chicken = chosen_report.remaining_chicken,
        remaining_original_chicken = chosen_report.remaining_original_chicken,
        remaining_spicy_chicken = chosen_report.remaining_spicy_chicken,
        remaining_chicken_skin = chosen_report.remaining_chicken_skin,
        remaining_offal = chosen_report.remaining_offal,
        remaining_ground_chicken = chosen_report.remaining_ground_chicken,
        remaining_drumstick = chosen_report.remaining_drumstick,
        remaining_sticky_rice = chosen_report.remaining_sticky_rice,
        remaining_oil = chosen_report.remaining_oil,
        order_original_chicken = chosen_report.order_original_chicken,
        order_spicy_chicken = chosen_report.order_spicy_chicken,
        order_offal = chosen_report.order_offal,
        order_chopped_chicken = chosen_report.order_chopped_chicken,
        order_drumstick = chosen_report.order_drumstick,
        order_chicken_skin = chosen_report.order_chicken_skin,
        order_sticky_rice = chosen_report.order_sticky_rice,
        order_oil = chosen_report.order_oil,
        order_palm_sugar = chosen_report.order_palm_sugar,
        order_other_items = chosen_report.order_other_items,
        requested_items = chosen_report.requested_items,
        note = chosen_report.note,
        submitted_by = target_profile.id,
        branch_name = navamin_branch.name,
        updated_at = now()
      where dr.report_date = target_report_date
        and dr.branch_id = navamin_branch.id;

      delete from public.daily_reports dr
      where dr.id = any(wrong_report_ids);
    else
      update public.daily_reports dr
      set
        branch_id = navamin_branch.id,
        branch_name = navamin_branch.name,
        updated_at = now()
      where dr.id = chosen_report.id;

      delete from public.daily_reports dr
      where dr.id = any(wrong_report_ids)
        and dr.id <> chosen_report.id;
    end if;
  end if;

  update public.profiles p
  set
    role = 'staff',
    branch_id = navamin_branch.id,
    branch_name = navamin_branch.name
  where p.id = target_profile.id;

  insert into public.branch_fix_audit (
    fix_key,
    user_email,
    user_id,
    report_date,
    before_branch_id,
    before_branch_name,
    after_branch_id,
    after_branch_name,
    moved_daily_report_count,
    moved_daily_report_ids
  ) values (
    fix_key_value,
    target_email,
    target_profile.id,
    target_report_date,
    target_profile.branch_id,
    coalesce(target_profile.branch_name, before_branch.name),
    navamin_branch.id,
    navamin_branch.name,
    moved_count,
    wrong_report_ids
  );

  raise notice 'Fix %: user %, before branch % (%), after branch % (%), moved daily_reports % (%). Owner reports query daily_reports.branch_id = selected branch id, so moved rows now appear under NAVAMIN.',
    fix_key_value,
    target_email,
    target_profile.branch_id,
    coalesce(target_profile.branch_name, before_branch.name),
    navamin_branch.id,
    navamin_branch.name,
    moved_count,
    wrong_report_ids;
end $$;

-- Verification query after running this migration:
-- select * from public.branch_fix_audit where fix_key = '202606100004_paphatraya_navamin_today' order by created_at desc limit 1;
-- select p.email, p.branch_id, p.branch_name from public.profiles p where lower(trim(p.email)) = 'paphatraya.6293@gmail.com';
-- select dr.id, dr.report_date, dr.branch_id, dr.branch_name, dr.submitted_by from public.daily_reports dr join public.profiles p on p.id = dr.submitted_by where lower(trim(p.email)) = 'paphatraya.6293@gmail.com' and dr.report_date = (now() at time zone 'Asia/Bangkok')::date;
