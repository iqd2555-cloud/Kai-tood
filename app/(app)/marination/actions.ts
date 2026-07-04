"use server";

import { revalidatePath } from "next/cache";
import { getCurrentProfile } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { buildAdjustmentNoteForMarination, calculateMarinationSystemBalance, type MarinationMovementType, type MarinationStockMovement } from "@/lib/marination";
import { canManageMarinationMovements } from "@/lib/marination-access";

type SaveMovementInput = {
  movementId?: string | null;
  movementDate: string;
  chickenPartId: string;
  movementType: MarinationMovementType;
  quantityKg: number;
  note?: string | null;
};

type VoidMovementInput = {
  movementId: string;
  reason: string;
};

const STAFF_ALLOWED_MOVEMENT_TYPES = new Set<MarinationMovementType>(["received", "used", "counted"]);
const OWNER_ONLY_MOVEMENT_TYPES = new Set<MarinationMovementType>(["adjustment"]);

function isValidMovementType(value: string): value is MarinationMovementType {
  return STAFF_ALLOWED_MOVEMENT_TYPES.has(value as MarinationMovementType) || OWNER_ONLY_MOVEMENT_TYPES.has(value as MarinationMovementType);
}

function isISODate(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

export async function saveMarinationMovement(input: SaveMovementInput) {
  const profile = await getCurrentProfile();
  const supabase = await createSupabaseServerClient();
  if (!supabase) return { ok: false, message: "ยังไม่ได้ตั้งค่า Supabase" };

  const movementId = input.movementId?.trim() || null;
  const movementType = input.movementType;
  const isOwner = canManageMarinationMovements(profile);
  const note = input.note?.trim() || null;

  if (!isISODate(input.movementDate)) return { ok: false, message: "วันที่ไม่ถูกต้อง" };
  if (!input.chickenPartId?.trim()) return { ok: false, message: "กรุณาเลือกชิ้นส่วนไก่" };
  if (!isValidMovementType(movementType)) return { ok: false, message: "ประเภทการบันทึกไม่ถูกต้อง" };
  if (!isOwner && OWNER_ONLY_MOVEMENT_TYPES.has(movementType)) return { ok: false, message: "เฉพาะ Owner เท่านั้นที่ทำรายการปรับยอดได้" };
  if (movementId && !isOwner) return { ok: false, message: "เฉพาะ Owner เท่านั้นที่แก้ไขรายการที่กระทบ ledger ได้" };
  if (!Number.isFinite(input.quantityKg) || (movementType === "adjustment" ? input.quantityKg < 0 : input.quantityKg <= 0)) {
    return { ok: false, message: movementType === "adjustment" ? "กรุณากรอกยอดคงเหลือที่ต้องการให้เป็นตั้งแต่ 0 กก. ขึ้นไป" : "กรุณากรอกจำนวนกิโลกรัมให้มากกว่า 0" };
  }

  let finalNote = note;
  if (movementType === "adjustment" && !movementId) {
    const [{ data: previousMovements, error: readError }, { data: resetRows, error: resetError }] = await Promise.all([
      supabase
        .from("marination_stock_movements")
        .select("id, movement_date, chicken_part_id, movement_type, quantity_kg, note, created_by, created_at, updated_at, is_voided, voided_at, voided_by, void_reason")
        .eq("is_voided", false)
        .eq("chicken_part_id", input.chickenPartId)
        .lte("movement_date", input.movementDate)
        .order("movement_date", { ascending: true })
        .order("created_at", { ascending: true })
        .order("id", { ascending: true })
        .returns<MarinationStockMovement[]>(),
      supabase
        .from("marination_stock_resets")
        .select("reset_date")
        .eq("is_active", true)
        .lte("reset_date", input.movementDate)
        .order("reset_date", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(1)
        .returns<{ reset_date: string }[]>(),
    ]);
    if (readError) return { ok: false, message: `ตรวจสอบยอดก่อนปรับไม่สำเร็จ: ${readError.message}` };
    if (resetError) return { ok: false, message: `ตรวจสอบวันตั้งต้นสต๊อกไม่สำเร็จ: ${resetError.message}` };
    const activeResetDate = resetRows?.[0]?.reset_date ?? null;
    finalNote = buildAdjustmentNoteForMarination(note ?? "", input.quantityKg, calculateMarinationSystemBalance(previousMovements ?? [], activeResetDate));
  }

  const payload = {
    movement_date: input.movementDate,
    chicken_part_id: input.chickenPartId,
    movement_type: movementType,
    quantity_kg: input.quantityKg,
    note: finalNote,
    updated_at: new Date().toISOString(),
  };

  const { error } = movementId
    ? await supabase.from("marination_stock_movements").update(payload).eq("id", movementId)
    : await supabase.from("marination_stock_movements").insert({ ...payload, created_by: profile.id });

  if (error) return { ok: false, message: `${movementId ? "บันทึกการแก้ไข" : "บันทึก"}ไม่สำเร็จ: ${error.message}` };
  revalidatePath("/marination");
  return { ok: true, message: movementId ? "บันทึกการแก้ไขรายการเดิมสำเร็จ" : "บันทึกข้อมูลโรงหมักไก่สำเร็จ" };
}


export async function voidMarinationMovement(input: VoidMovementInput) {
  const movementId = input.movementId?.trim();
  const reason = input.reason?.trim();
  if (!movementId) return { ok: false, message: "ไม่พบรายการที่ต้องการยกเลิก" };
  if (!reason) return { ok: false, message: "กรุณาระบุเหตุผลในการยกเลิกรายการ" };

  const profile = await getCurrentProfile();
  const supabase = await createSupabaseServerClient();
  if (!supabase) return { ok: false, message: "ยังไม่ได้ตั้งค่า Supabase" };

  if (!canManageMarinationMovements(profile)) return { ok: false, message: "เฉพาะ Owner เท่านั้นที่ยกเลิกรายการผิดได้" };

  const { data: existing, error: readError } = await supabase
    .from("marination_stock_movements")
    .select("id, is_voided")
    .eq("id", movementId)
    .maybeSingle<{ id: string; is_voided: boolean | null }>();

  if (readError) return { ok: false, message: `ตรวจสอบรายการไม่สำเร็จ: ${readError.message}` };
  if (!existing) return { ok: false, message: "ไม่พบรายการนี้ หรือคุณไม่มีสิทธิ์เข้าถึง" };
  if (existing.is_voided) return { ok: false, message: "รายการนี้ถูกยกเลิกไปแล้ว" };

  const { error } = await supabase
    .from("marination_stock_movements")
    .update({
      is_voided: true,
      voided_at: new Date().toISOString(),
      voided_by: profile.id,
      void_reason: reason,
      updated_at: new Date().toISOString(),
    })
    .eq("id", movementId)
    .eq("is_voided", false);

  if (error) return { ok: false, message: `ยกเลิกรายการไม่สำเร็จ: ${error.message}` };
  revalidatePath("/marination");
  return { ok: true, message: "ยกเลิกรายการผิดสำเร็จ รายการนี้จะไม่ถูกนำไปคำนวณสต๊อกแล้ว" };
}
