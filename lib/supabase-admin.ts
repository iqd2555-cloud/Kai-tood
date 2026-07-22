import { createClient } from "@supabase/supabase-js";
import { getSupabaseAdminEnv, getSupabaseAdminEnvDiagnostics } from "./supabase-env.ts";

export function createSupabaseAdminClient() {
  const supabaseEnv = getSupabaseAdminEnv();

  if (!supabaseEnv) return null;

  return createClient(supabaseEnv.url, supabaseEnv.serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

export function getSupabaseAdminClientDiagnostics() {
  return getSupabaseAdminEnvDiagnostics();
}
