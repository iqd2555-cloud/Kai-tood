"use client";

import { useActionState, useMemo, useState } from "react";
import { saveDailyReport } from "@/app/actions";
import { NumberField, TextAreaField } from "@/components/field";
import { moneyFormatter } from "@/lib/format";
import { SubmitButton } from "./submit-button";
import type { Branch, DailyReport } from "@/lib/types";

export function DailyForm({ branches, defaultBranchId, reportDate, existingReport }: { branches: Branch[]; defaultBranchId: string; reportDate: string; existingReport?: DailyReport | null }) {
  const [state, formAction] = useActionState(saveDailyReport, null);
  const [cashSales, setCashSales] = useState(Number(existingReport?.cash_sales ?? 0));
  const [transferSales, setTransferSales] = useState(Number(existingReport?.transfer_sales ?? 0));
  const totalSales = useMemo(() => cashSales + transferSales, [cashSales, transferSales]);

  return (
    <form action={formAction} className="space-y-5">
      <section className="rounded-[1.75rem] border border-black/10 bg-white p-5 shadow-sm">
        <h2 className="text-2xl font-black">สาขาและวันที่</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="mb-2 block font-black">สาขา</span>
            <select name="branch_id" defaultValue={existingReport?.branch_id ?? defaultBranchId} className="focus-ring min-h-14 w-full rounded-2xl border-2 border-black/10 bg-white px-4 text-lg font-bold">
              {branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}
            </select>
          </label>
          <label className="block">
            <span className="mb-2 block font-black">วันที่บันทึก</span>
            <input className="focus-ring min-h-14 w-full rounded-2xl border-2 border-black/10 bg-white px-4 text-lg font-bold" type="date" name="report_date" defaultValue={reportDate} required />
          </label>
        </div>
      </section>

      <section className="rounded-[1.75rem] border border-black/10 bg-white p-5 shadow-sm">
        <h2 className="text-2xl font-black">1. ยอดขายประจำวัน</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="mb-2 block text-base font-black text-black">เงินสด</span>
            <input
              className="focus-ring min-h-14 w-full rounded-2xl border-2 border-black/10 bg-white px-4 text-xl font-bold shadow-sm"
              type="number"
              inputMode="decimal"
              min="0"
              step="0.01"
              name="cash_sales"
              defaultValue={cashSales}
              onChange={(event) => setCashSales(Number(event.target.value || 0))}
            />
          </label>
          <label className="block">
            <span className="mb-2 block text-base font-black text-black">โอน</span>
            <input
              className="focus-ring min-h-14 w-full rounded-2xl border-2 border-black/10 bg-white px-4 text-xl font-bold shadow-sm"
              type="number"
              inputMode="decimal"
              min="0"
              step="0.01"
              name="transfer_sales"
              defaultValue={transferSales}
              onChange={(event) => setTransferSales(Number(event.target.value || 0))}
            />
          </label>
        </div>
        <div className="mt-4 rounded-3xl bg-[#ffc400] p-5 text-center text-black">
          <div className="text-sm font-black opacity-70">ยอดรวมอัตโนมัติ</div>
          <div className="text-4xl font-black tracking-tight">{moneyFormatter.format(totalSales)}</div>
        </div>
      </section>

      <section className="rounded-[1.75rem] border border-black/10 bg-white p-5 shadow-sm">
        <h2 className="text-2xl font-black">2. วัตถุดิบที่ใช้ไป</h2>
        <p className="mt-1 text-sm font-bold text-black/50">กรอกเป็นกิโลกรัมหรือหน่วยที่ร้านกำหนด</p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <NumberField label="BL" name="used_bl" defaultValue={existingReport?.used_bl ?? 0} />
          <NumberField label="BB" name="used_bb" defaultValue={existingReport?.used_bb ?? 0} />
          <NumberField label="หนังไก่" name="used_chicken_skin" defaultValue={existingReport?.used_chicken_skin ?? 0} />
          <NumberField label="น้ำมัน" name="used_oil" defaultValue={existingReport?.used_oil ?? 0} />
          <NumberField label="ข้าวเหนียว" name="used_sticky_rice" defaultValue={existingReport?.used_sticky_rice ?? 0} />
        </div>
      </section>

      <section className="rounded-[1.75rem] border border-black/10 bg-white p-5 shadow-sm">
        <h2 className="text-2xl font-black">3. สินค้าคงเหลือ</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <NumberField label="ไก่คงเหลือ" name="remaining_chicken" defaultValue={existingReport?.remaining_chicken ?? 0} />
          <NumberField label="ข้าวเหนียวคงเหลือ" name="remaining_sticky_rice" defaultValue={existingReport?.remaining_sticky_rice ?? 0} />
          <NumberField label="น้ำมันคงเหลือ" name="remaining_oil" defaultValue={existingReport?.remaining_oil ?? 0} />
        </div>
      </section>

      <section className="rounded-[1.75rem] border border-black/10 bg-white p-5 shadow-sm">
        <h2 className="text-2xl font-black">4. สั่งวัตถุดิบพรุ่งนี้</h2>
        <div className="mt-4"><TextAreaField label="รายการที่ต้องการ" name="requested_items" defaultValue={existingReport?.requested_items ?? ""} placeholder="เช่น BL 10 กก., น้ำมัน 2 ปี๊บ" /></div>
      </section>

      <section className="rounded-[1.75rem] border border-black/10 bg-white p-5 shadow-sm">
        <h2 className="text-2xl font-black">5. หมายเหตุ</h2>
        <div className="mt-4"><TextAreaField label="หมายเหตุประจำวัน" name="note" defaultValue={existingReport?.note ?? ""} placeholder="ปัญหา ลูกค้าเยอะ ของขาด ฯลฯ" /></div>
      </section>

      {state?.message && <div className={`rounded-2xl p-4 text-center font-black ${state.ok ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>{state.message}</div>}
      <SubmitButton />
    </form>
  );
}
