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
  used_bl: z.coerce.number(),
  used_bb: z.coerce.number(),
  used_chicken_skin: z.coerce.number(),
  used_oil: z.coerce.number(),
  used_sticky_rice: z.coerce.number(),
  used_chopped_chicken: z.coerce.number(),
  used_drumstick: z.coerce.number(),
  used_offal: z.coerce.number(),
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

  const { data: savedReport, error } = await supabase.from("daily_reports").upsert(
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
  ).select("id, report_date, branch_id, total_sales, branch_name").single();

  if (error) return { ok: false, message: error.message };

  if (profile.role === "owner" && savedReport?.id) {
    const { error: cashFlowError } = await upsertSalesCashFlowEntry(supabase, {
      id: savedReport.id,
      report_date: savedReport.report_date,
      branch_id: savedReport.branch_id,
      total_sales: savedReport.total_sales,
      branch_name: savedReport.branch_name,
      created_by: profile.id,
    });
    if (cashFlowError) return { ok: false, message: `บันทึกยอดขายสำเร็จ แต่ซิงก์ Cash Flow ไม่สำเร็จ: ${cashFlowError}` };
  }

  revalidatePath("/dashboard");
  revalidatePath("/daily");
  revalidatePath("/history");
  revalidatePath("/orders");
  revalidatePath("/reports");
  revalidatePath("/cash-flow");
  return { ok: true, message: "บันทึกข้อมูลเรียบร้อย" };
}

export async function signOut() {
  const supabase = await createSupabaseServerClient();
  await supabase?.auth.signOut();
  redirect("/login");
}

const cashFlowEntrySchema = z.object({
  transaction_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  due_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().or(z.literal("")),
  type: z.enum(["income", "expense"]),
  status: z.enum(["pending_receive", "received", "pending_pay", "paid", "cancelled", "overdue"]),
  category: z.string().max(200).optional().default(""),
  description: z.string().min(1).max(500),
  amount: z.coerce.number().positive(),
  payment_method: z.string().max(100).optional().default(""),
  branch_id: z.string().uuid().optional().or(z.literal("")),
  department: z.string().max(200).optional().default(""),
  source_ref_id: z.string().max(200).optional().default(""),
  attachment_url: z.string().max(1000).optional().default(""),
  note: z.string().max(2000).optional().default(""),
});

type SalesCashFlowReport = { id: string; report_date: string; branch_id: string | null; total_sales: number | string | null; branch_name?: string | null; created_by: string | null };

async function upsertSalesCashFlowEntry(supabase: NonNullable<Awaited<ReturnType<typeof createSupabaseServerClient>>>, report: SalesCashFlowReport) {
  const amount = Number(report.total_sales ?? 0);
  if (amount <= 0) return { error: null as string | null };
  const { error } = await supabase.from("cash_flow_entries").upsert({
    transaction_date: report.report_date,
    due_date: report.report_date,
    type: "income",
    status: "received",
    category: "ยอดขายหน้าร้าน",
    description: `ยอดขายสาขา${report.branch_name ? ` ${report.branch_name}` : ""}`,
    amount,
    payment_method: "รวมทุกช่องทาง",
    branch_id: report.branch_id,
    department: "หน้าร้าน",
    source: "sales",
    source_ref_id: report.id,
    created_by: report.created_by,
  }, { onConflict: "source,source_ref_id" });
  return { error: error?.message ?? null };
}

export async function saveCashFlowEntry(_: unknown, formData: FormData) {
  const profile = await getCurrentProfile();
  if (profile.role !== "owner") return { ok: false, message: "เฉพาะเจ้าของร้านเท่านั้น" };
  const parsed = cashFlowEntrySchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, message: "กรุณาตรวจสอบข้อมูล Cash Flow" };
  const payload = parsed.data;
  const supabase = await createSupabaseServerClient();
  if (!supabase) return { ok: false, message: "ยังไม่ได้ตั้งค่า Supabase บนเซิร์ฟเวอร์" };
  const { error } = await supabase.from("cash_flow_entries").insert({
    ...payload,
    due_date: payload.due_date || null,
    category: payload.category || null,
    payment_method: payload.payment_method || null,
    branch_id: payload.branch_id || null,
    department: payload.department || null,
    source_ref_id: payload.source_ref_id || null,
    attachment_url: payload.attachment_url || null,
    note: payload.note || null,
    source: "manual",
    created_by: profile.id,
  });
  if (error) return { ok: false, message: error.message };
  revalidatePath("/cash-flow");
  return { ok: true, message: "บันทึกรายการ Cash Flow เรียบร้อย" };
}

export async function syncDailySalesToCashFlow() {
  const profile = await getCurrentProfile();
  if (profile.role !== "owner") return { ok: false, message: "เฉพาะเจ้าของร้านเท่านั้น" };
  const supabase = await createSupabaseServerClient();
  if (!supabase) return { ok: false, message: "ยังไม่ได้ตั้งค่า Supabase บนเซิร์ฟเวอร์" };
  const { data: reports, error } = await supabase.from("daily_reports").select("id, report_date, branch_id, total_sales, branch_name").order("report_date", { ascending: false }).limit(120);
  if (error) return { ok: false, message: error.message };
  const results = await Promise.all((reports ?? []).map((report) => upsertSalesCashFlowEntry(supabase, { ...report, created_by: profile.id })));
  const failed = results.find((result) => result.error);
  if (failed?.error) return { ok: false, message: failed.error };
  revalidatePath("/cash-flow");
  return { ok: true, message: `ซิงก์ยอดขาย ${(reports ?? []).length} รายการแล้ว` };
}
