import type { Profile } from "@/lib/types";

export const STAFF_COUNTER_ORDER_EMAIL = "iqd2555@gmail.com";

export function canUseStaffCounterOrder(profile: Profile) {
  return profile.role === "staff" && profile.email?.toLowerCase() === STAFF_COUNTER_ORDER_EMAIL;
}

export function canUseCounterOrders(profile: Profile) {
  return profile.role === "owner" || canUseStaffCounterOrder(profile);
}
