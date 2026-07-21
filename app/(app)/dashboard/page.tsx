import Link from "next/link";
import { redirect } from "next/navigation";
import { BrandLogo } from "@/components/brand-logo";
import { DashboardRealtime } from "@/components/dashboard-realtime";
import { StatCard } from "@/components/stat-card";
import { getCurrentProfile, isOwner } from "@/lib/auth";
import { BRAND_NAME, BRAND_SUBTITLE } from "@/lib/brand";
import { formatThaiDate, moneyFormatter, numberFormatter, todayISO, daysAgoISO } from "@/lib/format";
import { REMAINING_INVENTORY_ITEMS, USED_INGREDIENT_ITEMS, getRemainingChickenTotal } from "@/lib/report-items";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import type { Branch, DailyReport } from "@/lib/types";
import { isMarinationOnlyStaff } from "@/lib/marination-access";

function sumReports(reports: DailyReport[], field: keyof Pick<DailyReport, "total_sales" | "cash_sales" | "transfer_sales" | "used_bl" | "used_bb" | "used_chicken_skin" | "used_oil" | "used_sticky_rice" | "used_chopped_chicken" | "used_drumstick" | "used_offal">) {
  return reports.reduce((sum, report) => sum + Number(report[field] ?? 0), 0);
}

export default async function DashboardPage() {
  const profile = await getCurrentProfile();
  if (isMarinationOnlyStaff(profile)) redirect("/marination");
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
    const remainingChicken = getRemainingChickenTotal(report);
    return Boolean(
      branch &&
        (remainingChicken <= branch.low_chicken_threshold ||
          report.remaining_sticky_rice <= branch.low_sticky_rice_threshold ||
          report.remaining_oil <= branch.low_oil_threshold),
    );
  });

  const ingredientTotals = USED_INGREDIENT_ITEMS.map((item) => ({
    label: item.label,
    value: sumReports(historyReports, item.name),
    unit: "กก.",
  }));

  if (process.env.NODE_ENV === "development") {
    console.info("dashboard_report_branch_debug", {
      selectedBranchId: isOwner(profile) ? "all" : profile.branch_id,
      reportBranchId: [...new Set(reports.map((report) => report.branch_id))],
    });
  }

  return (
    <div className="space-y-5">
      <section className="glass-dark rounded-[2rem] p-5 text-white">
        <div className="flex items-center gap-4">
          <BrandLogo size={64} priority className="rounded-2xl shadow-lg shadow-[#E60012]/20" />
          <div className="min-w-0">
            <p className="text-sm font-bold text-[#E60012]">ภาพรวมวันนี้</p>
            <h1 className="truncate text-3xl font-black text-[#E60012]">{BRAND_NAME}</h1>
            <p className="text-sm font-bold text-white/80">{BRAND_SUBTITLE}</p>
          </div>
        </div>
        <div className="mt-5 glass-button rounded-2xl p-4">
          <h2 className="text-2xl font-black">{isOwner(profile) ? "ทุกสาขา" : profile.branch?.name}</h2>
          <p className="mt-2 text-white/70">ข้อมูลอัปเดตทันทีเมื่อพนักงานบันทึกยอดขาย วัตถุดิบ และรายการสั่งของ</p>
          <div className="mt-4"><DashboardRealtime /></div>
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="ยอดขายวันนี้" value={moneyFormatter.format(todaySales)} tone="brand" />
        <StatCard label="เงินสด" value={moneyFormatter.format(cashSales)} />
        <StatCard label="โอน" value={moneyFormatter.format(transferSales)} />
        <StatCard label="ยอดขาย 7 วัน" value={moneyFormatter.format(weekSales)} tone="dark" />
      </section>

      <section className="glass-card rounded-[1.75rem] p-5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-sm font-bold text-black/50">สรุปวัตถุดิบย้อนหลัง</p>
            <h2 className="text-2xl font-black">{formatThaiDate(sevenDaysAgo)} - {formatThaiDate(today)}</h2>
          </div>
          <Link href={isOwner(profile) ? "/reports" : "/my-reports"} className="focus-ring rounded-full bg-black px-4 py-2 text-sm font-black text-white">ดูรายงาน</Link>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-7">
          {ingredientTotals.map((item) => (
            <div key={item.label} className="rounded-2xl bg-[#E60012]/20 p-3 text-center">
              <div className="text-sm font-black">{item.label}</div>
              <div className="text-2xl font-black">{numberFormatter.format(item.value)}</div>
              <div className="text-xs font-bold text-black/50">{item.unit}</div>
            </div>
          ))}
        </div>
      </section>

      {lowStockReports.length > 0 && (
        <section className="rounded-[1.75rem] border border-red-200/70 bg-red-50/80 p-5 shadow-sm backdrop-blur-md">
          <h2 className="text-2xl font-black text-red-900">แจ้งเตือนวัตถุดิบใกล้หมด</h2>
          <div className="mt-3 space-y-2">
            {lowStockReports.map((report) => (
              <div key={report.id} className="glass-card rounded-2xl p-3 font-bold text-red-900">
                {report.branches?.name}: ไก่รวม {numberFormatter.format(getRemainingChickenTotal(report))}, ข้าวเหนียว {numberFormatter.format(report.remaining_sticky_rice)}, น้ำมัน {numberFormatter.format(report.remaining_oil)}
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="grid gap-4 lg:grid-cols-2">
        {branches.map((branch) => {
          const report = reports.find((item) => item.branch_id === branch.id);
          return (
            <article key={branch.id} className="glass-card rounded-[1.75rem] p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-2xl font-black">{branch.name}</h2>
                  <p className="text-sm font-bold text-black/50">รหัสสาขา {branch.code}</p>
                </div>
                <span className={`rounded-full px-3 py-1 text-sm font-black ${report ? "bg-green-100 text-green-800" : "bg-[#FDECEC] text-[#7A0008]"}`}>
                  {report ? "ส่งแล้ว" : "รอข้อมูล"}
                </span>
              </div>
              {report ? (
                <div className="mt-4 space-y-3">
                  <div className="rounded-2xl bg-[#E60012]/20 p-4 text-center">
                    <div className="text-xs font-bold">ยอดขายรวม</div>
                    <div className="text-3xl font-black">{moneyFormatter.format(report.total_sales)}</div>
                  </div>
                  <div className="rounded-2xl bg-[#E60012]/30 p-4 text-center">
                    <div className="text-xs font-bold">รวมไก่คงเหลือทั้งหมด</div>
                    <div className="text-3xl font-black">{numberFormatter.format(getRemainingChickenTotal(report))}</div>
                    <div className="text-xs font-bold text-black/60">กิโลกรัม</div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-center sm:grid-cols-4">
                    {REMAINING_INVENTORY_ITEMS.map((item) => (
                      <div key={item.name} className="rounded-2xl bg-black/5 p-3">
                        <div className="text-xs font-bold">{item.label.replace("คงเหลือ", "")}</div>
                        <div className="text-xl font-black">{numberFormatter.format(report[item.name] ?? 0)}</div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="mt-4 rounded-2xl bg-[#FDECEC] p-4 font-bold text-[#7A0008]">ยังไม่มีข้อมูลวันนี้</p>
              )}
            </article>
          );
        })}
      </section>

      <Link href="/daily" className="focus-ring block rounded-3xl bg-[#E60012] px-5 py-5 text-center text-xl font-black text-white shadow-lg">กรอกข้อมูลประจำวัน</Link>
    </div>
  );
}
