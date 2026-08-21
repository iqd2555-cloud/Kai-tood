import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentProfile, isOwner } from "@/lib/auth";
import {
  buildCeoTodaySummary,
  type CeoAlertRow,
  type CeoCompanyPeopleRow,
  type CeoSnapshotRow,
} from "@/lib/ceo-today";
import { formatThaiDate, moneyFormatter, numberFormatter, todayISO } from "@/lib/format";
import { createKpiSupabaseAdminClient } from "@/lib/kpi-supabase";
import { createSupabaseAdminClient } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

const percentFormatter = new Intl.NumberFormat("th-TH", {
  maximumFractionDigits: 1,
  signDisplay: "exceptZero",
});

const dateTimeFormatter = new Intl.DateTimeFormat("th-TH", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Asia/Bangkok",
});

function percent(value: number | null) {
  return value === null ? "รอข้อมูล" : `${percentFormatter.format(value)}%`;
}

function kg(value: number) {
  return `${numberFormatter.format(value)} กก.`;
}

function count(value: number | null, unit = "คน") {
  return value === null ? "รอข้อมูล" : `${value.toLocaleString("th-TH")} ${unit}`;
}

function metricTone(value: number | null, warningBelow = -20, dark = false) {
  if (value === null) return dark ? "text-white/50" : "text-zinc-500";
  if (value <= warningBelow) return dark ? "text-red-300" : "text-red-700";
  if (value < 0) return dark ? "text-amber-300" : "text-amber-700";
  return dark ? "text-emerald-300" : "text-emerald-700";
}

function severityClasses(severity: string) {
  if (severity === "critical") return "border-red-300 bg-red-50 text-red-950";
  if (severity === "high") return "border-orange-300 bg-orange-50 text-orange-950";
  return "border-amber-300 bg-amber-50 text-amber-950";
}

type LiveAttendanceRow = {
  staff_id: string;
  check_in_at: string | null;
  updated_at: string;
};

type LivePeopleSummary = {
  late_count?: number;
  absent_count?: number;
  leave_count?: number;
  weekly_off_count?: number;
  kpi_expected_count?: number;
  kpi_incomplete_count?: number;
};

function MetricCard({ label, value, helper, valueClass = "text-black" }: { label: string; value: string; helper?: string; valueClass?: string }) {
  return (
    <div className="rounded-2xl border border-black/8 bg-white p-4 shadow-sm">
      <p className="text-sm font-bold text-black/55">{label}</p>
      <p className={`mt-1 text-2xl font-black leading-tight ${valueClass}`}>{value}</p>
      {helper ? <p className="mt-2 text-xs font-semibold leading-relaxed text-black/45">{helper}</p> : null}
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="rounded-[2rem] border border-amber-300 bg-amber-50 p-6">
      <h1 className="text-3xl font-black">CEO Today</h1>
      <p className="mt-3 font-semibold text-amber-950">{message}</p>
      <Link href="/daily" className="mt-5 inline-flex rounded-full bg-black px-5 py-3 font-black text-white">
        ไปหน้ากรอกรายงาน
      </Link>
    </div>
  );
}

