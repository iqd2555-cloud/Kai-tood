import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import type { Profile } from "@/lib/types";

export async function getCurrentProfile(): Promise<Profile> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("id, full_name, role, branch_id, branch:branches(id, name, code, low_chicken_threshold, low_sticky_rice_threshold, low_oil_threshold)")
    .eq("id", user.id)
    .single();

  if (error || !profile) redirect("/login?error=profile");
  return profile as Profile;
}

export function isOwner(profile: Profile) {
  return profile.role === "owner";
}
