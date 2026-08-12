import type { Profile } from "@/lib/types";

export const STAFF_COUNTER_ORDER_EMAILS = [
  "iqd2555@gmail.com",
  "sorrawisaaemprathom20mar2530@gmail.com",
] as const;

export function canUseStaffCounterOrder(profile: Profile) {
  const email = profile.email?.toLowerCase();
  return profile.role === "staff" && !!email && STAFF_COUNTER_ORDER_EMAILS.includes(email as (typeof STAFF_COUNTER_ORDER_EMAILS)[number]);
}

export function canUseCounterOrders(profile: Profile) {
  return profile.role === "owner" || canUseStaffCounterOrder(profile);
}
