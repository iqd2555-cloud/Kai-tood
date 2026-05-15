"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getCurrentProfile } from "@/lib/auth";
import { ORDER_REQUEST_ITEMS } from "@/lib/report-items";
import { createSupabaseServerClient } from "@/lib/supabase-server";

const dailyReportSchema = z.object({
  report_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "วันที่ไม่ถูกต้อง"),
  branch_id: z.string().uuid(),
  cash_sales: z.coerce.number().min(0),
  transfer_sales: z.coerce.number().min(0),
  used_bl: z.coerce.number().min(0),
  used_bb: z.coerce.number().min(0),
  used_chicken_skin: z.coerce.number().min(0),
  used_oil: z.coerce.number().min(0),
  used_sticky_rice: z.coerce.number().min(0),
  used_chopped_chicken: z.coerce.number().min(0),
  used_drumstick: z.coerce.number().min(0),
  remaining_chicken: z.coerce.number().min(0),
  remaining_sticky_rice: z.coerce.number().min(0),
  remaining_oil: z.coerce.number().min(0),
  order_wrapping_paper: z.coerce.number().min(0),
  order_plastic_bag: z.coerce.number().min(0),
  order_tom_yum_powder: z.coerce.number().min(0),
  order_cheese_powder: z.coerce.number().min(0),
  order_paprika_powder: z.coerce.number().min(0),
  order_wing_zabb_powder: z.coerce.number().min(0),
  order_hot_spicy_powder: z.coerce.number().min(0),
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
  const requestedItems = ORDER_REQUEST_ITEMS
    .map((item) => {
      const amount = Number(payload[item.name] ?? 0);
      if (amount <= 0) return null;
      return `${item.label}: ${amount.toLocaleString("th-TH")} ${item.unit}`;
    })
    .filter(Boolean)
    .join("\n");

  if (profile.role === "staff" && profile.branch_id !== payload.branch_id) {
    return { ok: false, message: "คุณไม่มีสิทธิ์บันทึกข้อมูลสาขานี้" };
  }

  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return { ok: false, message: "ยังไม่ได้ตั้งค่า Supabase บนเซิร์ฟเวอร์" };
  }

  const { error } = await supabase.from("daily_reports").upsert(
    {
      ...payload,
      requested_items: requestedItems,
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
  revalidatePath("/reports");
  return { ok: true, message: "บันทึกข้อมูลเรียบร้อย" };
}

export async function signOut() {
  const supabase = await createSupabaseServerClient();
  await supabase?.auth.signOut();
  redirect("/login");
}
