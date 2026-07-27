alter table public.mini_franchise_applications
  add column if not exists investment_budget_range text;

update public.mini_franchise_applications
set investment_budget_range = 'ไม่ระบุ — ใบสมัครเดิม'
where investment_budget_range is null or btrim(investment_budget_range) = '';

alter table public.mini_franchise_applications
  alter column investment_budget_range set default 'ไม่ระบุ — ใบสมัครเดิม',
  alter column investment_budget_range set not null,
  drop constraint if exists mini_franchise_applications_investment_budget_range_check,
  add constraint mini_franchise_applications_investment_budget_range_check check (
    investment_budget_range in (
      'ไม่ระบุ — ใบสมัครเดิม',
      'ต่ำกว่า 9,900 บาท',
      '9,900–14,999 บาท',
      '15,000–20,000 บาท',
      'มากกว่า 20,000 บาท'
    )
  );

comment on column public.mini_franchise_applications.investment_budget_range is
  'Total available investment budget used for MINI STARTER qualification. Values below 9,900 THB are not recommended for callback.';

notify pgrst, 'reload schema';
