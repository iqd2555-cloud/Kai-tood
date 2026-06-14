"use client";

import { useActionState } from "react";
import { submitFranchiseLead, type ApplyFormState } from "./actions";

const initialState: ApplyFormState = { ok: false, message: "" };
const budgetOptions = ["ต่ำกว่า 30,000 บาท", "30,000 - 50,000 บาท", "50,001 - 100,000 บาท", "มากกว่า 100,000 บาท"];

function Field({ label, name, required = false, children }: { label: string; name: string; required?: boolean; children?: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-sm font-black">{label}{required && <span className="text-red-600"> *</span>}</span>
      {children ?? <input name={name} required={required} className="mt-2 w-full rounded-2xl border border-black/15 bg-white px-4 py-3 font-bold outline-none focus:border-[#ffc400]" />}
    </label>
  );
}

export function ApplyForm() {
  const [state, action, pending] = useActionState(submitFranchiseLead, initialState);
  return (
    <form action={action} className="grid gap-4 rounded-[2rem] border border-black/10 bg-white p-5 shadow-sm sm:p-7">
      {state.message && <div className="rounded-2xl bg-red-50 p-4 text-sm font-bold text-red-700">{state.message}</div>}
      <Field label="ชื่อ-นามสกุล" name="full_name" required />
      <Field label="เบอร์โทร" name="phone" required><input name="phone" required inputMode="tel" className="mt-2 w-full rounded-2xl border border-black/15 bg-white px-4 py-3 font-bold outline-none focus:border-[#ffc400]" /></Field>
      <Field label="Line ID" name="line_id" />
      <div className="grid gap-4 sm:grid-cols-2"><Field label="จังหวัด" name="province" required /><Field label="อำเภอ/เขต" name="district" /></div>
      <Field label="อาชีพปัจจุบัน" name="current_job" />
      <Field label="มีเวลาทำร้านวันละกี่ชั่วโมง" name="available_time_per_day" />
      <Field label="งบประมาณ" name="budget_range" required><select name="budget_range" required className="mt-2 w-full rounded-2xl border border-black/15 bg-white px-4 py-3 font-bold outline-none focus:border-[#ffc400]"><option value="">เลือกงบประมาณ</option>{budgetOptions.map((x) => <option key={x}>{x}</option>)}</select></Field>
      <Field label="มีทำเลแล้วหรือยัง" name="has_location" required><select name="has_location" required className="mt-2 w-full rounded-2xl border border-black/15 bg-white px-4 py-3 font-bold outline-none focus:border-[#ffc400]"><option value="">เลือกคำตอบ</option><option>มีทำเลแล้ว</option><option>กำลังหาทำเล</option><option>ยังไม่มีทำเล</option></select></Field>
      <Field label="ประเภททำเล" name="location_type" />
      <Field label="รายได้ต่อวันที่คาดหวัง" name="expected_daily_income" />
      <Field label="ประสบการณ์ธุรกิจ/ขายอาหาร" name="business_experience"><textarea name="business_experience" rows={3} className="mt-2 w-full rounded-2xl border border-black/15 bg-white px-4 py-3 font-bold outline-none focus:border-[#ffc400]" /></Field>
      <Field label="หมายเหตุเพิ่มเติม" name="note"><textarea name="note" rows={4} className="mt-2 w-full rounded-2xl border border-black/15 bg-white px-4 py-3 font-bold outline-none focus:border-[#ffc400]" /></Field>
      <button disabled={pending} className="rounded-full bg-[#ffc400] px-6 py-4 text-lg font-black text-black disabled:opacity-60">{pending ? "กำลังส่งข้อมูล..." : "ส่งใบสมัคร"}</button>
    </form>
  );
}
