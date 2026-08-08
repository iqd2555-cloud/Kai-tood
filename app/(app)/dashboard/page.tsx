import { redirect } from "next/navigation";
import { getCurrentProfile, isOwner } from "@/lib/auth";
import { isMarinationOnlyStaff } from "@/lib/marination-access";

export default async function DashboardPage() {
  const profile = await getCurrentProfile();
  if (isOwner(profile)) redirect("/owner-overview");
  if (isMarinationOnlyStaff(profile)) redirect("/marination");
  redirect("/daily");
}
