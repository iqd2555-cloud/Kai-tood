import { NextResponse } from "next/server";
import { getCurrentProfile } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase-server";

function csvCell(value: unknown) {
  return `"${String(value ?? "").replaceAll('"', '""')}"`;
}

export async function GET(request: Request) {
  const profile = await getCurrentProfile();
  if (profile.role !== "owner") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { searchParams } = new URL(request.url);
  const from = searchParams.get("from") ?? new Date().toISOString().slice(0, 10);
  const to = searchParams.get("to") ?? from;
  const supabase = await createSupabaseServerClient();
  if (!supabase) return NextResponse.json({ error: "Supabase is not configured" }, { status: 500 });
  const { data, error } = await supabase
    .from("cash_flow_entries")
    .select("transaction_date,due_date,type,status,category,description,amount,payment_method,department,source,source_ref_id,note, branches(name)")
    .gte("transaction_date", from)
    .lte("transaction_date", to)
    .order("transaction_date", { ascending: true });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const header = ["วันที่ทำรายการ", "วันที่ครบกำหนด", "ประเภท", "สถานะ", "หมวดหมู่", "รายละเอียด", "จำนวนเงิน", "ช่องทางเงิน", "สาขา/หน่วยงาน", "แหล่งที่มา", "อ้างอิง", "หมายเหตุ"];
  const rows = (data ?? []).map((entry) => [entry.transaction_date, entry.due_date, entry.type, entry.status, entry.category, entry.description, entry.amount, entry.payment_method, (() => { const branch = entry.branches as { name?: string } | { name?: string }[] | null; return (Array.isArray(branch) ? branch[0]?.name : branch?.name) ?? entry.department ?? ""; })(), entry.source, entry.source_ref_id, entry.note]);
  const csv = [header, ...rows].map((row) => row.map(csvCell).join(",")).join("\n");
  return new NextResponse(`\uFEFF${csv}`, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="cash-flow-${from}-${to}.csv"`,
    },
  });
}
