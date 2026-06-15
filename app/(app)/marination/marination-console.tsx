"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase-client";
import { buildMarinationSummaries, movementTypeLabels, type ChickenPart, type MarinationMovementType, type MarinationStockMovement } from "@/lib/marination";
import { formatThaiDate, numberFormatter, todayISO } from "@/lib/format";

type Props = { parts: ChickenPart[]; initialMovements: MarinationStockMovement[]; userId: string; selectedDate: string };

function kg(value: number | null) { return value === null ? "-" : `${numberFormatter.format(value)} กก.`; }
function time(value: string) { return new Date(value).toLocaleString("th-TH", { dateStyle: "short", timeStyle: "short", timeZone: "Asia/Bangkok" }); }

export function MarinationConsole({ parts, initialMovements, userId, selectedDate }: Props) {
  const [movements, setMovements] = useState(initialMovements);
  const [dateValue, setDateValue] = useState(selectedDate);
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const pathname = usePathname();
  const partsById = useMemo(() => Object.fromEntries(parts.map((part) => [part.id, part])), [parts]);
  const { summaries, totals } = useMemo(() => buildMarinationSummaries(parts, movements), [parts, movements]);

  useEffect(() => {
    setMovements(initialMovements);
    setDateValue(selectedDate);
  }, [initialMovements, selectedDate]);

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    if (!supabase) return;
    const channel = supabase
      .channel("marination_stock_movements_realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "marination_stock_movements" }, (payload) => {
        const newMovementDate = (payload.new as Partial<MarinationStockMovement>).movement_date;
        const oldMovementDate = (payload.old as Partial<MarinationStockMovement>).movement_date;
        if (newMovementDate === selectedDate || oldMovementDate === selectedDate) router.refresh();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [router, selectedDate]);

  function changeReportDate(nextDate: string) {
    if (!nextDate) return;
    setDateValue(nextDate);
    const params = new URLSearchParams();
    params.set("date", nextDate);
    startTransition(() => router.replace(`${pathname}?${params.toString()}`));
  }

  function goToday() {
    changeReportDate(todayISO());
  }

  async function submitMovement(formData: FormData) {
    setMessage("");
    const movement_type = String(formData.get("movement_type")) as MarinationMovementType;
    const quantity_kg = Number(formData.get("quantity_kg"));
    if (!Number.isFinite(quantity_kg) || (movement_type !== "adjustment" && quantity_kg < 0) || quantity_kg === 0) {
      setMessage("กรุณากรอกจำนวนกิโลกรัมให้ถูกต้อง (ปรับยอดใส่ค่าติดลบได้)");
      return;
    }
    const supabase = createSupabaseBrowserClient();
    if (!supabase) { setMessage("ยังไม่ได้ตั้งค่า Supabase"); return; }
    const { error } = await supabase.from("marination_stock_movements").insert({
      movement_date: String(formData.get("movement_date")),
      chicken_part_id: String(formData.get("chicken_part_id")),
      movement_type,
      quantity_kg,
      note: String(formData.get("note") ?? "").trim() || null,
      created_by: userId,
    });
    if (error) { setMessage(`บันทึกไม่สำเร็จ: ${error.message}`); return; }
    setMessage("บันทึกข้อมูลโรงหมักไก่สำเร็จ");
    startTransition(() => router.refresh());
  }

  return (
    <div className="space-y-5">
      <section className="rounded-[2rem] bg-[#111111] p-5 text-white shadow-xl">
        <p className="text-sm font-bold text-[#ffc400]">ระบบหลังบ้าน Kai-tood</p>
        <h1 className="mt-2 text-3xl font-black">โรงหมักไก่</h1>
        <p className="mt-2 text-white/70">บันทึกและติดตามไก่สดรับเข้า ใช้หมัก คงเหลือตามระบบ และยอดตรวจนับจริงแบบ Real-time</p>
        <div className="mt-4 rounded-2xl bg-green-50 px-4 py-3 text-sm font-black text-green-800">เชื่อมต่อ Supabase Realtime สำหรับ Owner Dashboard แล้ว</div>
      </section>


      <nav className="grid gap-2 text-center text-sm font-black sm:grid-cols-5">
        <a className="focus-ring rounded-2xl bg-white px-3 py-3 shadow-sm" href="#overview">ภาพรวมโรงหมัก</a>
        <a className="focus-ring rounded-2xl bg-white px-3 py-3 shadow-sm" href="#input">บันทึกรับเข้า</a>
        <a className="focus-ring rounded-2xl bg-white px-3 py-3 shadow-sm" href="#input">บันทึกใช้หมัก</a>
        <a className="focus-ring rounded-2xl bg-white px-3 py-3 shadow-sm" href="#input">ตรวจนับคงเหลือ</a>
        <a className="focus-ring rounded-2xl bg-white px-3 py-3 shadow-sm" href="#history">รายงานย้อนหลัง</a>
      </nav>

      <section className="grid gap-3 sm:grid-cols-5">
        <Stat label="รับเข้าวันที่เลือก" value={kg(totals.received)} highlight />
        <Stat label="ใช้หมักวันที่เลือก" value={kg(totals.used)} />
        <Stat label="คงเหลือตามระบบ" value={kg(totals.systemBalance)} />
        <Stat label="ตรวจนับจริงล่าสุด" value={kg(totals.latestCounted)} />
        <Stat label="ส่วนต่างรวม" value={kg(totals.variance)} danger={totals.variance < 0} />
      </section>

      <section id="overview" className="rounded-[1.75rem] border border-black/10 bg-white p-4 shadow-sm">
        <div className="grid gap-4">
          <div className="flex flex-col gap-3 rounded-3xl bg-[#ffc400]/15 p-3 sm:flex-row sm:items-end sm:justify-between">
            <label className="flex-1">
              <span className="mb-2 block text-sm font-black text-black/60">เลือกวันที่</span>
              <input
                className="focus-ring min-h-14 w-full rounded-2xl border-2 border-black/10 bg-white px-4 text-lg font-black shadow-sm sm:max-w-xs"
                type="date"
                value={dateValue}
                aria-label="เลือกวันที่รายงานโรงหมัก"
                onChange={(event) => changeReportDate(event.target.value)}
              />
            </label>
            <button type="button" onClick={goToday} disabled={isPending || dateValue === todayISO()} className="focus-ring min-h-14 rounded-2xl bg-black px-5 text-lg font-black text-white shadow-sm disabled:cursor-not-allowed disabled:bg-black/30">วันนี้</button>
          </div>
          <div><p className="text-sm font-black text-black/50">ภาพรวมโรงหมัก</p><h2 className="text-2xl font-black">สรุปวันที่ {formatThaiDate(selectedDate)}</h2></div>
          {movements.length === 0 && <p className="rounded-2xl bg-black/5 px-4 py-3 text-sm font-bold text-black/60">ยังไม่มีรายการบันทึกในวันที่นี้</p>}
        </div>
        <div className="mt-4 overflow-x-auto rounded-2xl border border-black/10">
          <table className="w-full min-w-[860px] text-left text-sm">
            <thead className="bg-[#111111] text-white"><tr>{["ชิ้นส่วนไก่","รับเข้า","ใช้หมัก","ปรับยอด","คงเหลือตามระบบ","ตรวจนับจริงล่าสุด","ส่วนต่าง","หมายเหตุล่าสุด"].map(h => <th key={h} className="p-3">{h}</th>)}</tr></thead>
            <tbody>{summaries.map(row => <tr key={row.part.id} className="border-t border-black/10 font-bold"><td className="p-3 text-base font-black">{row.part.name}</td><td className="p-3">{kg(row.received)}</td><td className="p-3">{kg(row.used)}</td><td className="p-3">{kg(row.adjustment)}</td><td className="p-3">{kg(row.systemBalance)}</td><td className="p-3">{kg(row.latestCounted)}</td><td className={`p-3 ${row.variance && row.variance < 0 ? "text-red-600" : ""}`}>{kg(row.variance)}</td><td className="p-3">{row.latestNote}</td></tr>)}</tbody>
          </table>
        </div>
      </section>

      <section id="input" className="rounded-[1.75rem] border border-black/10 bg-white p-5 shadow-sm">
        <p className="text-sm font-black text-black/50">บันทึกรับเข้า / ใช้หมัก / ตรวจนับ / ปรับยอด</p><h2 className="text-2xl font-black">ฟอร์ม Staff โรงหมัก</h2>
        <form action={submitMovement} className="mt-4 grid gap-4 sm:grid-cols-2">
          <Field label="วันที่"><input className="focus-ring min-h-14 w-full rounded-2xl border-2 border-black/10 bg-white px-4 text-lg font-bold shadow-sm" type="date" name="movement_date" defaultValue={selectedDate || todayISO()} required /></Field>
          <Field label="ชิ้นส่วนไก่"><select className="focus-ring min-h-14 w-full rounded-2xl border-2 border-black/10 bg-white px-4 text-lg font-bold shadow-sm" name="chicken_part_id" required>{parts.map(part => <option key={part.id} value={part.id}>{part.name}</option>)}</select></Field>
          <Field label="ประเภทการบันทึก"><select className="focus-ring min-h-14 w-full rounded-2xl border-2 border-black/10 bg-white px-4 text-lg font-bold shadow-sm" name="movement_type" required>{(Object.keys(movementTypeLabels) as MarinationMovementType[]).map(type => <option key={type} value={type}>{movementTypeLabels[type]}</option>)}</select></Field>
          <Field label="จำนวนกิโลกรัม"><input className="focus-ring min-h-14 w-full rounded-2xl border-2 border-black/10 bg-white px-4 text-lg font-bold shadow-sm" type="number" inputMode="decimal" step="0.01" name="quantity_kg" placeholder="เช่น 30" required /></Field>
          <label className="sm:col-span-2"><span className="mb-2 block font-black">หมายเหตุ</span><textarea className="focus-ring min-h-14 w-full rounded-2xl border-2 border-black/10 bg-white px-4 text-lg font-bold shadow-sm min-h-28 py-3" name="note" placeholder="เช่น ปรับยอดเพราะชั่งผิด / ตรวจนับรอบเย็น" /></label>
          <button disabled={isPending} className="focus-ring min-h-14 rounded-2xl bg-[#ffc400] px-5 text-xl font-black text-black shadow-lg sm:col-span-2">{isPending ? "กำลังบันทึก..." : "บันทึกข้อมูล"}</button>
        </form>
        {message && <div className="mt-3 rounded-2xl bg-[#ffc400]/20 p-3 font-black">{message}</div>}
      </section>

      <section id="history" className="rounded-[1.75rem] border border-black/10 bg-white p-5 shadow-sm">
        <h2 className="text-2xl font-black">รายการล่าสุดของวันที่เลือก</h2>
        <div className="mt-4 space-y-3">{movements.length === 0 ? <p className="font-bold text-black/50">ยังไม่มีรายการ</p> : movements.slice(0, 40).map(m => <article key={m.id} className="rounded-2xl border border-black/10 p-4"><div className="flex justify-between gap-3"><div><h3 className="text-lg font-black">{partsById[m.chicken_part_id]?.name || "ไม่พบชิ้นส่วน"} · {movementTypeLabels[m.movement_type]}</h3><p className="text-sm font-bold text-black/50">ผู้บันทึก {m.created_by || "-"} · {time(m.created_at)}</p></div><div className="text-right text-2xl font-black">{kg(Number(m.quantity_kg))}</div></div>{m.note && <p className="mt-2 rounded-xl bg-black/5 p-3 font-bold">{m.note}</p>}</article>)}</div>
      </section>
    </div>
  );
}

function Stat({ label, value, highlight, danger }: { label: string; value: string; highlight?: boolean; danger?: boolean }) { return <div className={`rounded-3xl p-4 shadow-sm ${highlight ? "bg-[#ffc400]" : danger ? "bg-red-50" : "bg-white"}`}><div className="text-sm font-black text-black/50">{label}</div><div className="mt-1 text-2xl font-black">{value}</div></div>; }
function Field({ label, children }: { label: string; children: React.ReactNode }) { return <label><span className="mb-2 block font-black">{label}</span>{children}</label>; }
