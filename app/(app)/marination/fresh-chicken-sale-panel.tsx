"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { buildMarinationSummaries, type ChickenPart, type MarinationStockMovement } from "@/lib/marination";
import { numberFormatter } from "@/lib/format";
import { saveMarinationMovement } from "./actions";

type Props = {
  parts: ChickenPart[];
  movements: MarinationStockMovement[];
  selectedDate: string;
  stockResetDate: string | null;
};

function kg(value: number) {
  return `${numberFormatter.format(value)} กก.`;
}

export function FreshChickenSalePanel({ parts, movements, selectedDate, stockResetDate }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [partId, setPartId] = useState(parts[0]?.id ?? "");
  const [quantity, setQuantity] = useState("");
  const [note, setNote] = useState("");
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();
  const { summaries, totals } = useMemo(
    () => buildMarinationSummaries(parts, movements, selectedDate, stockResetDate),
    [parts, movements, selectedDate, stockResetDate],
  );
  const selected = summaries.find((row) => row.part.id === partId);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    const quantityKg = Number(quantity);
    if (!Number.isFinite(quantityKg) || quantityKg <= 0) {
      setMessage("กรุณากรอกจำนวนไก่สดที่ขายให้มากกว่า 0 กก.");
      return;
    }
    const result = await saveMarinationMovement({
      movementDate: selectedDate,
      chickenPartId: partId,
      movementType: "fresh_sale",
      quantityKg,
      note: note.trim() || "ขายไก่สด",
    });
    setMessage(result.message);
    if (!result.ok) return;
    setQuantity("");
    setNote("");
    setOpen(false);
    startTransition(() => router.refresh());
  }

  return (
    <section className="rounded-[1.75rem] border-2 border-[#E60012]/30 bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-black text-[#E60012]">ตัดสต๊อกไก่สด</p>
          <h2 className="text-2xl font-black">ขายไก่สด</h2>
          <p className="mt-1 text-sm font-bold text-black/60">ใช้เมื่อขายไก่สดออกจากโรงหมัก ระบบจะลดยอดคงเหลือตามชิ้นส่วนทันที และไม่รวมเป็น “ใช้หมัก”</p>
        </div>
        <button type="button" onClick={() => setOpen((value) => !value)} className="focus-ring min-h-14 shrink-0 rounded-2xl bg-[#E60012] px-6 text-xl font-black text-white shadow-lg">
          {open ? "ปิดฟอร์ม" : "+ ขายไก่สด"}
        </button>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
        <div className="rounded-2xl bg-red-50 p-3"><div className="text-xs font-black text-black/50">ขายไก่สดวันนี้</div><div className="mt-1 text-xl font-black text-[#E60012]">{kg(totals.soldFresh)}</div></div>
        <div className="rounded-2xl bg-black/5 p-3"><div className="text-xs font-black text-black/50">ใช้หมักวันนี้</div><div className="mt-1 text-xl font-black">{kg(totals.used)}</div></div>
        <div className="col-span-2 rounded-2xl bg-black p-3 text-white sm:col-span-1"><div className="text-xs font-black text-white/60">คงเหลือตามระบบ</div><div className="mt-1 text-xl font-black">{kg(totals.systemBalance)}</div></div>
      </div>

      {open && (
        <form onSubmit={submit} className="mt-4 grid gap-4 rounded-3xl bg-red-50 p-4 sm:grid-cols-2">
          <label><span className="mb-2 block font-black">ชิ้นส่วนไก่</span><select value={partId} onChange={(event) => setPartId(event.target.value)} className="focus-ring min-h-14 w-full rounded-2xl border-2 border-black/10 bg-white px-4 text-lg font-bold" required>{parts.map((part) => <option key={part.id} value={part.id}>{part.name}</option>)}</select></label>
          <label><span className="mb-2 block font-black">จำนวนที่ขาย (กก.)</span><input value={quantity} onChange={(event) => setQuantity(event.target.value)} type="number" inputMode="decimal" min="0.01" step="0.01" placeholder="เช่น 20" className="focus-ring min-h-14 w-full rounded-2xl border-2 border-black/10 bg-white px-4 text-lg font-bold" required /></label>
          <div className="sm:col-span-2 rounded-2xl bg-white px-4 py-3 font-bold">คงเหลือของ {selected?.part.name ?? "ชิ้นส่วนที่เลือก"} ก่อนบันทึก: <b>{kg(selected?.systemBalance ?? 0)}</b></div>
          <label className="sm:col-span-2"><span className="mb-2 block font-black">หมายเหตุ / ชื่อลูกค้า (ถ้ามี)</span><textarea value={note} onChange={(event) => setNote(event.target.value)} rows={2} placeholder="เช่น ขายไก่สดให้คุณ..." className="focus-ring w-full rounded-2xl border-2 border-black/10 bg-white px-4 py-3 text-lg font-bold" /></label>
          <button disabled={isPending} className="focus-ring min-h-14 rounded-2xl bg-[#E60012] px-5 text-xl font-black text-white disabled:bg-black/30 sm:col-span-2">{isPending ? "กำลังบันทึก..." : "ยืนยันขายไก่สดและตัดสต๊อก"}</button>
        </form>
      )}
      {message && <div className="mt-3 rounded-2xl bg-yellow-100 p-3 font-black text-yellow-950">{message}</div>}
    </section>
  );
}
