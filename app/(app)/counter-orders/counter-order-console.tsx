"use client";

import { useMemo, useState, useActionState } from "react";
import { cancelLatestCounterOrder, createCounterOrder, reprintLatestCounterOrder } from "./actions";

type CounterOrderConsoleProps = {
  branchId: string;
  latestOrderNumber?: string;
  latestOrderId?: string;
  priceItems: { price: number; item_name: string }[];
};

const shortcutQuantities = [1, 2, 3, 5];
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