export default async function CeoTodayPage() {
  const profile = await getCurrentProfile();
  if (!isOwner(profile)) redirect("/dashboard");

  const admin = createSupabaseAdminClient();
  if (!admin) return <EmptyState message="เซิร์ฟเวอร์ยังไม่พร้อมอ่านฐานข้อมูลกลาง" />;

  const { data: latest, error: latestError } = await admin
    .from("daily_business_snapshot")
    .select("business_date")
    .order("business_date", { ascending: false })
    .limit(1)
    .maybeSingle<{ business_date: string }>();

  if (latestError) console.error("ceo_today_latest_snapshot_failed", latestError);
  if (!latest?.business_date) return <EmptyState message="ยังไม่มี Daily Business Snapshot ให้แสดง" />;

  const businessDate = latest.business_date;
  const kpi = createKpiSupabaseAdminClient();
  const liveAttendancePromise = kpi
    ? kpi
        .from("attendance_logs")
        .select("staff_id,check_in_at,updated_at")
        .eq("work_date", businessDate)
        .not("check_in_at", "is", null)
        .returns<LiveAttendanceRow[]>()
    : Promise.resolve({ data: null, error: null });
  const livePeopleSummaryPromise = kpi
    ? kpi.rpc("owner_people_daily_summary", { p_work_date: businessDate })
    : Promise.resolve({ data: null, error: null });

  const [snapshotsResult, alertsResult, peopleResult, liveAttendanceResult, livePeopleSummaryResult] = await Promise.all([
    admin
      .from("daily_business_snapshot")
      .select(
        "id,business_date,branch_id,cash_sales,transfer_sales,total_sales,yesterday_sales,average_sales_30d,chicken_products_total_kg,sticky_rice_used_kg,packs_sold,chicken_yield_packs_per_kg,rice_yield_packs_per_kg,branch_cash_in,branch_cash_out,branch_net_cashflow,cash_variance,labor_cost,labor_cost_pct,staff_present_count,staff_late_count,complaint_count,open_alert_count,critical_alert_count,snapshot_status,data_quality_flags,calculated_at,branch:branches(code,name)",
      )
      .eq("business_date", businessDate)
      .order("branch_id")
      .returns<CeoSnapshotRow[]>(),
    admin
      .from("business_alerts")
      .select("id,alert_date,branch_id,rule_code,severity,metric_value,threshold_value,title,message,status")
      .eq("alert_date", businessDate)
      .in("status", ["open", "acknowledged"])
      .order("created_at", { ascending: false })
      .returns<CeoAlertRow[]>(),
    admin
      .from("people_daily_company_metrics")
      .select(
        "present_staff_count,absent_staff_count,late_staff_count,approved_leave_count,weekly_off_count,attendance_is_final,kpi_expected_count,kpi_complete_count,kpi_incomplete_count,kpi_is_final,synced_at",
      )
      .eq("work_date", businessDate)
      .order("synced_at", { ascending: false })
      .limit(1)
      .maybeSingle<CeoCompanyPeopleRow>(),
    liveAttendancePromise,
    livePeopleSummaryPromise,
  ]);

  if (snapshotsResult.error) console.error("ceo_today_snapshots_failed", snapshotsResult.error);
  if (alertsResult.error) console.error("ceo_today_alerts_failed", alertsResult.error);
  if (peopleResult.error) console.error("ceo_today_people_failed", peopleResult.error);
  if (liveAttendanceResult.error) console.error("ceo_today_live_attendance_failed", liveAttendanceResult.error);
  if (livePeopleSummaryResult.error) console.error("ceo_today_live_people_summary_failed", livePeopleSummaryResult.error);

  const snapshots = snapshotsResult.data ?? [];
  const alerts = alertsResult.data ?? [];
  const liveAttendance = (liveAttendanceResult.data ?? []) as LiveAttendanceRow[];
  const livePeopleSummary = (livePeopleSummaryResult.data ?? null) as LivePeopleSummary | null;
  const liveStaffIds = new Set(liveAttendance.map((row) => row.staff_id));
  const livePeople: CeoCompanyPeopleRow | null = liveStaffIds.size > 0
    ? {
        present_staff_count: liveStaffIds.size,
        absent_staff_count: livePeopleSummary?.absent_count ?? null,
        late_staff_count: livePeopleSummary?.late_count ?? null,
        approved_leave_count: livePeopleSummary?.leave_count ?? null,
        weekly_off_count: livePeopleSummary?.weekly_off_count ?? null,
        attendance_is_final: false,
        kpi_expected_count: livePeopleSummary?.kpi_expected_count ?? null,
        kpi_complete_count: null,
        kpi_incomplete_count: livePeopleSummary?.kpi_incomplete_count ?? null,
        kpi_is_final: false,
        synced_at: liveAttendance.map((row) => row.updated_at).sort().at(-1) ?? null,
      }
    : null;
  const people = livePeople ?? peopleResult.data ?? null;
  const summary = buildCeoTodaySummary(snapshots, people);
  if (!summary) return <EmptyState message="พบวันที่ล่าสุด แต่ยังไม่มีข้อมูลสาขาใน Snapshot" />;

  const isCurrentDay = businessDate === todayISO();
  const actionCount = alerts.length;
  const branchNames = new Map(summary.branches.map((branch) => [branch.branchId, branch.branchName]));

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6 pb-12">
      <section className="overflow-hidden rounded-[2rem] bg-black text-white shadow-xl">
        <div className="border-b border-white/10 bg-[radial-gradient(circle_at_top_right,rgba(246,196,0,.36),transparent_45%)] p-6 sm:p-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-sm font-black uppercase tracking-[0.18em] text-[#FFD43B]">CEO Today</p>
              <h1 className="mt-2 text-3xl font-black sm:text-5xl">เรื่องที่ต้องรู้ในหน้าเดียว</h1>
              <p className="mt-3 max-w-2xl font-semibold text-white/65">
                ข้อมูลจริงล่าสุด {formatThaiDate(summary.businessDate)} • {summary.branchCount} สาขา
                {!isCurrentDay ? " • ยังไม่มีรายงานของวันนี้ จึงแสดงวันล่าสุด" : ""}
              </p>
            </div>
            <div className={`rounded-2xl px-5 py-4 ${actionCount > 0 ? "bg-red-600" : "bg-emerald-600"}`}>
              <p className="text-xs font-black text-white/75">ต้องจัดการ</p>
              <p className="text-3xl font-black">{actionCount > 0 ? `${actionCount} เรื่อง` : "ปกติ"}</p>
            </div>
          </div>
        </div>
        <div className="grid gap-px bg-white/10 sm:grid-cols-3">
          <div className="bg-black/85 p-5">
            <p className="text-sm font-bold text-white/55">ยอดขายรวม</p>
            <p className="mt-1 text-3xl font-black text-[#FFD43B]">{moneyFormatter.format(summary.totalSales)}</p>
          </div>
          <div className="bg-black/85 p-5">
            <p className="text-sm font-bold text-white/55">เทียบเมื่อวาน</p>
            <p className={`mt-1 text-3xl font-black ${metricTone(summary.salesVsYesterdayPct, -20, true)}`}>{percent(summary.salesVsYesterdayPct)}</p>
          </div>
          <div className="bg-black/85 p-5">
            <p className="text-sm font-bold text-white/55">เทียบเฉลี่ย 30 วัน</p>
            <p className={`mt-1 text-3xl font-black ${metricTone(summary.salesVs30dPct, -20, true)}`}>{percent(summary.salesVs30dPct)}</p>
          </div>
        </div>
      </section>

      <section aria-labelledby="ceo-actions" className="space-y-3">
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="text-sm font-black text-red-700">ลำดับแรก</p>
            <h2 id="ceo-actions" className="text-2xl font-black">ต้องดูวันนี้</h2>
          </div>
          <span className="rounded-full bg-black px-3 py-1 text-xs font-black text-white">กฎธุรกิจตรวจให้อัตโนมัติ</span>
        </div>
        {alerts.length > 0 ? (
          <div className="space-y-3">
            {alerts.map((alert, index) => (
              <article key={alert.id} className={`rounded-2xl border p-5 ${severityClasses(alert.severity)}`}>
                <div className="flex gap-4">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-black text-lg font-black text-white">{index + 1}</span>
                  <div>
                    <p className="text-xs font-black uppercase tracking-wide opacity-60">
                      {alert.branch_id ? branchNames.get(alert.branch_id) ?? "ไม่ระบุสาขา" : "ทั้งบริษัท"} • {alert.severity}
                    </p>
                    <h3 className="mt-1 text-xl font-black">{alert.title}</h3>
                    <p className="mt-2 font-semibold leading-relaxed opacity-80">{alert.message}</p>
                  </div>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 font-bold text-emerald-900">
            ยังไม่พบ Alert เปิดอยู่ในวันที่แสดง
          </div>
        )}
        <div className="flex flex-wrap gap-2 text-sm font-black">
          <Link href="/customer-feedback-admin" className="rounded-full border border-black/10 bg-white px-4 py-2">
            ข้อร้องเรียนใน Snapshot {summary.complaintCount} เรื่อง
          </Link>
          <span className="rounded-full border border-black/10 bg-white px-4 py-2">
            Critical Alert {summary.criticalAlertCount} เรื่อง
          </span>
        </div>
      </section>

      <section aria-labelledby="sales-heading" className="space-y-3">
        <h2 id="sales-heading" className="text-2xl font-black">1. ยอดขาย</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <MetricCard label="ยอดขายรวม" value={moneyFormatter.format(summary.totalSales)} helper={`${summary.branchCount} สาขา`} />
          <MetricCard label="เงินสด" value={moneyFormatter.format(summary.cashSales)} />
          <MetricCard label="เงินโอน" value={moneyFormatter.format(summary.transferSales)} />
          <MetricCard label="ค่าเฉลี่ย 30 วัน" value={moneyFormatter.format(summary.averageSales30d)} />
        </div>
      </section>

      <section aria-labelledby="yield-heading" className="space-y-3">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <h2 id="yield-heading" className="text-2xl font-black">2. Yield วัตถุดิบ</h2>
          {summary.branchesAwaitingPacks > 0 ? (
            <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-black text-amber-900">
              รอจำนวนห่อ {summary.branchesAwaitingPacks} สาขา
            </span>
          ) : null}
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <MetricCard label="จำนวนห่อขายจริง" value={summary.packsReportedBranches ? count(summary.packsSold, "ห่อ") : "รอข้อมูล"} helper={`ส่งแล้ว ${summary.packsReportedBranches}/${summary.branchCount} สาขา`} />
          <MetricCard label="ไก่ใช้" value={kg(summary.chickenKg)} />
          <MetricCard label="Chicken Yield" value={summary.chickenYield === null ? "รอข้อมูล" : `${numberFormatter.format(summary.chickenYield)} ห่อ/กก.`} helper="มาตรฐานเริ่มต้น 8 ห่อ/กก." />
          <MetricCard label="Rice Yield" value={summary.riceYield === null ? "รอข้อมูล" : `${numberFormatter.format(summary.riceYield)} ห่อ/กก.`} helper={`ข้าวใช้ ${kg(summary.riceKg)} • มาตรฐาน 10 ห่อ/กก.`} />
        </div>
        {summary.branchesAwaitingPacks > 0 ? (
          <p className="rounded-xl bg-zinc-100 px-4 py-3 text-sm font-semibold text-zinc-700">
            ระบบไม่ใช้จำนวนถุงหรือบรรจุภัณฑ์แทนยอดขาย เมื่อพนักงานกรอก “จำนวนห่อขายจริง” Yield จะคำนวณและแสดงที่นี่อัตโนมัติ
          </p>
        ) : null}
      </section>

      <section aria-labelledby="people-heading" className="space-y-3">
        <h2 id="people-heading" className="text-2xl font-black">3. พนักงาน</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <MetricCard label="มาทำงาน" value={count(summary.staffPresent)} />
          <MetricCard label="ขาดงาน" value={count(summary.staffAbsent)} valueClass={summary.staffAbsent ? "text-red-700" : "text-black"} />
          <MetricCard label="มาสาย" value={count(summary.staffLate)} valueClass={summary.staffLate ? "text-amber-700" : "text-black"} />
          <MetricCard label="KPI ยังไม่ครบ" value={count(summary.kpiIncomplete)} helper={summary.kpiExpected === null ? "รอข้อมูล KPI" : `จากผู้ที่ต้องส่ง ${summary.kpiExpected} คน`} />
        </div>
      </section>

      <section aria-labelledby="money-heading" className="space-y-3">
        <h2 id="money-heading" className="text-2xl font-black">4. เงิน</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <MetricCard label="Cash In" value={moneyFormatter.format(summary.cashIn)} helper="เฉพาะรายการที่ผูกสาขา" />
          <MetricCard label="Cash Out" value={moneyFormatter.format(summary.cashOut)} helper="เฉพาะรายการที่ผูกสาขา" />
          <MetricCard label="Net Cash Flow" value={moneyFormatter.format(summary.netCashflow)} />
          <MetricCard label="เงินคลาดเคลื่อน" value={summary.cashVariance === null ? "รอข้อมูล" : moneyFormatter.format(summary.cashVariance)} />
          <MetricCard label="ค่าแรงต่อยอดขาย" value={summary.laborCostPct === null ? "รอข้อมูล" : `${numberFormatter.format(summary.laborCostPct)}%`} helper={summary.laborCost === null ? "ยังไม่มีค่าแรง" : moneyFormatter.format(summary.laborCost)} />
        </div>
      </section>

      <section aria-labelledby="branch-heading" className="space-y-3">
        <h2 id="branch-heading" className="text-2xl font-black">5. แยกตามสาขา</h2>
        <div className="grid gap-3 lg:grid-cols-2">
          {summary.branches.map((branch) => (
            <article key={branch.branchId} className="rounded-2xl border border-black/10 bg-white p-5 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-black text-black/40">{branch.branchCode}</p>
                  <h3 className="text-xl font-black">{branch.branchName}</h3>
                </div>
                <span className={`rounded-full px-3 py-1 text-xs font-black ${branch.alertCount ? "bg-red-100 text-red-800" : "bg-emerald-100 text-emerald-800"}`}>
                  {branch.alertCount ? `${branch.alertCount} Alert` : "ปกติ"}
                </span>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                <div><p className="font-bold text-black/45">ยอดขาย</p><p className="text-xl font-black">{moneyFormatter.format(branch.totalSales)}</p></div>
                <div><p className="font-bold text-black/45">เทียบเฉลี่ย 30 วัน</p><p className={`text-xl font-black ${metricTone(branch.salesVs30dPct)}`}>{percent(branch.salesVs30dPct)}</p></div>
                <div><p className="font-bold text-black/45">ไก่ / Yield</p><p className="font-black">{kg(branch.chickenKg)} / {branch.chickenYield === null ? "รอห่อ" : numberFormatter.format(branch.chickenYield)}</p></div>
                <div><p className="font-bold text-black/45">คน</p><p className="font-black">มา {branch.staffPresent} • สาย {branch.staffLate}</p></div>
              </div>
            </article>
          ))}
        </div>
      </section>

      <footer className="rounded-2xl bg-zinc-100 px-5 py-4 text-sm font-semibold text-zinc-600">
        Snapshot คำนวณล่าสุด {dateTimeFormatter.format(new Date(summary.calculatedAt))} • ข้อมูลพนักงานวันนี้อ่านสดจากระบบเช็กอิน และใช้ฐานกลางเป็นข้อมูลสำรอง
      </footer>
    </div>
  );
}
