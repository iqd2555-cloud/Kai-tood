"use client";

import { useActionState, useMemo, useState } from "react";
import { thaiAddress, thaiProvinces } from "@/lib/thai-address";
import { submitFranchiseLead, type ApplyFormState } from "./actions";

const initialState: ApplyFormState = { ok: false, message: "" };

const hasLocationOptions = ["มีทำเลแล้ว", "กำลังเจรจาทำเล", "ยังไม่มีทำเล"];
const locationTypeOptions = ["ตลาด", "ชุมชน / หมู่บ้าน", "หน้าโรงเรียน", "หน้าโรงงาน", "หอพัก / อพาร์ตเมนต์", "ริมถนนคนผ่านเยอะ", "หน้าร้านสะดวกซื้อ เช่น เซเว่น โลตัสโกเฟรช CJ หรือร้านค้าชุมชน", "หน้าสำนักงาน / หน่วยงาน / ออฟฟิศ", "ใกล้ตลาดเช้า / จุดขายอาหารช่วงเช้า", "ใกล้แหล่งคนทำงาน / คนเดินทาง", "ยังไม่แน่ใจ", "อื่น ๆ"];
const budgetOptions = ["ต่ำกว่า 10,000 บาท", "10,000–20,000 บาท", "20,001–40,000 บาท", "40,001–60,000 บาท", "มากกว่า 60,000 บาท", "ยังไม่แน่ใจ ต้องการทราบรายละเอียดก่อน"];
const workingCapitalOptions = ["ไม่มีทุนสำรอง", "มีทุนสำรองประมาณ 1 เดือน", "มีทุนสำรอง 2–3 เดือน", "มีทุนสำรองมากกว่า 3 เดือน"];
const availableTimeOptions = ["น้อยกว่า 3 ชั่วโมงต่อวัน", "3–5 ชั่วโมงต่อวัน", "6–8 ชั่วโมงต่อวัน", "อยู่ได้เต็มวัน"];
const businessExperienceOptions = ["เคยขายอาหาร", "เคยขายของ แต่ไม่ใช่อาหาร", "กำลังขายของอยู่ในปัจจุบัน", "เคยทำธุรกิจอื่น", "ไม่เคยขายมาก่อน"];
const expectedIncomeOptions = ["ต่ำกว่า 1,000 บาทต่อวัน", "1,000–2,000 บาทต่อวัน", "2,001–3,000 บาทต่อวัน", "3,001–5,000 บาทต่อวัน", "มากกว่า 5,000 บาทต่อวัน"];

function Section({ title, eyebrow, children }: { title: string; eyebrow: string; children: React.ReactNode }) {
  return (
    <section className="rounded-[1.75rem] border border-black/10 bg-white p-5 shadow-lg shadow-black/5 sm:p-6">
      <p className="text-xs font-black uppercase tracking-[0.22em] text-black/40">{eyebrow}</p>
      <h2 className="mt-2 text-2xl font-black">{title}</h2>
      <div className="mt-5 grid gap-4">{children}</div>
    </section>
  );
}

const fieldClass = "mt-2 w-full rounded-2xl border-2 border-black/10 bg-[#fffdf4] px-4 py-4 text-base font-bold outline-none transition focus:border-[#ffc400] focus:bg-white";

function Field({ label, name, required = false, children }: { label: string; name: string; required?: boolean; children?: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-sm font-black text-black/80">{label}{required && <span className="text-red-600"> *</span>}</span>
      {children ?? <input name={name} required={required} className={fieldClass} />}
    </label>
  );
}

function SelectField({ label, name, options }: { label: string; name: string; options: string[] }) {
  return (
    <Field label={label} name={name} required>
      <select name={name} required className={fieldClass}>
        <option value="">เลือกคำตอบ</option>
        {options.map((x) => <option key={x} value={x}>{x}</option>)}
      </select>
    </Field>
  );
}

