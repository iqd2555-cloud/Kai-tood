"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getCurrentProfile, isOwner } from "@/lib/auth";
import {
  CUSTOMER_MASTER,
  parseMarinatedOrder,
  priceOrder,
} from "@/lib/marinated-order-parser";
import { createSupabaseServerClient } from "@/lib/supabase-server";

const createSchema = z.object({
  customer_id: z.string().min(1),
  raw_message: z.string().trim().min(1).max(5000),
});

const transitionSchema = z.object({
  order_id: z.string().uuid(),
  new_status: z.enum(["confirmed", "sent_to_production", "completed", "cancelled"]),
  note: z.string().trim().max(1000).optional().default(""),
});

function testPageError(message: string) {
  return `/marinated-order-test?error=${encodeURIComponent(message)}`;
}

export async function createMarinatedDraftOrder(formData: FormData) {
  const profile = await getCurrentProfile();
  if (!isOwner(profile)) redirect("/dashboard");

  const parsed = createSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) redirect(testPageError("ข้อมูลออเดอร์ไม่ครบ"));

  const customer = CUSTOMER_MASTER.find((item) => item.id === parsed.data.customer_id);
  if (!customer) redirect(testPageError("ไม่พบข้อมูลลูกค้า"));

  const order = parseMarinatedOrder(parsed.data.raw_message, customer);
  if (order.needsReview || !order.deliveryDateISO || order.items.length === 0) {
    redirect(testPageError("ออเดอร์ยังมีจุดที่ต้องตรวจสอบ จึงยังไม่บันทึกเป็น Draft"));
  }

  const pricing = priceOrder(order, customer);
  const supabase = await createSupabaseServerClient();
  if (!supabase) redirect(testPageError("ระบบฐานข้อมูลยังไม่พร้อม"));

  const { data, error } = await supabase.rpc("create_marinated_order_draft", {
    p_customer_master_id: customer.id,
    p_customer_name: customer.name,
    p_customer_group: customer.group,
    p_customer_phone: customer.phone ?? "",
    p_customer_address: customer.address ?? "",
    p_shipping_instruction: customer.shippingInstruction ?? "",
    p_raw_message: parsed.data.raw_message,
    p_delivery_date: order.deliveryDateISO,
    p_price_per_kg: pricing.pricePerKg,
    p_items: order.items.map((item) => ({
      product: item.product,
      name: item.name,
      kg: item.kg,
    })),
  });

  if (error || !data) {
    console.error("Create marinated draft failed", error?.message);
    redirect(testPageError("บันทึก Draft Order ไม่สำเร็จ กรุณาลองใหม่"));
  }

  revalidatePath("/marinated-orders");
  redirect(`/marinated-orders/${data}?created=1`);
}

export async function transitionMarinatedOrder(formData: FormData) {
  const profile = await getCurrentProfile();
  if (!isOwner(profile)) redirect("/dashboard");

  const parsed = transitionSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) redirect("/marinated-orders?error=ข้อมูลสถานะไม่ถูกต้อง");

  if (parsed.data.new_status === "cancelled" && !parsed.data.note) {
    redirect(`/marinated-orders/${parsed.data.order_id}?error=${encodeURIComponent("กรุณาระบุเหตุผลที่ยกเลิก")}`);
  }

  const supabase = await createSupabaseServerClient();
  if (!supabase) redirect(`/marinated-orders/${parsed.data.order_id}?error=${encodeURIComponent("ระบบฐานข้อมูลยังไม่พร้อม")}`);

  const { error } = await supabase.rpc("transition_marinated_order", {
    p_order_id: parsed.data.order_id,
    p_new_status: parsed.data.new_status,
    p_note: parsed.data.note || null,
  });

  if (error) {
    console.error("Transition marinated order failed", error.message);
    redirect(`/marinated-orders/${parsed.data.order_id}?error=${encodeURIComponent("เปลี่ยนสถานะไม่สำเร็จ กรุณาโหลดหน้าใหม่แล้วลองอีกครั้ง")}`);
  }

  revalidatePath("/marinated-orders");
  revalidatePath(`/marinated-orders/${parsed.data.order_id}`);
  redirect(`/marinated-orders/${parsed.data.order_id}?updated=1`);
}
