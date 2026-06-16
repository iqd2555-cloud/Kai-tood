import type { Profile } from "@/lib/types";

export const MARINATION_STAFF_EMAILS = ["sorrawisaaemprathom20mar2530@gmail.com"] as const;

export const MARINATION_ALLOWED_EMAILS = [
  "sorrawisaaemprathom20mar2530@gmail.com",
  "iqd2555@gmail.com",
  "kommuangkham@gmail.com",
] as const;

export const OWNER_EMAILS = ["kommuangkham@gmail.com", "iqd2555@gmail.com"] as const;

function normalizeEmail(email: string | null | undefined) {
  return email?.trim().toLowerCase() ?? "";
}

function includesEmail<const T extends readonly string[]>(emails: T, email: string | null | undefined) {
  const normalizedEmail = normalizeEmail(email);
  return normalizedEmail ? emails.includes(normalizedEmail as T[number]) : false;
}

export function isMarinationStaffEmail(email: string | null | undefined) {
  return includesEmail(MARINATION_STAFF_EMAILS, email);
}

export function canAccessMarinationByEmail(email: string | null | undefined) {
  return includesEmail(MARINATION_ALLOWED_EMAILS, email);
}

export function isOwnerEmail(email: string | null | undefined) {
  return includesEmail(OWNER_EMAILS, email);
}

export function isMarinationOnlyStaff(profile: Pick<Profile, "email">) {
  return isMarinationStaffEmail(profile.email);
}

export function canAccessDailyInput(profile: Pick<Profile, "email">) {
  return !isMarinationOnlyStaff(profile);
}

export function canAccessOrderCount(profile: Pick<Profile, "email">) {
  return !isMarinationOnlyStaff(profile);
}

export function canAccessMyReport(profile: Pick<Profile, "email">) {
  return !isMarinationOnlyStaff(profile);
}

export function canAccessOwnerDashboard(profile: Pick<Profile, "email" | "role">) {
  return profile.role === "owner" && !isMarinationOnlyStaff(profile);
}

export function canAccessLeads(profile: Pick<Profile, "email" | "role">) {
  return canAccessOwnerDashboard(profile);
}

export function getDefaultRedirectPathForEmail(email: string | null | undefined) {
  return isMarinationStaffEmail(email) ? "/marination" : "/dashboard";
}

export function getSafeRedirectPathForEmail(email: string | null | undefined, requestedPath: string) {
  if (!isMarinationStaffEmail(email)) return requestedPath;
  return requestedPath === "/marination" || requestedPath.startsWith("/marination?") ? requestedPath : "/marination";
}
