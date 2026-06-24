import { redirect } from "next/navigation";
import { getCurrentProfile, isOwner } from "@/lib/auth";
import { canUseStaffCounterOrder } from "@/lib/counter-access";
import { formatThaiDate, ingredientKgFormatter, moneyFormatter, numberFormatter, todayISO, daysAgoISO } from "@/lib/format";
import { calculateBranchDailyInsight } from "@/lib/daily-insights";
import { InsightAlertBanner, type InsightAlertIssue, type InsightAlertStatus } from "@/components/insight-alert-banner";
import { calculateOverallDashboardSummary, normalizeDashboardReports } from "@/lib/dashboard/inventory-summary";
import { isReportableBranch } from "@/lib/branches";
import { createSupabaseServerClient } from "@/lib/supabase-server";

type ProfitRow = Record<string, string | number | null>;
type MetricKey = "totalSales" | "chickenCost" | "otherExpenses";
type BranchNoteRow = {
  report_date: string;
  branch_id: string;
  note: string | null;
  branches: { name: string; code: string | null; is_active?: boolean | null } | null;
};

type OwnerDashboardSearchParams = Promise<{ date?: string }>;
type InsightBranchRow = { id: string; name: string; code: string | null; is_active?: boolean | null };
type InsightReportRow = {
  id: string;
  report_date: string;
  branch_id: string;
  cash_sales: number | string | null;
  transfer_sales: number | string | null;
  total_sales: number | string | null;
  opening_original_chicken: number | string | null;
  opening_spicy_chicken: number | string | null;
  opening_ground_chicken: number | string | null;
  opening_drumstick: number | string | null;
  opening_offal: number | string | null;
  opening_chicken_skin: number | string | null;
  opening_sticky_rice: number | string | null;
  received_original_chicken: number | string | null;
  received_spicy_chicken: number | string | null;
  received_ground_chicken: number | string | null;
  received_drumstick: number | string | null;
  received_offal: number | string | null;
  received_chicken_skin: number | string | null;
  received_chicken: number | string | null;
  used_bl: number | string | null;
  used_bb: number | string | null;
  used_chopped_chicken: number | string | null;
  used_drumstick: number | string | null;
  used_offal: number | string | null;
  used_chicken_skin: number | string | null;
  used_sticky_rice: number | string | null;
  remaining_chicken: number | string | null;
  remaining_original_chicken: number | string | null;
  remaining_spicy_chicken: number | string | null;
  remaining_ground_chicken: number | string | null;
  remaining_drumstick: number | string | null;
  remaining_offal: number | string | null;
  remaining_chicken_skin: number | string | null;
  remaining_sticky_rice: number | string | null;
  received_sticky_rice: number | string | null;
  opening_oil: number | string | null;
  received_oil: number | string | null;
  remaining_oil: number | string | null;
  order_original_chicken: number | string | null;
  order_spicy_chicken: number | string | null;
  order_offal: number | string | null;
  order_chopped_chicken: number | string | null;
  order_drumstick: number | string | null;
  order_chicken_skin: number | string | null;
  order_sticky_rice: number | string | null;
  order_oil: number | string | null;
  order_palm_sugar: number | string | null;
  order_other_items: { name?: string; amount?: number | string }[] | null;
  requested_items: string | null;
  updated_at: string | null;
  created_at: string | null;
};

const CHICKEN_COST_PER_KG = 65;
const ESTIMATED_PROFIT_RATE = 0.35;

function estimatedProfit(totalSales: number) {
  return totalSales * ESTIMATED_PROFIT_RATE;
}

function toNumber(value: string | number | null | undefined) {
  if (typeof value === "number") return value;
  if (typeof value === "string" && value.trim()) return Number(value) || 0;
  return 0;
}

function pickNumber(row: ProfitRow, keys: string[]) {
  for (const key of keys) {
    const value = row[key];
    if (typeof value === "number") return value;
    if (typeof value === "string" && value.trim()) return Number(value) || 0;
  }
  return 0;
}

function pickDate(row: ProfitRow) {
  const value = row.report_date ?? row.date ?? row.sale_date;
  return typeof value === "string" ? value : "";
}

function pickBranchName(row: ProfitRow) {
  const value = row.branch_name ?? row.branch ?? row.branch_code;
  return typeof value === "string" && value.trim() ? value : "ไม่ระบุสาขา";
}

function pctChange(current: number, previous: number) {
  if (previous === 0 && current === 0) return 0;
  if (previous === 0) return 100;
  return ((current - previous) / Math.abs(previous)) * 100;
}

