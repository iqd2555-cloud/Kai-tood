-- Duplicate media must not count as a new daily KPI submission.
create or replace function public.refresh_daily_work_submission(p_submission_id uuid)
returns void language plpgsql security definer set search_path=public as $$
declare
  v_org_id uuid; v_work_date date; v_time_zone text := 'Asia/Bangkok'; v_deadline time := '12:30:00';
  v_completion_points smallint := 4; v_timeliness_points smallint := 2; v_duration_points smallint := 1; v_orientation_points smallint := 1;
  v_photo boolean := false; v_video boolean := false; v_first timestamptz; v_last timestamptz; v_complete_at timestamptz;
  v_video_duration_pass boolean := false; v_video_duration_unknown boolean := false; v_photo_ratio_pass boolean := false; v_video_vertical boolean := false;
  v_photo_ratio_unknown boolean := false; v_video_orientation_unknown boolean := false;
begin
  select organization_id,work_date into v_org_id,v_work_date from public.daily_work_submissions where id=p_submission_id;
  if not found then return; end if;
  select time_zone,daily_deadline,completion_points,timeliness_points,duration_points,orientation_points
    into v_time_zone,v_deadline,v_completion_points,v_timeliness_points,v_duration_points,v_orientation_points
  from public.submission_settings where organization_id=v_org_id;

  select coalesce(bool_or(media_type='image'),false),coalesce(bool_or(media_type='video'),false),min(submitted_at),max(submitted_at),
    coalesce(bool_or(media_type='video' and duration_check='pass'),false),coalesce(bool_or(media_type='video' and duration_check='unknown'),false),
    coalesce(bool_or(media_type='image' and aspect_ratio_check='pass'),false),coalesce(bool_or(media_type='video' and orientation='vertical'),false),
    coalesce(bool_or(media_type='image' and aspect_ratio_check='unknown'),false),coalesce(bool_or(media_type='video' and orientation='unknown'),false)
  into v_photo,v_video,v_first,v_last,v_video_duration_pass,v_video_duration_unknown,v_photo_ratio_pass,v_video_vertical,v_photo_ratio_unknown,v_video_orientation_unknown
  from public.work_submission_media
  where submission_id=p_submission_id and processing_status='stored' and coalesce(duplicate_status,'unchecked') <> 'duplicate';

  if v_photo and v_video then
    select max(first_time) into v_complete_at from (
      select min(submitted_at) first_time from public.work_submission_media where submission_id=p_submission_id and media_type='image' and processing_status='stored' and coalesce(duplicate_status,'unchecked') <> 'duplicate'
      union all
      select min(submitted_at) first_time from public.work_submission_media where submission_id=p_submission_id and media_type='video' and processing_status='stored' and coalesce(duplicate_status,'unchecked') <> 'duplicate'
    ) first_by_type;
  else v_complete_at:=null; end if;

  update public.daily_work_submissions set photo_received=v_photo,video_received=v_video,first_submitted_at=v_first,completed_at=v_complete_at,last_submitted_at=v_last,
    completion_score=(case when v_photo then v_completion_points/2 else 0 end)+(case when v_video then v_completion_points-(v_completion_points/2) else 0 end),
    timeliness_score=case when v_complete_at is not null and v_complete_at <= ((v_work_date+v_deadline) at time zone v_time_zone) then v_timeliness_points else 0 end,
    duration_score=case when not v_video then null when v_video_duration_pass then v_duration_points when v_video_duration_unknown then null else 0 end,
    orientation_score=case when not (v_photo and v_video) then null when v_photo_ratio_pass and v_video_vertical then v_orientation_points when v_photo_ratio_unknown or v_video_orientation_unknown then null else 0 end,
    review_status=case when is_exempt then 'exempt' else 'pending' end,updated_at=now()
  where id=p_submission_id;
end;
$$;

do $$ declare r record; begin
  for r in select distinct submission_id from public.work_submission_media where duplicate_status='duplicate' loop
    perform public.refresh_daily_work_submission(r.submission_id);
  end loop;
end $$;
