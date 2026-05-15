import { redirect } from "next/navigation";
import { StatCard } from "@/components/stat-card";
import { getCurrentProfile, isOwner } from "@/lib/auth";
import { daysAgoISO, formatThaiDate, moneyFormatter, numberFormatter, todayISO } from "@/lib/format";
import { ORDER_REQUEST_ITEMS, USED_INGREDIENT_ITEMS } from "@/lib/report-items";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import type { Branch, DailyReport } from "@/lib/types";

type SearchParams = {
  from?: string;
  to?: string;
  branch_id?: string;
};

type ReportsPageProps = {
  searchParams?: Promise<SearchParams>;
};

type NumericReportField = keyof Pick<
  DailyReport,
  | "cash_sales"
  | "transfer_sales"
  | "total_sales"
  | "used_bl"
  | "used_bb"
  | "used_chicken_skin"
  | "used_oil"
  | "used_sticky_rice"
  | "used_chopped_chicken"
  | "used_drumstick"
  | "order_wrapping_paper"
  | "order_plastic_bag"
  | "order_tom_yum_powder"
  | "order_cheese_powder"
  | "order_paprika_powder"
  | "order_wing_zabb_powder"
  | "order_hot_spicy_powder"
>;

function isIsoDate(value: string | undefined) {
  return Boolean(value?.match(/^\d{4}-\d{2}-\d{2}$/));
}

function sumReports(reports: DailyReport[], field: NumericReportField) {
  return reports.reduce((sum, report) => sum + Number(report[field] ?? 0), 0);
}

