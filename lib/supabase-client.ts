import { createBrowserClient } from "@supabase/ssr";
import { getSupabasePublicEnv } from "@/lib/supabase-env";

export function createSupabaseBrowserClient() {
  const supabaseEnv = getSupabasePublicEnv();
  if (!supabaseEnv) return null;

  return createBrowserClient(supabaseEnv.url, supabaseEnv.anonKey);
}
