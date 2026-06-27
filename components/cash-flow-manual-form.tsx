"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { CASH_FLOW_SOURCE_LABEL, CASH_FLOW_STATUS_LABEL, CASH_FLOW_TYPE_LABEL, type CashFlowEntry, type CashFlowStatus, type CashFlowType } from "@/lib/cash-flow";
import { numberFormatter } from "@/lib/format";
import { createSupabaseBrowserClient } from "@/lib/supabase-client";
import type { Branch } from "@/lib/types";

type Category = { id: string; name: string; type?: string; code?: string | null; is_active?: boolean };
type Props = { today: string; branches: Branch[]; categories: Category[]; entries: CashFlowEntry[]; branchNameById: Record<string, string>; categoryNameByCode: Record<string, string>; saveAction: (formData: FormData) => void | Promise<void>; deleteAction: (formData: FormData) => void | Promise<void> };

const inputClass = "focus-ring min-h-12 w-full rounded-2xl border-2 border-black/10 bg-white px-4 text-base font-bold shadow-sm";
const otherCodes = new Set(["other_expense", "other_income"]);

function Field({ label, children }: { label: string; children: React.ReactNode }) { return <label className="block"><span className="mb-2 block text-sm font-black text-black/70">{label}</span>{children}</label>; }
function safeDate(value: string | null | undefined, fallback: string) { return value && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : fallback; }
function amountText(entry: CashFlowEntry) { const formatted = numberFormatter.format(Number(entry.amount ?? 0)); return entry.type === "expense" ? `-${formatted}` : formatted; }
function label<T extends string>(labels: Record<T, string>, value: string | null | undefined, fallback = "-") { return value && value in labels ? labels[value as T] : fallback; }

