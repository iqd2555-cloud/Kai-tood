import { redirect } from "next/navigation";
import { DateShortcuts } from "@/components/date-shortcuts";
import { StatCard } from "@/components/stat-card";
import { getCurrentProfile, isOwner } from "@/lib/auth";
import { canUseStaffCounterOrder } from "@/lib/counter-access";
import { formatThaiDate, moneyFormatter, numberFormatter, todayISO } from "@/lib/format";
import { INVENTORY_FLOW_ITEMS, OPENING_INVENTORY_ITEMS, ORDER_REQUEST_ITEMS, RECEIVED_INGREDIENT_ITEMS, REMAINING_CHICKEN_FIELDS, REMAINING_INVENTORY_ITEMS, USED_INGREDIENT_ITEMS, getCalculatedRemaining, getInventoryDifference, getRemainingChickenTotal } from "@/lib/report-items";
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
  | "opening_original_chicken"
  | "opening_spicy_chicken"
  | "opening_ground_chicken"
  | "opening_drumstick"
  | "opening_offal"
  | "opening_chicken_skin"
  | "opening_sticky_rice"
  | "opening_oil"
  | "cash_sales"
  | "transfer_sales"
  | "total_sales"
  | "received_original_chicken"
  | "received_spicy_chicken"
  | "received_ground_chicken"
  | "received_drumstick"
  | "received_offal"
  | "received_chicken_skin"
  | "received_chicken"
  | "received_sticky_rice"
  | "received_oil"
  | "used_bl"
  | "used_bb"
  | "used_chicken_skin"
  | "used_oil"
  | "used_sticky_rice"
  | "used_chopped_chicken"
  | "used_drumstick"
  | "used_offal"
  | "remaining_original_chicken"
  | "remaining_spicy_chicken"
  | "remaining_chicken_skin"
  | "remaining_offal"
  | "remaining_ground_chicken"
  | "remaining_drumstick"
  | "remaining_sticky_rice"
  | "remaining_oil"
  | "order_original_chicken"
  | "order_spicy_chicken"
  | "order_offal"
  | "order_chopped_chicken"
  | "order_drumstick"
  | "order_chicken_skin"
  | "order_sticky_rice"
  | "order_oil"
  | "order_palm_sugar"
>;


function isIsoDate(value: string | undefined) {
  return Boolean(value?.match(/^\d{4}-\d{2}-\d{2}$/));
}

function sumReports(reports: DailyReport[], field: NumericReportField) {
  return reports.reduce((sum, report) => sum + Number(report[field] ?? 0), 0);
}

function sumChickenUsed(reports: DailyReport[]) {
  return sumReports(reports, "used_bl") + sumReports(reports, "used_bb") + sumReports(reports, "used_chicken_skin") + sumReports(reports, "used_chopped_chicken") + sumReports(reports, "used_drumstick") + sumReports(reports, "used_offal");
}

function sumChickenOrder(reports: DailyReport[]) {
  return sumReports(reports, "order_original_chicken") + sumReports(reports, "order_spicy_chicken") + sumReports(reports, "order_offal") + sumReports(reports, "order_chopped_chicken") + sumReports(reports, "order_drumstick") + sumReports(reports, "order_chicken_skin");
}

function latestReportsByBranch(reports: DailyReport[]) {
  const latest = new Map<string, DailyReport>();
  for (const report of reports) {
    if (!latest.has(report.branch_id)) latest.set(report.branch_id, report);
  }
  return Array.from(latest.values());
}

function sumLatestRemaining(reports: DailyReport[], field: NumericReportField) {
  return latestReportsByBranch(reports).reduce((sum, report) => sum + Number(report[field] ?? 0), 0);
}

function sumLatestRemainingChicken(reports: DailyReport[]) {
  return latestReportsByBranch(reports).reduce((sum, report) => sum + getRemainingChickenTotal(report), 0);
}

