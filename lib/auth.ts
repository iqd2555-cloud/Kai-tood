import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import type { Branch, Profile, UserRole } from "@/lib/types";

const PROFILE_SELECT =
  "id, full_name, role, branch_id, branch:branches(id, name, code, low_chicken_threshold, low_sticky_rice_threshold, low_oil_threshold)";

type ProfileResponse = {
  id: string;
  full_name: string;
  role: string;
  branch_id: string | null;
  branch: Branch | Branch[] | null;
};

function isUserRole(role: string): role is UserRole {
  return role === "owner" || role === "staff";
}

function normalizeProfileBranch(branch: ProfileResponse["branch"]): Branch | null {
  if (Array.isArray(branch)) return branch[0] ?? null;
  return branch;
}

function normalizeProfile(profile: ProfileResponse): Profile | null {
  if (!isUserRole(profile.role)) return null;

  return {
    id: profile.id,
    full_name: profile.full_name,
    role: profile.role,
    branch_id: profile.branch_id,
    branch: normalizeProfileBranch(profile.branch),
  };
}

export async function getCurrentProfile(): Promise<Profile> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) redirect("/login?setup=supabase");

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile, error } = await supabase
    .from("profiles")
    .select(PROFILE_SELECT)
    .eq("id", user.id)
    .returns<ProfileResponse>()
    .single();

  if (error || !profile) return redirect("/login?error=profile");

  const normalizedProfile = normalizeProfile(profile);
  if (!normalizedProfile) return redirect("/login?error=profile");

  return normalizedProfile;
}

export function isOwner(profile: Profile) {
  return profile.role === "owner";
}