export function ApplyForm() {
  const [state, action, pending] = useActionState(submitFranchiseLead, initialState);
  const [selectedProvince, setSelectedProvince] = useState("");
  const districtOptions = useMemo(() => thaiAddress[selectedProvince] ?? [], [selectedProvince]);
  return (
    <form action={action} className="grid gap-5 rounded-[2.25rem] border border-black/10 bg-[#fff9df] p-4 shadow-xl shadow-black/5 sm:p-6">
      {state.message && <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-black text-red-700">{state.message}</div>}

      <Section eyebrow="Step 01" title="ข้อมูลติดต่อ">
        <Field label="ชื่อ-นามสกุล" name="full_name" required />
        <Field label="เบอร์โทร" name="phone" required><input name="phone" required inputMode="tel" className={fieldClass} /></Field>
        <Field label="Line ID" name="line_id" />
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="จังหวัด" name="province" required>
            <select
              name="province"
              required
              value={selectedProvince}
              onChange={(event) => setSelectedProvince(event.target.value)}
              className={fieldClass}
            >
              <option value="">เลือกจังหวัด</option>
              {thaiProvinces.map((province) => <option key={province} value={province}>{province}</option>)}
            </select>
          </Field>
          <Field label="อำเภอ/เขต" name="district" required>
            <select name="district" required disabled={!selectedProvince} className={fieldClass}>
              <option value="">{selectedProvince ? "เลือกอำเภอ/เขต" : "เลือกจังหวัดก่อน"}</option>
              {districtOptions.map((district) => <option key={district} value={district}>{district}</option>)}
            </select>
          </Field>
        </div>
      </Section>

      <Section eyebrow="Step 02" title="ความพร้อมเบื้องต้น">
        <SelectField label="มีทำเลแล้วหรือยัง" name="has_location" options={hasLocationOptions} />
        <SelectField label="ประเภททำเล" name="location_type" options={locationTypeOptions} />
        <SelectField label="งบประมาณ" name="budget_range" options={budgetOptions} />
        <SelectField label="ทุนสำรอง" name="working_capital" options={workingCapitalOptions} />
        <SelectField label="เวลาที่สามารถดูแลร้านได้ต่อวัน" name="available_time_per_day" options={availableTimeOptions} />
        <SelectField label="ประสบการณ์ขาย/ทำธุรกิจ" name="business_experience" options={businessExperienceOptions} />
        <SelectField label="รายได้ต่อวันที่คาดหวัง" name="expected_daily_income" options={expectedIncomeOptions} />
      </Section>

      <Section eyebrow="Step 03" title="ยืนยันความเข้าใจ">
        <label className="flex items-start gap-3 rounded-[1.25rem] border-2 border-black/10 bg-[#fffdf4] p-4">
          <input name="understanding_confirmed" type="checkbox" value="true" required className="mt-1 h-6 w-6 shrink-0 accent-[#ffc400]" />
          <span className="text-sm font-bold leading-7 text-black/75">ข้าพเจ้าเข้าใจว่าแฟรนไชส์นี้ไม่ใช่การซื้ออุปกรณ์เปิดร้านเพียงอย่างเดียว แต่เป็นระบบร้านข้าวเหนียวไก่ทอดที่ต้องลงมือทำจริง ไม่มีการการันตีกำไร และการกรอกแบบฟอร์มนี้ยังไม่ถือว่าได้รับสิทธิ์แฟรนไชส์ทันที ทีมงานจะตรวจสอบข้อมูลและติดต่อกลับสำหรับผู้ที่มีความเหมาะสมกับระบบของแบรนด์</span>
        </label>
      </Section>

      <button disabled={pending} className="min-h-14 rounded-full bg-[#ffc400] px-6 py-4 text-lg font-black text-black shadow-lg shadow-yellow-300/30 transition hover:bg-[#ffd84d] disabled:opacity-60">{pending ? "กำลังส่งข้อมูล..." : "ส่งข้อมูลให้ทีมงานติดต่อกลับ"}</button>
    </form>
  );
}
