import { redirect } from "next/navigation";
import { deleteCashFlowEntry, saveCashFlowEntry, syncSalesToCashFlow } from "@/app/actions";
import { CashFlowManualForm } from "@/components/cash-flow-manual-form";
import { DateShortcuts } from "@/components/date-shortcuts";
import { StatCard } from "@/components/stat-card";
import { getCurrentProfile } from "@/lib/auth";
import { addDaysISO, calculateCashFlowSummary, CASH_FLOW_STATUS_LABEL, isPendingStatus, type CashFlowEntry } from "@/lib/cash-flow";
import { CASH_FLOW_ENTRIES_TABLE } from "@/lib/cash-flow-constants";
import { currentMonthStartISO, formatThaiDate, moneyFormatter, numberFormatter, todayISO } from "@/lib/format";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import type { Branch } from "@/lib/types";

type SearchParams = { from?: string; to?: string; range?: string; branch_id?: string; status?: string; category?: string; payment_method?: string; sync_message?: string; sync_ok?: string; cash_flow_message?: string; cash_flow_ok?: string };
type CashFlowLoadState = {
  branches: Branch[];
  categories: { id: string; name: string; type?: string; code?: string | null; is_active?: boolean }[];
  entries: CashFlowEntry[];
  errorMessage: string | null;
};
type PageProps = { searchParams?: Promise<SearchParams> };

function sum(entries: CashFlowEntry[], type: "income" | "expense", predicate: (entry: CashFlowEntry) => boolean) {
  return entries.filter((entry) => entry.type === type && predicate(entry)).reduce((total, entry) => total + Number(entry.amount ?? 0), 0);
}

function isSameDateRange(from: string, to: string) {
  return isISODate(from) && isISODate(to) && from === to;
}