function QuantityGrid({
  title,
  items,
  reports,
}: {
  title: string;
  items: readonly { label: string; name: NumericReportField; unit: string }[];
  reports: DailyReport[];
}) {
  return (
    <section className="rounded-[1.75rem] border border-black/10 bg-white p-5 shadow-sm">
      <h2 className="text-2xl font-black">{title}</h2>
      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
        {items.map((item) => (
          <div key={item.name} className="rounded-2xl bg-[#ffc400]/20 p-3 text-center">
            <div className="text-sm font-black">{item.label}</div>
            <div className="text-2xl font-black">{numberFormatter.format(sumReports(reports, item.name))}</div>
            <div className="text-xs font-bold text-black/50">{item.unit}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

export default async function ReportsPage({ searchParams }: ReportsPageProps) {
  const profile = await getCurrentProfile();
  if (!isOwner(profile)) redirect("/dashboard");

  const supabase = await createSupabaseServerClient();
  if (!supabase) redirect("/login?setup=supabase");

  const params = searchParams ? await searchParams : {};
  const today = todayISO();
  const defaultFrom = daysAgoISO(29);
  const from = isIsoDate(params.from) ? params.from! : defaultFrom;
  const to = isIsoDate(params.to) ? params.to! : today;

  const { data: branchesData } = await supabase.from("branches").select("*").order("name").returns<Branch[]>();
  const branches = branchesData ?? [];
  const selectedBranchId = branches.some((branch) => branch.id === params.branch_id) ? params.branch_id : branches[0]?.id;

  const { data: allReportsData } = await supabase
    .from("daily_reports")
    .select("*, branches(name, code, low_chicken_threshold, low_sticky_rice_threshold, low_oil_threshold)")
    .gte("report_date", from)
    .lte("report_date", to)
    .order("report_date", { ascending: false })
    .returns<DailyReport[]>();
  const allReports = allReportsData ?? [];
  const branchReports = selectedBranchId ? allReports.filter((report) => report.branch_id === selectedBranchId) : [];
  const selectedBranch = branches.find((branch) => branch.id === selectedBranchId);

  const branchRows = branches
    .map((branch) => {
      const reports = allReports.filter((report) => report.branch_id === branch.id);
      return {
        branch,
        reportCount: reports.length,
        totalSales: sumReports(reports, "total_sales"),
        cashSales: sumReports(reports, "cash_sales"),
        transferSales: sumReports(reports, "transfer_sales"),
      };
    })
    .filter((row) => row.reportCount > 0);

  return (
    <div className="space-y-5">
      <section className="rounded-[2rem] bg-[#111111] p-5 text-white shadow-xl">
        <p className="text-sm font-bold text-[#ffc400]">สำหรับเจ้าของร้าน</p>
        <h1 className="mt-2 text-3xl font-black">รายงานสรุปผล</h1>
        <p className="mt-2 text-white/70">ดูภาพรวมทุกสาขาและเลือกดูแยกตามสาขาได้ตามช่วงวันที่</p>
      </section>

      <form className="grid gap-3 rounded-[1.75rem] border border-black/10 bg-white p-5 shadow-sm sm:grid-cols-[1fr_1fr_1.4fr_auto]" action="/reports">
        <label className="block">
          <span className="mb-2 block font-black">วันที่เริ่มต้น</span>
          <input className="focus-ring min-h-14 w-full rounded-2xl border-2 border-black/10 px-4 text-lg font-bold" type="date" name="from" defaultValue={from} />
        </label>
        <label className="block">
          <span className="mb-2 block font-black">วันที่สิ้นสุด</span>
          <input className="focus-ring min-h-14 w-full rounded-2xl border-2 border-black/10 px-4 text-lg font-bold" type="date" name="to" defaultValue={to} />
        </label>
        <label className="block">
          <span className="mb-2 block font-black">เลือกสาขาเพื่อดูแยก</span>
          <select className="focus-ring min-h-14 w-full rounded-2xl border-2 border-black/10 bg-white px-4 text-lg font-bold" name="branch_id" defaultValue={selectedBranchId ?? ""}>
            {branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}
          </select>
        </label>
        <button className="focus-ring min-h-14 self-end rounded-2xl bg-[#ffc400] px-6 text-lg font-black text-black shadow-sm">ดูรายงาน</button>
      </form>

      <section className="rounded-[1.75rem] border border-black/10 bg-white p-5 shadow-sm">
        <p className="text-sm font-bold text-black/50">A. รายงานสรุปทุกสาขา</p>
        <h2 className="text-2xl font-black">{formatThaiDate(from)} - {formatThaiDate(to)}</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <StatCard label="ยอดขายรวม" value={moneyFormatter.format(sumReports(allReports, "total_sales"))} tone="yellow" />
          <StatCard label="เงินสดรวม" value={moneyFormatter.format(sumReports(allReports, "cash_sales"))} />
          <StatCard label="เงินโอนรวม" value={moneyFormatter.format(sumReports(allReports, "transfer_sales"))} />
          <StatCard label="จำนวนรายการที่บันทึก" value={numberFormatter.format(allReports.length)} tone="dark" />
          <StatCard label="จำนวนสาขาที่มีข้อมูล" value={numberFormatter.format(new Set(allReports.map((report) => report.branch_id)).size)} />
        </div>
      </section>

      <QuantityGrid title="วัตถุดิบใช้ไปรวมทุกสาขา" items={USED_INGREDIENT_ITEMS} reports={allReports} />
      <QuantityGrid title="รายการสั่งวัตถุดิบเพิ่มรวมทุกสาขา" items={ORDER_REQUEST_ITEMS} reports={allReports} />

      {branchRows.length > 0 && (
        <section className="rounded-[1.75rem] border border-black/10 bg-white p-5 shadow-sm">
          <h2 className="text-2xl font-black">ยอดรวมรายสาขา</h2>
          <div className="mt-4 space-y-3">
            {branchRows.map((row) => (
              <div key={row.branch.id} className="rounded-2xl bg-black/[0.03] p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h3 className="text-xl font-black">{row.branch.name}</h3>
                    <p className="text-sm font-bold text-black/50">{numberFormatter.format(row.reportCount)} รายการ</p>
                  </div>
                  <div className="text-right text-2xl font-black text-green-700">{moneyFormatter.format(row.totalSales)}</div>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2 text-center text-sm font-bold">
                  <div className="rounded-xl bg-white p-2">เงินสด {moneyFormatter.format(row.cashSales)}</div>
                  <div className="rounded-xl bg-white p-2">เงินโอน {moneyFormatter.format(row.transferSales)}</div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="rounded-[1.75rem] border border-black/10 bg-white p-5 shadow-sm">
        <p className="text-sm font-bold text-black/50">B. รายงานสรุปแยกตามสาขา</p>
        <h2 className="text-2xl font-black">{selectedBranch?.name ?? "ยังไม่มีสาขา"}</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="ยอดขายของสาขา" value={moneyFormatter.format(sumReports(branchReports, "total_sales"))} tone="yellow" />
          <StatCard label="เงินสดของสาขา" value={moneyFormatter.format(sumReports(branchReports, "cash_sales"))} />
          <StatCard label="เงินโอนของสาขา" value={moneyFormatter.format(sumReports(branchReports, "transfer_sales"))} />
          <StatCard label="จำนวนรายการที่พนักงานบันทึก" value={numberFormatter.format(branchReports.length)} tone="dark" />
        </div>
      </section>

      <QuantityGrid title={`วัตถุดิบใช้ไปของ${selectedBranch?.name ?? "สาขา"}`} items={USED_INGREDIENT_ITEMS} reports={branchReports} />
      <QuantityGrid title={`รายการสั่งวัตถุดิบเพิ่มของ${selectedBranch?.name ?? "สาขา"}`} items={ORDER_REQUEST_ITEMS} reports={branchReports} />
    </div>
  );
}