function InventoryFlowSummary({ title, reports }: { title: string; reports: DailyReport[] }) {
  const rows = [
    { label: "ไก่", received: sumReports(reports, "received_chicken"), used: sumChickenUsed(reports), remaining: REMAINING_CHICKEN_FIELDS.reduce((sum, field) => sum + sumLatestRemaining(reports, field), 0), order: sumChickenOrder(reports), unit: "กิโลกรัม" },
    { label: "ข้าวเหนียว", received: sumReports(reports, "received_sticky_rice"), used: sumReports(reports, "used_sticky_rice"), remaining: sumLatestRemaining(reports, "remaining_sticky_rice"), order: sumReports(reports, "order_sticky_rice"), unit: "กิโลกรัม" },
    { label: "น้ำมัน", received: sumReports(reports, "received_oil"), used: sumReports(reports, "used_oil"), remaining: sumLatestRemaining(reports, "remaining_oil"), order: sumReports(reports, "order_oil"), unit: "กิโลกรัม" },
  ];

  return (
    <section className="rounded-[1.75rem] border border-black/10 bg-white p-5 shadow-sm">
      <h2 className="text-2xl font-black">{title}</h2>
      <p className="mt-1 text-sm font-bold text-black/50">สรุปตามขั้นตอน: รับเข้า → ใช้ไป → คงเหลือ → ควรสั่งเพิ่ม</p>
      <div className="mt-4 overflow-hidden rounded-2xl border border-black/10">
        <div className="grid grid-cols-5 bg-black px-3 py-2 text-xs font-black text-white">
          <span>วัตถุดิบ</span>
          <span className="text-right">รับเข้า</span>
          <span className="text-right">ใช้ไป</span>
          <span className="text-right">เหลือ</span>
          <span className="text-right">ควรสั่งเพิ่ม</span>
        </div>
        {rows.map((row) => (
          <div key={row.label} className="grid grid-cols-5 border-t border-black/10 px-3 py-3 text-xs font-bold sm:text-sm">
            <span>{row.label}</span>
            <span className="text-right">{numberFormatter.format(row.received)}</span>
            <span className="text-right">{numberFormatter.format(row.used)}</span>
            <span className="text-right">{numberFormatter.format(row.remaining)}</span>
            <span className="text-right">{numberFormatter.format(row.order)}</span>
          </div>
        ))}
      </div>
      <p className="mt-2 text-xs font-bold text-black/50">หน่วย: กิโลกรัม • คงเหลือใช้ค่าล่าสุดของแต่ละสาขาในช่วงวันที่เลือก</p>
    </section>
  );
}

