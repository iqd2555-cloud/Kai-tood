"use client";

import { memo, useActionState, useCallback, useMemo, useState } from "react";
import type { ChangeEventHandler } from "react";
import { saveDailyReport } from "@/app/actions";
import { NumberField, TextAreaField } from "@/components/field";
import {
  INVENTORY_FLOW_ITEMS,
  OPENING_INVENTORY_ITEMS,
  ORDER_REQUEST_ITEMS,
  RECEIVED_INGREDIENT_ITEMS,
  REMAINING_INVENTORY_ITEMS,
  USED_INGREDIENT_ITEMS,
} from "@/lib/report-items";
import { moneyFormatter } from "@/lib/format";
import { SubmitButton } from "./submit-button";
import type { Branch, DailyReport } from "@/lib/types";

type DailyFormBranch = Pick<Branch, "id" | "name">;
type InventoryValues = Record<string, number>;
type ReportItem = {
  name: keyof DailyReport & string;
  label: string;
  unit: string;
};

const toInputNumber = (value: string) => Number(value || 0);

const InventoryInputSection = memo(function InventoryInputSection({
  id,
  title,
  description,
  items,
  columns = "sm:grid-cols-2",
  existingReport,
  onInventoryChange,
}: {
  id?: string;
  title: string;
  description: string;
  items: readonly ReportItem[];
  columns?: string;
  existingReport?: DailyReport | null;
  onInventoryChange: (name: string, value: number) => void;
}) {
  return (
    <section
      id={id}
      className="scroll-mt-24 rounded-[1.75rem] border border-black/10 bg-white p-5 shadow-sm"
    >
      <h2 className="text-2xl font-black">{title}</h2>
      <p className="mt-1 text-sm font-bold text-black/50">{description}</p>
      <div className={`mt-4 grid gap-4 ${columns}`}>
        {items.map((item) => (
          <NumberField
            key={item.name}
            label={`${item.label} (${item.unit})`}
            name={item.name}
            defaultValue={Number(existingReport?.[item.name] ?? 0)}
            onChange={(event) =>
              onInventoryChange(item.name, toInputNumber(event.target.value))
            }
          />
        ))}
      </div>
    </section>
  );
});

