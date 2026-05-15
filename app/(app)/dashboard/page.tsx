import Link from "next/link";
import { redirect } from "next/navigation";
import { DashboardRealtime } from "@/components/dashboard-realtime";
import { StatCard } from "@/components/stat-card";
import { getCurrentProfile, isOwner } from "@/lib/auth";
import { formatThaiDate, moneyFormatter, numberFormatter, todayISO, daysAgoISO } from "@/lib/format";
import { USED_INGREDIENT_ITEMS } from "@/lib/report-items";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import type { Branch, DailyReport } from "@/lib/types";

function sumReports(reports: DailyReport[], field: keyof Pick<DailyReport, "total_sales" | "cash_sales" | "transfer_sales" | "used_bl" | "used_bb" | "used_chicken_skin" | "used_oil" | "used_sticky_rice" | "used_chopped_chicken" | "used_drumstick">) {
  return reports.reduce((sum, report) => sum + Number(report[field] ?? 0), 0);
}

export default async function DashboardPage() {
  const profile = await getCurrentProfile();
  const supabase = await createSupabaseServerClient();
  if (!supabase) redirect("/login?setup=supabase");

  const today = todayISO();
  const sevenDaysAgo = daysAgoISO(6);

  const reportsQuery = supabase
    .from("daily_reports")
    .select("*, branches(name, code, low_chicken_threshold, low_sticky_rice_threshold, low_oil_threshold)")
    .eq("report_date", today)
    .order("updated_at", { ascending: false });

  if (!isOwner(profile) && profile.branch_id) reportsQuery.eq("branch_id", profile.branch_id);
  const { data: reportsData } = await reportsQuery.returns<DailyReport[]>();
  const reports = reportsData ?? [];

  const historyQuery = supabase
    .from("daily_reports")
    .select("*, branches(name, code, low_chicken_threshold, low_sticky_rice_threshold, low_oil_threshold)")
    .gte("report_date", sevenDaysAgo)
    .lte("report_date", today)
    .order("report_date", { ascending: false });

  if (!isOwner(profile) && profile.branch_id) historyQuery.eq("branch_id", profile.branch_id);
  const { data: historyData } = await historyQuery.returns<DailyReport[]>();
  const historyReports = historyData ?? [];

  const branchesQuery = supabase.from("branches").select("*").order("name");
  if (!isOwner(profile) && profile.branch_id) branchesQuery.eq("id", profile.branch_id);
  const { data: branchesData } = await branchesQuery.returns<Branch[]>();
  const branches = branchesData ?? [];

  const todaySales = sumReports(reports, "total_sales");
  const cashSales = sumReports(reports, "cash_sales");
  const transferSales = sumReports(reports, "transfer_sales");
  const weekSales = sumReports(historyReports, "total_sales");
  const lowStockReports = reports.filter((report) => {
    const branch = report.branches;
    return Boolean(
      branch &&
        (report.remaining_chicken <= branch.low_chicken_threshold ||
          report.remaining_sticky_rice <= branch.low_sticky_rice_threshold ||
          report.remaining_oil <= branch.low_oil_threshold),
    );
  });

  const ingredientTotals = USED_INGREDIENT_ITEMS.map((item) => ({
    label: item.label,
    value: sumReports(historyReports, item.name),
    unit: "กก.",
  }));

  return (
    <div className="space-y-5">
      <section className="rounded-[2rem] bg-[#111111] p-5 text-white shadow-xl">
        <p className="text-sm font-bold text-[#ffc400]">ภาพรวมวันนี้</p>
        <h1 className="mt-2 text-3xl font-black">{isOwner(profile) ? "ทุกสาขา" : profile.branch?.name}</h1>
        <p className="mt-2 text-white/70">ข้อมูลอัปเดตทันทีเมื่อพนักงานบันทึกยอดขาย วัตถุดิบ และรายการสั่งของ</p>
        <div className="mt-4"><DashboardRealtime /></div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="ยอดขายวันนี้" value={moneyFormatter.format(todaySales)} tone="yellow" />
        <StatCard label="เงินสด" value={moneyFormatter.format(cashSales)} />
        <StatCard label="โอน" value={moneyFormatter.format(transferSales)} />
        <StatCard label="ยอดขาย 7 วัน" value={moneyFormatter.format(weekSales)} tone="dark" />
      </section>

      <section className="rounded-[1.75rem] border border-black/10 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-sm font-bold text-black/50">สรุปวัตถุดิบย้อนหลัง</p>
            <h2 className="text-2xl font-black">{formatThaiDate(sevenDaysAgo)} - {formatThaiDate(today)}</h2>
          </div>
          <Link href="/reports" className="focus-ring rounded-full bg-black px-4 py-2 text-sm font-black text-white">ดูรายงาน</Link>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-7">
          {ingredientTotals.map((item) => (
            <div key={item.label} className="rounded-2xl bg-[#ffc400]/20 p-3 text-center">
              <div className="text-sm font-black">{item.label}</div>
              <div className="text-2xl font-black">{numberFormatter.format(item.value)}</div>
              <div className="text-xs font-bold text-black/50">{item.unit}</div>
            </div>
          ))}
        </div>
      </section>

      {lowStockReports.length > 0 && (
        <section className="rounded-[1.75rem] border border-red-200 bg-red-50 p-5 shadow-sm">
          <h2 className="text-2xl font-black text-red-900">แจ้งเตือนวัตถุดิบใกล้หมด</h2>
          <div className="mt-3 space-y-2">
            {lowStockReports.map((report) => (
              <div key={report.id} className="rounded-2xl bg-white p-3 font-bold text-red-900">
                {report.branches?.name}: ไก่ {numberFormatter.format(report.remaining_chicken)}, ข้าวเหนียว {numberFormatter.format(report.remaining_sticky_rice)}, น้ำมัน {numberFormatter.format(report.remaining_oil)}
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="grid gap-4 lg:grid-cols-2">
        {branches.map((branch) => {
          const report = reports.find((item) => item.branch_id === branch.id);
          return (
            <article key={branch.id} className="rounded-[1.75rem] border border-black/10 bg-white p-5 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-2xl font-black">{branch.name}</h2>
                  <p className="text-sm font-bold text-black/50">รหัสสาขา {branch.code}</p>
                </div>
                <span className={`rounded-full px-3 py-1 text-sm font-black ${report ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-900"}`}>
                  {report ? "ส่งแล้ว" : "รอข้อมูล"}
                </span>
              </div>
              {report ? (
                <div className="mt-4 space-y-3">
                  <div className="rounded-2xl bg-[#ffc400]/20 p-4 text-center">
                    <div className="text-xs font-bold">ยอดขายรวม</div>
                    <div className="text-3xl font-black">{moneyFormatter.format(report.total_sales)}</div>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="rounded-2xl bg-black/5 p-3"><div className="text-xs font-bold">ไก่</div><div className="text-xl font-black">{numberFormatter.format(report.remaining_chicken)}</div></div>
                    <div className="rounded-2xl bg-black/5 p-3"><div className="text-xs font-bold">ข้าวเหนียว</div><div className="text-xl font-black">{numberFormatter.format(report.remaining_sticky_rice)}</div></div>
                    <div className="rounded-2xl bg-black/5 p-3"><div className="text-xs font-bold">น้ำมัน</div><div className="text-xl font-black">{numberFormatter.format(report.remaining_oil)}</div></div>
                  </div>
                </div>
              ) : (
                <p className="mt-4 rounded-2xl bg-yellow-50 p-4 font-bold text-yellow-900">ยังไม่มีข้อมูลวันนี้</p>
              )}
            </article>
          );
        })}
      </section>

      <Link href="/daily" className="focus-ring block rounded-3xl bg-[#ffc400] px-5 py-5 text-center text-xl font-black text-black shadow-lg">กรอกข้อมูลประจำวัน</Link>
    </div>
  );
}
