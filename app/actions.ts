"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getCurrentProfile } from "@/lib/auth";
import { ORDER_REQUEST_ITEMS } from "@/lib/report-items";
import { createSupabaseServerClient } from "@/lib/supabase-server";

const numericField = z.coerce.number().min(0).default(0);

const dailyReportSchema = z.object({
  report_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "วันที่ไม่ถูกต้อง"),
  branch_id: z.string().uuid(),
  branch_name: z.string().optional().default(""),
  cash_sales: numericField,
  transfer_sales: numericField,
  received_chicken: numericField,
  received_rice: numericField,
  received_sticky_rice: numericField,
  received_oil: numericField,
  received_sugar: numericField,
  used_bl: numericField,
  used_bb: numericField,
  used_chicken_skin: numericField,
  used_oil: numericField,
  used_sticky_rice: numericField,
  used_chopped_chicken: numericField,
  used_drumstick: numericField,
  remaining_chicken: numericField,
  remaining_sticky_rice: numericField,
  remaining_oil: numericField,
  order_original_chicken: numericField,
  order_spicy_chicken: numericField,
  order_offal: numericField,
  order_chopped_chicken: numericField,
  order_drumstick: numericField,
  order_chicken_skin: numericField,
  order_sticky_rice: numericField,
  order_oil: numericField,
  order_palm_sugar: numericField,
  received_other_items: z.string().optional().default("[]"),
  order_other_items: z.string().optional().default("[]"),
  requested_items: z.string().max(3000).optional().default(""),
  note: z.string().max(3000).optional().default(""),
});

export async function saveDailyReport(_: unknown, formData: FormData) {
  const profile = await getCurrentProfile();
  const rawPayload = Object.fromEntries(formData);

  if (profile.role === "staff") {
    if (!profile.branch_id) {
      return { ok: false, message: "โปรไฟล์พนักงานยังไม่ได้ผูกสาขา" };
    }

    rawPayload.branch_id = profile.branch_id;
    rawPayload.branch_name = profile.branch_name ?? profile.branch?.name ?? "";
  }

  const parsed = dailyReportSchema.safeParse(rawPayload);

  if (!parsed.success) {
    console.error("Daily report validation failed", parsed.error.flatten());
    return { ok: false, message: "กรุณาตรวจสอบข้อมูลอีกครั้ง" };
  }

  const payload = parsed.data;
  const stickyRiceReceived = payload.received_sticky_rice || payload.received_rice;

  const parsedReceivedOtherItems = (() => {
    try {
      return JSON.parse(payload.received_other_items || "[]");
    } catch {
      return [];
    }
  })();
  const receivedOtherItems = z.array(z.object({ name: z.string(), amount: z.coerce.number().min(0) })).safeParse(parsedReceivedOtherItems);

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

  const { error } = await supabase.from("daily_reports").upsert(
    {
      ...payload,
      received_rice: stickyRiceReceived,
      received_sticky_rice: stickyRiceReceived,
      received_other_items: receivedOtherItems.success ? receivedOtherItems.data.filter((item) => item.name.trim() && item.amount > 0) : [],
      branch_name: profile.role === "staff" ? profile.branch_name ?? profile.branch?.name ?? branchData?.name ?? payload.branch_name : branchData?.name ?? payload.branch_name,
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
