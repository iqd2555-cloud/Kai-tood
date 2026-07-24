"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentProfile, isOwner } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import type { MiniApplicationStatus } from "@/lib/types";
const statuses: MiniApplicationStatus[] = ["new", "area_conflict", "awaiting_location_info", "prequalified", "appointment_scheduled", "approved", "rejected", "paid", "delivered", "opened"];
export async function updateMiniApplication(formData: FormData) {
  const profile = await getCurrentProfile(); if (!isOwner(profile)) redirect("/dashboard");
  const id = String(formData.get("id") ?? ""); const status = String(formData.get("status") ?? "") as MiniApplicationStatus; const internal_note = String(formData.get("internal_note") ?? "").trim() || null;
  if (!id || !statuses.includes(status)) return;
  const supabase = await createSupabaseServerClient(); if (!supabase) return;
  await supabase.from("mini_franchise_applications").update({ status, internal_note }).eq("id", id);
  revalidatePath("/mini-applications");
}