function rangeSum<T extends { date: string } & Record<string, string | number>>(rows: T[], start: string, end: string, field: keyof T) {
  return rows
    .filter((row) => row.date >= start && row.date <= end)
    .reduce((sum, row) => sum + (typeof row[field] === "number" ? (row[field] as number) : 0), 0);
}

function barWidth(value: number, max: number) {
  if (max <= 0) return 0;
  return Math.max(8, Math.round((value / max) * 100));
}

export default async function OwnerDashboardPage({ searchParams }: { searchParams: OwnerDashboardSearchParams }) {
  const profile = await getCurrentProfile();
  if (canUseStaffCounterOrder(profile)) redirect("/counter-orders");
  if (!isOwner(profile)) redirect("/dashboard");

  const supabase = await createSupabaseServerClient();
  if (!supabase) redirect("/login?setup=supabase");

  const resolvedSearchParams = await searchParams;
  const today = todayISO();
  const insightDate = /^\d{4}-\d{2}-\d{2}$/.test(resolvedSearchParams.date ?? "") ? resolvedSearchParams.date! : today;

  const { data, error } = await supabase.from("owner_profit_dashboard").select("*").returns<ProfitRow[]>();
  if (error) return <div className="rounded-2xl bg-red-50 p-4 font-bold text-red-900">โหลดข้อมูล owner_profit_dashboard ไม่สำเร็จ: {error.message}</div>;

  const { data: rawBranchNotes, error: branchNotesError } = await supabase
    .from("daily_reports")
    .select("report_date,branch_id,note,branches(name,code,is_active)")
    .not("note", "is", null)
    .returns<BranchNoteRow[]>();
  if (branchNotesError) {
    return <div className="rounded-2xl bg-red-50 p-4 font-bold text-red-900">โหลดหมายเหตุสาขาไม่สำเร็จ: {branchNotesError.message}</div>;
  }

  const branchNotes = (rawBranchNotes ?? [])
    .map((item) => ({
      reportDate: item.report_date,
      branchId: item.branch_id,
      branchName: item.branches?.name?.trim() || "ไม่ระบุสาขา",
      note: item.note?.trim() ?? "",
    }))
    .filter((item) => item.note.length > 0 && isReportableBranch(rawBranchNotes?.find((note) => note.branch_id === item.branchId)?.branches))
    .sort((a, b) => b.reportDate.localeCompare(a.reportDate));

  if (process.env.NODE_ENV === "development") {
    console.info("owner_summary_branch_debug", {
      selectedBranchId: "all",
      reportBranchId: [...new Set((rawBranchNotes ?? []).map((report) => report.branch_id))],
    });
  }

  const rows = (data ?? [])
    .filter((row) => isReportableBranch({ name: pickBranchName(row), code: typeof row.branch_code === "string" ? row.branch_code : null }))
    .map((row) => {
    const totalSales = pickNumber(row, ["total_sales", "sales_total", "total_revenue", "revenue"]);
    const chickenCostRaw = pickNumber(row, ["chicken_cost", "cost_chicken", "total_chicken_cost"]);
    const chickenKg = pickNumber(row, ["chicken_kg", "total_chicken_kg", "raw_chicken_kg"]);
    const chickenCost = chickenCostRaw > 0 ? chickenCostRaw : chickenKg * CHICKEN_COST_PER_KG;
    const otherExpenses = pickNumber(row, ["other_expenses", "expense_other", "operating_expenses"]);

    return {
      date: pickDate(row),
      branchName: pickBranchName(row),
      totalSales,
      chickenKg,
      chickenCost,
      otherExpenses,
      grossProfit: totalSales - chickenCost - otherExpenses,
    };
  });

  const yesterday = daysAgoISO(1);
  const sevenStart = daysAgoISO(6);
  const prevSevenStart = daysAgoISO(13);
  const prevSevenEnd = daysAgoISO(7);
  const monthPrefix = today.slice(0, 7);
  const monthStart = `${monthPrefix}-01`;
  const prevMonthDate = new Date(`${monthStart}T00:00:00Z`);
  prevMonthDate.setUTCMonth(prevMonthDate.getUTCMonth() - 1);
  const prevMonthPrefix = prevMonthDate.toISOString().slice(0, 7);

  const monthRows = rows.filter((row) => row.date.startsWith(monthPrefix));
  const prevMonthRows = rows.filter((row) => row.date.startsWith(prevMonthPrefix));
  const dayOfMonth = Number(today.slice(8, 10));
  const prevMonthMtd = prevMonthRows.filter((row) => Number(row.date.slice(8, 10)) <= dayOfMonth);

  const sumMetric = (items: typeof rows, key: MetricKey | "grossProfit" | "chickenKg") =>
    items.reduce((acc, item) => acc + (typeof item[key] === "number" ? item[key] : 0), 0);

  const salesToday = rangeSum(rows, today, today, "totalSales");
  const sales7 = rangeSum(rows, sevenStart, today, "totalSales");
  const salesMonth = sumMetric(monthRows, "totalSales");
  const estimatedProfitToday = estimatedProfit(salesToday);
  const estimatedProfit7 = estimatedProfit(sales7);
  const estimatedProfitMonth = estimatedProfit(salesMonth);

  const chickenKgToday = rangeSum(rows, today, today, "chickenKg");
  const chickenKg7 = rangeSum(rows, sevenStart, today, "chickenKg");
  const chickenKgMonth = sumMetric(monthRows, "chickenKg");

  const chickenCostToday = rangeSum(rows, today, today, "chickenCost");
  const chickenCost7 = rangeSum(rows, sevenStart, today, "chickenCost");
  const chickenCostMonth = sumMetric(monthRows, "chickenCost");

  const otherToday = rangeSum(rows, today, today, "otherExpenses");
  const other7 = rangeSum(rows, sevenStart, today, "otherExpenses");
  const otherMonth = sumMetric(monthRows, "otherExpenses");

  const gpToday = salesToday - chickenCostToday - otherToday;
  const gp7 = sales7 - chickenCost7 - other7;
  const gpMonth = salesMonth - chickenCostMonth - otherMonth;

  const gpPrevDay = rangeSum(rows, yesterday, yesterday, "totalSales") - rangeSum(rows, yesterday, yesterday, "chickenCost") - rangeSum(rows, yesterday, yesterday, "otherExpenses");
  const gpPrev7 = rangeSum(rows, prevSevenStart, prevSevenEnd, "totalSales") - rangeSum(rows, prevSevenStart, prevSevenEnd, "chickenCost") - rangeSum(rows, prevSevenStart, prevSevenEnd, "otherExpenses");
  const gpPrevMonthMtd = sumMetric(prevMonthMtd, "totalSales") - sumMetric(prevMonthMtd, "chickenCost") - sumMetric(prevMonthMtd, "otherExpenses");

  const salesLine = Object.values(rows.reduce<Record<string, { date: string; value: number }>>((acc, row) => {
    if (row.date < sevenStart || row.date > today) return acc;
    acc[row.date] ??= { date: row.date, value: 0 };
    acc[row.date].value += row.totalSales;
    return acc;
  }, {})).sort((a, b) => a.date.localeCompare(b.date));

  const usageBar = [
    { label: "วันนี้", kg: chickenKgToday, other: otherToday },
    { label: "7 วัน", kg: chickenKg7, other: other7 },
    { label: "เดือนนี้", kg: chickenKgMonth, other: otherMonth },
  ];

  const branchRanking = Object.values(rows.reduce<Record<string, { branchName: string; totalSales: number; grossProfit: number }>>((acc, row) => {
    acc[row.branchName] ??= { branchName: row.branchName, totalSales: 0, grossProfit: 0 };
    acc[row.branchName].totalSales += row.totalSales;
    acc[row.branchName].grossProfit += row.grossProfit;
    return acc;
  }, {})).sort((a, b) => b.grossProfit - a.grossProfit);


  const { data: insightBranches, error: insightBranchesError } = await supabase
    .from("branches")
    .select("id,name,code,is_active")
    .eq("is_active", true)
    .order("name")
    .returns<InsightBranchRow[]>();
  const activeInsightBranchIds = (insightBranches ?? []).filter(isReportableBranch).map((branch) => branch.id);

  const insightReportsQuery = supabase
    .from("daily_reports")
    .select("id,report_date,branch_id,cash_sales,transfer_sales,total_sales,opening_original_chicken,opening_spicy_chicken,opening_ground_chicken,opening_drumstick,opening_offal,opening_chicken_skin,opening_sticky_rice,received_original_chicken,received_spicy_chicken,received_ground_chicken,received_drumstick,received_offal,received_chicken_skin,received_chicken,received_sticky_rice,used_bl,used_bb,used_chopped_chicken,used_drumstick,used_offal,used_chicken_skin,used_sticky_rice,remaining_chicken,remaining_original_chicken,remaining_spicy_chicken,remaining_ground_chicken,remaining_drumstick,remaining_offal,remaining_chicken_skin,remaining_sticky_rice,opening_oil,received_oil,remaining_oil,order_original_chicken,order_spicy_chicken,order_offal,order_chopped_chicken,order_drumstick,order_chicken_skin,order_sticky_rice,order_oil,order_palm_sugar,order_other_items,requested_items,updated_at,created_at")
    .eq("report_date", insightDate)
    .order("updated_at", { ascending: false })
    .order("created_at", { ascending: false });

  if (activeInsightBranchIds.length > 0) insightReportsQuery.in("branch_id", activeInsightBranchIds);
  const { data: insightReports, error: insightReportsError } = await insightReportsQuery.returns<InsightReportRow[]>();

  const reportCountsByBranch = (insightReports ?? []).reduce<Map<string, number>>((acc, report) => {
    acc.set(report.branch_id, (acc.get(report.branch_id) ?? 0) + 1);
    return acc;
  }, new Map());
  const duplicateReportBranches = new Set([...reportCountsByBranch.entries()].filter(([, count]) => count > 1).map(([branchId]) => branchId));
  const branchDashboardSummaries = normalizeDashboardReports(insightReports ?? [], insightBranches ?? [], insightDate);
  const reportsByBranch = (insightReports ?? []).reduce<Map<string, InsightReportRow>>((acc, report) => {
    const current = acc.get(report.branch_id);
    const reportTime = String(report.updated_at || report.created_at || "");
    const currentTime = String(current?.updated_at || current?.created_at || "");
    if (!current || reportTime > currentTime) acc.set(report.branch_id, report);
    return acc;
  }, new Map());
  const overallSummary = calculateOverallDashboardSummary(branchDashboardSummaries, insightDate);
  const insightBranchCards = overallSummary.branchSummaries.map((summary) => {
    const report = reportsByBranch.get(summary.branchId);
    const base = {
      branchId: summary.branchId,
      branchName: summary.branchName,
      totalSales: summary.totalSales,
      chickenReceivedKg: summary.chickenReceivedKg,
      chickenUsedKg: summary.chickenUsedByStockKg,
      chickenRemainingKg: summary.chickenRemainingKg,
      stickyRiceUsedKg: summary.stickyRiceUsedByStockKg,
      stickyRiceRemainingKg: summary.stickyRiceRemainingKg,
      hasReport: summary.hasReport,
      report,
      summary,
    };
    return { ...base, insight: calculateBranchDailyInsight(base) };
  });
  const insightTotals = {
    totalSales: overallSummary.totalSales,
    chickenReceivedKg: overallSummary.chickenReceivedKg,
    chickenUsedKg: overallSummary.chickenUsedByStockKg,
    chickenRemainingKg: overallSummary.chickenRemainingKg,
    stickyRiceUsedKg: overallSummary.stickyRiceUsedByStockKg,
    salesPerChickenKg: overallSummary.salesPerChickenKg,
  };

  if (process.env.NODE_ENV === "development") {
    console.log("ingredient summary debug", {
      selectedDate: insightDate,
      branchSummaries: branchDashboardSummaries,
      overallSummary,
    });
  }
  const abnormalBranches = insightBranchCards.filter((item) => item.insight.status === "check");
  const missingBranches = insightBranchCards.filter((item) => item.insight.status === "missing");
  const criticalFlagKeywords = ["ไม่สัมพันธ์กัน", "ติดลบ", "ยอดขายมากกว่า 0", "ใช้ไก่เยอะผิดปกติ", "ไม่มีใช้ไก่เลย"];
  const getIssueStatus = (messages: string[]): InsightAlertStatus => messages.some((message) => criticalFlagKeywords.some((keyword) => message.includes(keyword))) ? "critical" : "warning";
  const alertIssues: InsightAlertIssue[] = [
    ...missingBranches.map((item) => ({
      id: `missing-${item.branchId}`,
      branchName: item.branchName,
      message: "ไม่มีการส่งรายงานจากสาขา",
      status: "missing" as const,
    })),
    ...abnormalBranches.map((item) => ({
      id: `abnormal-${item.branchId}`,
      branchName: item.branchName,
      message: item.insight.abnormalFlags.join(" / "),
      status: getIssueStatus(item.insight.abnormalFlags),
    })),
  ];
  const insightAlertStatus: InsightAlertStatus = alertIssues.some((issue) => issue.status === "critical") ? "critical" : alertIssues.some((issue) => issue.status === "warning") ? "warning" : alertIssues.some((issue) => issue.status === "missing") ? "missing" : "normal";
  const insightAlertTitle = alertIssues.length > 0 ? `ผลการตรวจสอบ: พบจุดที่ต้องตรวจสอบ ${alertIssues.length} สาขา` : "ผลการตรวจสอบ: ไม่พบความผิดปกติ";
  const insightAlertSummary = alertIssues.length > 0 ? "กรุณาตรวจสอบรายการสาขาด้านล่าง โดยแถบสีจะแยกระดับสถานะให้ชัดเจน" : "ทุกสาขาที่มีรายงานวันนี้อยู่ในเกณฑ์ปกติ และสรุปภาพรวมรวมเฉพาะสาขา active ที่มีรายงาน";
  const tomorrowTasks = insightBranchCards.flatMap((item) => {
    const report = item.report;
    if (!report) return [];
    const standardItems = [
      ["ไก่ BL", report.order_original_chicken], ["ไก่ BB", report.order_spicy_chicken], ["เครื่องใน", report.order_offal], ["ไก่สับ", report.order_chopped_chicken], ["น่องไก่", report.order_drumstick], ["หนังไก่", report.order_chicken_skin], ["ข้าวเหนียว", report.order_sticky_rice], ["น้ำมัน", report.order_oil], ["น้ำตาลปี๊บ", report.order_palm_sugar],
    ].filter(([, amount]) => toNumber(amount) > 0).map(([name, amount]) => `${item.branchName} สั่ง${name} ${numberFormatter.format(toNumber(amount))}`);
    const otherItems = Array.isArray(report.order_other_items) ? report.order_other_items.filter((x) => toNumber(x.amount) > 0 && x.name).map((x) => `${item.branchName} สั่ง${x.name} ${numberFormatter.format(toNumber(x.amount))}`) : [];
    const requested = report.requested_items?.trim() ? [`${item.branchName}: ${report.requested_items.trim()}`] : [];
    return [...standardItems, ...otherItems, ...requested];
  });

  const maxSalesLine = Math.max(...salesLine.map((x) => x.value), 0);
  const maxUsageBar = Math.max(...usageBar.map((x) => x.kg), 0);

  return (
    <div className="space-y-4 pb-6">
      <section className="rounded-3xl bg-[#111111] p-5 text-white shadow-xl">
        <p className="text-sm font-bold text-[#E60012]">รายงาน Owner</p>
        <h1 className="mt-1 text-2xl font-black">ภาพรวมยอดขาย วัตถุดิบ และกำไร</h1>
      </section>


      <section className="rounded-3xl border border-[#E60012]/20 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm font-black text-[#E60012]">Phase 1</p>
            <h2 className="text-xl font-black">สรุปรายงานอัจฉริยะ</h2>
            <p className="mt-1 text-xs font-bold text-black/60">ยอดไก่รับเข้า ใช้ไปตามสต๊อก และคงเหลือ คำนวณจากสูตรเดียวกับรายละเอียดสาขาเท่านั้น</p>
          </div>
          <form className="flex flex-wrap items-center gap-2" action="/owner-dashboard">
            <input name="date" type="date" defaultValue={insightDate} className="h-11 rounded-2xl border border-black/10 bg-white px-3 text-sm font-bold" />
            <button className="h-11 rounded-2xl bg-black px-4 text-sm font-black text-white" type="submit">ดูรายงาน</button>
            <a className="flex h-11 items-center rounded-2xl bg-[#E60012] px-4 text-sm font-black text-white" href={`/owner-dashboard?date=${today}`}>วันนี้</a>
          </form>
        </div>

        {(insightBranchesError || insightReportsError) ? (
          <div className="mt-4 rounded-2xl bg-yellow-50 p-3 text-sm font-bold text-yellow-900">ยังโหลดข้อมูลสรุปรายงานอัจฉริยะได้ไม่ครบ แต่หน้า Dashboard ยังใช้งานได้: {insightBranchesError?.message || insightReportsError?.message}</div>
        ) : null}

        <article className="mt-4 rounded-3xl bg-[#111111] p-4 text-white">
          <p className="text-sm font-bold text-white/70">รายงานประจำวันที่ {formatThaiDate(insightDate)}</p>
          <h3 className="mt-1 text-lg font-black">ภาพรวมทุกสาขา</h3>
          <div className="mt-3 grid grid-cols-2 gap-2 text-sm md:grid-cols-3">
            <div className="rounded-2xl bg-white/10 p-3"><p className="text-white/60">ยอดขายรวม</p><p className="font-black">{moneyFormatter.format(insightTotals.totalSales)}</p></div>
            <div className="rounded-2xl bg-white/10 p-3"><p className="text-white/60">ไก่รับเข้า</p><p className="font-black">{ingredientKgFormatter.format(insightTotals.chickenReceivedKg)} กก.</p></div>
            <div className="rounded-2xl bg-white/10 p-3"><p className="text-white/60">ไก่ใช้ไปตามสต๊อก</p><p className="font-black">{ingredientKgFormatter.format(insightTotals.chickenUsedKg)} กก.</p></div>
            <div className="rounded-2xl bg-white/10 p-3"><p className="text-white/60">ไก่คงเหลือรวม</p><p className="font-black">{ingredientKgFormatter.format(insightTotals.chickenRemainingKg)} กก.</p></div>
            <div className="rounded-2xl bg-white/10 p-3"><p className="text-white/60">ข้าวเหนียวใช้ไปตามสต๊อก</p><p className="font-black">{ingredientKgFormatter.format(insightTotals.stickyRiceUsedKg)} กก.</p></div>
            <div className="rounded-2xl bg-white/10 p-3"><p className="text-white/60">ยอดขายต่อไก่ 1 กก.</p><p className="font-black">{insightTotals.salesPerChickenKg === null ? "ยังไม่มีข้อมูล" : moneyFormatter.format(insightTotals.salesPerChickenKg)}</p></div>
          </div>
          <InsightAlertBanner
            className="mt-3"
            title={insightAlertTitle}
            status={insightAlertStatus}
            summary={insightAlertSummary}
            helperText={missingBranches.length > 0 ? `ยังไม่มีรายงาน: ${missingBranches.map((item) => item.branchName).join(", ")}` : undefined}
            issues={alertIssues}
          />
          {duplicateReportBranches.size > 0 ? <p className="mt-3 rounded-2xl bg-orange-50 p-3 text-sm font-bold text-orange-900">พบรายงานซ้ำในวันเดียวกัน: {insightBranchCards.filter((item) => duplicateReportBranches.has(item.branchId)).map((item) => item.branchName).join(", ")} — ใช้รายการล่าสุดในการคำนวณ</p> : null}
        </article>

        <div className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-2">
          {insightBranchCards.map((item) => {
            const branchIssueStatus: InsightAlertStatus = item.insight.status === "check" ? getIssueStatus(item.insight.abnormalFlags) : item.insight.status === "missing" ? "missing" : "normal";
            const badgeClass = branchIssueStatus === "normal" ? "border-[#86EFAC] bg-[#DFF5E3] text-[#166534]" : branchIssueStatus === "missing" ? "border-[#D1D5DB] bg-[#F3F4F6] text-[#333333]" : branchIssueStatus === "warning" ? "border-[#E0A800] bg-[#FFD54A] text-[#111111]" : "border-[#D9363E] bg-[#FF4D4F] text-white";
            const cardClass = branchIssueStatus === "normal" ? "border-[#86EFAC] bg-[#F7FFF8]" : branchIssueStatus === "missing" ? "border-[#D1D5DB] bg-[#F3F4F6]" : branchIssueStatus === "warning" ? "border-[#E0A800] bg-[#FFD54A]" : "border-[#D9363E] bg-[#FF4D4F] text-white";
            const mutedTextClass = branchIssueStatus === "critical" ? "text-white/85" : "text-black/60";
            const badgeText = branchIssueStatus === "normal" ? "ปกติ" : branchIssueStatus === "missing" ? "ไม่มีรายงาน" : branchIssueStatus === "warning" ? "ต้องตรวจสอบ" : "ผิดปกติ";
            return (
              <article key={item.branchId} className={`rounded-3xl border-2 p-4 shadow-sm ${cardClass}`}>
                <div className="flex items-start justify-between gap-2">
                  <h3 className="text-base font-black">สาขา: {item.branchName}</h3>
                  <span className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-black shadow-sm ${badgeClass}`}>{badgeText}</span>
                </div>
                <div className="mt-3 grid grid-cols-1 gap-2 text-sm font-bold sm:grid-cols-2">
                  <p>ยอดขาย: {moneyFormatter.format(item.totalSales)}</p><p>ไก่รับเข้า: {ingredientKgFormatter.format(item.chickenReceivedKg)} กก.</p>
                  <p>ไก่ใช้ไปตามสต๊อก: {ingredientKgFormatter.format(item.chickenUsedKg)} กก.</p><p>ไก่คงเหลือรวม: {ingredientKgFormatter.format(item.chickenRemainingKg)} กก.</p>
                  <p>ข้าวเหนียวใช้ไปตามสต๊อก: {ingredientKgFormatter.format(item.stickyRiceUsedKg)} กก.</p><p>ยอดขาย/ไก่ 1 กก.: {item.summary.salesPerChickenKg === null ? "ยังไม่มีข้อมูล" : moneyFormatter.format(item.summary.salesPerChickenKg)}</p>
                  <p>ไก่ กก.ละ: {item.insight.chickenPacksPerKg === null ? "ยังไม่มีข้อมูล" : `${numberFormatter.format(item.insight.chickenPacksPerKg)} ห่อ`}</p><p>ข้าว กก.ละ: {item.insight.stickyRicePacksPerKg === null ? "ยังไม่มีข้อมูล" : `${numberFormatter.format(item.insight.stickyRicePacksPerKg)} ห่อ`}</p>
                </div>
                {item.insight.abnormalFlags.length > 0 ? <ul className={`mt-3 rounded-2xl border-2 p-3 pl-8 text-sm font-black leading-relaxed ${branchIssueStatus === "critical" ? "border-white/50 bg-white/15 text-white" : "border-[#E0A800] bg-[#FFF3BF] text-[#111111]"}`}>{item.insight.abnormalFlags.map((flag) => <li key={flag}>{flag}</li>)}</ul> : <p className="mt-3 rounded-2xl border-2 border-[#86EFAC] bg-[#DFF5E3] p-3 text-sm font-black text-[#166534]">ไม่พบจุดผิดปกติ</p>}
                {item.insight.recommendations.length > 0 ? <p className={`mt-2 text-xs font-bold ${mutedTextClass}`}>คำแนะนำ: {item.insight.recommendations.join(" / ")}</p> : null}
              </article>
            );
          })}
        </div>

        <article className="mt-4 rounded-3xl border border-black/10 bg-[#FFF7D6] p-4">
          <h3 className="text-base font-black">สิ่งที่ต้องทำพรุ่งนี้</h3>
          {tomorrowTasks.length > 0 ? <ul className="mt-2 list-disc space-y-1 pl-5 text-sm font-bold">{tomorrowTasks.map((task, index) => <li key={`${task}-${index}`}>{task}</li>)}</ul> : <p className="mt-2 text-sm font-bold text-black/60">ยังไม่มีรายการที่ต้องเตรียมสำหรับพรุ่งนี้</p>}
        </article>
      </section>

      <section className="rounded-3xl bg-white p-4 shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-black">กำไรประมาณการ</h2>
            <p className="mt-1 text-xs font-bold text-black/60">คำนวณจากยอดขายรวม × 0.35 แบบ Real-time</p>
          </div>
          <span className="rounded-full bg-[#E60012] px-3 py-1 text-xs font-black text-white">Owner เท่านั้น</span>
        </div>
        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
          <article className="rounded-3xl border border-red-600/20 bg-[#E60012] p-5 text-white shadow-sm">
            <p className="text-sm font-black opacity-70">กำไรประมาณการวันนี้</p>
            <p className="mt-2 text-3xl font-black tracking-tight">{moneyFormatter.format(estimatedProfitToday)}</p>
          </article>
          <article className="rounded-3xl border border-black/10 bg-[#111111] p-5 text-white shadow-sm">
            <p className="text-sm font-black text-white/70">กำไรประมาณการ 7 วัน</p>
            <p className="mt-2 text-3xl font-black tracking-tight text-[#E60012]">{moneyFormatter.format(estimatedProfit7)}</p>
          </article>
          <article className="rounded-3xl border border-black/10 bg-white p-5 text-black shadow-sm">
            <p className="text-sm font-black opacity-70">กำไรประมาณการเดือนนี้</p>
            <p className="mt-2 text-3xl font-black tracking-tight">{moneyFormatter.format(estimatedProfitMonth)}</p>
          </article>
        </div>
        <p className="mt-3 text-xs font-bold text-black/60">* คำนวณจากกำไรเฉลี่ย 7 บาทต่อห่อ (ประมาณการ)</p>
      </section>

      <section className="rounded-3xl bg-white p-4 shadow-sm">
        <h2 className="text-lg font-black">หมวด 1: ยอดขาย</h2>
        <div className="mt-3 grid grid-cols-1 gap-2">
          <div className="rounded-2xl bg-black/5 p-3 text-sm font-bold">วันนี้: {moneyFormatter.format(salesToday)}</div>
          <div className="rounded-2xl bg-black/5 p-3 text-sm font-bold">7 วัน: {moneyFormatter.format(sales7)}</div>
          <div className="rounded-2xl bg-black/5 p-3 text-sm font-bold">เดือนนี้: {moneyFormatter.format(salesMonth)}</div>
        </div>
        <div className="mt-3 space-y-2">
          <p className="text-xs font-bold text-black/60">กราฟเส้น (ย้อนหลัง 7 วัน)</p>
          {salesLine.map((item) => (
            <div key={item.date}>
              <div className="mb-1 flex justify-between text-xs font-bold"><span>{formatThaiDate(item.date)}</span><span>{moneyFormatter.format(item.value)}</span></div>
              <div className="h-2 rounded-full bg-black/10"><div className="h-2 rounded-full bg-[#E60012]" style={{ width: `${barWidth(item.value, maxSalesLine)}%` }} /></div>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-3xl bg-white p-4 shadow-sm">
        <h2 className="text-lg font-black">หมวด 2: วัตถุดิบใช้ไปตามสต๊อก</h2>
        <div className="mt-3 grid grid-cols-1 gap-2">
          <div className="rounded-2xl bg-black/5 p-3 text-sm font-bold">รวมกิโลไก่ (เดือนนี้): {chickenKgMonth.toFixed(2)} กก.</div>
          <div className="rounded-2xl bg-black/5 p-3 text-sm font-bold">ต้นทุนไก่ (65 บาท/กก.): {moneyFormatter.format(chickenCostMonth)}</div>
          <div className="rounded-2xl bg-black/5 p-3 text-sm font-bold">ค่าใช้จ่ายอื่น (เดือนนี้): {moneyFormatter.format(otherMonth)}</div>
        </div>
        <div className="mt-3 space-y-2">
          <p className="text-xs font-bold text-black/60">กราฟแท่ง (กิโลไก่)</p>
          {usageBar.map((item) => (
            <div key={item.label}>
              <div className="mb-1 flex justify-between text-xs font-bold"><span>{item.label}</span><span>{item.kg.toFixed(2)} กก.</span></div>
              <div className="h-2 rounded-full bg-black/10"><div className="h-2 rounded-full bg-black" style={{ width: `${barWidth(item.kg, maxUsageBar)}%` }} /></div>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-3xl bg-white p-4 shadow-sm">
        <h2 className="text-lg font-black">หมวด 3: กำไรขั้นต้น</h2>
        <p className="mt-1 text-xs font-bold text-black/60">สูตร: ยอดขาย - ต้นทุนไก่ - ค่าใช้จ่ายอื่น</p>
        <div className="mt-3 space-y-2 text-sm font-bold">
          <div className="rounded-2xl bg-[#E60012]/30 p-3">วันนี้: {moneyFormatter.format(gpToday)} ({pctChange(gpToday, gpPrevDay).toFixed(1)}% เทียบเมื่อวาน)</div>
          <div className="rounded-2xl bg-[#E60012]/30 p-3">7 วัน: {moneyFormatter.format(gp7)} ({pctChange(gp7, gpPrev7).toFixed(1)}% เทียบ 7 วันก่อน)</div>
          <div className="rounded-2xl bg-[#E60012]/30 p-3">เดือนนี้: {moneyFormatter.format(gpMonth)} ({pctChange(gpMonth, gpPrevMonthMtd).toFixed(1)}% เทียบเดือนก่อนช่วงเดียวกัน)</div>
        </div>
      </section>

      <section className="rounded-3xl bg-white p-4 shadow-sm">
        <h2 className="text-lg font-black">หมวด 4: เปรียบเทียบสาขา</h2>
        <div className="mt-3 overflow-hidden rounded-2xl border border-black/10">
          <div className="grid grid-cols-12 bg-black px-3 py-2 text-xs font-bold text-white">
            <span className="col-span-2">อันดับ</span>
            <span className="col-span-4">ชื่อสาขา</span>
            <span className="col-span-3 text-right">ยอดขาย</span>
            <span className="col-span-3 text-right">กำไร</span>
          </div>
          {branchRanking.map((item, index) => (
            <div key={item.branchName} className="grid grid-cols-12 border-t border-black/10 px-3 py-2 text-xs font-bold">
              <span className="col-span-2">#{index + 1}</span>
              <span className="col-span-4 truncate">{item.branchName}</span>
              <span className="col-span-3 text-right">{moneyFormatter.format(item.totalSales)}</span>
              <span className="col-span-3 text-right">{moneyFormatter.format(item.grossProfit)}</span>
            </div>
          ))}
        </div>

        {branchNotes.length > 0 ? (
          <div className="mt-4 space-y-3">
            <h3 className="text-base font-black">📝 หมายเหตุจากสาขา</h3>
            {branchNotes.map((item) => (
              <article key={`${item.reportDate}-${item.branchId}-${item.note}`} className="rounded-2xl border border-black/10 bg-black/[0.03] p-3">
                <p className="text-xs font-bold text-black/70">{formatThaiDate(item.reportDate)}</p>
                <p className="text-sm font-black">{item.branchName}</p>
                <p className="mt-2 whitespace-pre-wrap text-sm font-medium text-black/90">{item.note}</p>
              </article>
            ))}
          </div>
        ) : null}
      </section>
    </div>
  );
}