const InventorySummary = memo(function InventorySummary({
  inventoryValues,
}: {
  inventoryValues: InventoryValues;
}) {
  const rows = useMemo(
    () =>
      INVENTORY_FLOW_ITEMS.map((item) => {
        const calculated =
          (inventoryValues[item.opening] ?? 0) +
          (inventoryValues[item.received] ?? 0) -
          (inventoryValues[item.used] ?? 0);
        const actual = inventoryValues[item.remaining] ?? 0;
        return {
          label: item.label,
          calculated,
          actual,
          difference: actual - calculated,
        };
      }),
    [inventoryValues],
  );

  return (
    <section className="rounded-[1.75rem] border border-black/10 bg-white p-5 shadow-sm">
      <h2 className="text-2xl font-black">คงเหลือคำนวณวันนี้</h2>
      <p className="mt-1 text-sm font-bold text-black/50">
        สูตร: ยกมา + รับเข้า - ใช้ไป และเทียบกับสินค้าคงเหลือปิดร้านที่กรอกจริง
      </p>
      <div className="mt-4 overflow-hidden rounded-2xl border border-black/10">
        <div className="grid grid-cols-4 bg-black px-3 py-2 text-xs font-black text-white">
          <span>วัตถุดิบ</span>
          <span className="text-right">คำนวณวันนี้</span>
          <span className="text-right">ปิดร้านจริง</span>
          <span className="text-right">ส่วนต่าง</span>
        </div>
        {rows.map((row) => (
          <div
            key={row.label}
            className="grid grid-cols-4 border-t border-black/10 px-3 py-3 text-xs font-bold sm:text-sm"
          >
            <span>{row.label}</span>
            <span className="text-right">
              {row.calculated.toLocaleString("th-TH")}
            </span>
            <span className="text-right">
              {row.actual.toLocaleString("th-TH")}
            </span>
            <span
              className={`text-right font-black ${row.difference === 0 ? "text-green-700" : "text-red-700"}`}
            >
              {row.difference.toLocaleString("th-TH")}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
});

export function DailyForm({
  branches,
  defaultBranchId,
  reportDate,
  existingReport,
  canSelectBranch,
}: {
  branches: DailyFormBranch[];
  defaultBranchId: string;
  reportDate: string;
  existingReport?: DailyReport | null;
  canSelectBranch: boolean;
}) {
  const [state, formAction] = useActionState(saveDailyReport, null);
  const [cashSales, setCashSales] = useState(
    Number(existingReport?.cash_sales ?? 0),
  );
  const [transferSales, setTransferSales] = useState(
    Number(existingReport?.transfer_sales ?? 0),
  );
  const [selectedBranchId, setSelectedBranchId] = useState(
    existingReport?.branch_id ?? defaultBranchId,
  );
  const selectedBranchName = useMemo(
    () => branches.find((branch) => branch.id === selectedBranchId)?.name ?? "",
    [branches, selectedBranchId],
  );
  const totalSales = useMemo(
    () => cashSales + transferSales,
    [cashSales, transferSales],
  );
  const [inventoryValues, setInventoryValues] = useState<InventoryValues>(
    () => {
      const values: InventoryValues = {};
      for (const item of INVENTORY_FLOW_ITEMS) {
        values[item.opening] = Number(existingReport?.[item.opening] ?? 0);
        values[item.received] = Number(existingReport?.[item.received] ?? 0);
        values[item.used] = Number(existingReport?.[item.used] ?? 0);
        values[item.remaining] = Number(existingReport?.[item.remaining] ?? 0);
      }
      return values;
    },
  );
  const setInventoryField = useCallback(
    (name: string, value: number) =>
      setInventoryValues((prev) =>
        prev[name] === value ? prev : { ...prev, [name]: value },
      ),
    [],
  );
  const handleCashSalesChange = useCallback<
    ChangeEventHandler<HTMLInputElement>
  >((event) => setCashSales(toInputNumber(event.target.value)), []);
  const handleTransferSalesChange = useCallback<
    ChangeEventHandler<HTMLInputElement>
  >((event) => setTransferSales(toInputNumber(event.target.value)), []);
  const [otherOrderItems, setOtherOrderItems] = useState<
    { name: string; amount: number }[]
  >(
    Array.isArray(existingReport?.order_other_items) &&
      existingReport?.order_other_items.length > 0
      ? existingReport.order_other_items
      : [{ name: "", amount: 0 }],
  );
  const serializedOtherOrderItems = useMemo(
    () =>
      JSON.stringify(
        otherOrderItems.filter((item) => item.name.trim() && item.amount > 0),
      ),
    [otherOrderItems],
  );

  return (
    <form action={formAction} className="space-y-5">
      <section className="rounded-[1.75rem] border border-black/10 bg-white p-5 shadow-sm">
        <h2 className="text-2xl font-black">สาขาและวันที่</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="mb-2 block font-black">สาขา</span>
            {canSelectBranch ? (
              <select
                name="branch_id"
                value={selectedBranchId}
                onChange={(event) => setSelectedBranchId(event.target.value)}
                className="focus-ring min-h-14 w-full rounded-2xl border-2 border-black/10 bg-white px-4 text-lg font-bold"
              >
                {branches.map((branch) => (
                  <option key={branch.id} value={branch.id}>
                    {branch.name}
                  </option>
                ))}
              </select>
            ) : (
              <div className="min-h-14 rounded-2xl border-2 border-black/10 bg-black/[0.03] px-4 py-3 text-lg font-black">
                {selectedBranchName || "สาขาของคุณ"}
              </div>
            )}
            <input type="hidden" name="branch_id" value={selectedBranchId} />
            <input
              type="hidden"
              name="branch_name"
              value={selectedBranchName}
            />
          </label>
          <label className="block">
            <span className="mb-2 block font-black">วันที่บันทึก</span>
            <input
              className="focus-ring min-h-14 w-full rounded-2xl border-2 border-black/10 bg-white px-4 text-lg font-bold"
              type="date"
              name="report_date"
              defaultValue={reportDate}
              required
            />
          </label>
        </div>
      </section>

      <InventoryInputSection
        id="opening-inventory"
        title="0. ยกมา / คงเหลือจากเมื่อวาน"
        description="กรอกจำนวนวัตถุดิบที่ยกมาจากเมื่อวานให้ครบทุกประเภท เพื่อใช้คำนวณคงเหลือวันนี้"
        items={OPENING_INVENTORY_ITEMS}
        existingReport={existingReport}
        onInventoryChange={setInventoryField}
      />

      <InventoryInputSection
        id="received-inventory"
        title="1. วัตถุดิบรับเข้า"
        description="กรอกตอนเช้าหรือตอนของมาส่ง เพื่อให้รายงานคำนวณรับเข้า เหลือ ใช้ไป และควรสั่งเพิ่มได้ครบ"
        items={RECEIVED_INGREDIENT_ITEMS}
        columns="sm:grid-cols-3"
        existingReport={existingReport}
        onInventoryChange={setInventoryField}
      />

      <section className="rounded-[1.75rem] border border-black/10 bg-white p-5 shadow-sm">
        <h2 className="text-2xl font-black">2. ยอดขายประจำวัน</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="mb-2 block text-base font-black text-black">
              เงินสด
            </span>
            <input
              className="focus-ring min-h-14 w-full rounded-2xl border-2 border-black/10 bg-white px-4 text-xl font-bold shadow-sm"
              type="number"
              inputMode="decimal"
              min="0"
              step="0.01"
              name="cash_sales"
              defaultValue={cashSales}
              onChange={handleCashSalesChange}
            />
          </label>
          <label className="block">
            <span className="mb-2 block text-base font-black text-black">
              โอน
            </span>
            <input
              className="focus-ring min-h-14 w-full rounded-2xl border-2 border-black/10 bg-white px-4 text-xl font-bold shadow-sm"
              type="number"
              inputMode="decimal"
              min="0"
              step="0.01"
              name="transfer_sales"
              defaultValue={transferSales}
              onChange={handleTransferSalesChange}
            />
          </label>
        </div>
        <div className="mt-4 rounded-3xl bg-[#E60012] p-5 text-center text-white">
          <div className="text-sm font-black opacity-70">ยอดรวมอัตโนมัติ</div>
          <div className="text-4xl font-black tracking-tight">
            {moneyFormatter.format(totalSales)}
          </div>
        </div>
      </section>

      <InventoryInputSection
        title="3. วัตถุดิบใช้ไป"
        description="กรอกเฉพาะตัวเลขจำนวนกิโลกรัมที่ใช้ไปในวันนี้หรือรอบนี้"
        items={USED_INGREDIENT_ITEMS}
        existingReport={existingReport}
        onInventoryChange={setInventoryField}
      />

      <InventoryInputSection
        title="4. สินค้าคงเหลือ"
        description="กรอกจำนวนคงเหลือปลายวันด้วยมือเพื่อใช้ตรวจสอบสต๊อกของแต่ละสาขา"
        items={REMAINING_INVENTORY_ITEMS}
        existingReport={existingReport}
        onInventoryChange={setInventoryField}
      />

      <InventorySummary inventoryValues={inventoryValues} />

      <section className="rounded-[1.75rem] border border-black/10 bg-white p-5 shadow-sm">
        <h2 className="text-2xl font-black">5. รายการสั่งของ</h2>
        <p className="mt-1 text-sm font-bold text-black/50">
          เลือกรายการไว้ให้แล้ว พนักงานกรอกเฉพาะจำนวนที่ต้องการสั่ง
        </p>
        <div className="mt-4 space-y-3">
          {ORDER_REQUEST_ITEMS.map((item) => (
            <label
              key={item.name}
              className="flex items-center gap-3 rounded-2xl border-2 border-black/10 bg-black/[0.02] p-3"
            >
              <span className="min-w-0 flex-1 text-base font-black text-black">
                {item.label}
              </span>
              <input
                className="focus-ring min-h-14 w-28 rounded-2xl border-2 border-black/10 bg-white px-3 text-center text-xl font-bold shadow-sm"
                type="number"
                inputMode="decimal"
                min="0"
                step="0.01"
                name={item.name}
                defaultValue={Number(existingReport?.[item.name] ?? 0)}
                aria-label={`จำนวน${item.label}`}
              />
              <span className="w-20 text-sm font-black text-black/60">
                {item.unit}
              </span>
            </label>
          ))}
          <div className="space-y-2 rounded-2xl border-2 border-dashed border-black/20 p-3">
            <p className="text-sm font-black text-black/60">
              รายการอื่นๆ (ระบุชื่อและจำนวนเอง)
            </p>
            {otherOrderItems.map((entry, index) => (
              <div
                key={index}
                className="grid gap-2 sm:grid-cols-[1fr_180px_auto]"
              >
                <input
                  className="focus-ring min-h-12 rounded-xl border-2 border-black/10 px-3 font-bold"
                  placeholder="เช่น ถุงร้อน"
                  value={entry.name}
                  onChange={(event) =>
                    setOtherOrderItems((prev) =>
                      prev.map((item, i) =>
                        i === index
                          ? { ...item, name: event.target.value }
                          : item,
                      ),
                    )
                  }
                />
                <input
                  className="focus-ring min-h-12 rounded-xl border-2 border-black/10 px-3 text-center font-bold"
                  type="number"
                  inputMode="decimal"
                  min="0"
                  step="0.01"
                  placeholder="จำนวน"
                  value={entry.amount || ""}
                  onChange={(event) =>
                    setOtherOrderItems((prev) =>
                      prev.map((item, i) =>
                        i === index
                          ? { ...item, amount: Number(event.target.value || 0) }
                          : item,
                      ),
                    )
                  }
                />
                <button
                  type="button"
                  className="focus-ring rounded-xl bg-black px-4 text-sm font-black text-white"
                  onClick={() =>
                    setOtherOrderItems((prev) =>
                      prev.filter((_, i) => i !== index || prev.length === 1),
                    )
                  }
                >
                  ลบ
                </button>
              </div>
            ))}
            <input
              type="hidden"
              name="order_other_items"
              value={serializedOtherOrderItems}
            />
            <button
              type="button"
              className="focus-ring rounded-xl bg-[#E60012] px-4 py-2 text-sm font-black"
              onClick={() =>
                setOtherOrderItems((prev) => [...prev, { name: "", amount: 0 }])
              }
            >
              + เพิ่มรายการอื่นๆ
            </button>
          </div>
        </div>
      </section>

      <section className="rounded-[1.75rem] border border-black/10 bg-white p-5 shadow-sm">
        <h2 className="text-2xl font-black">6. หมายเหตุ</h2>
        <div className="mt-4">
          <TextAreaField
            label="หมายเหตุประจำวัน"
            name="note"
            defaultValue={existingReport?.note ?? ""}
            placeholder="ปัญหา ลูกค้าเยอะ ของขาด ฯลฯ"
          />
        </div>
      </section>

      {state?.message && (
        <div
          className={`rounded-2xl p-4 text-center font-black ${state.ok ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}
        >
          {state.message}
        </div>
      )}
      <SubmitButton />
    </form>
  );
}
