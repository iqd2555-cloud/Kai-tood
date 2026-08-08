import { createClient } from "@supabase/supabase-js";

function clean(value: string | undefined) {
  return value?.trim() ?? "";
}

export function createKpiSupabaseAdminClient() {
  const url = clean(process.env.KPI_SUPABASE_URL);
  const serviceRoleKey = clean(process.env.KPI_SUPABASE_SERVICE_ROLE_KEY);
  if (!url || !serviceRoleKey) return null;

  return createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
