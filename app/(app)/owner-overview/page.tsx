import { redirect } from "next/navigation";
import { getCurrentProfile, isOwner } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { todayISO, moneyFormatter } from "@/lib/format";
import { MobileOwnerOverview } from "@/components/mobile-owner-overview";
import { buildMarinationSummaries, type ChickenPart, type MarinationStockMovement, type MarinationStockReset } from "@/lib/marination";

type Rollup = { branch_name: string | null; branch_code: string | null; total_sales: number | string | null };
type Note = { note: string | null };
type ChickenIncome = { amount: number | string | null; note: string | null; description: string | null };

const MARINATED_PRODUCT_COST_PER_KG = 2290 / 62.65;
const SHIPPING_ICE_PER_ORDER = 20;
const SHIPPING_BOX_PER_ORDER = 40;
const SHIPPING_TAPE_PER_ORDER = 10;
const SHIPPING_PACKING_LABOR_PER_ORDER = 50;
const SHIPPING_ORIGIN_PER_ORDER = 100;
const SHIPPING_AVERAGE_DESTINATION_PER_ORDER = 175;
const SHIPPING_AVERAGE_TOTAL_PER_ORDER = SHIPPING_ICE_PER_ORDER + SHIPPING_BOX_PER_ORDER + SHIPPING_TAPE_PER_ORDER + SHIPPING_PACKING_LABOR_PER_ORDER + SHIPPING_ORIGIN_PER_ORDER + SHIPPING_AVERAGE_DESTINATION_PER_ORDER;

function quantityFromChickenEntry(row: ChickenIncome) {
  const text = `${row.note ?? ""} ${row.description ?? ""}`;
  const match = text.match(/ปริมาณ\s*([\d,.]+)\s*กก\./u);
  if (!match) return 0;
  const value = Number(match[1].replace(/,/gu, ""));
  return Number.isFinite(value) && value > 0 ? value : 0;
}

