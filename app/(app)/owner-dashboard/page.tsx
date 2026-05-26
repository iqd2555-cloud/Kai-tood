import { redirect } from "next/navigation";
import { getCurrentProfile, isOwner } from "@/lib/auth";
import { formatThaiDate, moneyFormatter, todayISO, daysAgoISO } from "@/lib/format";
import { createSupabaseServerClient } from "@/lib/supabase-server";

type ProfitRow = Record<string, string | number | null>;

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

function compactNumber(value: number, maxValue: number) {
  if (maxValue <= 0) return 0;
  return Math.max(6, Math.round((value / maxValue) * 100));
}

export default async function OwnerDashboardPage() {
  const profile = await getCurrentProfile();
  if (!isOwner(profile)) redirect("/dashboard");

  const supabase = await createSupabaseServerClient();
  if (!supabase) redirect("/login?setup=supabase");

  const { data, error } = await supabase.from("owner_profit_dashboard").select("*").returns<ProfitRow[]>();
  if (error) return <div className="rounded-2xl bg-red-50 p-4 font-bold text-red-900">โหลดข้อมูล owner_profit_dashboard ไม่สำเร็จ: {error.message}</div>;

  const rows = data ?? [];
  const today = todayISO();
  const sevenDaysAgo = daysAgoISO(6);
  const monthPrefix = today.slice(0, 7);

  const normalized = rows.map((row) => ({
    date: pickDate(row),
    branchName: pickBranchName(row),
    totalSales: pickNumber(row, ["total_sales", "sales_total", "total_revenue", "revenue"]),
    chickenCost: pickNumber(row, ["chicken_cost", "cost_chicken", "total_chicken_cost"]),
    otherExpenses: pickNumber(row, ["other_expenses", "expense_other", "operating_expenses"]),
    grossProfit: pickNumber(row, ["gross_profit", "profit_gross", "gross_margin"]),
  }));

  const todayRows = normalized.filter((row) => row.date === today);
  const sevenDayRows = normalized.filter((row) => row.date >= sevenDaysAgo && row.date <= today);
  const monthlyRows = normalized.filter((row) => row.date.startsWith(monthPrefix));

  const sum = (items: typeof normalized, field: "totalSales" | "chickenCost" | "otherExpenses" | "grossProfit") => items.reduce((acc, item) => acc + item[field], 0);

  const dailySummary = {
    totalSales: sum(todayRows, "totalSales"),
    chickenCost: sum(todayRows, "chickenCost"),
    otherExpenses: sum(todayRows, "otherExpenses"),
    grossProfit: sum(todayRows, "grossProfit"),
  };

  const dailySeries = Object.values(sevenDayRows.reduce<Record<string, { date: string; totalSales: number; grossProfit: number }>>((acc, row) => {
    acc[row.date] ??= { date: row.date, totalSales: 0, grossProfit: 0 };
    acc[row.date].totalSales += row.totalSales;
    acc[row.date].grossProfit += row.grossProfit;
    return acc;
  }, {})).sort((a, b) => a.date.localeCompare(b.date));

  const monthlySeries = Object.values(monthlyRows.reduce<Record<string, { branchName: string; totalSales: number; grossProfit: number }>>((acc, row) => {
    acc[row.branchName] ??= { branchName: row.branchName, totalSales: 0, grossProfit: 0 };
    acc[row.branchName].totalSales += row.totalSales;
    acc[row.branchName].grossProfit += row.grossProfit;
    return acc;
  }, {})).sort((a, b) => b.totalSales - a.totalSales);

  const branchComparison = Object.values(normalized.reduce<Record<string, { branchName: string; totalSales: number; grossProfit: number; chickenCost: number }>>((acc, row) => {
    acc[row.branchName] ??= { branchName: row.branchName, totalSales: 0, grossProfit: 0, chickenCost: 0 };
    acc[row.branchName].totalSales += row.totalSales;
    acc[row.branchName].grossProfit += row.grossProfit;
    acc[row.branchName].chickenCost += row.chickenCost;
    return acc;
  }, {})).sort((a, b) => b.grossProfit - a.grossProfit);

  const maxDailySales = Math.max(...dailySeries.map((item) => item.totalSales), 0);
  const maxMonthlySales = Math.max(...monthlySeries.map((item) => item.totalSales), 0);

  return (
    <div className="space-y-5 pb-6">
      <section className="rounded-[1.75rem] bg-[#111111] p-5 text-white shadow-xl">
        <p className="text-sm font-bold text-[#ffc400]">สรุปภาพรวม (Owner)</p>
        <h1 className="mt-2 text-3xl font-black">รายได้และกำไรทุกสาขา</h1>
        <p className="mt-2 text-sm text-white/70">ข้อมูลจาก view: public.owner_profit_dashboard</p>
      </section>
      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-2xl bg-white p-4 shadow"><p className="text-xs font-bold text-black/50">ยอดขายรวม (วันนี้)</p><p className="text-xl font-black">{moneyFormatter.format(dailySummary.totalSales)}</p></div>
        <div className="rounded-2xl bg-white p-4 shadow"><p className="text-xs font-bold text-black/50">ต้นทุนไก่ (วันนี้)</p><p className="text-xl font-black">{moneyFormatter.format(dailySummary.chickenCost)}</p></div>
        <div className="rounded-2xl bg-white p-4 shadow"><p className="text-xs font-bold text-black/50">ค่าใช้จ่ายอื่น (วันนี้)</p><p className="text-xl font-black">{moneyFormatter.format(dailySummary.otherExpenses)}</p></div>
        <div className="rounded-2xl bg-[#ffc400] p-4 shadow"><p className="text-xs font-bold text-black/70">กำไรขั้นต้น (วันนี้)</p><p className="text-xl font-black">{moneyFormatter.format(dailySummary.grossProfit)}</p></div>
      </section>
      <section className="rounded-[1.75rem] border border-black/10 bg-white p-5 shadow-sm">
        <h2 className="text-xl font-black">รวมย้อนหลัง 7 วัน</h2>
        <p className="text-sm font-bold text-black/50">{formatThaiDate(sevenDaysAgo)} - {formatThaiDate(today)}</p>
        <div className="mt-3 grid grid-cols-2 gap-3">
          <div className="rounded-2xl bg-black/5 p-3"><p className="text-xs font-bold">รวมยอดขาย 7 วัน</p><p className="text-xl font-black">{moneyFormatter.format(sum(sevenDayRows, "totalSales"))}</p></div>
          <div className="rounded-2xl bg-black/5 p-3"><p className="text-xs font-bold">รวมกำไรขั้นต้น 7 วัน</p><p className="text-xl font-black">{moneyFormatter.format(sum(sevenDayRows, "grossProfit"))}</p></div>
        </div>
        <div className="mt-4 space-y-2">{dailySeries.map((item) => <div key={item.date}><div className="mb-1 flex items-center justify-between text-xs font-bold"><span>{formatThaiDate(item.date)}</span><span>{moneyFormatter.format(item.totalSales)}</span></div><div className="h-3 rounded-full bg-black/10"><div className="h-3 rounded-full bg-[#ffc400]" style={{ width: `${compactNumber(item.totalSales, maxDailySales)}%` }} /></div></div>)}</div>
      </section>
      <section className="rounded-[1.75rem] border border-black/10 bg-white p-5 shadow-sm">
        <h2 className="text-xl font-black">รวมรายเดือน</h2>
        <p className="text-sm font-bold text-black/50">เดือน {monthPrefix}</p>
        <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
          <div className="rounded-2xl bg-black/5 p-3"><p className="text-xs font-bold">ยอดขายรวมรายเดือน</p><p className="text-lg font-black">{moneyFormatter.format(sum(monthlyRows, "totalSales"))}</p></div>
          <div className="rounded-2xl bg-black/5 p-3"><p className="text-xs font-bold">ต้นทุนไก่รวมรายเดือน</p><p className="text-lg font-black">{moneyFormatter.format(sum(monthlyRows, "chickenCost"))}</p></div>
          <div className="rounded-2xl bg-black/5 p-3"><p className="text-xs font-bold">กำไรขั้นต้นรายเดือน</p><p className="text-lg font-black">{moneyFormatter.format(sum(monthlyRows, "grossProfit"))}</p></div>
        </div>
        <div className="mt-4 space-y-2">{monthlySeries.map((item) => <div key={item.branchName}><div className="mb-1 flex items-center justify-between text-xs font-bold"><span>{item.branchName}</span><span>{moneyFormatter.format(item.totalSales)}</span></div><div className="h-3 rounded-full bg-black/10"><div className="h-3 rounded-full bg-black" style={{ width: `${compactNumber(item.totalSales, maxMonthlySales)}%` }} /></div></div>)}</div>
      </section>
      <section className="rounded-[1.75rem] border border-black/10 bg-white p-5 shadow-sm">
        <h2 className="text-xl font-black">เปรียบเทียบสาขา</h2>
        <div className="mt-3 space-y-2">{branchComparison.map((item) => <div key={item.branchName} className="rounded-2xl bg-black/5 p-3"><p className="text-sm font-black">{item.branchName}</p><p className="text-xs font-bold text-black/60">ยอดขาย: {moneyFormatter.format(item.totalSales)} | ต้นทุนไก่: {moneyFormatter.format(item.chickenCost)} | กำไรขั้นต้น: {moneyFormatter.format(item.grossProfit)}</p></div>)}</div>
      </section>
    </div>
  );
}
