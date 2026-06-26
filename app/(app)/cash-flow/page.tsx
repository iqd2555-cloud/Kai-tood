import { redirect } from "next/navigation";
import { saveCashFlowEntry, syncDailySalesToCashFlow } from "@/app/actions";
import { StatCard } from "@/components/stat-card";
import { getCurrentProfile } from "@/lib/auth";
import { addDaysISO, CASH_FLOW_SOURCE_LABEL, CASH_FLOW_STATUS_LABEL, CASH_FLOW_TYPE_LABEL, isActualStatus, isPendingStatus, type CashFlowEntry } from "@/lib/cash-flow";
import { formatThaiDate, moneyFormatter, todayISO } from "@/lib/format";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import type { Branch } from "@/lib/types";

type SearchParams = { from?: string; to?: string; branch_id?: string; status?: string; category_id?: string; money_channel_id?: string; sync_message?: string; sync_ok?: string };
type PageProps = { searchParams?: Promise<SearchParams> };

function sum(entries: CashFlowEntry[], type: "income" | "expense", predicate: (entry: CashFlowEntry) => boolean) {
  return entries.filter((entry) => entry.type === type && predicate(entry)).reduce((total, entry) => total + Number(entry.amount ?? 0), 0);
}

function forecast(entries: CashFlowEntry[], currentBalance: number, toDate: string) {
  const expectedIn = sum(entries, "income", (entry) => isPendingStatus(entry.status) && (entry.due_date ?? entry.transaction_date) <= toDate);
  const expectedOut = sum(entries, "expense", (entry) => isPendingStatus(entry.status) && (entry.due_date ?? entry.transaction_date) <= toDate);
  return currentBalance + expectedIn - expectedOut;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block"><span className="mb-2 block text-sm font-black text-black/70">{label}</span>{children}</label>;
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

  const [{ data: branches }, { data: categories }, { data: channels }] = await Promise.all([
    supabase.from("branches").select("id,name,code,low_chicken_threshold,low_sticky_rice_threshold,low_oil_threshold,is_active").order("name"),
    supabase.from("cash_flow_categories").select("id,name,direction,sort_order,is_active").eq("is_active", true).order("sort_order"),
    supabase.from("cash_flow_money_channels").select("id,name,opening_balance,is_active").eq("is_active", true).order("name"),
  ]);

  let query = supabase.from("cash_flow_entries").select("*").gte("transaction_date", from).lte("transaction_date", to).order("transaction_date", { ascending: false });
  if (params?.branch_id) query = query.eq("branch_id", params.branch_id);
  if (params?.status) query = query.eq("status", params.status);
  if (params?.category_id) query = query.eq("category", params.category_id);
  if (params?.money_channel_id) query = query.eq("payment_method", params.money_channel_id);
  const [{ data, error: entriesError }, { data: dashboardData, error: dashboardError }] = await Promise.all([
    query.returns<CashFlowEntry[]>(),
    supabase.from("cash_flow_entries").select("transaction_date,due_date,type,status,amount").returns<CashFlowEntry[]>(),
  ]);
  const entries = data ?? [];
  const dashboardEntries = dashboardData ?? [];
  const branchNameById = new Map(((branches as Branch[] | null) ?? []).map((branch) => [branch.id, branch.name]));
  const loadError = entriesError ? `ไม่สามารถโหลดข้อมูล Cash Flow ได้: ${entriesError.message}` : dashboardError ? `ไม่สามารถโหลด Dashboard Cash Flow ได้: ${dashboardError.message}` : null;
  const openingBalance = (channels ?? []).reduce((total, channel) => total + Number(channel.opening_balance ?? 0), 0);
  const actualInToday = sum(dashboardEntries, "income", (entry) => entry.transaction_date === today && entry.status === "received");
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
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-sm font-black text-[#FFD43B]">Cash Flow Center</p><h1 className="text-3xl font-black">ศูนย์บริหารกระแสเงินสด</h1><p className="mt-2 text-sm font-bold text-white/70">ดูเงินจริง รอรับ รอจ่าย และคาดการณ์ 7/15/30 วัน แบบไม่ซับซ้อนเหมือนบัญชีภาษี</p></div><form action={async (formData: FormData) => { "use server"; const result = await syncDailySalesToCashFlow(formData); const message = encodeURIComponent(result.message); redirect(`/cash-flow?from=${formData.get("from")}&to=${formData.get("to")}&sync_ok=${result.ok ? "1" : "0"}&sync_message=${message}`); }} className="flex flex-col gap-2 sm:items-end"><input type="hidden" name="from" value={from}/><input type="hidden" name="to" value={to}/><button className="focus-ring rounded-full bg-[#FFD43B] px-5 py-3 font-black text-black">ซิงก์ยอดขายอัตโนมัติ</button><p className="text-xs font-bold text-white/60">ใช้ช่วงวันที่ที่เลือก หรืออย่างน้อยย้อนหลัง 30 วัน</p></form></div>
    </section>

    {params?.sync_message && <div className={`rounded-2xl border p-4 font-black ${params.sync_ok === "1" ? "border-green-200 bg-green-50 text-green-700" : "border-red-200 bg-red-50 text-red-700"}`}>{decodeURIComponent(params.sync_message)}</div>}
    {loadError && <div className="rounded-2xl border border-red-200 bg-red-50 p-4 font-black text-red-700">{loadError}</div>}

    <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <StatCard label="เงินสด/บัญชีคงเหลือปัจจุบัน" value={moneyFormatter.format(currentBalance)} tone="dark" />
      <StatCard label="รับวันนี้" value={moneyFormatter.format(actualInToday)} />
      <StatCard label="จ่ายวันนี้" value={moneyFormatter.format(actualOutToday)} />
      <StatCard label="เงินคงเหลือวันนี้" value={moneyFormatter.format(openingBalance + actualInToday - actualOutToday)} tone="brand" />
      <StatCard label="เงินรอรับทั้งหมด" value={moneyFormatter.format(pendingIn)} />
      <StatCard label="เงินรอจ่ายทั้งหมด" value={moneyFormatter.format(pendingOut)} />
      <StatCard label="คาดการณ์อีก 7 วัน" value={moneyFormatter.format(forecast(entries, currentBalance, addDaysISO(today, 7)))} />
      <StatCard label="คาดการณ์อีก 30 วัน" value={moneyFormatter.format(forecast(entries, currentBalance, addDaysISO(today, 30)))} />
    </section>

    <section className="grid gap-4 lg:grid-cols-2">
      <div className="rounded-[1.75rem] border border-black/10 bg-white p-5"><h2 className="text-xl font-black">รายการจ่ายเร่งด่วน</h2>{urgentPayables.map((e)=><p key={e.id} className="mt-3 flex justify-between gap-3 rounded-2xl bg-red-50 p-3 text-sm font-bold"><span>{e.description}<br/><span className="text-black/50">ครบกำหนด {formatThaiDate(e.due_date ?? e.transaction_date)}</span></span><span>{moneyFormatter.format(e.amount)}</span></p>)}</div>
      <div className="rounded-[1.75rem] border border-black/10 bg-white p-5"><h2 className="text-xl font-black">รายการรับที่ควรติดตาม</h2>{followReceivables.map((e)=><p key={e.id} className="mt-3 flex justify-between gap-3 rounded-2xl bg-yellow-50 p-3 text-sm font-bold"><span>{e.description}<br/><span className="text-black/50">ครบกำหนด {formatThaiDate(e.due_date ?? e.transaction_date)}</span></span><span>{moneyFormatter.format(e.amount)}</span></p>)}</div>
    </section>

    <section className="rounded-[1.75rem] border border-black/10 bg-white p-5 shadow-sm"><h2 className="text-2xl font-black">บันทึกรายการเอง</h2><form action={async (formData: FormData) => { "use server"; await saveCashFlowEntry(null, formData); }} className="mt-4 grid gap-3 sm:grid-cols-2">
      <Field label="วันที่ทำรายการ"><input className={inputClass()} type="date" name="transaction_date" defaultValue={today}/></Field><Field label="วันที่ครบกำหนด"><input className={inputClass()} type="date" name="due_date" defaultValue={today}/></Field>
      <Field label="ประเภท"><select className={inputClass()} name="type"><option value="income">รับ</option><option value="expense">จ่าย</option></select></Field><Field label="สถานะ"><select className={inputClass()} name="status"><option value="received">รับแล้ว</option><option value="paid">จ่ายแล้ว</option><option value="pending_receive">รอรับ</option><option value="pending_pay">รอจ่าย</option><option value="overdue">ค้างชำระ</option><option value="cancelled">ยกเลิก</option></select></Field>
      <Field label="หมวดหมู่"><select className={inputClass()} name="category"><option value="">ไม่ระบุ</option>{categories?.map((c)=><option key={c.id} value={c.name}>{c.name}</option>)}</select></Field><Field label="ช่องทางเงิน"><select className={inputClass()} name="payment_method"><option value="">ไม่ระบุ</option>{channels?.map((c)=><option key={c.id} value={c.name}>{c.name}</option>)}</select></Field>
      <Field label="สาขา"><select className={inputClass()} name="branch_id"><option value="">ส่วนกลาง/ไม่ระบุ</option>{(branches as Branch[] | null)?.map((b)=><option key={b.id} value={b.id}>{b.name}</option>)}</select></Field><Field label="แผนก"><input className={inputClass()} name="department" placeholder="เช่น หน้าร้าน / ส่วนกลาง"/></Field><Field label="จำนวนเงิน"><input className={inputClass()} type="number" step="0.01" min="0" name="amount" placeholder="0"/></Field>
      <div className="sm:col-span-2"><Field label="รายละเอียดรายการ"><input className={inputClass()} name="description" placeholder="เช่น ค่าเช่า เติมเงินเข้ากิจการ ซื้อไก่สด"/></Field></div>
      <Field label="อ้างอิงเอกสาร/รหัสต้นทาง"><input className={inputClass()} name="source_ref_id"/></Field><Field label="ลิงก์สลิป/เอกสารแนบ"><input className={inputClass()} name="attachment_url"/></Field>
      <div className="sm:col-span-2"><Field label="หมายเหตุ"><textarea className="focus-ring min-h-24 w-full rounded-2xl border-2 border-black/10 bg-white px-4 py-3 font-bold" name="note" /></Field></div><button className="focus-ring min-h-14 rounded-2xl bg-[#FFD43B] px-5 font-black text-black sm:col-span-2">บันทึกรายการ</button>
    </form></section>

    <section className="rounded-[1.75rem] border border-black/10 bg-white p-5 shadow-sm"><div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"><h2 className="text-2xl font-black">รายการ Cash Flow</h2><a className="rounded-full bg-black px-4 py-2 text-center text-sm font-black text-white" href={`/api/cash-flow/export?from=${from}&to=${to}`}>Export CSV</a></div><form className="mt-4 grid gap-2 sm:grid-cols-5"><input className={inputClass()} type="date" name="from" defaultValue={from}/><input className={inputClass()} type="date" name="to" defaultValue={to}/><select className={inputClass()} name="branch_id"><option value="">ทุกสาขา</option>{(branches as Branch[] | null)?.map((b)=><option key={b.id} value={b.id}>{b.name}</option>)}</select><select className={inputClass()} name="status"><option value="">ทุกสถานะ</option>{Object.entries(CASH_FLOW_STATUS_LABEL).map(([v,l])=><option key={v} value={v}>{l}</option>)}</select><button className="rounded-2xl bg-[#FFD43B] font-black">กรอง</button></form><div className="mt-4 overflow-x-auto"><table className="w-full min-w-[760px] text-sm"><thead><tr className="bg-black text-left text-white"><th className="p-3">วันที่</th><th>ประเภท</th><th>สถานะ</th><th>รายการ</th><th>หมวด</th><th>สาขา</th><th className="text-right">จำนวน</th></tr></thead><tbody>{entries.map((e)=><tr key={e.id} className="border-b border-black/10 font-bold"><td className="p-3">{formatThaiDate(e.transaction_date)}</td><td>{CASH_FLOW_TYPE_LABEL[e.type]}</td><td>{CASH_FLOW_STATUS_LABEL[e.status]}</td><td>{e.description}<div className="text-xs text-black/40">{CASH_FLOW_SOURCE_LABEL[e.source]}</div></td><td>{e.category ?? "-"}</td><td>{e.branch_id ? branchNameById.get(e.branch_id) ?? e.branch_id : "ส่วนกลาง"}</td><td className="text-right">{moneyFormatter.format(e.amount)}</td></tr>)}{entries.length === 0 && <tr><td className="p-6 text-center font-black text-black/50" colSpan={7}>{loadError ?? "ยังไม่มีรายการ Cash Flow ในช่วงวันที่นี้"}</td></tr>}</tbody></table></div></section>
  </div>;
}
