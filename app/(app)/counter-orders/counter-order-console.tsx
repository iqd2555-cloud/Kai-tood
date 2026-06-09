"use client";

import { useEffect, useMemo, useState, useActionState } from "react";
import { cancelLatestCounterOrder, createCounterOrder, reprintLatestCounterOrder } from "./actions";

type CounterOrderConsoleProps = {
  branchId: string;
  latestOrderNumber?: string;
  latestOrderId?: string;
  priceItems: { price: number; item_name: string }[];
};

type StaffCounterOrderInputProps = {
  branchId: string;
  priceItems: { price: number; item_name: string }[];
};

const shortcutQuantities = [1, 2, 3, 5];
const staffQuickQuantities = [1, 2, 3, 4, 5];
const staffPrices = [20, 25, 30];
const customQuantities = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
const cancelReasons = ["กดผิด", "ลูกค้าเปลี่ยนใจ", "รายการผิด", "อื่น ๆ"];
const initialState = { ok: false, message: "" };

function SubmitHint({ message, ok }: { message: string; ok: boolean }) {
  if (!message) return null;
  return (
    <div className={`rounded-2xl px-4 py-3 text-center text-base font-black ${ok ? "bg-green-100 text-green-900" : "bg-red-100 text-red-900"}`} role="status">
      {message}
    </div>
  );
}

function availableStaffPriceItems(priceItems: StaffCounterOrderInputProps["priceItems"]) {
  return staffPrices.map((price) => priceItems.find((item) => item.price === price) ?? { price, item_name: `ไก่ทอดห่อ ${price} บาท` });
}

function StaffQuickSaleCard({ action, branchId, item, pending }: { action: (formData: FormData) => void; branchId: string; item: { price: number; item_name: string }; pending: boolean }) {
  const [quantity, setQuantity] = useState(1);

  return (
    <form action={action} className="rounded-[1.5rem] border-2 border-black/10 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-2xl font-black">ราคา {item.price} บาท</h3>
        <span className="rounded-full bg-[#ffc400] px-3 py-1 text-sm font-black text-black">ขายเร็ว</span>
      </div>
      <input type="hidden" name="branch_id" value={branchId} />
      <input type="hidden" name="price" value={item.price} />
      <input type="hidden" name="quantity" value={quantity} />
      <div className="mt-4 grid grid-cols-5 gap-2">
        {staffQuickQuantities.map((amount) => (
          <button
            key={amount}
            className={`focus-ring min-h-16 rounded-2xl border-2 text-2xl font-black ${quantity === amount ? "border-black bg-[#ffc400] text-black" : "border-black/10 bg-black/5 text-black"}`}
            type="button"
            onClick={() => setQuantity(amount)}
          >
            {amount}
          </button>
        ))}
      </div>
      <button className="focus-ring mt-4 min-h-16 w-full rounded-2xl bg-[#111111] px-4 text-xl font-black text-[#ffc400] shadow active:scale-[0.99] disabled:opacity-60" disabled={pending} type="submit">
        บันทึก
      </button>
    </form>
  );
}

