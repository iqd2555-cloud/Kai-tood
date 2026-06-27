"use client";

import { useMemo, useState } from "react";
import type { Branch } from "@/lib/types";

type Category = { id: string; name: string; type?: string; code?: string | null; is_active?: boolean };

const inputClass = "focus-ring min-h-12 w-full rounded-2xl border-2 border-black/10 bg-white px-4 text-base font-bold shadow-sm";
const otherCodes = new Set(["other_expense", "other_income"]);

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block"><span className="mb-2 block text-sm font-black text-black/70">{label}</span>{children}</label>;
}

export function CashFlowManualForm({ today, branches, categories, action }: { today: string; branches: Branch[]; categories: Category[]; action: (formData: FormData) => void | Promise<void> }) {
  const [type, setType] = useState<"income" | "expense">("income");
  const [category, setCategory] = useState("");
  const filteredCategories = useMemo(() => categories.filter((item) => item.type === type && item.code), [categories, type]);
  const isOther = otherCodes.has(category);

  return <form action={action} className="mt-4 grid gap-3 sm:grid-cols-2">
    <Field label="วันที่ทำรายการ"><input className={inputClass} type="date" name="transaction_date" defaultValue={today}/></Field>
    <Field label="วันที่ครบกำหนด"><input className={inputClass} type="date" name="due_date" defaultValue={today}/></Field>
    <Field label="ประเภท"><select className={inputClass} name="type" value={type} onChange={(event) => { setType(event.target.value as "income" | "expense"); setCategory(""); }}><option value="income">รับ</option><option value="expense">จ่าย</option></select></Field>
    <Field label="หมวดหมู่"><select className={inputClass} name="category" value={category} onChange={(event) => setCategory(event.target.value)} required><option value="">เลือกหมวดหมู่</option>{filteredCategories.map((c)=><option key={c.id} value={c.code ?? ""}>{c.name}</option>)}</select></Field>
    {isOther && <div className="sm:col-span-2"><Field label={type === "income" ? "ชื่อรายได้อื่น" : "ชื่อค่าใช้จ่ายอื่น"}><input className={inputClass} name="custom_category_name" placeholder="ระบุชื่อรายการเอง" required /></Field></div>}
    <input type="hidden" name="status" value={type === "income" ? "received" : "paid"}/>
    <Field label="ช่องทางเงิน"><input className={inputClass} name="payment_method" placeholder="เช่น เงินสด / โอน / ธนาคาร"/></Field>
    <Field label="สาขา"><select className={inputClass} name="branch_id"><option value="">ส่วนกลาง/ไม่ระบุ</option>{branches.map((b)=><option key={b.id} value={b.id}>{b.name}</option>)}</select></Field>
    <Field label="แผนก"><input className={inputClass} name="department" placeholder="เช่น หน้าร้าน / ส่วนกลาง"/></Field>
    <Field label="จำนวนเงิน"><input className={inputClass} type="number" step="0.01" min="0" name="amount" placeholder="0" required/></Field>
    <div className="sm:col-span-2"><Field label="รายละเอียดรายการ"><input className={inputClass} name="description" placeholder="เช่น ค่าไก่สด / ค่าข้าวเหนียว / ค่าขายไก่หมัก" required={!isOther}/></Field></div>
    <Field label="อ้างอิงเอกสาร/รหัสต้นทาง"><input className={inputClass} name="source_ref_id"/></Field>
    <Field label="ลิงก์สลิป/เอกสารแนบ"><input className={inputClass} name="attachment_url"/></Field>
    <div className="sm:col-span-2"><Field label="หมายเหตุ"><textarea className="focus-ring min-h-24 w-full rounded-2xl border-2 border-black/10 bg-white px-4 py-3 font-bold" name="note" /></Field></div>
    <button className="focus-ring min-h-14 rounded-2xl bg-[#FFD43B] px-5 font-black text-black sm:col-span-2">บันทึกรายการ</button>
  </form>;
}
