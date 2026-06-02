"use client";

import { useActionState, useMemo, useState } from "react";
import { saveDailyReport } from "@/app/actions";
import { NumberField, TextAreaField } from "@/components/field";
import { ORDER_REQUEST_ITEMS, RECEIVED_INGREDIENT_ITEMS, USED_INGREDIENT_ITEMS } from "@/lib/report-items";
import { moneyFormatter } from "@/lib/format";
import { SubmitButton } from "./submit-button";
import type { Branch, DailyReport } from "@/lib/types";

type DailyFormBranch = Pick<Branch, "id" | "name">;

export function DailyForm({ branches, defaultBranchId, reportDate, existingReport, canSelectBranch }: { branches: DailyFormBranch[]; defaultBranchId: string; reportDate: string; existingReport?: DailyReport | null; canSelectBranch: boolean }) {
  const [state, formAction] = useActionState(saveDailyReport, null);
  const [cashSales, setCashSales] = useState(Number(existingReport?.cash_sales ?? 0));
  const [transferSales, setTransferSales] = useState(Number(existingReport?.transfer_sales ?? 0));
  const [selectedBranchId, setSelectedBranchId] = useState(existingReport?.branch_id ?? defaultBranchId);
  const selectedBranchName = branches.find((branch) => branch.id === selectedBranchId)?.name ?? "";
  const totalSales = useMemo(() => cashSales + transferSales, [cashSales, transferSales]);

  const [otherOrderItems, setOtherOrderItems] = useState<{ name: string; amount: number }[]>(
    Array.isArray(existingReport?.order_other_items) && existingReport?.order_other_items.length > 0
      ? existingReport.order_other_items
      : [{ name: "", amount: 0 }],
  );

  return (
    <form action={formAction} className="space-y-5">
      <section className="rounded-[1.75rem] border border-black/10 bg-white p-5 shadow-sm">
        <h2 className="text-2xl font-black">สาขาและวันที่</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="mb-2 block font-black">สาขา</span>
            {canSelectBranch ? (
              <select name="branch_id" value={selectedBranchId} onChange={(event) => setSelectedBranchId(event.target.value)} className="focus-ring min-h-14 w-full rounded-2xl border-2 border-black/10 bg-white px-4 text-lg font-bold">
                {branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}
              </select>
            ) : (
              <div className="min-h-14 rounded-2xl border-2 border-black/10 bg-black/[0.03] px-4 py-3 text-lg font-black">{selectedBranchName || "สาขาของคุณ"}</div>
            )}
            <input type="hidden" name="branch_id" value={selectedBranchId} />
            <input type="hidden" name="branch_name" value={selectedBranchName} />
          </label>
          <label className="block">
            <span className="mb-2 block font-black">วันที่บันทึก</span>
            <input className="focus-ring min-h-14 w-full rounded-2xl border-2 border-black/10 bg-white px-4 text-lg font-bold" type="date" name="report_date" defaultValue={reportDate} required />
          </label>
        </div>
      </section>

      <section id="received-inventory" className="scroll-mt-24 rounded-[1.75rem] border border-black/10 bg-white p-5 shadow-sm">
        <h2 className="text-2xl font-black">1. วัตถุดิบรับเข้า</h2>
        <p className="mt-1 text-sm font-bold text-black/50">กรอกตอนเช้าหรือตอนของมาส่ง เพื่อให้รายงานคำนวณรับเข้า เหลือ ใช้ไป และควรสั่งเพิ่มได้ครบ</p>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          {RECEIVED_INGREDIENT_ITEMS.map((item) => (
            <NumberField
              key={item.name}
              label={`${item.label} (${item.unit})`}
              name={item.name}
              defaultValue={Number(existingReport?.[item.name] ?? 0)}
            />
          ))}
        </div>
      </section>

      <section className="rounded-[1.75rem] border border-black/10 bg-white p-5 shadow-sm">
        <h2 className="text-2xl font-black">2. ยอดขายประจำวัน</h2>
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
        <h2 className="text-2xl font-black">3. วัตถุดิบใช้ไป</h2>
        <p className="mt-1 text-sm font-bold text-black/50">กรอกเฉพาะตัวเลขจำนวนกิโลกรัมที่ใช้ไปในวันนี้หรือรอบนี้</p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {USED_INGREDIENT_ITEMS.map((item) => (
            <NumberField
              key={item.name}
              label={`${item.label} (${item.unit})`}
              name={item.name}
              defaultValue={Number(existingReport?.[item.name] ?? 0)}
            />
          ))}
        </div>
      </section>

      <section className="rounded-[1.75rem] border border-black/10 bg-white p-5 shadow-sm">
        <h2 className="text-2xl font-black">4. วัตถุดิบคงเหลือ</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <NumberField label="ไก่คงเหลือ" name="remaining_chicken" defaultValue={existingReport?.remaining_chicken ?? 0} />
          <NumberField label="ข้าวเหนียวคงเหลือ" name="remaining_sticky_rice" defaultValue={existingReport?.remaining_sticky_rice ?? 0} />
          <NumberField label="น้ำมันคงเหลือ" name="remaining_oil" defaultValue={existingReport?.remaining_oil ?? 0} />
        </div>
      </section>

      <section className="rounded-[1.75rem] border border-black/10 bg-white p-5 shadow-sm">
        <h2 className="text-2xl font-black">5. รายการสั่งของ</h2>
        <p className="mt-1 text-sm font-bold text-black/50">เลือกรายการไว้ให้แล้ว พนักงานกรอกเฉพาะจำนวนที่ต้องการสั่ง</p>
        <div className="mt-4 space-y-3">
          {ORDER_REQUEST_ITEMS.map((item) => (
            <label key={item.name} className="flex items-center gap-3 rounded-2xl border-2 border-black/10 bg-black/[0.02] p-3">
              <span className="min-w-0 flex-1 text-base font-black text-black">{item.label}</span>
              <input className="focus-ring min-h-14 w-28 rounded-2xl border-2 border-black/10 bg-white px-3 text-center text-xl font-bold shadow-sm" type="number" inputMode="decimal" min="0" step="0.01" name={item.name} defaultValue={Number(existingReport?.[item.name] ?? 0)} aria-label={`จำนวน${item.label}`} />
              <span className="w-20 text-sm font-black text-black/60">{item.unit}</span>
            </label>
          ))}
          <div className="space-y-2 rounded-2xl border-2 border-dashed border-black/20 p-3">
            <p className="text-sm font-black text-black/60">รายการอื่นๆ (ระบุชื่อและจำนวนเอง)</p>
            {otherOrderItems.map((entry, index) => (
              <div key={index} className="grid gap-2 sm:grid-cols-[1fr_180px_auto]">
                <input className="focus-ring min-h-12 rounded-xl border-2 border-black/10 px-3 font-bold" placeholder="เช่น ถุงร้อน" value={entry.name} onChange={(event) => setOtherOrderItems((prev) => prev.map((item, i) => i === index ? { ...item, name: event.target.value } : item))} />
                <input className="focus-ring min-h-12 rounded-xl border-2 border-black/10 px-3 text-center font-bold" type="number" inputMode="decimal" min="0" step="0.01" placeholder="จำนวน" value={entry.amount || ""} onChange={(event) => setOtherOrderItems((prev) => prev.map((item, i) => i === index ? { ...item, amount: Number(event.target.value || 0) } : item))} />
                <button type="button" className="focus-ring rounded-xl bg-black px-4 text-sm font-black text-white" onClick={() => setOtherOrderItems((prev) => prev.filter((_, i) => i !== index || prev.length === 1))}>ลบ</button>
              </div>
            ))}
            <input type="hidden" name="order_other_items" value={JSON.stringify(otherOrderItems.filter((item) => item.name.trim() && item.amount > 0))} />
            <button type="button" className="focus-ring rounded-xl bg-[#ffc400] px-4 py-2 text-sm font-black" onClick={() => setOtherOrderItems((prev) => [...prev, { name: "", amount: 0 }])}>+ เพิ่มรายการอื่นๆ</button>
          </div>
        </div>
      </section>

      <section className="rounded-[1.75rem] border border-black/10 bg-white p-5 shadow-sm">
        <h2 className="text-2xl font-black">6. หมายเหตุ</h2>
        <div className="mt-4"><TextAreaField label="หมายเหตุประจำวัน" name="note" defaultValue={existingReport?.note ?? ""} placeholder="ปัญหา ลูกค้าเยอะ ของขาด ฯลฯ" /></div>
      </section>

      {state?.message && <div className={`rounded-2xl p-4 text-center font-black ${state.ok ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>{state.message}</div>}
      <SubmitButton />
    </form>
  );
}
