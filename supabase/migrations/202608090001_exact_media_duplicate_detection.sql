-- Exact duplicate protection for employee KPI media.
-- Same bytes must never earn KPI/content credit twice, including videos.

create or replace function public.detect_exact_media_duplicate()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_original uuid;
begin
  if new.sha256 is null or btrim(new.sha256) = '' then
    return new;
  end if;

  select m.id into v_original
  from public.work_submission_media m
  where m.id <> new.id
    and m.organization_id = new.organization_id
    and m.media_type = new.media_type
    and m.sha256 = new.sha256
    and m.submitted_at < new.submitted_at
  order by m.submitted_at asc
  limit 1;

  if v_original is not null then
    new.duplicate_status := 'duplicate';
    new.duplicate_of_media_id := v_original;
    new.duplicate_similarity := 1;
    new.content_candidate := false;
    new.content_status := 'rejected';
  end if;

  return new;
end;
$$;

drop trigger if exists detect_exact_media_duplicate_before_write on public.work_submission_media;
create trigger detect_exact_media_duplicate_before_write
before insert or update of sha256 on public.work_submission_media
for each row execute function public.detect_exact_media_duplicate();

-- Repair exact duplicates already stored before this rule existed.
with ranked as (
  select id,
         first_value(id) over (
           partition by organization_id, media_type, sha256
           order by submitted_at, id
         ) as original_id,
         row_number() over (
           partition by organization_id, media_type, sha256
           order by submitted_at, id
         ) as rn
  from public.work_submission_media
  where sha256 is not null and btrim(sha256) <> ''
), repaired as (
  update public.work_submission_media m
  set duplicate_status = 'duplicate',
      duplicate_of_media_id = r.original_id,
      duplicate_similarity = 1,
      content_candidate = false,
      content_status = 'rejected'
  from ranked r
  where m.id = r.id
    and r.rn > 1
  returning m.id
)
delete from public.content_automation_queue q
using repaired r
where q.media_id = r.id;
