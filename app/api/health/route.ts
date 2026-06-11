import { getSupabaseEnvStatus } from "@/lib/supabase-env";

export const dynamic = "force-dynamic";

export function GET() {
  const supabase = getSupabaseEnvStatus();

  return Response.json({
    ok: supabase.serverConfigValid,
    service: "kai-tood-pwa",
    supabase,
  });
}
