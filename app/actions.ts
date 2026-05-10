"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getCurrentProfile } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase-server";

const dailyReportSchema = z.object({
  report_date: z.string().min(10).max(10),
  branch_id: z.string().uuid(),
  cash_sales: z.coerce.number().min(0),
  transfer_sales: z.coerce.number().min(0),
  used_bl: z.coerce.number().min(0),
  used_bb: z.coerce.number().min(0),
  used_chicken_skin: z.coerce.number().min(0),
  used_oil: z.coerce.number().min(0),
  used_sticky_rice: z.coerce.number().min(0),
  remaining_chicken: z.coerce.number().min(0),
  remaining_sticky_rice: z.coerce.number().min(0),
  remaining_oil: z.coerce.number().min(0),
  requested_items: z.string().max(3000).optional().default(""),
  note: z.string().max(3000).optional().default(""),
});

export async function saveDailyReport(_: unknown, formData: FormData) {
  const profile = await getCurrentProfile();
  const parsed = dailyReportSchema.safeParse(Object.fromEntries(formData));

  if (!parsed.success) {
    return { ok: false, message: "กรุณาตรวจสอบข้อมูลอีกครั้ง" };
  }

  const payload = parsed.data;
  if (profile.role === "staff" && profile.branch_id !== payload.branch_id) {
    return { ok: false, message: "คุณไม่มีสิทธิ์บันทึกข้อมูลสาขานี้" };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("daily_reports").upsert(
    {
      ...payload,
      submitted_by: profile.id,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "branch_id,report_date" },
  );

  if (error) return { ok: false, message: error.message };

  revalidatePath("/dashboard");
  revalidatePath("/daily");
  revalidatePath("/history");
  revalidatePath("/orders");
  return { ok: true, message: "บันทึกข้อมูลเรียบร้อย" };
}

export async function signOut() {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  redirect("/login");
}
