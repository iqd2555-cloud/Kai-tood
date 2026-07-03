"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase-client";
import { buildMarinationSummaries, calculateMarinationSystemBalance, movementTypeLabels, type ChickenPart, type MarinationMovementType, type MarinationStockMovement } from "@/lib/marination";
import { formatThaiDate, numberFormatter, todayISO } from "@/lib/format";
import { voidMarinationMovement } from "./actions";
import { buildMarinationCalculationAudit, type MarinationMovementAuditRow, type MarinationPartCalculationAudit } from "@/lib/marination/stock-audit";

type Props = { parts: ChickenPart[]; initialMovements: MarinationStockMovement[]; userId: string; selectedDate: string; canViewAudit: boolean; canAdjustMovements: boolean; canVoidMovements: boolean };

type MovementFormState = {
  movement_date: string;
  chicken_part_id: string;
  movement_type: MarinationMovementType | "void_mistake";
  quantity_kg: string;
  note: string;
};

function kg(value: number | null) { return value === null ? "-" : `${numberFormatter.format(value)} กก.`; }
function buildAdjustmentNote(userNote: string, targetBalance: number, currentSystemBalance: number) {
  const autoNote = `ปรับยอดให้คงเหลือเป็น ${numberFormatter.format(targetBalance)} กก. จากยอดเดิม ${numberFormatter.format(currentSystemBalance)} กก.`;
  const trimmedNote = userNote.trim();
  return trimmedNote ? `${trimmedNote} | ${autoNote}` : autoNote;
}
function signedKg(value: number) { const prefix = value > 0 ? "+" : ""; return `${prefix}${numberFormatter.format(value)} กก.`; }
function time(value: string) { return new Date(value).toLocaleString("th-TH", { dateStyle: "short", timeStyle: "short", timeZone: "Asia/Bangkok" }); }

function initialFormState(selectedDate: string, parts: ChickenPart[]): MovementFormState {
  return { movement_date: selectedDate || todayISO(), chicken_part_id: parts[0]?.id ?? "", movement_type: "received", quantity_kg: "", note: "" };
}

