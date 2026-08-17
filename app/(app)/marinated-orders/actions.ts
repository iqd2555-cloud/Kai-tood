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
  line_inbox_id: z.string().uuid().optional().or(z.literal("")),
});

const lineInboxSchema = z.object({
  inbox_id: z.string().uuid(),
  customer_id: z.string().min(1),
});

const ignoreLineInboxSchema = z.object({ inbox_id: z.string().uuid() });

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

  if (parsed.data.line_inbox_id) {
    const [orderUpdate, inboxUpdate] = await Promise.all([
      supabase.from("marinated_orders").update({ source: "line_parser" }).eq("id", data),
      supabase.from("marinated_order_line_inbox").update({
        processing_status: "draft_created",
        customer_master_id: customer.id,
        marinated_order_id: data,
        parser_errors: [],
        processed_at: new Date().toISOString(),
      }).eq("id", parsed.data.line_inbox_id),
    ]);
    if (orderUpdate.error || inboxUpdate.error) {
      console.error("Link manual LINE order draft failed", orderUpdate.error?.message, inboxUpdate.error?.message);
    }
  }

  revalidatePath("/marinated-orders");
  redirect(`/marinated-orders/${data}?created=1`);
}

export async function bindLineOrderSourceAndProcess(formData: FormData) {
  const profile = await getCurrentProfile();
  if (!isOwner(profile)) redirect("/dashboard");

  const parsed = lineInboxSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) redirect("/marinated-orders?error=ข้อมูลข้อความ LINE ไม่ถูกต้อง");

  const customer = CUSTOMER_MASTER.find((item) => item.id === parsed.data.customer_id);
  if (!customer) redirect("/marinated-orders?error=ไม่พบข้อมูลลูกค้า");

  const supabase = await createSupabaseServerClient();
  if (!supabase) redirect("/marinated-orders?error=ระบบฐานข้อมูลยังไม่พร้อม");

  const { data: inbox, error: inboxError } = await supabase
    .from("marinated_order_line_inbox")
    .select("id,source_type,source_id,line_user_id,display_name,raw_message,marinated_order_id")
    .eq("id", parsed.data.inbox_id)
    .maybeSingle();
  if (inboxError || !inbox) redirect("/marinated-orders?error=ไม่พบข้อความ LINE นี้");
  if (inbox.marinated_order_id) redirect(`/marinated-orders/${inbox.marinated_order_id}`);

  const { error: mappingError } = await supabase.from("marinated_order_line_sources").upsert({
    source_type: inbox.source_type,
    source_id: inbox.source_id,
    line_user_id: inbox.line_user_id,
    display_name: inbox.display_name,
    customer_master_id: customer.id,
    created_by: profile.id,
  }, { onConflict: "source_type,source_id" });
  if (mappingError) {
    console.error("Bind LINE order source failed", mappingError.message);
    redirect("/marinated-orders?error=ผูกบัญชี LINE กับลูกค้าไม่สำเร็จ");
  }

  const order = parseMarinatedOrder(inbox.raw_message, customer);
  if (order.needsReview || !order.deliveryDateISO || order.items.length === 0) {
    await supabase.from("marinated_order_line_inbox").update({
      processing_status: "needs_review",
      customer_master_id: customer.id,
      parser_errors: order.errors,
      parser_warnings: order.warnings,
    }).eq("id", inbox.id);
    const query = new URLSearchParams({
      customer: customer.id,
      raw: inbox.raw_message,
      line_inbox: inbox.id,
      error: "ผูกลูกค้าแล้ว แต่ข้อความนี้ยังต้องแก้ก่อนบันทึก Draft",
    });
    redirect(`/marinated-order-test?${query.toString()}`);
  }

  const pricing = priceOrder(order, customer);
  const { data: orderId, error: orderError } = await supabase.rpc("create_marinated_order_draft", {
    p_customer_master_id: customer.id,
    p_customer_name: customer.name,
    p_customer_group: customer.group,
    p_customer_phone: customer.phone ?? "",
    p_customer_address: customer.address ?? "",
    p_shipping_instruction: customer.shippingInstruction ?? "",
    p_raw_message: inbox.raw_message,
    p_delivery_date: order.deliveryDateISO,
    p_price_per_kg: pricing.pricePerKg,
    p_items: order.items.map((item) => ({ product: item.product, name: item.name, kg: item.kg })),
  });
  if (orderError || !orderId) {
    console.error("Create linked LINE order draft failed", orderError?.message);
    redirect("/marinated-orders?error=สร้าง Draft จากข้อความ LINE ไม่สำเร็จ");
  }


  const [orderUpdate, inboxUpdate] = await Promise.all([
    supabase.from("marinated_orders").update({ source: "line_parser" }).eq("id", orderId),
    supabase.from("marinated_order_line_inbox").update({
      processing_status: "draft_created",
      customer_master_id: customer.id,
      marinated_order_id: orderId,
      parser_errors: [],
      processed_at: new Date().toISOString(),
    }).eq("id", inbox.id),
  ]);
  if (orderUpdate.error || inboxUpdate.error) {
    console.error("Link owner-created LINE draft failed", orderUpdate.error?.message, inboxUpdate.error?.message);
  }

  revalidatePath("/marinated-orders");
  redirect(`/marinated-orders/${orderId}?created=1`);
}

export async function ignoreLineOrderMessage(formData: FormData) {
  const profile = await getCurrentProfile();
  if (!isOwner(profile)) redirect("/dashboard");

  const parsed = ignoreLineInboxSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) redirect("/marinated-orders?error=ข้อมูลข้อความ LINE ไม่ถูกต้อง");
  const supabase = await createSupabaseServerClient();
  if (!supabase) redirect("/marinated-orders?error=ระบบฐานข้อมูลยังไม่พร้อม");

  const { error } = await supabase.from("marinated_order_line_inbox").update({
    processing_status: "ignored",
    processed_at: new Date().toISOString(),
  }).eq("id", parsed.data.inbox_id).is("marinated_order_id", null);
  if (error) redirect("/marinated-orders?error=ข้ามข้อความไม่สำเร็จ");

  revalidatePath("/marinated-orders");
  redirect("/marinated-orders");
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
