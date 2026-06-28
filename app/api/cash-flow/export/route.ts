import { NextResponse } from "next/server";
import { CASH_FLOW_DOCUMENT_TYPE_LABEL, CASH_FLOW_SOURCE_LABEL, CASH_FLOW_STATUS_LABEL, CASH_FLOW_TYPE_LABEL, type CashFlowDocumentType, type CashFlowSource, type CashFlowStatus, type CashFlowType } from "@/lib/cash-flow";
import { getCurrentProfile } from "@/lib/auth";
import { CASH_FLOW_ENTRIES_TABLE } from "@/lib/cash-flow-constants";
import { createSupabaseServerClient } from "@/lib/supabase-server";

function csvCell(value: unknown) {
  return `"${String(value ?? "").replaceAll('"', '""')}"`;
}

function label<T extends string>(labels: Record<T, string>, value: unknown) {
  return typeof value === "string" && value in labels ? labels[value as T] : value ?? "";
}

type ExportEntry = {
  transaction_date: string | null;
  due_date: string | null;
  type: CashFlowType;
  status: CashFlowStatus;
  category: string | null;
  payment_method: string | null;
  branch_id: string | null;
  department: string | null;
  source: CashFlowSource;
  source_ref_id: string | null;
  amount: number | string | null;
  description: string | null;
  attachment_url: string | null;
  document_type: CashFlowDocumentType | null;
  accountant_note: string | null;
  has_attachment: boolean | null;
  created_by: string | null;
  created_at: string | null;
  updated_at: string | null;
  note: string | null;
};

export async function GET(request: Request) {
  const profile = await getCurrentProfile();
  if (profile.role !== "owner") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { searchParams } = new URL(request.url);
  const isAllRange = searchParams.get("range") === "all";
  const from = searchParams.get("from") ?? new Date().toISOString().slice(0, 10);
  const to = searchParams.get("to") ?? from;
  const isAccountingExport = searchParams.get("mode") === "accounting";
  const supabase = await createSupabaseServerClient();
  if (!supabase) return NextResponse.json({ error: "Supabase is not configured" }, { status: 500 });

  let query = supabase
    .from(CASH_FLOW_ENTRIES_TABLE)
    .select("transaction_date,due_date,type,status,category,payment_method,branch_id,department,source,source_ref_id,amount,description,attachment_url,document_type,accountant_note,has_attachment,created_by,created_at,updated_at,note");
  if (!isAllRange) query = query.gte("transaction_date", from).lte("transaction_date", to);
  const { data, error } = await query.order("transaction_date", { ascending: true }).returns<ExportEntry[]>();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const branchIds = Array.from(new Set((data ?? []).map((entry) => entry.branch_id).filter(Boolean))) as string[];
  const creatorIds = Array.from(new Set((data ?? []).map((entry) => entry.created_by).filter(Boolean))) as string[];
  const [{ data: branches }, { data: profiles }] = await Promise.all([
    branchIds.length ? supabase.from("branches").select("id,name").in("id", branchIds) : Promise.resolve({ data: [] }),
    creatorIds.length ? supabase.from("profiles").select("id,full_name").in("id", creatorIds) : Promise.resolve({ data: [] }),
  ]);
  const branchNameById = new Map(((branches ?? []) as { id: string; name: string | null }[]).map((branch) => [branch.id, branch.name ?? branch.id]));
  const profileNameById = new Map(((profiles ?? []) as { id: string; full_name: string | null }[]).map((creator) => [creator.id, creator.full_name ?? creator.id]));

  const header = isAccountingExport
    ? ["วันที่รายการ", "วันที่ครบกำหนด", "ประเภท", "สถานะ", "หมวดหมู่", "รายละเอียด", "เงินรับ", "เงินจ่าย", "จำนวนสุทธิ", "ช่องทางเงิน", "สาขา", "แผนก", "เลขที่เอกสาร/รหัสอ้างอิง", "ลิงก์เอกสารแนบ", "มีเอกสารแนบ", "ประเภทเอกสาร", "หมายเหตุถึงสำนักงานบัญชี", "แหล่งที่มา", "รหัสอ้างอิงต้นทาง", "ผู้บันทึก", "วันที่สร้าง", "วันที่แก้ไขล่าสุด"]
    : ["วันที่ทำรายการ", "วันที่ครบกำหนด", "ประเภท", "สถานะ", "หมวดหมู่", "ช่องทางเงิน", "สาขา", "แผนก", "แหล่งที่มา", "อ้างอิง", "จำนวนเงิน", "รายละเอียด", "หมายเหตุ"];
  const rows = (data ?? []).map((entry) => {
    const amount = Number(entry.amount ?? 0);
    const received = entry.type === "income" ? amount : 0;
    const paid = entry.type === "expense" ? amount : 0;
    const net = entry.type === "expense" ? -amount : amount;
    const hasAttachment = Boolean(entry.has_attachment ?? entry.attachment_url);
    const branchName = entry.branch_id ? branchNameById.get(entry.branch_id) ?? entry.branch_id : "ส่วนกลาง";
    if (!isAccountingExport) return [entry.transaction_date, entry.due_date, label(CASH_FLOW_TYPE_LABEL, entry.type), label(CASH_FLOW_STATUS_LABEL, entry.status), entry.category, entry.payment_method, branchName, entry.department, label(CASH_FLOW_SOURCE_LABEL, entry.source), entry.source_ref_id, net, entry.description, entry.note];
    return [entry.transaction_date, entry.due_date, label(CASH_FLOW_TYPE_LABEL, entry.type), label(CASH_FLOW_STATUS_LABEL, entry.status), entry.category, entry.description, received, paid, net, entry.payment_method, branchName, entry.department, entry.source_ref_id, entry.attachment_url, hasAttachment ? "ใช่" : "ไม่ใช่", label(CASH_FLOW_DOCUMENT_TYPE_LABEL, entry.document_type), entry.accountant_note, label(CASH_FLOW_SOURCE_LABEL, entry.source), entry.source_ref_id, entry.created_by ? profileNameById.get(entry.created_by) ?? entry.created_by : "", entry.created_at, entry.updated_at];
  });
  const csv = [header, ...rows].map((row) => row.map(csvCell).join(",")).join("\n");
  return new NextResponse(`\uFEFF${csv}`, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="cash-flow${isAccountingExport ? "-accounting" : ""}-${isAllRange ? "all" : `${from}-${to}`}.csv"`,
    },
  });
}
