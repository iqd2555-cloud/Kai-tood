import Link from "next/link";
import { DashboardRealtime } from "@/components/dashboard-realtime";
import { StatCard } from "@/components/stat-card";
import { getCurrentProfile, isOwner } from "@/lib/auth";
import { moneyFormatter, numberFormatter, todayISO } from "@/lib/format";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import type { Branch, DailyReport } from "@/lib/types";

export default async function DashboardPage() {
  const profile = await getCurrentProfile();
  const supabase = await createSupabaseServerClient();
  const today = todayISO();

  const reportsQuery = supabase
    .from("daily_reports")
    .select("*, branches(name, code, low_chicken_threshold, low_sticky_rice_threshold, low_oil_threshold)")
    .eq("report_date", today)
    .order("updated_at", { ascending: false });

  if (!isOwner(profile) && profile.branch_id) reportsQuery.eq("branch_id", profile.branch_id);
  const { data: reports = [] } = await reportsQuery.returns<DailyReport[]>();

  const branchesQuery = supabase.from("branches").select("*").order("name");
  if (!isOwner(profile) && profile.branch_id) branchesQuery.eq("id", profile.branch_id);
  const { data: branches = [] } = await branchesQuery.returns<Branch[]>();

  const todaySales = reports.reduce((sum, report) => sum + Number(report.total_sales), 0);
  const cashSales = reports.reduce((sum, report) => sum + Number(report.cash_sales), 0);
  const transferSales = reports.reduce((sum, report) => sum + Number(report.transfer_sales), 0);
  const lowStockReports = reports.filter((report) => {
    const branch = report.branches;
    return Boolean(
      branch &&
        (report.remaining_chicken <= branch.low_chicken_threshold ||
          report.remaining_sticky_rice <= branch.low_sticky_rice_threshold ||
          report.remaining_oil <= branch.low_oil_threshold),
    );
  });

  return (
    <div className="space-y-5">
      <section className="rounded-[2rem] bg-[#111111] p-5 text-white shadow-xl">
        <p className="text-sm font-bold text-[#ffc400]">ภาพรวมวันนี้</p>
        <h1 className="mt-2 text-3xl font-black">{isOwner(profile) ? "ทุกสาขา" : profile.branch?.name}</h1>
        <p className="mt-2 text-white/70">ข้อมูลอัปเดตทันทีเมื่อพนักงานบันทึกยอดขาย วัตถุดิบ และรายการสั่งของ</p>
        <div className="mt-4"><DashboardRealtime /></div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="ยอดขายรวม" value={moneyFormatter.format(todaySales)} tone="yellow" />
        <StatCard label="เงินสด" value={moneyFormatter.format(cashSales)} />
        <StatCard label="โอน" value={moneyFormatter.format(transferSales)} />
        <StatCard label="แจ้งเตือนใกล้หมด" value={`${lowStockReports.length} รายการ`} tone="dark" />
      </section>

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
                <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                  <div className="rounded-2xl bg-black/5 p-3"><div className="text-xs font-bold">ไก่</div><div className="text-xl font-black">{numberFormatter.format(report.remaining_chicken)}</div></div>
                  <div className="rounded-2xl bg-black/5 p-3"><div className="text-xs font-bold">ข้าวเหนียว</div><div className="text-xl font-black">{numberFormatter.format(report.remaining_sticky_rice)}</div></div>
                  <div className="rounded-2xl bg-black/5 p-3"><div className="text-xs font-bold">น้ำมัน</div><div className="text-xl font-black">{numberFormatter.format(report.remaining_oil)}</div></div>
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
