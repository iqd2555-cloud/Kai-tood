-- Add the explicit, non-derived packs-sold input used by the daily branch report.
-- Existing rows stay NULL until a branch or POS provides an actual count.

alter table public.daily_reports
  add column if not exists packs_sold integer,
  add column if not exists packs_sold_source text;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.daily_reports'::regclass
      and conname = 'daily_reports_packs_sold_check'
  ) then
    alter table public.daily_reports
      add constraint daily_reports_packs_sold_check
      check (packs_sold is null or packs_sold >= 0);
  end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.daily_reports'::regclass
      and conname = 'daily_reports_packs_sold_source_check'
  ) then
    alter table public.daily_reports
      add constraint daily_reports_packs_sold_source_check
      check (
        packs_sold_source is null
        or packs_sold_source in (
          'manual_report',
          'pos_import',
          'verified_adjustment'
        )
      );
  end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.daily_reports'::regclass
      and conname = 'daily_reports_packs_source_consistency_check'
  ) then
    alter table public.daily_reports
      add constraint daily_reports_packs_source_consistency_check
      check (
        (packs_sold is null and packs_sold_source is null)
        or packs_sold is not null
      );
  end if;
end
$$;

comment on column public.daily_reports.packs_sold is
  'จำนวนห่อที่ขายจริงของสาขาในวันรายงาน ห้ามประมาณจากยอดขายหรือจำนวนบรรจุภัณฑ์';

comment on column public.daily_reports.packs_sold_source is
  'แหล่งที่มาของจำนวนห่อ: manual_report, pos_import หรือ verified_adjustment';

-- CEO refresh functions are server-side operations. The application invokes
-- refresh_ceo_daily with its server-only service role after a successful save.
do $$
begin
  if to_regprocedure('public.refresh_ceo_daily(date)') is not null then
    execute 'revoke execute on function public.refresh_ceo_daily(date) from public, anon, authenticated';
    execute 'grant execute on function public.refresh_ceo_daily(date) to service_role';
  end if;

  if to_regprocedure('public.apply_packs_daily_metrics(date)') is not null then
    execute 'revoke execute on function public.apply_packs_daily_metrics(date) from public, anon, authenticated';
    execute 'grant execute on function public.apply_packs_daily_metrics(date) to service_role';
  end if;
end
$$;
