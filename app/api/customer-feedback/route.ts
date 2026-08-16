import { NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseAdminClient } from "@/lib/supabase-admin";
import { isReportableBranch } from "@/lib/branches";

export const runtime = "nodejs";

const feedbackSchema = z.object({
  branch_id: z.string().uuid(),
  service_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  service_time: z.union([z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/), z.literal("")]).optional().default(""),
  feedback_type: z.enum(["complaint", "suggestion", "compliment"]),
  details: z.string().trim().min(5).max(3000),
  customer_name: z.string().trim().max(120).optional().default(""),
  customer_contact: z.string().trim().max(120).optional().default(""),
});

function thailandDateCompact() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Bangkok",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const value = (type: string) => parts.find((part) => part.type === type)?.value ?? "";
  return `${value("year")}${value("month")}${value("day")}`;
}

function newCaseNumber() {
  const suffix = crypto.randomUUID().replaceAll("-", "").slice(0, 6).toUpperCase();
  return `CS-${thailandDateCompact()}-${suffix}`;
}

export async function POST(request: Request) {
  const supabase = createSupabaseAdminClient();
  if (!supabase) return NextResponse.json({ ok: false, message: "ระบบยังไม่พร้อมใช้งาน" }, { status: 503 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, message: "ข้อมูลไม่ถูกต้อง" }, { status: 400 });
  }

  const parsed = feedbackSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, message: "กรุณาตรวจสอบข้อมูลที่กรอกอีกครั้ง" }, { status: 400 });
  }

  const data = parsed.data;
  const { data: branch, error: branchError } = await supabase
    .from("branches")
    .select("id,name,code,is_active")
    .eq("id", data.branch_id)
    .maybeSingle();

  if (branchError || !branch || !isReportableBranch(branch)) {
    return NextResponse.json({ ok: false, message: "ไม่พบสาขาที่เลือก" }, { status: 400 });
  }

  const caseNumber = newCaseNumber();
  const { error } = await supabase.from("customer_feedback").insert({
    case_number: caseNumber,
    branch_id: branch.id,
    branch_name: branch.name,
    service_date: data.service_date,
    service_time: data.service_time || null,
    feedback_type: data.feedback_type,
    details: data.details,
    customer_name: data.customer_name || null,
    customer_contact: data.customer_contact || null,
    status: "received",
  });

  if (error) {
    console.error("customer_feedback insert failed", error);
    return NextResponse.json({ ok: false, message: "ส่งข้อมูลไม่สำเร็จ กรุณาลองใหม่อีกครั้ง" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, caseNumber });
}
