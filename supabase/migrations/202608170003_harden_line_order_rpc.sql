alter function public.create_marinated_order_draft_from_line(
  uuid, text, text, text, text, text, text, text, date, numeric, jsonb
) security invoker;

revoke execute on function public.create_marinated_order_draft_from_line(
  uuid, text, text, text, text, text, text, text, date, numeric, jsonb
) from authenticated;

grant execute on function public.create_marinated_order_draft_from_line(
  uuid, text, text, text, text, text, text, text, date, numeric, jsonb
) to service_role;