export function CashFlowManualForm({ today, branches, categories, entries, branchNameById, categoryNameByCode, saveAction, deleteAction }: Props) {
  const formRef = useRef<HTMLFormElement>(null);
  const [editing, setEditing] = useState<CashFlowEntry | null>(null);
  const [type, setType] = useState<CashFlowType>("income");
  const [status, setStatus] = useState<CashFlowStatus>("received");
  const [category, setCategory] = useState("");
  const [liveCategories, setLiveCategories] = useState<Category[]>(categories);

  useEffect(() => { setLiveCategories(categories); }, [categories]);
  useEffect(() => {
    let isMounted = true;
    const supabase = createSupabaseBrowserClient();
    if (!supabase) return;
    const client = supabase;
    async function loadCategories() {
      const { data, error } = await client.from("cash_flow_categories").select("id,name,type,code,is_active").eq("is_active", true).order("name");
      if (!isMounted) return;
      if (error) return console.error("Cash Flow categories load error:", error);
      setLiveCategories(data ?? []);
    }
    void loadCategories();
    const channel = client.channel("cash-flow-categories-dropdown").on("postgres_changes", { event: "*", schema: "public", table: "cash_flow_categories" }, () => { void loadCategories(); }).subscribe();
    return () => { isMounted = false; void client.removeChannel(channel); };
  }, []);

  const filteredCategories = useMemo(() => liveCategories.filter((item) => item.is_active !== false && item.type === type && item.code), [liveCategories, type]);
  const isOther = otherCodes.has(category);
  const resetEdit = () => { setEditing(null); setType("income"); setStatus("received"); setCategory(""); formRef.current?.reset(); };
  const startEdit = (entry: CashFlowEntry) => { setEditing(entry); setType(entry.type); setStatus(entry.status); setCategory(entry.category ?? ""); setTimeout(() => formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 0); };

  return <>
    <form ref={formRef} action={saveAction} className="mt-4 grid gap-3 sm:grid-cols-2">
      <input type="hidden" name="entry_id" value={editing?.id ?? ""} />
      {editing?.source === "sales" && <div className="sm:col-span-2 rounded-2xl border border-[#FFD43B] bg-yellow-50 p-3 text-sm font-black text-black">รายการจากยอดขายซิงก์</div>}
      <Field label="วันที่ทำรายการ"><input className={inputClass} type="date" name="transaction_date" key={`tx-${editing?.id ?? "new"}`} defaultValue={safeDate(editing?.transaction_date, today)}/></Field>
      <Field label="วันที่ครบกำหนด"><input className={inputClass} type="date" name="due_date" key={`due-${editing?.id ?? "new"}`} defaultValue={safeDate(editing?.due_date, today)}/></Field>
      <Field label="ประเภท"><select className={inputClass} name="type" value={type} onChange={(event) => { const next = event.target.value as CashFlowType; setType(next); setStatus(next === "income" ? "received" : "paid"); setCategory(""); }}><option value="income">รับ</option><option value="expense">จ่าย</option></select></Field>
      <Field label="สถานะ"><select className={inputClass} name="status" value={status} onChange={(event) => setStatus(event.target.value as CashFlowStatus)}>{Object.entries(CASH_FLOW_STATUS_LABEL).map(([value, text]) => <option key={value} value={value}>{text}</option>)}</select></Field>
      <Field label="หมวดหมู่"><select className={inputClass} name="category" value={category} onChange={(event) => setCategory(event.target.value)} required><option value="">เลือกหมวดหมู่</option>{filteredCategories.map((c)=><option key={c.id} value={c.code ?? ""}>{c.name}</option>)}</select></Field>
      {isOther && <Field label={type === "income" ? "ชื่อรายได้อื่น" : "ชื่อค่าใช้จ่ายอื่น"}><input className={inputClass} name="custom_category_name" key={`custom-${editing?.id ?? "new"}`} defaultValue={editing?.description ?? ""} required /></Field>}
      <Field label="ช่องทางเงิน"><input className={inputClass} name="payment_method" key={`payment-${editing?.id ?? "new"}`} defaultValue={editing?.payment_method ?? ""} placeholder="เช่น เงินสด / โอน / ธนาคาร"/></Field>
      <Field label="สาขา"><select className={inputClass} name="branch_id" key={`branch-${editing?.id ?? "new"}`} defaultValue={editing?.branch_id ?? ""}><option value="">ส่วนกลาง/ไม่ระบุ</option>{branches.map((b)=><option key={b.id} value={b.id}>{b.name}</option>)}</select></Field>
      <Field label="แผนก"><input className={inputClass} name="department" key={`department-${editing?.id ?? "new"}`} defaultValue={editing?.department ?? ""} placeholder="เช่น หน้าร้าน / ส่วนกลาง"/></Field>
      <Field label="จำนวนเงิน"><input className={inputClass} type="number" step="0.01" min="0" name="amount" key={`amount-${editing?.id ?? "new"}`} defaultValue={editing?.amount ?? ""} placeholder="0" required/></Field>
      <div className="sm:col-span-2"><Field label="รายละเอียดรายการ"><input className={inputClass} name="description" key={`desc-${editing?.id ?? "new"}`} defaultValue={editing?.description ?? ""} placeholder="เช่น ค่าไก่สด / ค่าข้าวเหนียว / ค่าขายไก่หมัก" required={!isOther}/></Field></div>
      <Field label="อ้างอิงเอกสาร/รหัสต้นทาง"><input className={inputClass} name="source_ref_id" key={`ref-${editing?.id ?? "new"}`} defaultValue={editing?.source_ref_id ?? ""}/></Field>
      <Field label="ลิงก์สลิป/เอกสารแนบ"><input className={inputClass} name="attachment_url" key={`attach-${editing?.id ?? "new"}`} defaultValue={editing?.attachment_url ?? ""}/></Field>
      <div className="sm:col-span-2"><Field label="หมายเหตุ"><textarea className="focus-ring min-h-24 w-full rounded-2xl border-2 border-black/10 bg-white px-4 py-3 font-bold" name="note" key={`note-${editing?.id ?? "new"}`} defaultValue={editing?.note ?? ""} /></Field></div>
      <div className="grid gap-2 sm:col-span-2 sm:grid-cols-2"><button className="focus-ring min-h-14 rounded-2xl bg-[#FFD43B] px-5 font-black text-black">{editing ? "บันทึกการแก้ไข" : "บันทึกรายการ"}</button>{editing && <button type="button" onClick={resetEdit} className="focus-ring min-h-14 rounded-2xl bg-black/10 px-5 font-black text-black">ยกเลิกการแก้ไข</button>}</div>
    </form>

    <div className="mt-4 overflow-x-auto"><table className="w-full min-w-[880px] text-sm"><thead><tr className="bg-black text-left text-white"><th className="p-3">วันที่</th><th>ประเภท</th><th>สถานะ</th><th>รายการ</th><th>หมวด</th><th>สาขา</th><th className="text-right">จำนวน</th><th className="text-center">จัดการ</th></tr></thead><tbody>{entries.map((e)=><tr key={e.id} className="border-b border-black/10 font-bold"><td className="p-3">{e.transaction_date}</td><td>{label(CASH_FLOW_TYPE_LABEL, e.type)}</td><td>{label(CASH_FLOW_STATUS_LABEL, e.status)}</td><td>{e.description}<div className="text-xs text-black/40">{e.source === "sales" ? "รายการจากยอดขายซิงก์" : label(CASH_FLOW_SOURCE_LABEL, e.source, "ไม่ทราบแหล่งที่มา")}</div></td><td>{categoryNameByCode[e.category ?? ""] ?? e.category ?? "-"}</td><td>{e.branch_id ? branchNameById[e.branch_id] ?? e.branch_id : "ส่วนกลาง"}</td><td className={`text-right ${e.type === "expense" ? "text-red-600" : "text-green-700"}`}>{amountText(e)}</td><td><div className="flex justify-center gap-2"><button type="button" onClick={() => startEdit(e)} className="rounded-full bg-[#FFD43B] px-3 py-2 font-black text-black">แก้ไข</button><form action={deleteAction} onSubmit={(event) => { const message = e.source === "sales" ? "รายการนี้มาจากการซิงก์ยอดขาย หากลบแล้วสามารถซิงก์กลับมาใหม่ได้ ต้องการลบหรือไม่?" : "ยืนยันลบรายการนี้หรือไม่?"; if (!window.confirm(message)) event.preventDefault(); }}><input type="hidden" name="entry_id" value={e.id}/><input type="hidden" name="transaction_date" value={e.transaction_date}/><button className="rounded-full bg-red-600 px-3 py-2 font-black text-white">ลบ</button></form></div></td></tr>)}{entries.length === 0 && <tr><td className="p-6 text-center font-black text-black/50" colSpan={8}>ยังไม่มีรายการ Cash Flow ในช่วงวันที่นี้</td></tr>}</tbody></table></div>
  </>;
}
