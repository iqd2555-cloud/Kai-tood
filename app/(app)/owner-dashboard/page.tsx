import { redirect } from "next/navigation";
import { getCurrentProfile, isOwner } from "@/lib/auth";
import { formatThaiDate, moneyFormatter, todayISO, daysAgoISO } from "@/lib/format";
import { createSupabaseServerClient } from "@/lib/supabase-server";

type ProfitRow = Record<string, string | number | null>;
type MetricKey = "totalSales" | "chickenCost" | "otherExpenses";

const CHICKEN_COST_PER_KG = 65;

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

function rangeSum<T extends { date: string } & Record<string, number>>(rows: T[], start: string, end: string, field: keyof T) {
  return rows
    .filter((row) => row.date >= start && row.date <= end)
    .reduce((sum, row) => sum + (typeof row[field] === "number" ? (row[field] as number) : 0), 0);
}

function barWidth(value: number, max: number) {
  if (max <= 0) return 0;
  return Math.max(8, Math.round((value / max) * 100));
}

export default async function OwnerDashboardPage() {
  const profile = await getCurrentProfile();
  if (!isOwner(profile)) redirect("/dashboard");

  const supabase = await createSupabaseServerClient();
  if (!supabase) redirect("/login?setup=supabase");

  const { data, error } = await supabase.from("owner_profit_dashboard").select("*").returns<ProfitRow[]>();
  if (error) return <div className="rounded-2xl bg-red-50 p-4 font-bold text-red-900">โหลดข้อมูล owner_profit_dashboard ไม่สำเร็จ: {error.message}</div>;

  const rows = (data ?? []).map((row) => {
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

  const today = todayISO();
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

  const sumMetric = (items: typeof rows, key: MetricKey | "grossProfit" | "chickenKg") => items.reduce((acc, item) => acc + item[key], 0);

  const salesToday = rangeSum(rows, today, today, "totalSales");
  const sales7 = rangeSum(rows, sevenStart, today, "totalSales");
  const salesMonth = sumMetric(monthRows, "totalSales");

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

  const maxSalesLine = Math.max(...salesLine.map((x) => x.value), 0);
  const maxUsageBar = Math.max(...usageBar.map((x) => x.kg), 0);

  return (
    <div className="space-y-4 pb-6">
      <section className="rounded-3xl bg-[#111111] p-5 text-white shadow-xl">
        <p className="text-sm font-bold text-[#ffc400]">รายงาน Owner</p>
        <h1 className="mt-1 text-2xl font-black">ภาพรวมยอดขาย วัตถุดิบ และกำไร</h1>
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
              <div className="h-2 rounded-full bg-black/10"><div className="h-2 rounded-full bg-[#ffc400]" style={{ width: `${barWidth(item.value, maxSalesLine)}%` }} /></div>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-3xl bg-white p-4 shadow-sm">
        <h2 className="text-lg font-black">หมวด 2: วัตถุดิบใช้ไป</h2>
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
          <div className="rounded-2xl bg-[#ffc400]/30 p-3">วันนี้: {moneyFormatter.format(gpToday)} ({pctChange(gpToday, gpPrevDay).toFixed(1)}% เทียบเมื่อวาน)</div>
          <div className="rounded-2xl bg-[#ffc400]/30 p-3">7 วัน: {moneyFormatter.format(gp7)} ({pctChange(gp7, gpPrev7).toFixed(1)}% เทียบ 7 วันก่อน)</div>
          <div className="rounded-2xl bg-[#ffc400]/30 p-3">เดือนนี้: {moneyFormatter.format(gpMonth)} ({pctChange(gpMonth, gpPrevMonthMtd).toFixed(1)}% เทียบเดือนก่อนช่วงเดียวกัน)</div>
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
      </section>
    </div>
  );
}
