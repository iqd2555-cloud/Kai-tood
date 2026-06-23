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
  branch_name: z.string().optional().default(""),
  cash_sales: z.coerce.number().min(0),
  transfer_sales: z.coerce.number().min(0),
  opening_original_chicken: z.coerce.number().min(0),
  opening_spicy_chicken: z.coerce.number().min(0),
  opening_ground_chicken: z.coerce.number().min(0),
  opening_drumstick: z.coerce.number().min(0),
  opening_offal: z.coerce.number().min(0),
  opening_chicken_skin: z.coerce.number().min(0),
  opening_sticky_rice: z.coerce.number().min(0),
  opening_oil: z.coerce.number().min(0),
  received_original_chicken: z.coerce.number().min(0),
  received_spicy_chicken: z.coerce.number().min(0),
  received_ground_chicken: z.coerce.number().min(0),
  received_drumstick: z.coerce.number().min(0),
  received_offal: z.coerce.number().min(0),
  received_chicken_skin: z.coerce.number().min(0),
  received_chicken: z.coerce.number().min(0).optional().default(0),
  received_sticky_rice: z.coerce.number().min(0),
  received_oil: z.coerce.number().min(0),
  used_bl: z.coerce.number().min(0),
  used_bb: z.coerce.number().min(0),
  used_chicken_skin: z.coerce.number().min(0),
  used_oil: z.coerce.number().min(0),
  used_sticky_rice: z.coerce.number().min(0),
  used_chopped_chicken: z.coerce.number().min(0),
  used_drumstick: z.coerce.number().min(0),
  used_offal: z.coerce.number().min(0),
  remaining_original_chicken: z.coerce.number().min(0),
  remaining_spicy_chicken: z.coerce.number().min(0),
  remaining_ground_chicken: z.coerce.number().min(0),
  remaining_drumstick: z.coerce.number().min(0),
  remaining_offal: z.coerce.number().min(0),
  remaining_chicken_skin: z.coerce.number().min(0),
  remaining_sticky_rice: z.coerce.number().min(0),
  remaining_oil: z.coerce.number().min(0),
  order_original_chicken: z.coerce.number().min(0),
  order_spicy_chicken: z.coerce.number().min(0),
  order_offal: z.coerce.number().min(0),
  order_chopped_chicken: z.coerce.number().min(0),
  order_drumstick: z.coerce.number().min(0),
  order_chicken_skin: z.coerce.number().min(0),
  order_sticky_rice: z.coerce.number().min(0),
  order_oil: z.coerce.number().min(0),
  order_palm_sugar: z.coerce.number().min(0),
  order_other_items: z.string().optional().default("[]"),
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

  if (profile.role === "staff") {
    if (!profile.branch_id) {
      return { ok: false, message: "โปรไฟล์พนักงานยังไม่ได้ผูกสาขา" };
    }

    // Staff reports must always follow the branch_id from the logged-in profile.
    // Never trust the submitted hidden field or fall back to a default branch.
    payload.branch_id = profile.branch_id;
  }

  const parsedOtherItems = (() => {
    try {
      return JSON.parse(payload.order_other_items || "[]");
    } catch {
      return [];
    }
  })();
  const otherItems = z.array(z.object({ name: z.string(), amount: z.coerce.number().min(0) })).safeParse(parsedOtherItems);

  const requestedItems = ORDER_REQUEST_ITEMS
    .map((item) => {
      const amount = Number(payload[item.name] ?? 0);
      if (amount <= 0) return null;
      return `${item.label}: ${amount.toLocaleString("th-TH")} ${item.unit}`;
    })
    .filter(Boolean)
    .join("\n");
  const requestedItemLines = otherItems.success
    ? otherItems.data.filter((item) => item.name.trim() && item.amount > 0).map((item) => `${item.name.trim()}: ${item.amount.toLocaleString("th-TH")}`)
    : [];
  const allRequestedItems = [requestedItems, ...requestedItemLines].filter(Boolean).join("\n");

  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return { ok: false, message: "ยังไม่ได้ตั้งค่า Supabase บนเซิร์ฟเวอร์" };
  }

  const { data: branchData } = await supabase
    .from("branches")
    .select("name")
    .eq("id", payload.branch_id)
    .maybeSingle();

  const canonicalBranchName = branchData?.name ?? payload.branch_name;

  if (process.env.NODE_ENV === "development") {
    console.info("daily_report_branch_debug", {
      currentUserEmail: profile.email,
      profileBranchId: profile.branch_id,
      reportBranchId: payload.branch_id,
    });
  }

  const totalReceivedChicken = payload.received_original_chicken + payload.received_spicy_chicken + payload.received_ground_chicken + payload.received_drumstick + payload.received_offal + payload.received_chicken_skin;

  const { error } = await supabase.from("daily_reports").upsert(
    {
      ...payload,
      received_chicken: totalReceivedChicken,
      remaining_chicken: payload.remaining_original_chicken,
      branch_name: canonicalBranchName,
      requested_items: allRequestedItems,
      order_other_items: otherItems.success ? otherItems.data.filter((item) => item.name.trim() && item.amount > 0) : [],
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