export default async function OwnerOverviewPage() {
  const profile = await getCurrentProfile();
  if (!isOwner(profile)) redirect("/dashboard");
  const supabase = await createSupabaseServerClient();
  if (!supabase) redirect("/login?setup=supabase");

  const today = todayISO();
  const [{ data: sales }, { data: notes }, { data: chickenIncome }, { data: partsData }, { data: movementsData }, { data: resetData }] = await Promise.all([
    supabase.from("daily_report_rollups").select("branch_name,branch_code,total_sales").eq("report_date", today).returns<Rollup[]>(),
    supabase.from("daily_reports").select("note").eq("report_date", today).not("note", "is", null).returns<Note[]>(),
    supabase.from("cash_flow_entries").select("amount,note,description").eq("transaction_date", today).eq("type", "income").eq("status", "received").eq("category", "marinated_chicken_sales").returns<ChickenIncome[]>(),
    supabase.from("chicken_parts").select("id,name,sort_order,is_active").eq("is_active", true).order("sort_order", { ascending: true }).returns<ChickenPart[]>(),
    supabase.from("marination_stock_movements").select("id,movement_date,chicken_part_id,movement_type,quantity_kg,note,created_by,created_at,updated_at,is_voided,voided_at,voided_by,void_reason").eq("is_voided", false).lte("movement_date", today).order("movement_date", { ascending: true }).order("created_at", { ascending: true }).order("id", { ascending: true }).returns<MarinationStockMovement[]>(),
    supabase.from("marination_stock_resets").select("id,reset_date,branch_id,note,created_at,created_by,is_active").eq("is_active", true).lte("reset_date", today).order("reset_date", { ascending: false }).order("created_at", { ascending: false }).limit(1).returns<MarinationStockReset[]>(),
  ]);

  const totalSales = (sales ?? []).reduce((sum, row) => sum + Number(row.total_sales ?? 0), 0);
  const branchProblemCount = (notes ?? []).filter((row) => row.note?.trim()).length;
  const branchMetrics = (sales ?? []).slice(0, 4).map((row) => ({ label: row.branch_name || row.branch_code || "สาขา", value: moneyFormatter.format(Number(row.total_sales ?? 0)), status: "good" as const }));

  const chickenRows = chickenIncome ?? [];
  const chickenRevenue = chickenRows.reduce((sum, row) => sum + Number(row.amount ?? 0), 0);
  const classifiedChickenRows = chickenRows.filter((row) => quantityFromChickenEntry(row) > 0);
  const chickenQuantityKg = classifiedChickenRows.reduce((sum, row) => sum + quantityFromChickenEntry(row), 0);
  const chickenCost = chickenQuantityKg * MARINATED_PRODUCT_COST_PER_KG;
  const chickenShippingCost = classifiedChickenRows.length * SHIPPING_AVERAGE_TOTAL_PER_ORDER;
  const chickenEstimatedProfit = chickenRevenue - chickenCost - chickenShippingCost;
  const chickenUnclassifiedCount = chickenRows.length - classifiedChickenRows.length;

  const marination = buildMarinationSummaries(partsData ?? [], movementsData ?? [], today, resetData?.[0]?.reset_date ?? null);
  const marinationTotalStockKg = marination.totals.systemBalance;

  const sections = [
    { icon: "💰", title: "วันนี้", href: "/cash-flow", metrics: [
      { label: "ยอดขายหน้าร้าน", value: moneyFormatter.format(totalSales), status: "good" as const },
      { label: "เงินเข้า", value: "เปิดดู", status: "neutral" as const },
      { label: "เงินออก", value: "เปิดดู", status: "neutral" as const },
      { label: "กำไรหน้าร้านประมาณ", value: moneyFormatter.format(totalSales * 0.35), status: "good" as const },
    ]},
    { icon: "🍗", title: "ไก่หมัก", href: "/cash-flow?category=marinated_chicken_sales", metrics: [
      { label: "รายได้ขายไก่หมัก", value: moneyFormatter.format(chickenRevenue), status: "good" as const },
      { label: "ปริมาณที่ระบุกลุ่มแล้ว", value: `${chickenQuantityKg.toLocaleString("th-TH", { maximumFractionDigits: 3 })} กก.`, status: chickenUnclassifiedCount ? "watch" as const : "good" as const },
      { label: "กำไรหลังค่าขนส่งประมาณ", value: moneyFormatter.format(chickenEstimatedProfit), status: chickenUnclassifiedCount ? "watch" as const : "good" as const },
      { label: "รอระบุกลุ่ม", value: `${chickenUnclassifiedCount} รายการ`, status: chickenUnclassifiedCount ? "alert" as const : "good" as const },
    ]},
    { icon: "🏪", title: "ร้าน", href: "/owner-dashboard", metrics: branchMetrics.length ? branchMetrics : [{ label: "ยอดขายสาขา", value: "ยังไม่มีรายงาน", status: "watch" as const }, { label: "ปัญหา", value: `${branchProblemCount}`, status: branchProblemCount ? "alert" as const : "good" as const }] },
    { icon: "👥", title: "คน", href: "/reports", metrics: [{ label: "มาสาย / ขาด", value: "เปิดดู", status: "neutral" as const }, { label: "KPI / งานค้าง", value: "เปิดดู", status: "neutral" as const }] },
    { icon: "🏭", title: "โรงหมัก", href: "/marination", metrics: [{ label: "สต็อกไก่รวมทุกชิ้นส่วน", value: `${marinationTotalStockKg.toLocaleString("th-TH", { maximumFractionDigits: 3 })} กก.`, status: marinationTotalStockKg > 0 ? "good" as const : "watch" as const }, { label: "ผลิต / ส่ง", value: "เปิดดู", status: "neutral" as const }] },
    { icon: "🐔", title: "แฟรนไชส์", href: "/leads", metrics: [{ label: "ผู้สมัครใหม่", value: "เปิดดู", status: "neutral" as const }, { label: "รอพิจารณา / ชำระ", value: "เปิดดู", status: "neutral" as const }] },
  ];

  return <main className="mx-auto w-full max-w-2xl space-y-4 px-3 pb-10 sm:px-5"><div className="px-1 pt-1"><p className="text-sm font-bold text-black/50">OWNER • วันนี้</p><h1 className="text-3xl font-black leading-tight">ภาพรวมร้าน</h1></div><MobileOwnerOverview sections={sections} /></main>;
}
