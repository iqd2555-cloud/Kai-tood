import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import type { Branch, Profile, UserRole } from "@/lib/types";

const PROFILE_SELECT =
  "id, email, full_name, role, branch_id, branch:branches(id, name, code, low_chicken_threshold, low_sticky_rice_threshold, low_oil_threshold)";

type ProfileResponse = {
  id: string;
  email: string | null;
  full_name: string;
  role: string;
  branch_id: string | null;
  branch?: Branch | Branch[] | null;
};

type AuthUserForProvisioning = {
  id: string;
  email?: string | null;
  user_metadata?: {
    full_name?: unknown;
    name?: unknown;
  };
};

function isUserRole(role: string): role is UserRole {
  return role === "owner" || role === "staff";
}

function normalizeProfileBranch(branch: ProfileResponse["branch"]): Branch | null {
  if (Array.isArray(branch)) return branch[0] ?? null;
  return branch ?? null;
}

function normalizeProfile(profile: ProfileResponse): Profile | null {
  if (!isUserRole(profile.role)) return null;
  if (profile.role === "staff" && !profile.branch_id) return null;

  return {
    id: profile.id,
    email: profile.email,
    full_name: profile.full_name,
    role: profile.role,
    branch_id: profile.branch_id,
    branch: normalizeProfileBranch(profile.branch),
  };
}

function getUserFullName(user: AuthUserForProvisioning) {
  const metadataName = user.user_metadata?.full_name ?? user.user_metadata?.name;
  if (typeof metadataName === "string" && metadataName.trim()) return metadataName.trim();
  return user.email?.split("@")[0]?.trim() || "ผู้ใช้งาน";
}

export async function ensureProfileForUser(user: AuthUserForProvisioning) {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return { ok: false, message: "ยังไม่ได้ตั้งค่า Supabase URL หรือ Anon Key" };

  const { data: profile, error } = await supabase
    .rpc("ensure_login_profile", {
      user_full_name: getUserFullName(user),
      user_id: user.id,
      user_email: user.email ?? null,
    })
    .returns<ProfileResponse>()
    .single();

  if (error) {
    return {
      ok: false,
      message: `เข้าสู่ระบบสำเร็จ แต่เตรียมโปรไฟล์ไม่สำเร็จ: ${error.message}`,
    };
  }

  if (!profile || !normalizeProfile(profile)) {
    return {
      ok: false,
      message: "เข้าสู่ระบบสำเร็จ แต่โปรไฟล์ที่สร้างไม่สมบูรณ์",
    };
  }

  return { ok: true, message: "" };
}

async function fetchCurrentProfile(): Promise<Profile | null> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) redirect("/login?setup=supabase");

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const ensureResult = await ensureProfileForUser(user);
  if (!ensureResult.ok) {
    console.error(ensureResult.message);
  }

  const { data: profile, error } = await supabase
    .from("profiles")
    .select(PROFILE_SELECT)
    .eq("id", user.id)
    .returns<ProfileResponse>()
    .maybeSingle();

  if (error || !profile) {
    if (error) console.error("Load profile failed", error.message);
    return null;
  }

  return normalizeProfile(profile);
}

export async function getCurrentProfile(): Promise<Profile> {
  const profile = await fetchCurrentProfile();
  if (!profile) return redirect("/login?error=profile");
  return profile;
}

export function isOwner(profile: Profile) {
  return profile.role === "owner";
}