export function MarinationConsole({ parts, initialMovements, userId, selectedDate, canViewAudit, canAdjustMovements, canVoidMovements }: Props) {
  const [movements, setMovements] = useState(initialMovements);
  const [dateValue, setDateValue] = useState(selectedDate);
  const [message, setMessage] = useState("");
  const [editingMovementId, setEditingMovementId] = useState<string | null>(null);
  const [formState, setFormState] = useState<MovementFormState>(() => initialFormState(selectedDate, parts));
  const [activeAuditPartId, setActiveAuditPartId] = useState<string | "all" | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const pathname = usePathname();
  const partsById = useMemo(() => Object.fromEntries(parts.map((part) => [part.id, part])), [parts]);
  const { summaries, totals } = useMemo(() => buildMarinationSummaries(parts, movements, selectedDate), [parts, movements, selectedDate]);
  const calculationAudits = useMemo(() => parts.map((part) => buildMarinationCalculationAudit({ selectedDate, part, movements })), [parts, movements, selectedDate]);
  const activeAudits = useMemo(() => activeAuditPartId === "all" ? calculationAudits : calculationAudits.filter((audit) => parts.find((part) => part.name === audit.partName)?.id === activeAuditPartId), [activeAuditPartId, calculationAudits, parts]);
  const selectedDateMovements = useMemo(() => movements.filter((movement) => movement.movement_date === selectedDate), [movements, selectedDate]);
  const isEditing = editingMovementId !== null;
  const isVoidMode = formState.movement_type === "void_mistake";
  const isAdjustment = formState.movement_type === "adjustment";
  const isDirectAdjustmentEdit = isEditing && isAdjustment;
  const movementTypeOptions = useMemo(() => (Object.keys(movementTypeLabels) as MarinationMovementType[]).filter((type) => canAdjustMovements || type !== "adjustment"), [canAdjustMovements]);
  const selectedPartMovements = useMemo(() => movements.filter((movement) => movement.chicken_part_id === formState.chicken_part_id && movement.movement_date <= formState.movement_date), [movements, formState.chicken_part_id, formState.movement_date]);
  const selectedPartSystemBalance = useMemo(() => calculateMarinationSystemBalance(selectedPartMovements), [selectedPartMovements]);

  useEffect(() => {
    setMovements(initialMovements);
    setDateValue(selectedDate);
    if (!editingMovementId) setFormState(initialFormState(selectedDate, parts));
  }, [initialMovements, selectedDate, parts, editingMovementId]);

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    if (!supabase) return;
    const channel = supabase
      .channel("marination_stock_movements_realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "marination_stock_movements" }, (payload) => {
        const newMovementDate = (payload.new as Partial<MarinationStockMovement>).movement_date;
        const oldMovementDate = (payload.old as Partial<MarinationStockMovement>).movement_date;
        if ((newMovementDate && newMovementDate <= selectedDate) || (oldMovementDate && oldMovementDate <= selectedDate)) router.refresh();
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

  function updateForm<K extends keyof MovementFormState>(key: K, value: MovementFormState[K]) {
    setFormState((current) => ({ ...current, [key]: value }));
  }

  function startEditMovement(movement: MarinationStockMovement) {
    if (movement.movement_type === "adjustment" && !canAdjustMovements) {
      setMessage("เฉพาะ Owner เท่านั้นที่แก้ไขรายการปรับยอดได้");
      return;
    }
    setEditingMovementId(movement.id);
    setMessage("กำลังแก้ไขรายการเดิม ไม่ใช่การบันทึกเพิ่ม");
    setFormState({
      movement_date: movement.movement_date,
      chicken_part_id: movement.chicken_part_id,
      movement_type: movement.movement_type,
      quantity_kg: String(movement.quantity_kg),
      note: movement.note ?? "",
    });
    document.getElementById("input")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function cancelEdit() {
    setEditingMovementId(null);
    setMessage("");
    setFormState(initialFormState(selectedDate, parts));
  }

  async function submitMovement(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    if (isVoidMode) return;
    if (formState.movement_type === "adjustment" && !canAdjustMovements) {
      setMessage("เฉพาะ Owner เท่านั้นที่ทำรายการปรับยอดได้");
      return;
    }
    const inputQuantityKg = Number(formState.quantity_kg);
    if (!Number.isFinite(inputQuantityKg) || (isDirectAdjustmentEdit ? inputQuantityKg === 0 : inputQuantityKg < 0 || (!isAdjustment && inputQuantityKg === 0))) {
      setMessage(isDirectAdjustmentEdit ? "กรุณากรอกค่าเดลต้าปรับยอดที่ไม่ใช่ 0" : isAdjustment ? "กรุณากรอกยอดคงเหลือที่ต้องการให้เป็นตั้งแต่ 0 กก. ขึ้นไป" : "กรุณากรอกจำนวนกิโลกรัมให้มากกว่า 0");
      return;
    }
    const supabase = createSupabaseBrowserClient();
    if (!supabase) { setMessage("ยังไม่ได้ตั้งค่า Supabase"); return; }

    if (editingMovementId) {
      const { error } = await supabase.from("marination_stock_movements").update({
        movement_date: formState.movement_date,
        chicken_part_id: formState.chicken_part_id,
        movement_type: formState.movement_type,
        quantity_kg: inputQuantityKg,
        note: formState.note.trim() || null,
        updated_at: new Date().toISOString(),
      }).eq("id", editingMovementId);
      if (error) { setMessage(`บันทึกการแก้ไขไม่สำเร็จ: ${error.message}`); return; }
      setMessage("บันทึกการแก้ไขรายการเดิมสำเร็จ");
      setEditingMovementId(null);
      setFormState(initialFormState(selectedDate, parts));
      startTransition(() => router.refresh());
      return;
    }

    const insertPayload = {
      movement_date: formState.movement_date,
      chicken_part_id: formState.chicken_part_id,
      movement_type: formState.movement_type,
      quantity_kg: inputQuantityKg,
      note: formState.note.trim() || null as string | null,
      created_by: userId,
    };

    if (isAdjustment) insertPayload.note = buildAdjustmentNote(formState.note, inputQuantityKg, selectedPartSystemBalance);

    const { error } = await supabase.from("marination_stock_movements").insert(insertPayload);
    if (error) { setMessage(`บันทึกไม่สำเร็จ: ${error.message}`); return; }
    setMessage("บันทึกข้อมูลโรงหมักไก่สำเร็จ");
    setFormState(initialFormState(selectedDate, parts));
    startTransition(() => router.refresh());
  }

  return (
    <div className="space-y-5">
      <section className="rounded-[2rem] bg-[#111111] p-5 text-white shadow-xl">
        <p className="text-sm font-bold text-[#E60012]">ระบบหลังบ้าน Kai-tood</p>
        <h1 className="mt-2 text-3xl font-black">โรงหมักไก่</h1>
        <p className="mt-2 text-white/70">บันทึกและติดตามไก่สดรับเข้า ใช้หมัก คงเหลือตามระบบ และยอดตรวจนับจริงแบบ Real-time</p>
        <p className="mt-3 rounded-2xl bg-white/10 px-4 py-3 text-sm font-bold text-white/80">กติกาสต๊อก: ยอดยกมาของวันที่เลือก = ยอดคงเหลือตามระบบของวันก่อนหน้า หลังรวมรับเข้า ใช้หมัก และปรับยอดครบแล้ว</p>
        <div className="mt-4 rounded-2xl bg-green-50 px-4 py-3 text-sm font-black text-green-800">เชื่อมต่อ Supabase Realtime สำหรับ Owner Dashboard แล้ว</div>
      </section>


      <nav className="grid gap-2 text-center text-sm font-black sm:grid-cols-5">
        <a className="focus-ring rounded-2xl bg-white px-3 py-3 shadow-sm" href="#overview">ภาพรวมโรงหมัก</a>
        <a className="focus-ring rounded-2xl bg-white px-3 py-3 shadow-sm" href="#input">บันทึกรับเข้า</a>
        <a className="focus-ring rounded-2xl bg-white px-3 py-3 shadow-sm" href="#input">บันทึกใช้หมัก</a>
        <a className="focus-ring rounded-2xl bg-white px-3 py-3 shadow-sm" href="#input">ตรวจนับคงเหลือ</a>
        <a className="focus-ring rounded-2xl bg-white px-3 py-3 shadow-sm" href="#history">รายงานย้อนหลัง</a>
      </nav>

      <section className="grid gap-3 sm:grid-cols-6">
        <Stat label="ยอดยกมา (ปิดยอดวันก่อน)" value={kg(totals.opening)} highlight />
        <Stat label="รับเข้าวันที่เลือก" value={kg(totals.received)} />
        <Stat label="ใช้หมักวันที่เลือก" value={kg(totals.used)} />
        <Stat label="คงเหลือตามระบบ" value={kg(totals.systemBalance)} />
        <Stat label="ตรวจนับจริงล่าสุด" value={kg(totals.latestCounted)} />
        <Stat label="ส่วนต่างรวม" value={kg(totals.variance)} danger={totals.variance < 0} />
      </section>

      <section id="overview" className="rounded-[1.75rem] border border-black/10 bg-white p-4 shadow-sm">
        <div className="grid gap-4">
          <div className="flex flex-col gap-3 rounded-3xl bg-[#E60012]/15 p-3 sm:flex-row sm:items-end sm:justify-between">
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
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-sm font-black text-black/50">ภาพรวมโรงหมัก</p><h2 className="text-2xl font-black">สรุปวันที่ {formatThaiDate(selectedDate)}</h2></div>{canViewAudit && <button type="button" onClick={() => setActiveAuditPartId("all")} className="focus-ring min-h-12 rounded-2xl bg-[#E60012] px-4 font-black text-white shadow-sm">ตรวจสอบสูตรคำนวณทั้งหมด</button>}</div>
          {selectedDateMovements.length === 0 && <p className="rounded-2xl bg-black/5 px-4 py-3 text-sm font-bold text-black/60">ยังไม่มีรายการบันทึกในวันที่นี้</p>}
        </div>
        <div className="mt-4 overflow-x-auto rounded-2xl border border-black/10">
          <table className="w-full min-w-[860px] text-left text-sm">
            <thead className="bg-[#111111] text-white"><tr>{["ชิ้นส่วนไก่","ยอดยกมา","รับเข้า","ใช้หมัก","ปรับยอด","คงเหลือตามระบบ","ตรวจนับจริงล่าสุด","ส่วนต่าง","หมายเหตุล่าสุด", ...(canViewAudit ? ["ตรวจสอบ"] : [])].map(h => <th key={h} className="p-3">{h}</th>)}</tr></thead>
            <tbody>{summaries.map(row => <tr key={row.part.id} className="border-t border-black/10 font-bold"><td className="p-3 text-base font-black">{row.part.name}</td><td className="p-3">{kg(row.openingKg)}</td><td className="p-3">{kg(row.received)}</td><td className="p-3">{kg(row.used)}</td><td className="p-3">{kg(row.adjustment)}</td><td className="p-3">{kg(row.systemBalance)}</td><td className="p-3">{kg(row.latestCounted)}</td><td className={`p-3 ${row.variance && row.variance < 0 ? "text-red-600" : ""}`}>{kg(row.variance)}</td><td className="p-3">{row.latestNote ?? "-"}</td>{canViewAudit && <td className="p-3"><button type="button" onClick={() => setActiveAuditPartId(row.part.id)} className="focus-ring min-h-10 rounded-xl bg-black px-3 font-black text-white">ดูวิธีคิด</button></td>}</tr>)}</tbody>
          </table>
        </div>
      </section>

      {canViewAudit && activeAuditPartId && <AuditModal audits={activeAudits} selectedDate={selectedDate} onClose={() => setActiveAuditPartId(null)} />}

      <section id="input" className={`rounded-[1.75rem] border bg-white p-5 shadow-sm ${isEditing ? "border-[#E60012] ring-4 ring-[#E60012]/15" : "border-black/10"}`}>
        <p className="text-sm font-black text-black/50">บันทึกรับเข้า / ใช้หมัก / ตรวจนับ / ปรับยอด</p><h2 className="text-2xl font-black">ฟอร์ม Staff โรงหมัก</h2>
        {isEditing && <div className="mt-3 rounded-2xl bg-yellow-100 p-3 font-black text-yellow-900">กำลังแก้ไขรายการเดิม ไม่ใช่การบันทึกเพิ่ม</div>}
        {isVoidMode && canVoidMovements ? <div className="mt-4 grid gap-4"><Field label="ประเภทการบันทึก"><select className="focus-ring min-h-14 w-full rounded-2xl border-2 border-black/10 bg-white px-4 text-lg font-bold shadow-sm" name="movement_type" value={formState.movement_type} onChange={(event) => updateForm("movement_type", event.target.value as MovementFormState["movement_type"])} required>{movementTypeOptions.map(type => <option key={type} value={type}>{movementTypeLabels[type]}</option>)}<option value="void_mistake">ยกเลิกรายการผิด</option></select></Field><VoidMovementPanel movements={selectedDateMovements} partsById={partsById} onDone={(nextMessage) => { setMessage(nextMessage); startTransition(() => router.refresh()); }} /></div> : <form onSubmit={submitMovement} className="mt-4 grid gap-4 sm:grid-cols-2">
          <Field label="วันที่"><input className="focus-ring min-h-14 w-full rounded-2xl border-2 border-black/10 bg-white px-4 text-lg font-bold shadow-sm" type="date" name="movement_date" value={formState.movement_date} onChange={(event) => updateForm("movement_date", event.target.value)} required /></Field>
          <Field label="ชิ้นส่วนไก่"><select className="focus-ring min-h-14 w-full rounded-2xl border-2 border-black/10 bg-white px-4 text-lg font-bold shadow-sm" name="chicken_part_id" value={formState.chicken_part_id} onChange={(event) => updateForm("chicken_part_id", event.target.value)} required>{parts.map(part => <option key={part.id} value={part.id}>{part.name}</option>)}</select></Field>
          <Field label="ประเภทการบันทึก"><select className="focus-ring min-h-14 w-full rounded-2xl border-2 border-black/10 bg-white px-4 text-lg font-bold shadow-sm" name="movement_type" value={formState.movement_type} onChange={(event) => updateForm("movement_type", event.target.value as MovementFormState["movement_type"])} required>{movementTypeOptions.map(type => <option key={type} value={type}>{movementTypeLabels[type]}</option>)}{canVoidMovements && <option value="void_mistake">ยกเลิกรายการผิด</option>}</select></Field>
          <Field label={isAdjustment && !isEditing ? "ยอดคงเหลือที่ต้องการให้เป็น" : "จำนวนกิโลกรัม"}>
            <input className="focus-ring min-h-14 w-full rounded-2xl border-2 border-black/10 bg-white px-4 text-lg font-bold shadow-sm" type="number" inputMode="decimal" min={isDirectAdjustmentEdit ? undefined : "0"} step="0.01" name="quantity_kg" value={formState.quantity_kg} onChange={(event) => updateForm("quantity_kg", event.target.value)} placeholder={isAdjustment && !isEditing ? "เช่น ต้องการให้คงเหลือเป็น 50 ให้กรอก 50" : "เช่น 30"} required />
            {isAdjustment && !isEditing && (
              <p className="mt-2 rounded-2xl bg-yellow-100 px-3 py-2 text-sm font-black text-yellow-900">
                ระบบจะตั้งค่ายอดคงเหลือตามระบบให้เท่ากับจำนวนที่กรอก ไม่ใช่บวกเพิ่มจากยอดเดิม
                <span className="mt-1 block text-yellow-950">ยอดคงเหลือปัจจุบันของวันที่เลือก: {kg(selectedPartSystemBalance)}</span>
              </p>
            )}
          </Field>
          <label className="sm:col-span-2"><span className="mb-2 block font-black">หมายเหตุ</span><textarea className="focus-ring min-h-14 w-full rounded-2xl border-2 border-black/10 bg-white px-4 text-lg font-bold shadow-sm min-h-28 py-3" name="note" value={formState.note} onChange={(event) => updateForm("note", event.target.value)} placeholder="เช่น ปรับยอดเพราะชั่งผิด / ตรวจนับรอบเย็น" /></label>
          {!isVoidMode && <div className="grid gap-3 sm:col-span-2 sm:grid-cols-2">
            <button disabled={isPending} className="focus-ring min-h-14 rounded-2xl bg-[#E60012] px-5 text-xl font-black text-white shadow-lg">{isPending ? "กำลังบันทึก..." : isEditing ? "บันทึกการแก้ไข" : "บันทึกข้อมูล"}</button>
            {isEditing && <button type="button" onClick={cancelEdit} className="focus-ring min-h-14 rounded-2xl bg-black px-5 text-xl font-black text-white shadow-lg">ยกเลิก/ปิดฟอร์มแก้ไข</button>}
          </div>}
        </form>}
        {message && <div className="mt-3 rounded-2xl bg-[#E60012]/20 p-3 font-black">{message}</div>}
      </section>

      <section id="history" className="rounded-[1.75rem] border border-black/10 bg-white p-5 shadow-sm">
        <h2 className="text-2xl font-black">รายการล่าสุดของวันที่เลือก</h2>
        <div className="mt-4 space-y-3">{selectedDateMovements.length === 0 ? <p className="font-bold text-black/50">ยังไม่มีรายการ</p> : selectedDateMovements.slice(0, 40).map(m => <article key={m.id} className="rounded-2xl border border-black/10 p-4"><div className="flex flex-col gap-3 sm:flex-row sm:justify-between"><div><h3 className="text-lg font-black">{partsById[m.chicken_part_id]?.name || "ไม่พบชิ้นส่วน"} · {movementTypeLabels[m.movement_type]}</h3><p className="text-sm font-bold text-black/50">ผู้บันทึก {m.created_by || "-"} · {time(m.created_at)}</p>{m.updated_at && <p className="text-xs font-bold text-[#E60012]">แก้ไขล่าสุด {time(m.updated_at)}</p>}</div><div className="text-left text-2xl font-black sm:text-right">{kg(Number(m.quantity_kg))}</div></div>{m.note && <p className="mt-2 rounded-xl bg-black/5 p-3 font-bold">{m.note}</p>}{(canAdjustMovements || m.movement_type !== "adjustment") && <button type="button" onClick={() => startEditMovement(m)} className="focus-ring mt-3 min-h-12 w-full rounded-2xl bg-[#111111] px-4 text-lg font-black text-white sm:w-auto">แก้ไข</button>}</article>)}</div>
      </section>
    </div>
  );
}

function VoidMovementPanel({ movements, partsById, onDone }: { movements: MarinationStockMovement[]; partsById: Record<string, ChickenPart>; onDone: (message: string) => void }) {
  const [selectedId, setSelectedId] = useState(movements[0]?.id ?? "");
  const [reason, setReason] = useState("");
  const [isSubmitting, startSubmit] = useTransition();
  const latestMovements = useMemo(() => movements.slice().sort((a, b) => b.created_at.localeCompare(a.created_at) || b.id.localeCompare(a.id)), [movements]);
  const selected = latestMovements.find((movement) => movement.id === selectedId);

  useEffect(() => {
    setSelectedId((current) => latestMovements.some((movement) => movement.id === current) ? current : latestMovements[0]?.id ?? "");
  }, [latestMovements]);

  function submitVoid() {
    if (!selectedId) { onDone("กรุณาเลือกรายการที่ต้องการยกเลิก"); return; }
    if (!reason.trim()) { onDone("กรุณาระบุเหตุผลในการยกเลิกรายการ"); return; }
    startSubmit(async () => {
      const result = await voidMarinationMovement({ movementId: selectedId, reason });
      onDone(result.message);
      if (result.ok) setReason("");
    });
  }

  return (
    <section className="rounded-3xl border-2 border-[#E60012] bg-red-50 p-4">
      <p className="text-sm font-black text-[#E60012]">Owner เท่านั้น</p>
      <h3 className="text-2xl font-black">ยกเลิกรายการผิด</h3>
      <p className="mt-1 font-bold text-black/60">ระบบจะทำ soft delete/void รายการที่เลือก และไม่นำรายการนั้นไปคำนวณยอดโรงหมักอีก</p>
      {movements.length === 0 ? <p className="mt-3 rounded-2xl bg-white p-3 font-bold text-black/50">ไม่มีรายการของวันที่เลือกให้ยกเลิก</p> : (
        <div className="mt-4 grid gap-4">
          <Field label="เลือกรายการล่าสุดของวันที่เลือก">
            <select className="focus-ring min-h-14 w-full rounded-2xl border-2 border-black/10 bg-white px-4 text-lg font-bold shadow-sm" value={selectedId} onChange={(event) => setSelectedId(event.target.value)}>
              {latestMovements.slice(0, 40).map((movement) => <option key={movement.id} value={movement.id}>{partsById[movement.chicken_part_id]?.name || "ไม่พบชิ้นส่วน"} | {movementTypeLabels[movement.movement_type]} | {signedKg(Number(movement.quantity_kg))} | id: {movement.id.slice(0, 8)}</option>)}
            </select>
          </Field>
          {selected && <div className="rounded-2xl bg-white p-3 font-bold"><p>{partsById[selected.chicken_part_id]?.name || "ไม่พบชิ้นส่วน"} · {movementTypeLabels[selected.movement_type]} · {kg(Number(selected.quantity_kg))}</p><p className="text-sm text-black/50">วันที่ {formatThaiDate(selected.movement_date)} · id: {selected.id}</p>{selected.note && <p className="mt-2 rounded-xl bg-black/5 p-2">{selected.note}</p>}</div>}
          <label><span className="mb-2 block font-black">เหตุผลที่ยกเลิก</span><textarea className="focus-ring min-h-28 w-full rounded-2xl border-2 border-black/10 bg-white px-4 py-3 text-lg font-bold shadow-sm" value={reason} onChange={(event) => setReason(event.target.value)} placeholder="เช่น บันทึกปรับยอดผิดเป็น -50 กก. ความจริงต้องตั้งยอดคงเหลือ 50 กก." /></label>
          <button type="button" disabled={isSubmitting} onClick={submitVoid} className="focus-ring min-h-14 rounded-2xl bg-[#E60012] px-5 text-xl font-black text-white shadow-lg disabled:bg-black/30">{isSubmitting ? "กำลังยกเลิก..." : "ยืนยันยกเลิกรายการนี้"}</button>
        </div>
      )}
    </section>
  );
}

function Stat({ label, value, highlight, danger }: { label: string; value: string; highlight?: boolean; danger?: boolean }) {
  return (
    <div className={`rounded-3xl border p-4 shadow-sm ${highlight ? "border-[#E60012] bg-[#E60012] text-white" : danger ? "border-red-100 bg-red-50" : "border-black/10 bg-white"}`}>
      <div className={`text-sm font-black ${highlight ? "text-white/75" : "text-black/50"}`}>{label}</div>
      <div className="mt-1 text-2xl font-black">{value}</div>
    </div>
  );
}
function Field({ label, children }: { label: string; children: React.ReactNode }) { return <label><span className="mb-2 block font-black">{label}</span>{children}</label>; }

function AuditModal({ audits, selectedDate, onClose }: { audits: MarinationPartCalculationAudit[]; selectedDate: string; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end bg-black/60 p-2 sm:items-center sm:p-6" role="dialog" aria-modal="true">
      <div className="max-h-[92vh] w-full overflow-y-auto rounded-[1.75rem] bg-white p-4 shadow-2xl sm:mx-auto sm:max-w-5xl sm:p-6">
        <div className="sticky top-0 z-10 -mx-4 -mt-4 flex items-center justify-between gap-3 bg-white p-4 sm:-mx-6 sm:-mt-6 sm:p-6">
          <div><p className="text-sm font-black text-black/50">Calculation Audit</p><h2 className="text-2xl font-black">ตรวจสอบสูตรคำนวณ {formatThaiDate(selectedDate)}</h2></div>
          <button type="button" onClick={onClose} className="focus-ring min-h-12 rounded-2xl bg-black px-4 font-black text-white">ปิด</button>
        </div>
        <div className="space-y-5">
          {audits.map((audit) => <AuditPart key={audit.partName} audit={audit} />)}
        </div>
      </div>
    </div>
  );
}

function AuditPart({ audit }: { audit: MarinationPartCalculationAudit }) {
  return (
    <article className="rounded-3xl border border-black/10 p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div><p className="text-sm font-black text-black/50">{formatThaiDate(audit.selectedDate)}</p><h3 className="text-2xl font-black">{audit.partName}</h3><p className="mt-1 font-bold text-black/60">คงเหลือ = ยกมา + รับเข้า - ใช้หมัก + ปรับยอด</p><p className="font-black text-[#E60012]">{audit.formulaText}</p></div>
        <div className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-5">{[["ยกมา", audit.openingKg], ["รับเข้า", audit.receivedKg], ["ใช้หมัก", audit.usedKg], ["ปรับยอด", audit.adjustmentKg], ["คงเหลือ", audit.systemRemainingKg]].map(([label, value]) => <div key={label} className="rounded-2xl bg-black/5 p-3"><div className="font-black text-black/50">{label}</div><div className="text-lg font-black">{kg(value as number)}</div></div>)}</div>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2 text-sm sm:grid-cols-5">
        {[["รับเข้าก่อนวัน", audit.totalReceiveBeforeDate], ["ใช้หมักก่อนวัน", audit.totalUseBeforeDate], ["ผลปรับยอดก่อนวัน", audit.adjustmentEffectsBeforeDate], ["ตรวจนับที่ ignore", audit.stockCheckIgnoredBeforeDate], ["openingKg", audit.openingKg]].map(([label, value]) => (
          <div key={label} className="rounded-2xl bg-yellow-50 p-3">
            <div className="font-black text-yellow-900/60">{label}</div>
            <div className="text-lg font-black text-yellow-950">{kg(value as number)}</div>
          </div>
        ))}
      </div>
      {audit.warnings.length > 0 && <div className="mt-4 rounded-2xl bg-yellow-100 p-3 font-black text-yellow-900"><p>คำเตือน</p><ul className="mt-1 list-disc pl-5">{audit.warnings.map((warning) => <li key={warning}>{warning}</li>)}</ul></div>}
      <AuditRows title="รายการที่นำมาคิดเป็นยอดยกมา" rows={audit.openingRows} />
      <AuditRows title="รายการรับเข้าวันนี้" rows={audit.todayReceiveRows} />
      <AuditRows title="รายการใช้หมักวันนี้" rows={audit.todayUseRows} />
      <AuditRows title="รายการปรับยอดวันนี้" rows={audit.todayAdjustmentRows} />
      <AuditRows title="รายการที่ไม่ถูกนำมาคิด" rows={audit.ignoredRows} showReason />
    </article>
  );
}

function AuditRows({ title, rows, showReason }: { title: string; rows: MarinationMovementAuditRow[]; showReason?: boolean }) {
  return (
    <section className="mt-4">
      <h4 className="font-black">{title}</h4>
      {rows.length === 0 ? <p className="mt-2 rounded-2xl bg-black/5 p-3 font-bold text-black/50">ไม่มีรายการ</p> : (
        <div className="mt-2 overflow-x-auto rounded-2xl border border-black/10"><table className="w-full min-w-[760px] text-left text-xs sm:text-sm"><thead className="bg-black text-white"><tr>{["วันที่", "ประเภท", "จำนวน", "ก่อน", "ผลต่อสต๊อก", "หลัง", "หมายเหตุ", "id", ...(showReason ? ["เหตุผล"] : [])].map((head) => <th key={head} className="p-2">{head}</th>)}</tr></thead><tbody>{rows.map((row) => <tr key={`${row.id}-${row.bucket}`} className="border-t border-black/10 font-bold"><td className="p-2">{formatThaiDate(row.date)}<span className="block text-black/40">{row.createdAt ? time(row.createdAt) : "-"}</span></td><td className="p-2">{movementTypeLabels[row.movementType as MarinationMovementType] ?? row.movementType}</td><td className="p-2">{kg(row.quantityKg)}</td><td className="p-2 font-black">{kg(row.balanceBefore)}</td><td className={`p-2 font-black ${row.signedQuantityKg > 0 ? "text-green-700" : row.signedQuantityKg < 0 ? "text-red-600" : "text-black/50"}`}>{signedKg(row.signedQuantityKg)}</td><td className="p-2 font-black">{kg(row.balanceAfter)}</td><td className="p-2">{row.note ?? "-"}</td><td className="p-2 font-mono">{row.id.slice(0, 8)}</td>{showReason && <td className="p-2">{row.reason}</td>}</tr>)}</tbody></table></div>
      )}
    </section>
  );
}
