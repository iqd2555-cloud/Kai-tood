"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentProfile, isOwner } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import type { LeadStatus } from "@/lib/types";

const statuses: LeadStatus[] = ["new", "contacted", "awaiting_info", "interested", "appointment_scheduled", "not_ready", "not_qualified", "converted"];

export async function updateLead(formData: FormData) {
  const profile = await getCurrentProfile();
  if (!isOwner(profile)) redirect("/dashboard");
  const id = String(formData.get("id") || "");
  const status = String(formData.get("status") || "") as LeadStatus;
  const internal_note = String(formData.get("internal_note") || "").trim();
  if (!id || !statuses.includes(status)) return;
  const supabase = await createSupabaseServerClient();
  if (!supabase) return;
  await supabase.from("franchise_leads").update({ status, internal_note, updated_at: new Date().toISOString() }).eq("id", id);
  revalidatePath("/leads");
}
