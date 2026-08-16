"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getCurrentProfile } from "@/lib/auth";
import { createSupabaseAdminClient } from "@/lib/supabase-admin";

const schema = z.object({
  id: z.string().uuid(),
  status: z.enum(["received", "investigating", "resolved", "closed"]),
  admin_note: z.string().trim().max(3000).optional().default(""),
});

export async function updateFeedbackStatus(formData: FormData) {
  const profile = await getCurrentProfile();
  if (profile.role !== "owner") return;

  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return;

  const supabase = createSupabaseAdminClient();
  if (!supabase) return;

  await supabase
    .from("customer_feedback")
    .update({
      status: parsed.data.status,
      admin_note: parsed.data.admin_note || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", parsed.data.id);

  revalidatePath("/customer-feedback-admin");
}
