import { getSupabaseEnvStatus } from "@/lib/supabase-env";

export const dynamic = "force-dynamic";

export function GET() {
  const supabase = getSupabaseEnvStatus();

  return Response.json({
    ok: supabase.publicConfigValid,
    service: "kai-tood-pwa",
    supabase,
  });
}
