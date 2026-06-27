"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getCurrentProfile } from "@/lib/auth";
import { ORDER_REQUEST_ITEMS } from "@/lib/report-items";
import { createSupabaseAdminClient } from "@/lib/supabase-admin";
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

  if (savedReport?.id) {
    const cashFlowResult = await syncSalesReportToCashFlow(savedReport.id, supabase, profile.id);
    if (!cashFlowResult.ok) return { ok: false, message: `บันทึกยอดขายสำเร็จ แต่ซิงก์ Cash Flow ไม่สำเร็จ: ${cashFlowResult.message}` };
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

const typeMap = { "รับ": "income", "จ่าย": "expense", income: "income", expense: "expense" } as const;
const statusMap = {
  "รับแล้ว": "received",
  "จ่ายแล้ว": "paid",
  "รอรับ": "pending_receive",
  "รอจ่าย": "pending_pay",
  "ยกเลิก": "cancelled",
  "ค้างชำระ": "overdue",
  pending_receive: "pending_receive",
  received: "received",
  pending_pay: "pending_pay",
  paid: "paid",
  cancelled: "cancelled",
  overdue: "overdue",
} as const;

const cashFlowEntrySchema = z.object({
  transaction_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  due_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().or(z.literal("")),
  type: z.string().transform((value, ctx) => {
    const mapped = typeMap[value as keyof typeof typeMap];
    if (!mapped) { ctx.addIssue({ code: z.ZodIssueCode.custom, message: "ประเภท Cash Flow ไม่ถูกต้อง" }); return z.NEVER; }
    return mapped;
  }),
  status: z.string().transform((value, ctx) => {
    const mapped = statusMap[value as keyof typeof statusMap];
    if (!mapped) { ctx.addIssue({ code: z.ZodIssueCode.custom, message: "สถานะ Cash Flow ไม่ถูกต้อง" }); return z.NEVER; }
    return mapped;
  }),
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
type CashFlowSyncResult = { ok: boolean; action: "inserted" | "updated" | "skipped" | "error"; entryId: string | null; message: string };
type CashFlowClient = NonNullable<Awaited<ReturnType<typeof createSupabaseServerClient>>>;

function isISODate(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function cashFlowSyncClient(serverClient: CashFlowClient) {
  return createSupabaseAdminClient() ?? serverClient;
}

function logSalesCashFlowSync(event: string, details: Record<string, unknown>) {
  console.info("syncSalesReportToCashFlow", { event, ...details });
}

function readableSupabaseError(message: string, fallback: string) {
  if (/permission denied|row-level security|rls/i.test(message)) return `${fallback}: ไม่มีสิทธิ์อ่าน/เขียนข้อมูล (${message})`;
  return `${fallback}: ${message}`;
}

export async function syncSalesReportToCashFlow(salesReportId: string, existingClient?: CashFlowClient, createdBy?: string | null): Promise<CashFlowSyncResult> {
  const serverClient = existingClient ?? await createSupabaseServerClient();
  if (!serverClient) return { ok: false, action: "error", entryId: null, message: "ยังไม่ได้ตั้งค่า Supabase บนเซิร์ฟเวอร์" };
  const supabase = cashFlowSyncClient(serverClient);

  const { data: report, error: reportError } = await supabase
    .from("daily_reports")
    .select("id, report_date, branch_id, total_sales, branch_name, submitted_by")
    .eq("id", salesReportId)
    .maybeSingle();

  if (reportError) {
    console.error("syncSalesReportToCashFlow", { salesReportId, error: reportError });
    return { ok: false, action: "error", entryId: null, message: readableSupabaseError(reportError.message, "อ่านยอดขายไม่สำเร็จ") };
  }
  if (!report) return { ok: false, action: "error", entryId: null, message: "ไม่พบยอดขายที่ต้องการซิงก์" };
  if (!isISODate(report.report_date)) return { ok: false, action: "error", entryId: null, message: `วันที่ไม่ตรงรูปแบบ ISO: ${report.report_date}` };

  const amount = Number(report.total_sales ?? 0);
  logSalesCashFlowSync("report_loaded", { salesReportId, branch_id: report.branch_id, sales_date: report.report_date, total_sales: amount });
  if (amount <= 0) return { ok: true, action: "skipped", entryId: null, message: "ข้ามรายการยอดขาย 0 บาท" };

  const { data: existingEntry, error: existingError } = await supabase
    .from("cash_flow_entries")
    .select("id")
    .eq("source", "sales")
    .eq("source_ref_id", salesReportId)
    .maybeSingle();
  if (existingError) {
    console.error("syncSalesReportToCashFlow", { salesReportId, error: existingError });
    return { ok: false, action: "error", entryId: null, message: readableSupabaseError(existingError.message, "ตรวจรายการ Cash Flow เดิมไม่สำเร็จ") };
  }

  const cashFlowPayload = {
    transaction_date: report.report_date,
    due_date: report.report_date,
    type: "income",
    status: "received",
    source: "sales",
    source_ref_id: salesReportId,
    branch_id: report.branch_id,
    amount,
    category: "sales_revenue",
    payment_method: "unspecified",
    department: "หน้าร้าน",
    description: `ยอดขายหน้าร้านประจำวันที่ ${report.report_date}${report.branch_name ? ` (${report.branch_name})` : ""}`,
    created_by: createdBy ?? report.submitted_by,
    note: "สร้างอัตโนมัติจากรายงานยอดขายพนักงาน",
  };

  const { data: entry, error: writeError } = await supabase
    .from("cash_flow_entries")
    .upsert({ ...cashFlowPayload, updated_at: new Date().toISOString() }, { onConflict: "source,source_ref_id" })
    .select("id")
    .single();
  if (writeError) {
    console.error("syncSalesReportToCashFlow", { salesReportId, branch_id: report.branch_id, sales_date: report.report_date, total_sales: amount, error: writeError });
    return { ok: false, action: "error", entryId: null, message: readableSupabaseError(writeError.message, "เขียน cash_flow_entries ไม่สำเร็จ") };
  }

  logSalesCashFlowSync(existingEntry ? "updated" : "inserted", { salesReportId, branch_id: report.branch_id, sales_date: report.report_date, total_sales: amount, cash_flow_entry_id: entry.id });
  return { ok: true, action: existingEntry ? "updated" : "inserted", entryId: entry.id, message: existingEntry ? "ยอดขายนี้ถูก sync แล้ว จึงอัปเดตรายการเดิม" : "สร้างรายการ Cash Flow จากยอดขายแล้ว" };
}

async function upsertSalesCashFlowEntry(supabase: CashFlowClient, report: SalesCashFlowReport) {
  return syncSalesReportToCashFlow(report.id, supabase, report.created_by);
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
    transaction_date: payload.transaction_date,
    due_date: payload.due_date || payload.transaction_date,
    type: payload.type,
    status: payload.status,
    description: payload.description,
    amount: Number(payload.amount),
    category: payload.category || null,
    payment_method: payload.payment_method || null,
    branch_id: payload.branch_id || null,
    department: payload.department || null,
    source_ref_id: payload.source_ref_id || null,
    attachment_url: payload.attachment_url || null,
    note: payload.note || null,
    source: "manual",
    created_by: profile.id || null,
  });
  if (error) return { ok: false, message: error.message };
  revalidatePath("/cash-flow");
  return { ok: true, message: "บันทึกรายการ Cash Flow เรียบร้อย" };
}

export async function syncDailySalesToCashFlow(formData?: FormData) {
  const profile = await getCurrentProfile();
  if (profile.role !== "owner") return { ok: false, message: "เฉพาะเจ้าของร้านเท่านั้น" };
  const supabase = await createSupabaseServerClient();
  if (!supabase) return { ok: false, message: "ยังไม่ได้ตั้งค่า Supabase บนเซิร์ฟเวอร์" };

  const today = new Date().toISOString().slice(0, 10);
  const defaultFrom = new Date(Date.now() - 29 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const rawFrom = String(formData?.get("from") ?? defaultFrom);
  const rawTo = String(formData?.get("to") ?? today);
  const from = isISODate(rawFrom) ? rawFrom : defaultFrom;
  const to = isISODate(rawTo) ? rawTo : today;

  const { data: reports, error } = await supabase
    .from("daily_reports")
    .select("id, report_date, branch_id, total_sales, branch_name")
    .gte("report_date", from)
    .lte("report_date", to)
    .order("report_date", { ascending: false });
  if (error) return { ok: false, message: readableSupabaseError(error.message, "ดึงยอดขายย้อนหลังไม่สำเร็จ") };
  if (!reports?.length) return { ok: false, message: `ไม่พบยอดขายของวันที่เลือก (${from} ถึง ${to})` };

  let synced = 0;
  let skipped = 0;
  const errors: string[] = [];
  for (const report of reports) {
    const result = await upsertSalesCashFlowEntry(supabase, { ...report, created_by: profile.id });
    if (result.ok && result.action === "skipped") skipped += 1;
    else if (result.ok) synced += 1;
    else errors.push(`${report.report_date}: ${result.message}`);
  }

  revalidatePath("/cash-flow");
  return {
    ok: errors.length === 0,
    message: `ซิงก์สำเร็จ ${synced} รายการ / ข้าม ${skipped} รายการ / error ${errors.length} รายการ${errors.length ? ` — ${errors.slice(0, 3).join(" | ")}` : ""}`,
  };
}
