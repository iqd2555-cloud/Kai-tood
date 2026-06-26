import { NextResponse } from "next/server";
import { getCurrentProfile } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase-server";

function csvCell(value: unknown) {
  return `"${String(value ?? "").replaceAll('"', '""')}"`;
}

function relationName(value: unknown) {
  return (Array.isArray(value) ? value[0]?.name : (value as { name?: string } | null)?.name) ?? "";
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
    .select("transaction_date,due_date,direction,status,description,amount,source,source_ref,note, branches(name), cash_flow_categories(name), cash_flow_money_channels(name)")
    .gte("transaction_date", from)
    .lte("transaction_date", to)
    .order("transaction_date", { ascending: true });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const header = ["วันที่ทำรายการ", "วันที่ครบกำหนด", "ประเภท", "สถานะ", "หมวดหมู่", "รายละเอียด", "จำนวนเงิน", "ช่องทางเงิน", "สาขา/หน่วยงาน", "แหล่งที่มา", "อ้างอิง", "หมายเหตุ"];
  const rows = (data ?? []).map((entry) => [entry.transaction_date, entry.due_date, entry.direction, entry.status, relationName(entry.cash_flow_categories), entry.description, entry.amount, relationName(entry.cash_flow_money_channels), relationName(entry.branches), entry.source, entry.source_ref, entry.note]);
  const csv = [header, ...rows].map((row) => row.map(csvCell).join(",")).join("\n");
  return new NextResponse(`\uFEFF${csv}`, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="cash-flow-${from}-${to}.csv"`,
    },
  });
}
