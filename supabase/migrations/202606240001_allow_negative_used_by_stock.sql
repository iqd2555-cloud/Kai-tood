-- used_by_stock is calculated as previous_remaining + received_today - current_remaining.
-- It may be negative when current remaining is higher than stock available in the system;
-- the UI warns staff so they can correct received/remaining values.
alter table public.daily_reports
  drop constraint if exists daily_reports_used_bl_check,
  drop constraint if exists daily_reports_used_bb_check,
  drop constraint if exists daily_reports_used_chicken_skin_check,
  drop constraint if exists daily_reports_used_oil_check,
  drop constraint if exists daily_reports_used_sticky_rice_check,
  drop constraint if exists daily_reports_used_chopped_chicken_check,
  drop constraint if exists daily_reports_used_drumstick_check,
  drop constraint if exists daily_reports_used_offal_check;