function RemainingInventoryGrid({
  title,
  reports,
}: {
  title: string;
  reports: DailyReport[];
}) {
  return (
    <section className="rounded-[1.75rem] border border-black/10 bg-white p-5 shadow-sm">
      <h2 className="text-2xl font-black">{title}</h2>
      <p className="mt-1 text-sm font-bold text-black/50">คงเหลือใช้ค่าล่าสุดของแต่ละสาขาในช่วงวันที่เลือก</p>
      <div className="mt-4 rounded-2xl bg-[#E60012]/30 p-4 text-center">
        <div className="text-sm font-black">รวมไก่คงเหลือทั้งหมด</div>
        <div className="text-3xl font-black">{numberFormatter.format(sumLatestRemainingChicken(reports))}</div>
        <div className="text-xs font-bold text-black/60">กิโลกรัม</div>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
        {REMAINING_INVENTORY_ITEMS.map((item) => (
          <div key={item.name} className="rounded-2xl bg-black/[0.04] p-3 text-center">
            <div className="text-sm font-black">{item.label}</div>
            <div className="text-2xl font-black">{numberFormatter.format(sumLatestRemaining(reports, item.name))}</div>
            <div className="text-xs font-bold text-black/50">{item.unit}</div>
          </div>
        ))}
      </div>
    </section>
  );
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
          <div key={item.name} className="rounded-2xl bg-[#E60012]/20 p-3 text-center">
            <div className="text-sm font-black">{item.label}</div>
            <div className="text-2xl font-black">{numberFormatter.format(sumReports(reports, item.name))}</div>
            <div className="text-xs font-bold text-black/50">{item.unit}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

function InventoryComparisonTable({ title, reports }: { title: string; reports: DailyReport[] }) {
  return (
    <section className="rounded-[1.75rem] border border-black/10 bg-white p-5 shadow-sm">
      <h2 className="text-2xl font-black">{title}</h2>
      <p className="mt-1 text-sm font-bold text-black/50">เทียบสูตรคงเหลือคำนวณวันนี้ = ยกมา + รับเข้า - ใช้ไป กับยอดปิดร้านจริง</p>
      <div className="mt-4 space-y-4">
        {reports.length === 0 ? (
          <p className="rounded-2xl bg-black/[0.04] p-4 text-sm font-bold text-black/60">ไม่มีข้อมูลสำหรับช่วงวันที่นี้</p>
        ) : reports.map((report) => (
          <article key={report.id} className="overflow-hidden rounded-2xl border border-black/10">
            <div className="bg-[#E60012]/30 px-3 py-2 text-sm font-black">{formatThaiDate(report.report_date)} • {report.branches?.name ?? report.branch_name}</div>
            <div className="grid grid-cols-4 bg-black px-3 py-2 text-xs font-black text-white">
              <span>วัตถุดิบ</span>
              <span className="text-right">คำนวณวันนี้</span>
              <span className="text-right">ปิดร้านจริง</span>
              <span className="text-right">ส่วนต่าง</span>
            </div>
            {INVENTORY_FLOW_ITEMS.map((item) => {
              const calculated = getCalculatedRemaining(report, item);
              const actual = Number(report[item.remaining] ?? 0);
              const difference = getInventoryDifference(report, item);
              return (
                <div key={item.label} className="grid grid-cols-4 border-t border-black/10 px-3 py-3 text-xs font-bold sm:text-sm">
                  <span>{item.label}</span>
                  <span className="text-right">{numberFormatter.format(calculated)}</span>
                  <span className="text-right">{numberFormatter.format(actual)}</span>
                  <span className={`text-right font-black ${difference === 0 ? "text-green-700" : "text-red-700"}`}>{numberFormatter.format(difference)}</span>
                </div>
              );
            })}
          </article>
        ))}
      </div>
    </section>
  );
}

export default async function ReportsPage({ searchParams }: ReportsPageProps) {
  const profile = await getCurrentProfile();
  if (canUseStaffCounterOrder(profile)) redirect("/counter-orders");
  if (!isOwner(profile)) redirect("/dashboard");

  const supabase = await createSupabaseServerClient();
  if (!supabase) redirect("/login?setup=supabase");

  const params = searchParams ? await searchParams : {};
  const today = todayISO();
  const from = isIsoDate(params.from) ? params.from! : today;
  const to = isIsoDate(params.to) ? params.to! : today;

  const { data: branchesData } = await supabase.from("branches").select("*").order("name").returns<Branch[]>();
  const branches = branchesData ?? [];
  const selectedBranchId = branches.some((branch) => branch.id === params.branch_id) ? params.branch_id : branches[0]?.id;

  const reportSelect = "*, branches(name, code, low_chicken_threshold, low_sticky_rice_threshold, low_oil_threshold)";

  const { data: allReportsData } = await supabase
    .from("daily_reports")
    .select(reportSelect)
    .gte("report_date", from)
    .lte("report_date", to)
    .order("report_date", { ascending: false })
    .returns<DailyReport[]>();
  const allReports = allReportsData ?? [];

  const branchReportsQuery = supabase
    .from("daily_reports")
    .select(reportSelect)
    .gte("report_date", from)
    .lte("report_date", to)
    .order("report_date", { ascending: false });

  if (selectedBranchId) branchReportsQuery.eq("branch_id", selectedBranchId);

  const { data: branchReportsData } = await branchReportsQuery.returns<DailyReport[]>();
  const branchReports = branchReportsData ?? [];

  if (process.env.NODE_ENV === "development") {
    console.info("owner_report_branch_debug", {
      selectedBranchId,
      reportBranchId: [...new Set(branchReports.map((report) => report.branch_id))],
    });
  }

  const branchNotes = branchReports
    .filter((report) => typeof report.note === "string" && report.note.trim().length > 0)
    .map((report) => ({
      report_date: report.report_date,
      branch_id: report.branch_id,
      branchName: report.branches?.name ?? "ไม่ระบุสาขา",
      note: report.note.trim(),
    }))
    .sort((a, b) => b.report_date.localeCompare(a.report_date));
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
        <p className="text-sm font-bold text-[#E60012]">สำหรับเจ้าของร้าน</p>
        <h1 className="mt-2 text-3xl font-black">รายงานสรุปผล</h1>
        <p className="mt-2 text-white/70">ดูภาพรวมทุกสาขาและเลือกดูแยกตามสาขาได้ตามช่วงวันที่</p>
      </section>

      <form className="grid gap-3 rounded-[1.75rem] border border-black/10 bg-white p-5 shadow-sm sm:grid-cols-[1fr_1fr_1.4fr_auto]" action="/reports">
        <div className="sm:col-span-4">
          <p className="mb-2 text-sm font-black text-black/60">ปุ่มลัดช่วงวันที่</p>
          <DateShortcuts basePath="/reports" branchId={selectedBranchId} />
        </div>
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
        <button className="focus-ring min-h-14 self-end rounded-2xl bg-[#E60012] px-6 text-lg font-black text-white shadow-sm">ดูรายงาน</button>
      </form>

      <section className="rounded-[1.75rem] border border-black/10 bg-white p-5 shadow-sm">
        <p className="text-sm font-bold text-black/50">A. รายงานสรุปทุกสาขา</p>
        <h2 className="text-2xl font-black">{formatThaiDate(from)} - {formatThaiDate(to)}</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <StatCard label="ยอดขายรวม" value={moneyFormatter.format(sumReports(allReports, "total_sales"))} tone="brand" />
          <StatCard label="เงินสดรวม" value={moneyFormatter.format(sumReports(allReports, "cash_sales"))} />
          <StatCard label="เงินโอนรวม" value={moneyFormatter.format(sumReports(allReports, "transfer_sales"))} />
          <StatCard label="จำนวนรายการที่บันทึก" value={numberFormatter.format(allReports.length)} tone="dark" />
          <StatCard label="จำนวนสาขาที่มีข้อมูล" value={numberFormatter.format(new Set(allReports.map((report) => report.branch_id)).size)} />
        </div>
      </section>

      <QuantityGrid title="ยกมา / คงเหลือจากเมื่อวานรวมทุกสาขา" items={OPENING_INVENTORY_ITEMS} reports={allReports} />
      <QuantityGrid title="วัตถุดิบรับเข้ารวมทุกสาขา" items={RECEIVED_INGREDIENT_ITEMS} reports={allReports} />
      <QuantityGrid title="วัตถุดิบใช้ไปรวมทุกสาขา" items={USED_INGREDIENT_ITEMS} reports={allReports} />
      <RemainingInventoryGrid title="สินค้าคงเหลือรวมทุกสาขา" reports={allReports} />
      <QuantityGrid title="รายการสั่งวัตถุดิบเพิ่มรวมทุกสาขา" items={ORDER_REQUEST_ITEMS} reports={allReports} />
      <InventoryFlowSummary title="ระบบรายงานวัตถุดิบรวมทุกสาขา" reports={allReports} />
      <InventoryComparisonTable title="คงเหลือคำนวณวันนี้และส่วนต่างรวมทุกสาขา" reports={allReports} />

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
          <StatCard label="ยอดขายของสาขา" value={moneyFormatter.format(sumReports(branchReports, "total_sales"))} tone="brand" />
          <StatCard label="เงินสดของสาขา" value={moneyFormatter.format(sumReports(branchReports, "cash_sales"))} />
          <StatCard label="เงินโอนของสาขา" value={moneyFormatter.format(sumReports(branchReports, "transfer_sales"))} />
          <StatCard label="จำนวนรายการที่พนักงานบันทึก" value={numberFormatter.format(branchReports.length)} tone="dark" />
        </div>
      </section>

      <QuantityGrid title={`ยกมา / คงเหลือจากเมื่อวานของ${selectedBranch?.name ?? "สาขา"}`} items={OPENING_INVENTORY_ITEMS} reports={branchReports} />
      <QuantityGrid title={`วัตถุดิบรับเข้าของ${selectedBranch?.name ?? "สาขา"}`} items={RECEIVED_INGREDIENT_ITEMS} reports={branchReports} />
      <QuantityGrid title={`วัตถุดิบใช้ไปของ${selectedBranch?.name ?? "สาขา"}`} items={USED_INGREDIENT_ITEMS} reports={branchReports} />
      <RemainingInventoryGrid title={`สินค้าคงเหลือของ${selectedBranch?.name ?? "สาขา"}`} reports={branchReports} />
      <QuantityGrid title={`รายการสั่งวัตถุดิบเพิ่มของ${selectedBranch?.name ?? "สาขา"}`} items={ORDER_REQUEST_ITEMS} reports={branchReports} />
      <InventoryFlowSummary title={`ระบบรายงานวัตถุดิบของ${selectedBranch?.name ?? "สาขา"}`} reports={branchReports} />
      <InventoryComparisonTable title={`คงเหลือคำนวณวันนี้และส่วนต่างของ${selectedBranch?.name ?? "สาขา"}`} reports={branchReports} />

      <section className="rounded-[1.75rem] border border-black/10 bg-white p-5 shadow-sm">
        <h2 className="text-2xl font-black">หมายเหตุจากสาขา</h2>

        {branchNotes.length === 0 ? (
          <p className="mt-4 rounded-2xl bg-black/[0.04] p-4 text-sm font-bold text-black/60">ไม่มีหมายเหตุ</p>
        ) : (
          <div className="mt-4 space-y-3">
            {branchNotes.map((report, index) => (
              <article key={`${report.report_date}-${report.branch_id}-${index}`} className="rounded-2xl bg-black/[0.04] p-4">
                <p className="text-sm font-bold text-black/50">{formatThaiDate(report.report_date)}</p>
                <p className="text-base font-black">{report.branchName}</p>
                <p className="mt-2 whitespace-pre-wrap text-base font-bold">{report.note}</p>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
