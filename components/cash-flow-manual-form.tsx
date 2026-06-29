"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { CASH_FLOW_DOCUMENT_TYPE_LABEL, CASH_FLOW_SOURCE_LABEL, CASH_FLOW_STATUS_LABEL, CASH_FLOW_TYPE_LABEL, type CashFlowEntry, type CashFlowStatus, type CashFlowType } from "@/lib/cash-flow";
import { formatThaiDate, numberFormatter } from "@/lib/format";
import { createSupabaseBrowserClient } from "@/lib/supabase-client";
import type { Branch } from "@/lib/types";

type Category = { id: string; name: string; type?: string; code?: string | null; is_active?: boolean };
type Props = { today: string; branches: Branch[]; categories: Category[]; entries: CashFlowEntry[]; branchNameById: Record<string, string>; categoryNameByCode: Record<string, string>; saveAction: (formData: FormData) => void | Promise<void>; deleteAction: (formData: FormData) => Promise<{ ok: boolean; message: string; code?: string }> };

const inputClass = "focus-ring min-h-12 w-full rounded-2xl border-2 border-black/10 bg-white px-4 text-base font-bold shadow-sm";
const otherCodes = new Set(["other_expense", "other_income"]);

function Field({ label, children }: { label: string; children: React.ReactNode }) { return <label className="block"><span className="mb-2 block text-sm font-black text-black/70">{label}</span>{children}</label>; }
function safeDate(value: string | null | undefined, fallback: string) { return value && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : fallback; }
function amountText(entry: CashFlowEntry) { const formatted = numberFormatter.format(Number(entry.amount ?? 0)); return entry.type === "expense" ? `-${formatted}` : formatted; }
function label<T extends string>(labels: Record<T, string>, value: string | null | undefined, fallback = "-") { return value && value in labels ? labels[value as T] : fallback; }

