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

type QuickOrderParseResult = {
  fields: Partial<Record<(typeof ORDER_REQUEST_ITEMS)[number]["name"], number>>;
  otherItems: { name: string; amount: number }[];
  infoLines: string[];
};

const QUICK_ORDER_PATTERNS: { field?: (typeof ORDER_REQUEST_ITEMS)[number]["name"]; otherName?: string; pattern: RegExp }[] = [
  { field: "order_original_chicken", pattern: /(?:\bBL\b|บีแอล)(?!\s*skin)[^\d\n]*(\d+(?:\.\d+)?)/i },
  { field: "order_spicy_chicken", pattern: /(?:\bBB\b|บีบี)[^\d\n]*(\d+(?:\.\d+)?)/i },
  { field: "order_chicken_skin", pattern: /(?:BL\s*skin|หนังไก่)[^\d\n]*(\d+(?:\.\d+)?)/i },
  { field: "order_offal", pattern: /(?:ตับ\s*c|ตับc|ดึงดีตับแตก|เครื่องใน)[^\d\n]*(\d+(?:\.\d+)?)/i },
  { field: "order_chopped_chicken", pattern: /ไก่สับ[^\d\n]*(\d+(?:\.\d+)?)/i },
  { otherName: "ปีกบนชำรุด", pattern: /ปีกบนชำรุด[^\d\n]*(\d+(?:\.\d+)?)/i },
];

function parseQuickOrderMessage(message: string): QuickOrderParseResult {
  const fields: QuickOrderParseResult["fields"] = {};
  const otherItems: QuickOrderParseResult["otherItems"] = [];
  const infoLines = message
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) =>
      line &&
      !QUICK_ORDER_PATTERNS.some(({ pattern }) => pattern.test(line)) &&
      !/^วันที่\s*/i.test(line),
    );

  for (const item of QUICK_ORDER_PATTERNS) {
    const match = message.match(item.pattern);
    const amount = Number(match?.[1] ?? 0);
    if (!amount) continue;
    if (item.field) fields[item.field] = amount;
    if (item.otherName) otherItems.push({ name: item.otherName, amount });
  }

  return { fields, otherItems, infoLines };
}


const InventoryInputSection = memo(function InventoryInputSection({
  id,
  title,
  description,
  items,
  columns = "sm:grid-cols-2",
  existingReport,
  onInventoryChange,
  readOnly = false,
}: {
  id?: string;
  title: string;
  description: string;
  items: readonly ReportItem[];
  columns?: string;
  existingReport?: DailyReport | null;
  onInventoryChange: (name: string, value: number) => void;
  readOnly?: boolean;
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
            readOnly={readOnly}
          />
        ))}
      </div>
    </section>
  );
});

