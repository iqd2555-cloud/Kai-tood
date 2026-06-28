import { redirect } from "next/navigation";
import { deleteCashFlowEntry, saveCashFlowEntry, syncSalesToCashFlow } from "@/app/actions";
import { CashFlowManualForm } from "@/components/cash-flow-manual-form";
import { StatCard } from "@/components/stat-card";
import { getCurrentProfile } from "@/lib/auth";
import { addDaysISO, CASH_FLOW_STATUS_LABEL, isActualStatus, isPendingStatus, type CashFlowEntry } from "@/lib/cash-flow";
import { formatThaiDate, moneyFormatter, numberFormatter, todayISO } from "@/lib/format";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import type { Branch } from "@/lib/types";

type SearchParams = { from?: string; to?: string; branch_id?: string; status?: string; category?: string; payment_method?: string; sync_message?: string; sync_ok?: string; cash_flow_message?: string; cash_flow_ok?: string };
type DailyReportRollupSales = {
  report_date: string;
  branch_code: string | null;
  cash_sales: number | string | null;
  total_sales: number | string | null;
};

type CashFlowLoadState = {
  branches: Branch[];
  categories: { id: string; name: string; type?: string; code?: string | null; is_active?: boolean }[];
  entries: CashFlowEntry[];
  dashboardEntries: CashFlowEntry[];
  todaySalesRollups: DailyReportRollupSales[];
  errorMessage: string | null;
};
type PageProps = { searchParams?: Promise<SearchParams> };

function sum(entries: CashFlowEntry[], type: "income" | "expense", predicate: (entry: CashFlowEntry) => boolean) {
  return entries.filter((entry) => entry.type === type && predicate(entry)).reduce((total, entry) => total + Number(entry.amount ?? 0), 0);
}

function sumRollupSales(rollups: DailyReportRollupSales[], key: "cash_sales" | "total_sales") {
  return rollups.reduce((total, rollup) => total + Number(rollup[key] ?? 0), 0);
}