export function CashFlowManualForm({ today, branches, categories, entries, branchNameById, categoryNameByCode, saveAction, deleteAction }: Props) {
  const formRef = useRef<HTMLFormElement>(null);
  const [editing, setEditing] = useState<CashFlowEntry | null>(null);
  const [editingEntryId, setEditingEntryId] = useState("");
  const [type, setType] = useState<CashFlowType>("income");
  const [status, setStatus] = useState<CashFlowStatus>("received");
  const [category, setCategory] = useState("");
  const [attachmentUrl, setAttachmentUrl] = useState("");
  const [hasAttachment, setHasAttachment] = useState(false);
  const [liveCategories, setLiveCategories] = useState<Category[]>(categories);
  const [localEntries, setLocalEntries] = useState<CashFlowEntry[]>(entries);
  const [deletingId, setDeletingId] = useState("");
  const [deleteError, setDeleteError] = useState("");

  useEffect(() => { setLiveCategories(categories); }, [categories]);
  useEffect(() => { setLocalEntries(entries); }, [entries]);
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
  const resetEdit = () => { setEditing(null); setEditingEntryId(""); setType("income"); setStatus("received"); setCategory(""); setAttachmentUrl(""); setHasAttachment(false); formRef.current?.reset(); };
  const handleEdit = (entry: CashFlowEntry) => {
    if (!entry.id) {
      console.error("Cash Flow entry is missing id; edit button is disabled", entry);
      return;
    }

    console.log("EDIT_CLICKED", entry.id);
    setEditing(entry);
    setEditingEntryId(entry.id);
    setType(entry.type);
    setStatus(entry.status);
    setCategory(entry.category ?? "");
    setAttachmentUrl(entry.attachment_url ?? "");
    setHasAttachment(Boolean(entry.has_attachment ?? entry.attachment_url));
    setTimeout(() => formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 0);
  };
  const handleDelete = async (row: CashFlowEntry) => {
    setDeleteError("");

    if (!row) {
      const message = "ไม่พบข้อมูลรายการ";
      setDeleteError(message);
      alert(message);
      return;
    }

    if (!row.db_id) {
      const message = "ลบไม่ได้: รายการนี้ไม่มี db_id จริงจากฐานข้อมูล";
      setDeleteError(message);
      alert(message);
      console.error("Missing db_id:", row);
      return;
    }

    if (!row.source_table) {
      const message = "ลบไม่ได้: ไม่พบแหล่งข้อมูลของรายการ";
      setDeleteError(message);
      alert(message);
      console.error("Missing source_table:", row);
      return;
    }

    const ok = window.confirm("ยืนยันลบรายการนี้หรือไม่?");
    if (!ok) return;

    try {
      console.log("DELETE ROW:", row);
      console.log("DELETE TABLE:", row.source_table);
      console.log("DELETE ID:", row.db_id);
      setDeletingId(row.db_id);

      const formData = new FormData();
      formData.set("entry_id", row.db_id);
      formData.set("source_table", row.source_table);
      if (row.dbPath) formData.set("db_path", row.dbPath);
      const result = await deleteAction(formData);

      if (!result.ok) {
        const error = new Error(result.message);
        (error as Error & { code?: string }).code = result.code ?? "delete-failed";
        throw error;
      }

      console.log("DELETE SUCCESS:", row.db_id);
      setLocalEntries((prev) => prev.filter((item) => !(item.db_id === row.db_id && item.source_table === row.source_table)));
      alert("ลบรายการเรียบร้อยแล้ว");
    } catch (error) {
      const code = typeof error === "object" && error && "code" in error ? String(error.code) : "unknown";
      const message = error instanceof Error ? error.message : "กรุณาตรวจสอบระบบ";
      const fullMessage = `ลบไม่สำเร็จ
code: ${code}
message: ${message}`;
      setDeleteError(fullMessage);
      alert(fullMessage);
      console.error("DELETE FAILED:", error);
    } finally {
      setDeletingId("");
    }
  };

  return <>
    {deleteError && <div role="alert" className="mt-4 rounded-2xl border-2 border-red-600 bg-red-50 p-4 text-sm font-black whitespace-pre-line text-red-700">{deleteError}</div>}
    <form ref={formRef} action={saveAction} className="mt-4 grid gap-3 sm:grid-cols-2">
      <input type="hidden" name="entry_id" value={editingEntryId} />
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
      <Field label="ลิงก์สลิป/เอกสารแนบ"><input className={inputClass} name="attachment_url" key={`attach-${editing?.id ?? "new"}`} value={attachmentUrl} onChange={(event) => { setAttachmentUrl(event.target.value); if (event.target.value.trim()) setHasAttachment(true); }}/></Field>
      <Field label="ประเภทเอกสาร"><select className={inputClass} name="document_type" key={`doc-${editing?.id ?? "new"}`} defaultValue={editing?.document_type ?? "transfer_slip"}>{Object.entries(CASH_FLOW_DOCUMENT_TYPE_LABEL).map(([value, text]) => <option key={value} value={value}>{text}</option>)}</select></Field>
      <label className="flex min-h-12 items-center gap-3 rounded-2xl border-2 border-black/10 bg-white px-4 text-base font-black shadow-sm"><input type="checkbox" name="has_attachment" value="true" checked={hasAttachment} onChange={(event) => setHasAttachment(event.target.checked)} className="h-5 w-5 accent-[#FFD43B]"/>มีเอกสารแนบหรือไม่</label>
      <div className="sm:col-span-2"><Field label="หมายเหตุถึงสำนักงานบัญชี"><textarea className="focus-ring min-h-24 w-full rounded-2xl border-2 border-black/10 bg-white px-4 py-3 font-bold" name="accountant_note" key={`accountant-${editing?.id ?? "new"}`} defaultValue={editing?.accountant_note ?? ""} /></Field></div>
      <div className="sm:col-span-2"><Field label="หมายเหตุ"><textarea className="focus-ring min-h-24 w-full rounded-2xl border-2 border-black/10 bg-white px-4 py-3 font-bold" name="note" key={`note-${editing?.id ?? "new"}`} defaultValue={editing?.note ?? ""} /></Field></div>
      <div className="grid gap-2 sm:col-span-2 sm:grid-cols-2"><button className="focus-ring min-h-14 rounded-2xl bg-[#FFD43B] px-5 font-black text-black">{editing ? "บันทึกการแก้ไข" : "บันทึกรายการ"}</button>{editing && <button type="button" onClick={resetEdit} className="focus-ring min-h-14 rounded-2xl bg-black/10 px-5 font-black text-black">ยกเลิกการแก้ไข</button>}</div>
    </form>

    <div className="mt-4 overflow-x-auto">
      <table className="w-full min-w-[880px] text-sm">
        <thead>
          <tr className="bg-black text-left text-white">
            <th className="p-3">วันที่</th><th>ประเภท</th><th>สถานะ</th><th>รายการ</th><th>หมวด</th><th>สาขา</th><th className="text-right">จำนวน</th><th className="text-center">จัดการ</th>
          </tr>
        </thead>
        <tbody>
          {localEntries.map((e) => {
            const hasDbId = Boolean(e.db_id);
            const canDelete = hasDbId && e.source_table === "cash_flow_entries" && e.source === "manual";
            if (!hasDbId) console.error("Cash Flow entry is missing db_id; action buttons were not rendered", e);
            return <tr key={e.db_id || e.id || `${e.transaction_date}-${e.description}`} className="border-b border-black/10 font-bold">
              <td className="p-3">{formatThaiDate(e.transaction_date)}</td>
              <td>{label(CASH_FLOW_TYPE_LABEL, e.type)}</td>
              <td>{label(CASH_FLOW_STATUS_LABEL, e.status)}</td>
              <td>{e.description}<div className="text-xs text-black/40">{e.source_table ? `${e.source_table} / ` : ""}{e.source === "sales" ? "รายการจากยอดขายซิงก์" : label(CASH_FLOW_SOURCE_LABEL, e.source, "ไม่ทราบแหล่งที่มา")}</div></td>
              <td>{categoryNameByCode[e.category ?? ""] ?? e.category ?? "-"}</td>
              <td>{e.branch_id ? branchNameById[e.branch_id] ?? e.branch_id : "ส่วนกลาง"}</td>
              <td className={`text-right ${e.type === "expense" ? "text-red-600" : "text-green-700"}`}>{amountText(e)}</td>
              <td className="relative z-10">
                <div className="relative z-20 flex justify-center gap-2 pointer-events-auto">
                  {hasDbId ? <>
                    <button type="button" onClick={(event) => { event.preventDefault(); event.stopPropagation(); handleEdit(e); }} className="relative z-20 pointer-events-auto rounded-full bg-[#FFD43B] px-3 py-2 font-black text-black">แก้ไข</button>
                    {canDelete ? <button type="button" disabled={deletingId === e.db_id} onClick={(event) => { event.preventDefault(); event.stopPropagation(); handleDelete(e); }} className="relative z-20 pointer-events-auto rounded-full bg-red-600 px-3 py-2 font-black text-white disabled:opacity-50">ลบ</button> : <span className="max-w-36 text-center text-xs font-black text-black/50">รายการนี้สร้างจากข้อมูลต้นทาง ต้องลบจากเมนูต้นทาง</span>}
                  </> : <span className="text-xs font-black text-red-600">ไม่มี db_id</span>}
                </div>
              </td>
            </tr>;
          })}
          {localEntries.length === 0 && <tr><td className="p-6 text-center font-black text-black/50" colSpan={8}>ไม่พบรายการในช่วงวันที่เลือก ลองเลือก 7 วันหรือเดือนนี้</td></tr>}
        </tbody>
      </table>
    </div>
  </>;
}
