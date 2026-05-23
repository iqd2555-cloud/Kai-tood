-- Add branch_name fields and enforce two Kai-tood branches
alter table public.profiles add column if not exists branch_name text;
alter table public.daily_reports add column if not exists branch_name text;

insert into public.branches (name, code, low_chicken_threshold, low_sticky_rice_threshold, low_oil_threshold)
values
  ('สาขาที่ 1 ร.ร.นวมินทร์', 'NAVAMIN', 5, 5, 2),
  ('สาขาที่ 2 โลตัสป้อม 1', 'LOTUS-POM1', 5, 5, 2)
on conflict (code) do update set name = excluded.name;

update public.profiles p
set branch_name = b.name
from public.branches b
where p.branch_id = b.id
  and (p.branch_name is null or p.branch_name = '');

update public.daily_reports dr
set branch_name = b.name
from public.branches b
where dr.branch_id = b.id
  and (dr.branch_name is null or dr.branch_name = '');

create or replace function public.current_profile_branch_name()
returns text
language sql
security definer
set search_path = public
as $$ select branch_name from public.profiles where id = auth.uid() $$;

create policy "profiles update own branch name" on public.profiles
for update
using (id = auth.uid() or public.current_profile_role() = 'owner')
with check (public.current_profile_role() = 'owner' or (id = auth.uid() and branch_name = public.current_profile_branch_name()));