const UsedByStockSummary = memo(function UsedByStockSummary({
  inventoryValues,
  hasPreviousReport,
}: {
  inventoryValues: InventoryValues;
  hasPreviousReport: boolean;
}) {
  const rows = useMemo(
    () =>
      INVENTORY_FLOW_ITEMS.map((item) => {
        const usedByStock =
          (inventoryValues[item.opening] ?? 0) +
          (inventoryValues[item.received] ?? 0) -
          (inventoryValues[item.remaining] ?? 0);
        return { ...item, usedByStock };
      }),
    [inventoryValues],
  );

  return (
    <section className="rounded-[1.75rem] border border-black/10 bg-white p-5 shadow-sm">
      <h2 className="text-2xl font-black">3. วัตถุดิบใช้ไปตามสต๊อก — ระบบคำนวณอัตโนมัติ</h2>
      <p className="mt-1 text-sm font-bold text-black/50">
        ระบบคำนวณจากยอดคงเหลือเมื่อวาน + รับเข้าวันนี้ - คงเหลือวันนี้
      </p>
      {!hasPreviousReport && (
        <p className="mt-3 rounded-2xl bg-yellow-100 px-4 py-3 text-sm font-black text-yellow-900">
          ไม่พบยอดคงเหลือจากเมื่อวาน ระบบใช้ค่า 0 ชั่วคราว
        </p>
      )}
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {rows.map((row) => (
          <div key={row.used} className="rounded-2xl border-2 border-black/10 bg-black/[0.02] p-4">
            <input type="hidden" name={row.used} value={row.usedByStock} />
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-black">{row.label}</p>
                <p className="text-xs font-bold text-black/50">
                  {inventoryValues[row.opening] ?? 0} + {inventoryValues[row.received] ?? 0} - {inventoryValues[row.remaining] ?? 0}
                </p>
              </div>
              <div className={`text-right text-2xl font-black ${row.usedByStock < 0 ? "text-red-700" : "text-black"}`}>
                {row.usedByStock.toLocaleString("th-TH")}
                <span className="ml-1 text-sm">{row.unit}</span>
              </div>
            </div>
            {row.usedByStock < 0 && (
              <p className="mt-2 text-sm font-black text-red-700">
                ตัวเลขติดลบ กรุณาตรวจสอบยอดรับเข้าและคงเหลือวันนี้
              </p>
            )}
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
  previousReport,
  canSelectBranch,
}: {
  branches: DailyFormBranch[];
  defaultBranchId: string;
  reportDate: string;
  existingReport?: DailyReport | null;
  previousReport?: DailyReport | null;
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
        values[item.opening] = Number(previousReport?.[item.remaining] ?? 0);
        values[item.received] = Number(existingReport?.[item.received] ?? 0);
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
  const [quickOrderMessage, setQuickOrderMessage] = useState("");
  const [quickOrderFeedback, setQuickOrderFeedback] = useState("");
  const [orderFieldValues, setOrderFieldValues] = useState(() =>
    Object.fromEntries(
      ORDER_REQUEST_ITEMS.map((item) => [
        item.name,
        Number(existingReport?.[item.name] ?? 0),
      ]),
    ) as Record<(typeof ORDER_REQUEST_ITEMS)[number]["name"], number>,
  );
  const [otherOrderItems, setOtherOrderItems] = useState<
    { name: string; amount: number }[]
  >(
    Array.isArray(existingReport?.order_other_items) &&
      existingReport?.order_other_items.length > 0
      ? existingReport.order_other_items
      : [{ name: "", amount: 0 }],
  );
  const applyQuickOrderMessage = useCallback(() => {
    const parsed = parseQuickOrderMessage(quickOrderMessage);
    setOrderFieldValues((prev) => ({ ...prev, ...parsed.fields }));
    setOtherOrderItems((prev) => {
      const kept = prev.filter((item) => item.name.trim() && item.amount > 0);
      const merged = [...kept];
      for (const item of parsed.otherItems) {
        const existingIndex = merged.findIndex((entry) => entry.name === item.name);
        if (existingIndex >= 0) merged[existingIndex] = item;
        else merged.push(item);
      }
      return merged.length > 0 ? merged : [{ name: "", amount: 0 }];
    });
    const filledCount = Object.keys(parsed.fields).length + parsed.otherItems.length;
    setQuickOrderFeedback(
      filledCount > 0
        ? `ดึงรายการได้ ${filledCount.toLocaleString("th-TH")} รายการ${parsed.infoLines.length ? ` — ข้อมูลจัดส่ง/ลูกค้า: ${parsed.infoLines.join(" • ")}` : ""}`
        : "ยังไม่พบรายการที่ระบบรู้จัก กรุณากรอกเองหรือเพิ่มเป็นรายการอื่นๆ",
    );
  }, [quickOrderMessage]);

  const serializedOtherOrderItems = useMemo(
    () =>
      JSON.stringify(
        otherOrderItems.filter((item) => item.name.trim() && item.amount > 0),
      ),
    [otherOrderItems],
  );

  const openingSnapshot = useMemo(() => {
    const values: Partial<DailyReport> = {};
    for (const item of INVENTORY_FLOW_ITEMS) {
      values[item.opening] = Number(previousReport?.[item.remaining] ?? 0);
    }
    return values as DailyReport;
  }, [previousReport]);

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
        description="ระบบดึงยอดคงเหลือของวัตถุดิบแต่ละรายการจากรายงานล่าสุดของวันก่อนหน้า"
        items={OPENING_INVENTORY_ITEMS}
        existingReport={openingSnapshot}
        onInventoryChange={setInventoryField}
        readOnly
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

      <UsedByStockSummary inventoryValues={inventoryValues} hasPreviousReport={Boolean(previousReport)} />

      <InventoryInputSection
        title="4. สินค้าคงเหลือวันนี้"
        description="กรอกจำนวนคงเหลือปลายวันด้วยมือเพื่อใช้ตรวจสอบสต๊อกของแต่ละสาขา"
        items={REMAINING_INVENTORY_ITEMS}
        existingReport={existingReport}
        onInventoryChange={setInventoryField}
      />

      <section className="rounded-[1.75rem] border border-black/10 bg-white p-5 shadow-sm">
        <h2 className="text-2xl font-black">5. รายการสั่งวัตถุดิบเพิ่ม</h2>
        <p className="mt-1 text-sm font-bold text-black/50">
          เลือกรายการไว้ให้แล้ว พนักงานกรอกเฉพาะจำนวนที่ต้องการสั่ง
        </p>
        <div className="mt-4 space-y-3">
          <div className="rounded-2xl border-2 border-dashed border-[#E60012]/30 bg-[#E60012]/5 p-3">
            <label className="block">
              <span className="mb-2 block text-sm font-black text-black/70">วางข้อความสั่งของจาก LINE / แชต</span>
              <textarea
                className="focus-ring min-h-32 w-full rounded-2xl border-2 border-black/10 bg-white px-4 py-3 text-base font-bold shadow-sm"
                value={quickOrderMessage}
                onChange={(event) => setQuickOrderMessage(event.target.value)}
                placeholder={"เช่น BL scrap 70 กก.\nBB scrap 30 กก.\nตับc 70 กก.\nรถพี่เจี๊ยบ"}
              />
            </label>
            <button
              type="button"
              className="focus-ring mt-3 min-h-12 rounded-2xl bg-black px-5 text-base font-black text-white"
              onClick={applyQuickOrderMessage}
            >
              ดึงรายการเข้าฟอร์ม
            </button>
            {quickOrderFeedback && (
              <p className="mt-2 rounded-xl bg-white px-3 py-2 text-sm font-black text-black/70">{quickOrderFeedback}</p>
            )}
          </div>
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
                value={orderFieldValues[item.name] || ""}
                onChange={(event) =>
                  setOrderFieldValues((prev) => ({
                    ...prev,
                    [item.name]: Number(event.target.value || 0),
                  }))
                }
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
