"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getCurrentProfile } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase-server";

const orderActionSchema = z.object({
  branch_id: z.string().uuid("กรุณาเลือกสาขา"),
  price: z.coerce.number().min(1).optional(),
  quantity: z.coerce.number().int().min(1).max(999).optional(),
  shortcut: z.string().optional(),
});

const cancelActionSchema = z.object({
  branch_id: z.string().uuid("กรุณาเลือกสาขา"),
  reason: z.string().min(1, "กรุณาเลือกเหตุผล").max(200),
});

const reprintActionSchema = z.object({
  order_id: z.string().uuid(),
});

type ActionState = {
  ok: boolean;
  message: string;
};

function parseShortcut(shortcut: string | undefined) {
  if (!shortcut) return null;
  const [price, quantity] = shortcut.split(":").map(Number);
  if (!Number.isFinite(price) || !Number.isFinite(quantity)) return null;
  return { price, quantity };
}

async function assertBranchAccess(branchId: string) {
  const profile = await getCurrentProfile();
  if (profile.role === "staff" && profile.branch_id !== branchId) {
    return { ok: false, message: "พนักงานกดขายได้เฉพาะสาขาของตัวเอง" };
  }
  return { ok: true, message: "" };
}

export async function createCounterOrder(_: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = orderActionSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, message: "ข้อมูลออเดอร์ไม่ถูกต้อง" };

  const shortcut = parseShortcut(parsed.data.shortcut);
  const price = shortcut?.price ?? parsed.data.price;
  const quantity = shortcut?.quantity ?? parsed.data.quantity;

  if (!price || !quantity) return { ok: false, message: "กรุณาเลือกราคาและจำนวน" };

  const access = await assertBranchAccess(parsed.data.branch_id);
  if (!access.ok) return access;

  const supabase = await createSupabaseServerClient();
  if (!supabase) return { ok: false, message: "ยังไม่ได้ตั้งค่า Supabase บนเซิร์ฟเวอร์" };

  const { data, error } = await supabase
    .rpc("create_counter_order", {
      p_branch_id: parsed.data.branch_id,
      p_price: price,
      p_quantity: quantity,
    })
    .select("order_number, total_amount")
    .single();

  if (error) return { ok: false, message: error.message };

  revalidatePath("/counter-orders");
  return { ok: true, message: `บันทึก ${data?.order_number ?? "ออเดอร์ใหม่"} ยอด ${Number(data?.total_amount ?? price * quantity).toLocaleString("th-TH")} บาทแล้ว` };
}

export async function cancelLatestCounterOrder(_: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = cancelActionSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, message: "กรุณาเลือกเหตุผลยกเลิก" };

  const access = await assertBranchAccess(parsed.data.branch_id);
  if (!access.ok) return access;

  const supabase = await createSupabaseServerClient();
  if (!supabase) return { ok: false, message: "ยังไม่ได้ตั้งค่า Supabase บนเซิร์ฟเวอร์" };

  const { data, error } = await supabase
    .rpc("cancel_latest_counter_order", {
      p_branch_id: parsed.data.branch_id,
      p_reason: parsed.data.reason,
    })
    .select("order_number, total_amount")
    .single();

  if (error) return { ok: false, message: error.message };

  revalidatePath("/counter-orders");
  return { ok: true, message: `ยกเลิก ${data?.order_number ?? "ออเดอร์ล่าสุด"} และหักยอด ${Number(data?.total_amount ?? 0).toLocaleString("th-TH")} บาทแล้ว` };
}

export async function reprintLatestCounterOrder(_: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = reprintActionSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, message: "ไม่พบออเดอร์สำหรับพิมพ์ซ้ำ" };

  const supabase = await createSupabaseServerClient();
  if (!supabase) return { ok: false, message: "ยังไม่ได้ตั้งค่า Supabase บนเซิร์ฟเวอร์" };

  const { data, error } = await supabase.rpc("reprint_order", { p_order_id: parsed.data.order_id }).select("order_number").single();
  if (error) return { ok: false, message: error.message };

  revalidatePath("/counter-orders");
  return { ok: true, message: `เตรียมข้อมูลพิมพ์ซ้ำ ${data?.order_number ?? "ออเดอร์ล่าสุด"} แล้ว (ยังไม่เพิ่มยอดขายซ้ำ)` };
}
