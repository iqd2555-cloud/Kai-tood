"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getCurrentProfile } from "@/lib/auth";
import { canUseStaffCounterOrder } from "@/lib/counter-access";
import { createSupabaseServerClient } from "@/lib/supabase-server";

const orderActionSchema = z.object({
  branch_id: z.string().uuid("กรุณาเลือกสาขา"),
  price: z.coerce.number().min(1).optional(),
  quantity: z.coerce.number().int().min(1).max(999).optional(),
  shortcut: z.string().optional(),
  entry_mode: z.enum(["quick", "bulk"]).optional(),
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

function isMissingRpcError(message: string) {
  return message.includes("Could not find the function") || message.includes("PGRST202") || message.includes("schema cache");
}

async function createCounterOrderDirectly(supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>, branchId: string, price: number, quantity: number) {
  if (!supabase) return { data: null, error: { message: "ยังไม่ได้ตั้งค่า Supabase บนเซิร์ฟเวอร์" } };

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user) return { data: null, error: { message: userError?.message ?? "Authentication required" } };

  const { data: item, error: itemError } = await supabase
    .from("counter_price_items")
    .select("item_name, price")
    .eq("price", price)
    .eq("status", "active")
    .single();
  if (itemError || !item) return { data: null, error: { message: itemError?.message ?? "Price item is not active" } };

  const totalAmount = Number(item.price) * quantity;
  const { data: order, error: orderError } = await supabase
    .from("counter_orders")
    .insert({ branch_id: branchId, user_id: user.id, total_amount: totalAmount })
    .select("id, order_number, total_amount")
    .single();
  if (orderError || !order) return { data: null, error: { message: orderError?.message ?? "Create counter order failed" } };

  const { error: itemInsertError } = await supabase.from("counter_order_items").insert({
    order_id: order.id,
    item_name: item.item_name,
    price: Number(item.price),
    quantity,
    line_total: totalAmount,
  });

  if (itemInsertError) {
    await supabase.from("counter_orders").update({ status: "cancelled", updated_at: new Date().toISOString() }).eq("id", order.id);
    return { data: null, error: { message: itemInsertError.message } };
  }

  return { data: order, error: null };
}

function parseShortcut(shortcut: string | undefined) {
  if (!shortcut) return null;
  const [price, quantity] = shortcut.split(":").map(Number);
  if (!Number.isFinite(price) || !Number.isFinite(quantity)) return null;
  return { price, quantity };
}

async function assertBranchAccess(branchId: string) {
  const profile = await getCurrentProfile();
  if (profile.role === "staff" && !canUseStaffCounterOrder(profile)) {
    return { ok: false, message: "บัญชีนี้ยังไม่ได้เปิดใช้ระบบนับออเดอร์หน้าร้าน" };
  }
  if (profile.role === "staff" && profile.branch_id !== branchId) {
    return { ok: false, message: "พนักงานกดขายได้เฉพาะสาขาของตัวเอง" };
  }
  return { ok: true, message: "", staffLimited: canUseStaffCounterOrder(profile) };
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
  if (access.staffLimited && parsed.data.entry_mode === "bulk" && quantity < 6) {
    return { ok: false, message: "กรุณากรอกจำนวนตั้งแต่ 6 ห่อขึ้นไป" };
  }

  const supabase = await createSupabaseServerClient();
  if (!supabase) return { ok: false, message: "ยังไม่ได้ตั้งค่า Supabase บนเซิร์ฟเวอร์" };

  const rpcResult = await supabase
    .rpc("create_counter_order", {
      p_branch_id: parsed.data.branch_id,
      p_price: price,
      p_quantity: quantity,
    })
    .select("order_number, total_amount")
    .single();

  const { data, error } =
    rpcResult.error && isMissingRpcError(rpcResult.error.message)
      ? await createCounterOrderDirectly(supabase, parsed.data.branch_id, price, quantity)
      : rpcResult;

  if (error) return { ok: false, message: error.message };

  revalidatePath("/counter-orders");
  if (access.staffLimited) return { ok: true, message: "✅ บันทึกออเดอร์แล้ว" };

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
