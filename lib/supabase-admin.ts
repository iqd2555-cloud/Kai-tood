import { createClient } from "@supabase/supabase-js";
import { getSupabasePublicEnv } from "@/lib/supabase-env";

function clean(value: string | undefined) {
  return value?.trim() ?? "";
}

export function createSupabaseAdminClient() {
  const supabaseEnv = getSupabasePublicEnv();
  const serviceRoleKey = clean(process.env.SUPABASE_SERVICE_ROLE_KEY);

  if (!supabaseEnv || !serviceRoleKey) return null;

  return createClient(supabaseEnv.url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
