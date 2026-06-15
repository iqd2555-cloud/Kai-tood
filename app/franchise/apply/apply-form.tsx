"use client";

import { useActionState } from "react";
import { submitFranchiseLead, type ApplyFormState } from "./actions";

const initialState: ApplyFormState = { ok: false, message: "" };

const hasLocationOptions = ["มีทำเลแล้ว", "กำลังเจรจาทำเล", "ยังไม่มีทำเล"];
const locationTypeOptions = [
  "ตลาด",
  "ชุมชน / หมู่บ้าน",
  "หน้าโรงเรียน",
  "หน้าโรงงาน",
  "หอพัก / อพาร์ตเมนต์",
  "ริมถนนคนผ่านเยอะ",
  "หน้าร้านสะดวกซื้อ เช่น เซเว่น โลตัสโกเฟรช CJ หรือร้านค้าชุมชน",
  "หน้าสำนักงาน / หน่วยงาน / ออฟฟิศ",
  "ใกล้ตลาดเช้า / จุดขายอาหารช่วงเช้า",
  "ใกล้แหล่งคนทำงาน / คนเดินทาง",
  "ยังไม่แน่ใจ",
  "อื่น ๆ",
];
const budgetOptions = ["ต่ำกว่า 10,000 บาท", "10,000–20,000 บาท", "20,001–40,000 บาท", "40,001–60,000 บาท", "มากกว่า 60,000 บาท", "ยังไม่แน่ใจ ต้องการทราบรายละเอียดก่อน"];
const workingCapitalOptions = ["ไม่มีทุนสำรอง", "มีทุนสำรองประมาณ 1 เดือน", "มีทุนสำรอง 2–3 เดือน", "มีทุนสำรองมากกว่า 3 เดือน"];
const availableTimeOptions = ["น้อยกว่า 3 ชั่วโมงต่อวัน", "3–5 ชั่วโมงต่อวัน", "6–8 ชั่วโมงต่อวัน", "อยู่ได้เต็มวัน"];
const businessExperienceOptions = ["เคยขายอาหาร", "เคยขายของ แต่ไม่ใช่อาหาร", "กำลังขายของอยู่ในปัจจุบัน", "เคยทำธุรกิจอื่น", "ไม่เคยขายมาก่อน"];
const expectedIncomeOptions = ["ต่ำกว่า 1,000 บาทต่อวัน", "1,000–2,000 บาทต่อวัน", "2,001–3,000 บาทต่อวัน", "3,001–5,000 บาทต่อวัน", "มากกว่า 5,000 บาทต่อวัน"];

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-4 rounded-[1.5rem] border border-black/10 bg-[#fffdf5] p-4 sm:p-5">
      <h2 className="text-xl font-black">{title}</h2>
      {children}
    </section>
  );
}

function Field({ label, name, required = false, children }: { label: string; name: string; required?: boolean; children?: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-sm font-black">{label}{required && <span className="text-red-600"> *</span>}</span>
      {children ?? <input name={name} required={required} className="mt-2 w-full rounded-2xl border border-black/15 bg-white px-4 py-3 font-bold outline-none focus:border-[#ffc400]" />}
    </label>
  );
}

function SelectField({ label, name, options }: { label: string; name: string; options: string[] }) {
  return (
    <Field label={label} name={name} required>
      <select name={name} required className="mt-2 w-full rounded-2xl border border-black/15 bg-white px-4 py-3 font-bold outline-none focus:border-[#ffc400]">
        <option value="">เลือกคำตอบ</option>
        {options.map((x) => <option key={x} value={x}>{x}</option>)}
      </select>
    </Field>
  );
}

export function ApplyForm() {
  const [state, action, pending] = useActionState(submitFranchiseLead, initialState);
  return (
    <form action={action} className="grid gap-5 rounded-[2rem] border border-black/10 bg-white p-4 shadow-sm sm:p-7">
      {state.message && <div className="rounded-2xl bg-red-50 p-4 text-sm font-bold text-red-700">{state.message}</div>}

      <Section title="1. ข้อมูลติดต่อ">
        <Field label="ชื่อ-นามสกุล" name="full_name" required />
        <Field label="เบอร์โทร" name="phone" required><input name="phone" required inputMode="tel" className="mt-2 w-full rounded-2xl border border-black/15 bg-white px-4 py-3 font-bold outline-none focus:border-[#ffc400]" /></Field>
        <Field label="Line ID" name="line_id" />
        <div className="grid gap-4 sm:grid-cols-2"><Field label="จังหวัด" name="province" required /><Field label="อำเภอ/เขต" name="district" /></div>
      </Section>

      <Section title="2. ความพร้อมเบื้องต้น">
        <SelectField label="มีทำเลแล้วหรือยัง" name="has_location" options={hasLocationOptions} />
        <SelectField label="ประเภททำเล" name="location_type" options={locationTypeOptions} />
        <SelectField label="งบประมาณ" name="budget_range" options={budgetOptions} />
        <SelectField label="ทุนสำรอง" name="working_capital" options={workingCapitalOptions} />
        <SelectField label="เวลาที่สามารถดูแลร้านได้ต่อวัน" name="available_time_per_day" options={availableTimeOptions} />
        <SelectField label="ประสบการณ์ขาย/ทำธุรกิจ" name="business_experience" options={businessExperienceOptions} />
        <SelectField label="รายได้ต่อวันที่คาดหวัง" name="expected_daily_income" options={expectedIncomeOptions} />
      </Section>

      <Section title="3. ยืนยันความเข้าใจ">
        <label className="flex items-start gap-3 rounded-2xl border border-black/10 bg-white p-4">
          <input name="understanding_confirmed" type="checkbox" value="true" required className="mt-1 h-6 w-6 accent-[#ffc400]" />
          <span className="text-sm font-bold leading-7 text-black/75">ข้าพเจ้าเข้าใจว่าแฟรนไชส์นี้ไม่ใช่การซื้ออุปกรณ์เปิดร้านเพียงอย่างเดียว แต่เป็นระบบร้านข้าวเหนียวไก่ทอดที่ต้องลงมือทำจริง ไม่มีการการันตีกำไร และการกรอกแบบฟอร์มนี้ยังไม่ถือว่าได้รับสิทธิ์แฟรนไชส์ทันที ทีมงานจะตรวจสอบข้อมูลและติดต่อกลับสำหรับผู้ที่มีความเหมาะสมกับระบบของแบรนด์</span>
        </label>
      </Section>

      <button disabled={pending} className="rounded-full bg-[#ffc400] px-6 py-4 text-lg font-black text-black disabled:opacity-60">{pending ? "กำลังส่งข้อมูล..." : "ส่งข้อมูลให้ทีมงานติดต่อกลับ"}</button>
    </form>
  );
}