function StaffBulkSaleCard({
  action,
  branchId,
  item,
  pending,
  resetSignal,
}: {
  action: (formData: FormData) => void;
  branchId: string;
  item: { price: number; item_name: string };
  pending: boolean;
  resetSignal: number;
}) {
  const [quantity, setQuantity] = useState("");
  const [warning, setWarning] = useState("");

  useEffect(() => {
    setQuantity("");
    setWarning("");
  }, [resetSignal]);

  function validateQuantity() {
    const numericQuantity = Number(quantity);
    if (!quantity || !Number.isFinite(numericQuantity) || numericQuantity < 6) {
      setWarning("กรุณากรอกจำนวนตั้งแต่ 6 ห่อขึ้นไป");
      return false;
    }
    setWarning("");
    return true;
  }

  return (
    <form
      action={action}
      className="rounded-[1.5rem] bg-[#111111] p-4 text-white shadow-sm"
      noValidate
      onSubmit={(event) => {
        if (!validateQuantity()) event.preventDefault();
      }}
    >
      <h3 className="text-2xl font-black">ราคา {item.price} บาท</h3>
      <p className="mt-1 text-sm font-bold text-white/60">กรอกจำนวนตั้งแต่ 6 ขึ้นไป</p>
      <input type="hidden" name="branch_id" value={branchId} />
      <input type="hidden" name="price" value={item.price} />
      <input type="hidden" name="entry_mode" value="bulk" />
      <label className="mt-4 block">
        <span className="mb-2 block text-sm font-black text-[#ffc400]">จำนวนห่อ</span>
        <input
          className="focus-ring min-h-16 w-full rounded-2xl border-2 border-white/20 bg-black px-4 text-center text-4xl font-black text-[#ffc400] placeholder:text-xl placeholder:text-[#ffc400]/45"
          inputMode="numeric"
          min={6}
          name="quantity"
          placeholder="กรอกจำนวน 6 ขึ้นไป"
          type="number"
          value={quantity}
          onBlur={validateQuantity}
          onChange={(event) => {
            setQuantity(event.target.value);
            if (warning) setWarning("");
          }}
        />
        {warning && <p className="mt-2 rounded-2xl bg-red-100 px-3 py-2 text-center text-sm font-black text-red-900" role="alert">{warning}</p>}
      </label>
      <button className="focus-ring mt-4 min-h-16 w-full rounded-2xl bg-[#ffc400] px-4 text-xl font-black text-black shadow active:scale-[0.99] disabled:opacity-60" disabled={pending} type="submit">
        บันทึก
      </button>
    </form>
  );
}

export function StaffCounterOrderInput({ branchId, priceItems }: StaffCounterOrderInputProps) {
  const [orderState, orderAction, orderPending] = useActionState(createCounterOrder, initialState);
  const [successToast, setSuccessToast] = useState("");
  const [bulkResetSignal, setBulkResetSignal] = useState(0);
  const limitedPriceItems = availableStaffPriceItems(priceItems);

  useEffect(() => {
    if (!orderState.ok || !orderState.message) return;

    setBulkResetSignal((current) => current + 1);
    setSuccessToast("✅ บันทึกแล้ว");

    const timeout = window.setTimeout(() => setSuccessToast(""), 1600);
    return () => window.clearTimeout(timeout);
  }, [orderState]);

  return (
    <div className="space-y-5">
      <section className="rounded-[2rem] bg-[#111111] p-5 text-white shadow-xl">
        <p className="text-sm font-bold text-[#ffc400]">โหมด Staff Order Input</p>
        <h1 className="mt-2 text-3xl font-black">กดขายหน้าร้าน</h1>
        <p className="mt-2 text-white/70">เลือกปุ่มขายแล้วกดบันทึกเท่านั้น</p>
      </section>

      <section className="space-y-4 rounded-[2rem] border-4 border-[#ffc400] bg-[#ffc400]/10 p-4 shadow-xl">
        <div>
          <p className="text-sm font-black text-black/50">กลุ่มที่ 1</p>
          <h2 className="text-2xl font-black">กดขายเร็ว</h2>
        </div>
        <div className="grid gap-3 lg:grid-cols-3">
          {limitedPriceItems.map((item) => <StaffQuickSaleCard key={item.price} action={orderAction} branchId={branchId} item={item} pending={orderPending} />)}
        </div>
      </section>

      <section className="space-y-4 rounded-[2rem] bg-white p-4 shadow-xl">
        <div>
          <p className="text-sm font-black text-black/50">กลุ่มที่ 2</p>
          <h2 className="text-2xl font-black">จำนวนมาก</h2>
        </div>
        <div className="grid gap-3 lg:grid-cols-3">
          {limitedPriceItems.map((item) => (
            <StaffBulkSaleCard
              key={item.price}
              action={orderAction}
              branchId={branchId}
              item={item}
              pending={orderPending}
              resetSignal={bulkResetSignal}
            />
          ))}
        </div>
      </section>

      {successToast && (
        <div className="fixed inset-x-4 bottom-6 z-50 mx-auto max-w-sm rounded-3xl bg-green-600 px-5 py-4 text-center text-xl font-black text-white shadow-2xl" role="status">
          {successToast}
        </div>
      )}
      {!orderState.ok && <SubmitHint message={orderState.message} ok={orderState.ok} />}
    </div>
  );
}

