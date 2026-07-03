"use server";

import { revalidatePath } from "next/cache";
import { getCurrentProfile } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { canManageMarinationMovements } from "@/lib/marination-access";

type VoidMovementInput = {
  movementId: string;
  reason: string;
};

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