function isISODate(value: unknown): value is string {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function safeThaiDate(value: string | null | undefined) {
  return isISODate(value) ? formatThaiDate(value) : "-";
}

function readableLoadError(error: unknown) {
  const message = error instanceof Error ? error.message : typeof error === "object" && error && "message" in error ? String(error.message) : String(error || "ไม่ทราบสาเหตุ");
  if (/permission denied|row-level security|rls|jwt/i.test(message)) return `โหลด Cash Flow ไม่สำเร็จ: สิทธิ์ Supabase/RLS ไม่อนุญาต (${message})`;
  return `โหลด Cash Flow ไม่สำเร็จ: ${message}`;
}

function forecast(entries: CashFlowEntry[], currentBalance: number, toDate: string) {
  const expectedIn = sum(entries, "income", (entry) => isPendingStatus(entry.status) && (entry.due_date ?? entry.transaction_date) <= toDate);
  const expectedOut = sum(entries, "expense", (entry) => isPendingStatus(entry.status) && (entry.due_date ?? entry.transaction_date) <= toDate);
  return currentBalance + expectedIn - expectedOut;
}

function plainAmount(entry: CashFlowEntry) {
  const amount = numberFormatter.format(Number(entry.amount ?? 0));
  return entry.type === "expense" ? `-${amount}` : amount;
}

function inputClass() { return "focus-ring min-h-12 w-full rounded-2xl border-2 border-black/10 bg-white px-4 text-base font-bold shadow-sm"; }

export default async function CashFlowPage({ searchParams }: PageProps) {
  const profile = await getCurrentProfile();
  if (profile.role !== "owner") redirect("/dashboard");
  const params = await searchParams;
  const today = todayISO();
  const from = params?.from?.match(/^\d{4}-\d{2}-\d{2}$/) ? params.from : today.slice(0, 8) + "01";
  const to = params?.to?.match(/^\d{4}-\d{2}-\d{2}$/) ? params.to : addDaysISO(today, 30);
  const supabase = await createSupabaseServerClient();
  if (!supabase) redirect("/login?setup=supabase");

  const loadState: CashFlowLoadState = { branches: [], categories: [], entries: [], dashboardEntries: [], todaySalesRollups: [], errorMessage: null };
  try {
    const [{ data: branches, error: branchesError }, { data: categories, error: categoriesError }] = await Promise.all([
      supabase.from("branches").select("id,name,code,low_chicken_threshold,low_sticky_rice_threshold,low_oil_threshold,is_active").order("name"),
      supabase.from("cash_flow_categories").select("id,name,type,code,is_active").eq("is_active", true).order("name"),
    ]);
    const setupError = branchesError ?? categoriesError;
    if (setupError) throw setupError;

    const selectedBranch = params?.branch_id ? ((branches as Branch[] | null) ?? []).find((branch) => branch.id === params.branch_id) : null;
    const entrySelect = "id,transaction_date,due_date,type,status,category,payment_method,branch_id,department,source,source_ref_id,amount,description,note,attachment_url,document_type,accountant_note,has_attachment,created_by,created_at,updated_at";
    let query = supabase.from("cash_flow_entries").select(entrySelect).gte("transaction_date", from).lte("transaction_date", to).order("transaction_date", { ascending: false });
    if (params?.branch_id) query = query.eq("branch_id", params.branch_id);
    if (params?.status) query = query.eq("status", params.status);
    if (params?.category) query = query.eq("category", params.category);
    if (params?.payment_method) query = query.eq("payment_method", params.payment_method);
    let todaySalesQuery = supabase.from("daily_report_rollups").select("report_date,branch_code,cash_sales,total_sales").eq("report_date", today);
    if (selectedBranch?.code) todaySalesQuery = todaySalesQuery.eq("branch_code", selectedBranch.code);

    const [{ data, error: entriesError }, { data: dashboardData, error: dashboardError }, { data: todaySalesRollups, error: todaySalesError }] = await Promise.all([
      query.returns<CashFlowEntry[]>(),
      supabase.from("cash_flow_entries").select(entrySelect).order("transaction_date", { ascending: false }).returns<CashFlowEntry[]>(),
      todaySalesQuery.returns<DailyReportRollupSales[]>(),
    ]);
    if (entriesError) {
      console.error("Cash flow entries load error:", entriesError);
    }
    if (dashboardError) {
      console.error("Cash flow dashboard load error:", dashboardError);
    }
    if (todaySalesError) {
      console.error("Daily report rollup sales load error:", todaySalesError);
    }
    const entryError = entriesError ?? dashboardError ?? todaySalesError;
    if (entryError) throw entryError;

    loadState.branches = (branches as Branch[] | null) ?? [];
    loadState.categories = categories ?? [];
    loadState.entries = data ?? [];
    loadState.dashboardEntries = dashboardData ?? [];
    loadState.todaySalesRollups = todaySalesRollups ?? [];
  } catch (error) {
    console.error("Cash Flow load error:", error);
    loadState.errorMessage = readableLoadError(error);
  }

  const { branches, categories, entries, dashboardEntries, todaySalesRollups, errorMessage } = loadState;
  const branchNameById = new Map(branches.map((branch) => [branch.id, branch.name]));
  const categoryNameByCode = new Map(categories.filter((category) => category.code).map((category) => [category.code as string, category.name]));
  const openingBalance = 0;
  const actualInToday = sumRollupSales(todaySalesRollups, "total_sales");
  const cashSalesToday = sumRollupSales(todaySalesRollups, "cash_sales");
  const actualOutToday = sum(dashboardEntries, "expense", (entry) => entry.transaction_date === today && entry.status === "paid");
  const actualIn = sum(dashboardEntries, "income", (entry) => isActualStatus(entry.status));
  const actualOut = sum(dashboardEntries, "expense", (entry) => isActualStatus(entry.status));
  const currentBalance = openingBalance + actualIn - actualOut;
  const pendingIn = sum(dashboardEntries, "income", (entry) => entry.status === "pending_receive");
  const pendingOut = sum(dashboardEntries, "expense", (entry) => entry.status === "pending_pay");
  const urgentPayables = entries.filter((entry) => entry.type === "expense" && isPendingStatus(entry.status)).slice(0, 5);
  const followReceivables = entries.filter((entry) => entry.type === "income" && isPendingStatus(entry.status)).slice(0, 5);

  return <div className="space-y-5">
    <section className="rounded-[2rem] bg-[#111] p-5 text-white shadow-lg">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-sm font-black text-[#FFD43B]">Cash Flow Center</p><h1 className="text-3xl font-black">ศูนย์บริหารกระแสเงินสด</h1><p className="mt-2 text-sm font-bold text-white/70">ดูเงินจริง รอรับ รอจ่าย และคาดการณ์ 7/30 วัน แบบไม่ซับซ้อนเหมือนบัญชีภาษี</p></div><form action={async (formData: FormData) => { "use server"; const result = await syncSalesToCashFlow(formData); const message = encodeURIComponent(result.message); const selectedDate = formData.get("selected_date") ?? to; redirect(`/cash-flow?from=${selectedDate}&to=${selectedDate}&sync_ok=${result.ok ? "1" : "0"}&sync_message=${message}`); }} className="flex flex-col gap-2 sm:items-end"><input type="date" className={inputClass()} name="selected_date" defaultValue={isISODate(params?.to) ? params?.to : today}/><select className={inputClass()} name="sync_range" defaultValue="today"><option value="today">ซิงก์ข้อมูลวันนี้</option><option value="7d">ซิงก์ข้อมูลย้อนหลัง 7 วัน</option><option value="30d">ซิงก์ข้อมูลย้อนหลัง 30 วัน</option></select><button className="focus-ring rounded-full bg-[#FFD43B] px-5 py-3 font-black text-black">ซิงก์ยอดขายอัตโนมัติ</button><p className="text-xs font-bold text-white/60">เลือกช่วงก่อนซิงก์ ระบบไม่ดึงทั้งเดือนอัตโนมัติ</p></form></div>
    </section>

    {params?.sync_message && <div className={`rounded-2xl border p-4 font-black ${params.sync_ok === "1" ? "border-green-200 bg-green-50 text-green-700" : "border-red-200 bg-red-50 text-red-700"}`}>{decodeURIComponent(params.sync_message)}</div>}
    {errorMessage && <div className="rounded-2xl border border-red-200 bg-red-50 p-4 font-black text-red-700">{errorMessage}<div className="mt-1 text-sm font-bold text-red-600">ตรวจสอบ Supabase error ด้านบนโดยตรง ระบบไม่ใช้ข้อมูลจำลองและไม่ซ่อน error ที่เกิดขึ้นจริง</div></div>}
    {params?.cash_flow_message && <div className={`rounded-2xl border p-4 font-black ${params.cash_flow_ok === "1" ? "border-green-200 bg-green-50 text-green-700" : "border-red-200 bg-red-50 text-red-700"}`}>{decodeURIComponent(params.cash_flow_message)}</div>}
    <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <StatCard label="เงินสดวันนี้" value={moneyFormatter.format(cashSalesToday)} tone="dark" />
      <StatCard label="รับวันนี้" value={moneyFormatter.format(actualInToday)} />
      <StatCard label="จ่ายวันนี้" value={moneyFormatter.format(actualOutToday)} />
      <StatCard label="เงินคงเหลือวันนี้" value={moneyFormatter.format(openingBalance + cashSalesToday - actualOutToday)} tone="brand" />
      <StatCard label="เงินรอรับทั้งหมด" value={moneyFormatter.format(pendingIn)} />
      <StatCard label="เงินรอจ่ายทั้งหมด" value={moneyFormatter.format(pendingOut)} />
      <StatCard label="คาดการณ์อีก 7 วัน" value={moneyFormatter.format(forecast(entries, currentBalance, addDaysISO(today, 7)))} />
      <StatCard label="คาดการณ์อีก 30 วัน" value={moneyFormatter.format(forecast(entries, currentBalance, addDaysISO(today, 30)))} />
    </section>

    <section className="grid gap-4 lg:grid-cols-2">
      <div className="rounded-[1.75rem] border border-black/10 bg-white p-5"><h2 className="text-xl font-black">รายการจ่ายเร่งด่วน</h2>{urgentPayables.map((e)=><p key={e.id} className="mt-3 flex justify-between gap-3 rounded-2xl bg-red-50 p-3 text-sm font-bold"><span>{e.description}<br/><span className="text-black/50">ครบกำหนด {safeThaiDate(e.due_date ?? e.transaction_date)}</span></span><span className="text-red-600">{plainAmount(e)}</span></p>)}</div>
      <div className="rounded-[1.75rem] border border-black/10 bg-white p-5"><h2 className="text-xl font-black">รายการรับที่ควรติดตาม</h2>{followReceivables.map((e)=><p key={e.id} className="mt-3 flex justify-between gap-3 rounded-2xl bg-yellow-50 p-3 text-sm font-bold"><span>{e.description}<br/><span className="text-black/50">ครบกำหนด {safeThaiDate(e.due_date ?? e.transaction_date)}</span></span><span className="text-green-700">{plainAmount(e)}</span></p>)}</div>
    </section>

    <section className="rounded-[1.75rem] border border-black/10 bg-white p-5 shadow-sm"><h2 className="text-2xl font-black">บันทึกรายการเอง</h2><CashFlowManualForm today={today} branches={branches as Branch[]} categories={categories} entries={entries} branchNameById={Object.fromEntries(branchNameById)} categoryNameByCode={Object.fromEntries(categoryNameByCode)} saveAction={async (formData: FormData) => { "use server"; const result = await saveCashFlowEntry(null, formData); const message = encodeURIComponent(result.message); const selectedDate = formData.get("transaction_date"); redirect(`/cash-flow?from=${selectedDate}&to=${selectedDate}&cash_flow_ok=${result.ok ? "1" : "0"}&cash_flow_message=${message}`); }} deleteAction={async (formData: FormData) => { "use server"; const result = await deleteCashFlowEntry(formData); const message = encodeURIComponent(result.message); const selectedDate = formData.get("transaction_date") ?? today; redirect(`/cash-flow?from=${selectedDate}&to=${selectedDate}&cash_flow_ok=${result.ok ? "1" : "0"}&cash_flow_message=${message}`); }} /></section>

    <section className="rounded-[1.75rem] border border-black/10 bg-white p-5 shadow-sm"><div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"><h2 className="text-2xl font-black">รายการ Cash Flow</h2><a className="rounded-full bg-black px-4 py-2 text-center text-sm font-black text-white" href={`/api/cash-flow/export?from=${from}&to=${to}`}>Export CSV ทั่วไป</a><a className="rounded-full bg-[#FFD43B] px-4 py-2 text-center text-sm font-black text-black" href={`/api/cash-flow/export?from=${from}&to=${to}&mode=accounting`}>Export CSV สำหรับสำนักงานบัญชี</a></div><form className="mt-4 grid gap-2 sm:grid-cols-5"><input className={inputClass()} type="date" name="from" defaultValue={from}/><input className={inputClass()} type="date" name="to" defaultValue={to}/><select className={inputClass()} name="branch_id"><option value="">ทุกสาขา</option>{(branches as Branch[] | null)?.map((b)=><option key={b.id} value={b.id}>{b.name}</option>)}</select><select className={inputClass()} name="status"><option value="">ทุกสถานะ</option>{Object.entries(CASH_FLOW_STATUS_LABEL).map(([v,l])=><option key={v} value={v}>{l}</option>)}</select><button className="rounded-2xl bg-[#FFD43B] font-black">กรอง</button></form><p className="mt-3 text-sm font-bold text-black/60">จัดการรายการด้วยปุ่มแก้ไข/ลบในตารางด้านบนหลังฟอร์มบันทึกรายการ</p></section>
  </div>;
}