export function CounterOrderConsole({ branchId, latestOrderNumber, latestOrderId, priceItems }: CounterOrderConsoleProps) {
  const [orderState, orderAction, orderPending] = useActionState(createCounterOrder, initialState);
  const [cancelState, cancelAction, cancelPending] = useActionState(cancelLatestCounterOrder, initialState);
  const [reprintState, reprintAction, reprintPending] = useActionState(reprintLatestCounterOrder, initialState);
  const [selectedPrice, setSelectedPrice] = useState(priceItems[0]?.price ?? 20);
  const [quantity, setQuantity] = useState(1);
  const [showCancel, setShowCancel] = useState(false);

  const selectedItemName = useMemo(() => priceItems.find((item) => item.price === selectedPrice)?.item_name ?? `ไก่ทอดห่อ ${selectedPrice} บาท`, [priceItems, selectedPrice]);
  const total = selectedPrice * quantity;

  return (
    <div className="space-y-5">
      <form action={orderAction} className="space-y-4 rounded-[2rem] border-4 border-[#ffc400] bg-white p-4 shadow-xl">
        <input type="hidden" name="branch_id" value={branchId} />
        <div>
          <p className="text-sm font-black text-black/50">โหมดขายเร็วแบบกดครั้งเดียว</p>
          <h2 className="text-2xl font-black">กดปุ่มเดียว = บันทึกยอดทันที</h2>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {priceItems.flatMap((item) => shortcutQuantities.map((shortcutQuantity) => (
            <button
              key={`${item.price}-${shortcutQuantity}`}
              className="focus-ring min-h-24 rounded-[1.5rem] bg-[#111111] px-3 py-4 text-center text-3xl font-black text-[#ffc400] shadow active:scale-[0.98] disabled:opacity-60"
              disabled={orderPending}
              name="shortcut"
              value={`${item.price}:${shortcutQuantity}`}
            >
              {item.price} × {shortcutQuantity}
              <span className="mt-1 block text-sm font-bold text-white/70">{(item.price * shortcutQuantity).toLocaleString("th-TH")} บาท</span>
            </button>
          )))}
        </div>
        <SubmitHint message={orderState.message} ok={orderState.ok} />
      </form>

      <form action={orderAction} className="space-y-4 rounded-[2rem] bg-[#111111] p-4 text-white shadow-xl">
        <input type="hidden" name="branch_id" value={branchId} />
        <input type="hidden" name="price" value={selectedPrice} />
        <input type="hidden" name="quantity" value={quantity} />
        <div>
          <p className="text-sm font-black text-[#ffc400]">โหมดกด 2 ครั้ง</p>
          <h2 className="text-2xl font-black">เลือกราคา → เลือกจำนวน → บันทึก</h2>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {priceItems.map((item) => (
            <button
              key={item.price}
              className={`focus-ring min-h-20 rounded-[1.25rem] border-2 px-3 text-2xl font-black ${selectedPrice === item.price ? "border-[#ffc400] bg-[#ffc400] text-black" : "border-white/20 bg-white/10 text-white"}`}
              type="button"
              onClick={() => setSelectedPrice(item.price)}
            >
              {item.price} บาท
            </button>
          ))}
        </div>
        <div className="grid grid-cols-5 gap-2">
          {customQuantities.map((amount) => (
            <button
              key={amount}
              className={`focus-ring min-h-16 rounded-2xl border-2 text-2xl font-black ${quantity === amount ? "border-[#ffc400] bg-[#ffc400] text-black" : "border-white/20 bg-white/10 text-white"}`}
              type="button"
              onClick={() => setQuantity(amount)}
            >
              {amount}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-[auto_1fr_auto] items-center gap-3 rounded-[1.5rem] bg-white/10 p-3">
          <button className="focus-ring h-16 w-16 rounded-2xl bg-white text-4xl font-black text-black" type="button" onClick={() => setQuantity((current) => Math.max(1, current - 1))}>−</button>
          <label className="block text-center">
            <span className="block text-sm font-bold text-white/60">จำนวนห่อ</span>
            <input className="mt-1 w-full rounded-2xl border-2 border-white/20 bg-black px-3 py-3 text-center text-4xl font-black text-[#ffc400]" inputMode="numeric" min={1} max={999} type="number" value={quantity} onChange={(event) => setQuantity(Math.max(1, Number(event.target.value) || 1))} />
          </label>
          <button className="focus-ring h-16 w-16 rounded-2xl bg-[#ffc400] text-4xl font-black text-black" type="button" onClick={() => setQuantity((current) => Math.min(999, current + 1))}>+</button>
        </div>
        <button className="focus-ring min-h-20 w-full rounded-[1.5rem] bg-[#ffc400] px-4 py-4 text-2xl font-black text-black shadow active:scale-[0.99] disabled:opacity-60" disabled={orderPending} type="submit">
          บันทึก {selectedItemName} × {quantity} = {total.toLocaleString("th-TH")} บาท
        </button>
      </form>

      <section className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-[1.5rem] border border-black/10 bg-white p-4 shadow-sm">
          <h2 className="text-xl font-black">ปุ่มควบคุมสำคัญ</h2>
          <p className="mt-1 text-sm font-bold text-black/50">ออเดอร์ล่าสุด: {latestOrderNumber ?? "ยังไม่มี"}</p>
          <div className="mt-3 grid gap-2">
            <button className="focus-ring min-h-14 rounded-2xl bg-red-600 px-4 font-black text-white disabled:opacity-50" disabled={!latestOrderNumber || cancelPending} type="button" onClick={() => setShowCancel((open) => !open)}>
              ยกเลิกออเดอร์ล่าสุด
            </button>
            <a className="focus-ring min-h-14 rounded-2xl bg-black px-4 py-4 text-center font-black text-white" href="#latest-orders">ดูออเดอร์ล่าสุด</a>
            <a className="focus-ring min-h-14 rounded-2xl bg-[#ffc400] px-4 py-4 text-center font-black text-black" href="#today-report">รายงานวันนี้</a>
            <a className="focus-ring min-h-14 rounded-2xl bg-[#ffc400] px-4 py-4 text-center font-black text-black" href="#accounting-report">รายงานส่งบัญชี</a>
          </div>
        </div>

        <div className="rounded-[1.5rem] border border-black/10 bg-white p-4 shadow-sm">
          <h2 className="text-xl font-black">รองรับเครื่องพิมพ์ในอนาคต</h2>
          <p className="mt-1 text-sm font-bold text-black/50">เฟสแรกเตรียมข้อมูล ESC/POS 80mm แต่ยังไม่ส่งไปเครื่องจริง</p>
          <form action={reprintAction} className="mt-3">
            <input type="hidden" name="order_id" value={latestOrderId ?? ""} />
            <button className="focus-ring min-h-14 w-full rounded-2xl border-2 border-black px-4 font-black text-black disabled:opacity-50" disabled={!latestOrderId || reprintPending} type="submit">
              พิมพ์ซ้ำออเดอร์ล่าสุด (อนาคต)
            </button>
          </form>
          <button className="mt-2 min-h-14 w-full rounded-2xl bg-black/10 px-4 font-black text-black/50" disabled type="button">ปิดยอดประจำวัน (อนาคต)</button>
          <SubmitHint message={reprintState.message} ok={reprintState.ok} />
        </div>
      </section>

      {showCancel && (
        <form action={cancelAction} className="rounded-[1.5rem] border-2 border-red-200 bg-red-50 p-4 shadow-sm">
          <input type="hidden" name="branch_id" value={branchId} />
          <h2 className="text-xl font-black text-red-950">ยืนยันยกเลิก Order #{latestOrderNumber} ใช่หรือไม่</h2>
          <label className="mt-3 block">
            <span className="mb-2 block font-black text-red-950">เหตุผลที่ยกเลิก</span>
            <select className="focus-ring min-h-14 w-full rounded-2xl border-2 border-red-200 bg-white px-4 text-lg font-bold" name="reason" defaultValue={cancelReasons[0]}>
              {cancelReasons.map((reason) => <option key={reason} value={reason}>{reason}</option>)}
            </select>
          </label>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <button className="focus-ring min-h-14 rounded-2xl bg-red-600 px-4 font-black text-white disabled:opacity-60" disabled={cancelPending} type="submit">ยืนยันยกเลิก</button>
            <button className="focus-ring min-h-14 rounded-2xl bg-white px-4 font-black text-black" type="button" onClick={() => setShowCancel(false)}>ไม่ยกเลิก</button>
          </div>
          <SubmitHint message={cancelState.message} ok={cancelState.ok} />
        </form>
      )}
    </div>
  );
}