function dashboardRangeLabel(kind: "income" | "expense", from: string, to: string, today: string) {
  const prefix = kind === "income" ? "รับ" : "จ่าย";
  if (isSameDateRange(from, to) && to === today) return `${prefix}วันนี้`;
  if (isSameDateRange(from, to)) return `${prefix}วันที่ ${safeThaiDate(to)}`;
  return `${prefix}ตามช่วงที่เลือก`;
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

function monthStartISO(isoDate: FormDataEntryValue | null | undefined, fallback: string) {
  const value = typeof isoDate === "string" && isISODate(isoDate) ? isoDate : fallback;
  return `${value.slice(0, 8)}01`;
}

function cashFlowRedirectPath(fromDate: string, toDate: FormDataEntryValue | null | undefined, ok: boolean, message: string) {
  const selectedDate = typeof toDate === "string" && isISODate(toDate) ? toDate : fromDate;
  return `/cash-flow?from=${fromDate}&to=${selectedDate}&cash_flow_ok=${ok ? "1" : "0"}&cash_flow_message=${message}`;
}

function exportHref(from: string, to: string, isAllRange: boolean, mode?: "accounting") {
  const params = new URLSearchParams();
  if (isAllRange) {
    params.set("range", "all");
  } else {
    params.set("from", from);
    params.set("to", to);
  }
  if (mode) params.set("mode", mode);
  return `/api/cash-flow/export?${params.toString()}`;
}

export default async function CashFlowPage({ searchParams }: PageProps) {
  const profile = await getCurrentProfile();
  if (profile.role !== "owner") redirect("/dashboard");
  const params = await searchParams;
  const today = todayISO();
  const isAllRange = params?.range === "all";
  const from = isAllRange ? "" : params?.from?.match(/^\d{4}-\d{2}-\d{2}$/) ? params.from : currentMonthStartISO();
  const to = isAllRange ? "" : params?.to?.match(/^\d{4}-\d{2}-\d{2}$/) ? params.to : today;
  const supabaseClient = await createSupabaseServerClient();
  if (!supabaseClient) redirect("/login?setup=supabase");
  const supabase = supabaseClient;

  async function loadCashFlowData(): Promise<CashFlowLoadState> {
    const loadState: CashFlowLoadState = { branches: [], categories: [], entries: [], errorMessage: null };
    try {
      const [{ data: branches, error: branchesError }, { data: categories, error: categoriesError }] = await Promise.all([
        supabase.from("branches").select("id,name,code,low_chicken_threshold,low_sticky_rice_threshold,low_oil_threshold,is_active").order("name"),
        supabase.from("cash_flow_categories").select("id,name,type,code,is_active").eq("is_active", true).order("name"),
      ]);
      const setupError = branchesError ?? categoriesError;
      if (setupError) throw setupError;

      const entrySelect = "id,transaction_date,due_date,type,status,category,payment_method,branch_id,department,source,source_ref_id,amount,description,note,attachment_url,document_type,accountant_note,has_attachment,created_by,created_at,updated_at";
      let query = supabase.from(CASH_FLOW_ENTRIES_TABLE).select(entrySelect);
      if (!isAllRange) query = query.gte("transaction_date", from).lte("transaction_date", to);
      if (params?.branch_id) query = query.eq("branch_id", params.branch_id);
      if (params?.status) query = query.eq("status", params.status);
      if (params?.category) query = query.eq("category", params.category);
      if (params?.payment_method) query = query.eq("payment_method", params.payment_method);
      const { data, error: entriesError } = await query.order("transaction_date", { ascending: false }).returns<CashFlowEntry[]>();
      if (entriesError) throw entriesError;

      loadState.branches = (branches as Branch[] | null) ?? [];
      loadState.categories = categories ?? [];
      loadState.entries = (data ?? []).map((entry) => ({
        ...entry,
        id: entry.id,
        db_id: entry.id,
        source: entry.source ?? "manual",
        source_table: CASH_FLOW_ENTRIES_TABLE,
        dbPath: `public.${CASH_FLOW_ENTRIES_TABLE}/${entry.id}`,
      }));
    } catch (error) {
      console.error("Cash Flow load error:", error);
      loadState.errorMessage = readableLoadError(error);
    }
    return loadState;
  }

  const { branches, categories, entries, errorMessage } = await loadCashFlowData();
  const branchNameById = new Map(branches.map((branch) => [branch.id, branch.name]));
  const categoryNameByCode = new Map(categories.filter((category) => category.code).map((category) => [category.code as string, category.name]));
  const openingBalance = 0;
  const selectedDate = isISODate(to) ? to : today;
  const filterStartDate = isISODate(from) ? from : selectedDate;
  const filterEndDate = isISODate(to) ? to : selectedDate;
  const cashFlowSummary = calculateCashFlowSummary(entries, selectedDate, filterStartDate, filterEndDate);
  const currentBalance = openingBalance + cashFlowSummary.todayNetCash;
  const pendingIn = sum(entries, "income", (entry) => entry.status === "pending_receive");
  const pendingOut = sum(entries, "expense", (entry) => entry.status === "pending_pay");
  const urgentPayables = entries.filter((entry) => entry.type === "expense" && isPendingStatus(entry.status)).slice(0, 5);
  const followReceivables = entries.filter((entry) => entry.type === "income" && isPendingStatus(entry.status)).slice(0, 5);

  return <div className="space-y-5">
    <section className="rounded-[2rem] bg-[#111] p-5 text-white shadow-lg">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-sm font-black text-[#FFD43B]">Cash Flow Center</p><h1 className="text-3xl font-black">ศูนย์บริหารกระแสเงินสด</h1><p className="mt-2 text-sm font-bold text-white/70">ดูเงินจริง รอรับ รอจ่าย และคาดการณ์ 7/30 วัน แบบไม่ซับซ้อนเหมือนบัญชีภาษี</p></div><form action={async (formData: FormData) => { "use server"; const result = await syncSalesToCashFlow(formData); const message = encodeURIComponent(result.message); const selectedDate = formData.get("selected_date") ?? to; redirect(`/cash-flow?from=${monthStartISO(selectedDate, today)}&to=${selectedDate}&sync_ok=${result.ok ? "1" : "0"}&sync_message=${message}`); }} className="flex flex-col gap-2 sm:items-end"><input type="date" className={inputClass()} name="selected_date" defaultValue={isISODate(params?.to) ? params?.to : today}/><select className={inputClass()} name="sync_range" defaultValue="today"><option value="today">ซิงก์ข้อมูลวันนี้</option><option value="7d">ซิงก์ข้อมูลย้อนหลัง 7 วัน</option><option value="30d">ซิงก์ข้อมูลย้อนหลัง 30 วัน</option></select><button className="focus-ring rounded-full bg-[#FFD43B] px-5 py-3 font-black text-black">ซิงก์ยอดขายอัตโนมัติ</button><p className="text-xs font-bold text-white/60">เลือกช่วงก่อนซิงก์ ระบบไม่ดึงทั้งเดือนอัตโนมัติ</p></form></div>
    </section>

    {params?.sync_message && <div className={`rounded-2xl border p-4 font-black ${params.sync_ok === "1" ? "border-green-200 bg-green-50 text-green-700" : "border-red-200 bg-red-50 text-red-700"}`}>{decodeURIComponent(params.sync_message)}</div>}
    {errorMessage && <div className="rounded-2xl border border-red-200 bg-red-50 p-4 font-black text-red-700">{errorMessage}<div className="mt-1 text-sm font-bold text-red-600">ตรวจสอบ Supabase error ด้านบนโดยตรง ระบบไม่ใช้ข้อมูลจำลองและไม่ซ่อน error ที่เกิดขึ้นจริง</div></div>}
    {params?.cash_flow_message && <div className={`rounded-2xl border p-4 font-black ${params.cash_flow_ok === "1" ? "border-green-200 bg-green-50 text-green-700" : "border-red-200 bg-red-50 text-red-700"}`}>{decodeURIComponent(params.cash_flow_message)}</div>}
    <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <StatCard label="เงินสดวันนี้" value={numberFormatter.format(cashFlowSummary.todayCash)} tone="dark" />
      <StatCard label="รับวันนี้" value={numberFormatter.format(cashFlowSummary.todayIncome)} />
      <StatCard label="จ่ายวันนี้" value={numberFormatter.format(cashFlowSummary.todayExpense)} />
      <StatCard label="Net Cash" value={numberFormatter.format(cashFlowSummary.todayNetCash)} tone="brand" />
      <StatCard label={dashboardRangeLabel("income", from, to, today)} value={numberFormatter.format(cashFlowSummary.rangeIncome)} />
      <StatCard label={dashboardRangeLabel("expense", from, to, today)} value={numberFormatter.format(cashFlowSummary.rangeExpense)} />
      <StatCard label="Net Cash ตามช่วง" value={numberFormatter.format(cashFlowSummary.rangeNetCash)} tone="brand" />
      <StatCard label="เงินรอรับทั้งหมด" value={moneyFormatter.format(pendingIn)} />
      <StatCard label="เงินรอจ่ายทั้งหมด" value={moneyFormatter.format(pendingOut)} />
      <StatCard label="คาดการณ์อีก 7 วัน" value={moneyFormatter.format(forecast(entries, currentBalance, addDaysISO(today, 7)))} />
      <StatCard label="คาดการณ์อีก 30 วัน" value={moneyFormatter.format(forecast(entries, currentBalance, addDaysISO(today, 30)))} />
    </section>

    <section className="grid gap-4 lg:grid-cols-2">
      <div className="rounded-[1.75rem] border border-black/10 bg-white p-5"><h2 className="text-xl font-black">รายการจ่ายเร่งด่วน</h2>{urgentPayables.map((e)=><p key={e.id} className="mt-3 flex justify-between gap-3 rounded-2xl bg-red-50 p-3 text-sm font-bold"><span>{e.description}<br/><span className="text-black/50">ครบกำหนด {safeThaiDate(e.due_date ?? e.transaction_date)}</span></span><span className="text-red-600">{plainAmount(e)}</span></p>)}</div>
      <div className="rounded-[1.75rem] border border-black/10 bg-white p-5"><h2 className="text-xl font-black">รายการรับที่ควรติดตาม</h2>{followReceivables.map((e)=><p key={e.id} className="mt-3 flex justify-between gap-3 rounded-2xl bg-yellow-50 p-3 text-sm font-bold"><span>{e.description}<br/><span className="text-black/50">ครบกำหนด {safeThaiDate(e.due_date ?? e.transaction_date)}</span></span><span className="text-green-700">{plainAmount(e)}</span></p>)}</div>
    </section>

    <section className="rounded-[1.75rem] border border-black/10 bg-white p-5 shadow-sm"><h2 className="text-2xl font-black">บันทึกรายการเอง</h2><CashFlowManualForm today={today} branches={branches as Branch[]} categories={categories} entries={entries} branchNameById={Object.fromEntries(branchNameById)} categoryNameByCode={Object.fromEntries(categoryNameByCode)} saveAction={async (formData: FormData) => { "use server"; const result = await saveCashFlowEntry(null, formData); const message = encodeURIComponent(result.message); const selectedDate = formData.get("transaction_date"); redirect(cashFlowRedirectPath(monthStartISO(selectedDate, today), selectedDate, result.ok, message)); }} deleteAction={deleteCashFlowEntry} /></section>

    <section className="rounded-[1.75rem] border border-black/10 bg-white p-5 shadow-sm"><div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"><h2 className="text-2xl font-black">รายการ Cash Flow</h2><div className="flex flex-wrap gap-2"><a className="rounded-full bg-black px-4 py-2 text-center text-sm font-black text-white" href={exportHref(from, to, isAllRange)}>Export CSV ทั่วไป</a><a className="rounded-full bg-[#FFD43B] px-4 py-2 text-center text-sm font-black text-black" href={exportHref(from, to, isAllRange, "accounting")}>Export CSV สำหรับสำนักงานบัญชี</a></div></div><div className="mt-4"><p className="mb-2 text-sm font-black text-black/60">ช่วงวันที่ด่วน</p><DateShortcuts basePath="/cash-flow" branchId={params?.branch_id} /></div><form className="mt-4 grid gap-2 sm:grid-cols-5"><input className={inputClass()} type="date" name="from" defaultValue={from}/><input className={inputClass()} type="date" name="to" defaultValue={to}/><select className={inputClass()} name="branch_id" defaultValue={params?.branch_id ?? ""}><option value="">ทุกสาขา</option>{(branches as Branch[] | null)?.map((b)=><option key={b.id} value={b.id}>{b.name}</option>)}</select><select className={inputClass()} name="status" defaultValue={params?.status ?? ""}><option value="">ทุกสถานะ</option>{Object.entries(CASH_FLOW_STATUS_LABEL).map(([v,l])=><option key={v} value={v}>{l}</option>)}</select><button className="rounded-2xl bg-[#FFD43B] font-black">กรอง</button></form><p className="mt-3 text-sm font-bold text-black/60">จัดการรายการด้วยปุ่มแก้ไข/ลบในตารางด้านบนหลังฟอร์มบันทึกรายการ</p></section>
  </div>;
}
