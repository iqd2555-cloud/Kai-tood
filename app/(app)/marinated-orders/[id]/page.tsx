import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getCurrentProfile, isOwner } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { transitionMarinatedOrder } from "../actions";

type OrderStatus = "draft" | "confirmed" | "sent_to_production" | "completed" | "cancelled";
type OrderItem = { id: string; product_name: string; quantity_kg: number | string; unit_price: number | string; line_total: number | string };
type HistoryItem = { id: number; old_status: OrderStatus | null; new_status: OrderStatus; note: string | null; created_at: string };
type OrderDetail = {
  id: string;
  order_number: string;
  customer_name: string;
  customer_group: "A" | "B" | "C";
  customer_phone: string | null;
  customer_address: string | null;
  shipping_instruction: string | null;
  raw_message: string;
  delivery_date: string;
  status: OrderStatus;
  price_per_kg: number | string;
  total_kg: number | string;
  total_amount: number | string;
  cancel_reason: string | null;
  created_at: string;
  marinated_order_items: OrderItem[];
};

const STATUS_LABELS: Record<OrderStatus, string> = {
  draft: "รอตรวจยืนยัน",
  confirmed: "ยืนยันแล้ว",
  sent_to_production: "ส่งต่อโรงหมักแล้ว",
  completed: "เสร็จสมบูรณ์",
  cancelled: "ยกเลิก",
};

const NEXT_ACTION: Partial<Record<OrderStatus, { status: OrderStatus; label: string; description: string }>> = {
  draft: { status: "confirmed", label: "ยืนยันออเดอร์", description: "ยืนยันว่าลูกค้า รายการ น้ำหนัก ราคา และวันส่งถูกต้องแล้ว" },
  confirmed: { status: "sent_to_production", label: "เปลี่ยนเป็นส่งต่อโรงหมัก", description: "บันทึกสถานะเท่านั้น ยังไม่สร้างใบจัดสินค้าและไม่ตัดสต๊อก" },
  sent_to_production: { status: "completed", label: "ปิดงานเป็นเสร็จสมบูรณ์", description: "ใช้เมื่อดำเนินการออเดอร์นี้เสร็จครบแล้ว" },
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("th-TH", { dateStyle: "medium", timeZone: "Asia/Bangkok" }).format(new Date(`${value}T00:00:00+07:00`));
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("th-TH", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Bangkok" }).format(new Date(value));
}

export default async function MarinatedOrderDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ created?: string; updated?: string; error?: string }>;
}) {
  const profile = await getCurrentProfile();
  if (!isOwner(profile)) redirect("/dashboard");
  const [{ id }, query] = await Promise.all([params, searchParams]);

  const supabase = await createSupabaseServerClient();
  if (!supabase) return <p className="rounded-2xl bg-red-50 p-5 font-bold text-red-800">ระบบฐานข้อมูลยังไม่พร้อม</p>;

  const [orderResult, historyResult] = await Promise.all([
    supabase
      .from("marinated_orders")
      .select("id, order_number, customer_name, customer_group, customer_phone, customer_address, shipping_instruction, raw_message, delivery_date, status, price_per_kg, total_kg, total_amount, cancel_reason, created_at, marinated_order_items(id, product_name, quantity_kg, unit_price, line_total)")
      .eq("id", id)
      .returns<OrderDetail>()
      .maybeSingle(),
    supabase
      .from("marinated_order_status_history")
      .select("id, old_status, new_status, note, created_at")
      .eq("order_id", id)
      .order("created_at", { ascending: true })
      .returns<HistoryItem[]>(),
  ]);

  const order = orderResult.data as OrderDetail | null;
  if (!order) notFound();
  const history = historyResult.data ?? [];
  const nextAction = NEXT_ACTION[order.status];

  return <div className="space-y-5">
    <Link href="/marinated-orders" className="inline-flex rounded-full bg-white px-4 py-2 text-sm font-black">← กลับรายการออเดอร์</Link>

    <section className="rounded-[2rem] bg-[#111] p-5 text-white shadow-xl">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div><p className="text-sm font-black text-white/50">{order.order_number}</p><h1 className="mt-1 text-3xl font-black">{order.customer_name}</h1><p className="mt-2 text-white/70">ลูกค้ากลุ่ม {order.customer_group} · ส่ง {formatDate(order.delivery_date)}</p></div>
        <span className="rounded-full bg-[#FFD43B] px-4 py-2 font-black text-black">{STATUS_LABELS[order.status]}</span>
      </div>
    </section>

    {query.created && <p className="rounded-2xl bg-green-50 p-4 font-black text-green-800">สร้าง Draft Order แล้ว กรุณาตรวจรายละเอียดก่อนกดยืนยัน</p>}
    {query.updated && <p className="rounded-2xl bg-green-50 p-4 font-black text-green-800">อัปเดตสถานะเรียบร้อยแล้ว</p>}
    {query.error && <p className="rounded-2xl bg-red-50 p-4 font-black text-red-800">{query.error}</p>}

    <section className="rounded-[1.75rem] border border-black/10 bg-white p-5 shadow-sm">
      <h2 className="text-2xl font-black">ตรวจรายการสินค้า</h2>
      <div className="mt-4 space-y-2">{order.marinated_order_items.map((item) => <div key={item.id} className="grid grid-cols-[1fr_auto] gap-3 rounded-2xl bg-black/5 p-4 font-black"><span>{item.product_name}</span><span>{Number(item.quantity_kg).toLocaleString("th-TH")} กก.</span><span className="text-sm text-black/50">{Number(item.unit_price).toLocaleString("th-TH")} บาท/กก.</span><span className="text-sm text-black/60">{Number(item.line_total).toLocaleString("th-TH")} บาท</span></div>)}</div>
      <div className="mt-4 rounded-2xl bg-black p-4 text-white"><div className="flex justify-between text-xl font-black"><span>รวม {Number(order.total_kg).toLocaleString("th-TH")} กก.</span><span>{Number(order.total_amount).toLocaleString("th-TH")} บาท</span></div></div>
    </section>

    <section className="grid gap-4 md:grid-cols-2">
      <div className="rounded-[1.75rem] border border-black/10 bg-white p-5 shadow-sm"><h2 className="text-xl font-black">ข้อมูลจัดส่ง</h2><div className="mt-3 space-y-2 font-bold text-black/70"><p>{order.customer_phone || "ไม่มีเบอร์โทร"}</p><p>{order.customer_address || "ไม่มีที่อยู่"}</p>{order.shipping_instruction && <p className="rounded-2xl bg-red-50 p-3 text-red-800">เงื่อนไข: {order.shipping_instruction}</p>}</div></div>
      <div className="rounded-[1.75rem] border border-black/10 bg-white p-5 shadow-sm"><h2 className="text-xl font-black">ข้อความต้นฉบับ</h2><pre className="mt-3 whitespace-pre-wrap rounded-2xl bg-black/5 p-4 font-sans text-sm font-bold text-black/70">{order.raw_message}</pre></div>
    </section>

    {order.status === "cancelled" && <section className="rounded-[1.75rem] border border-red-200 bg-red-50 p-5"><h2 className="text-xl font-black text-red-800">เหตุผลที่ยกเลิก</h2><p className="mt-2 font-bold text-red-900">{order.cancel_reason}</p></section>}

    {nextAction && <section className="rounded-[1.75rem] border-4 border-[#FFD43B] bg-white p-5 shadow-sm"><h2 className="text-2xl font-black">ขั้นตอนถัดไป</h2><p className="mt-2 font-bold text-black/60">{nextAction.description}</p><form action={transitionMarinatedOrder} className="mt-4"><input type="hidden" name="order_id" value={order.id}/><input type="hidden" name="new_status" value={nextAction.status}/><button className="min-h-14 w-full rounded-2xl bg-[#E60012] px-5 text-lg font-black text-white">{nextAction.label}</button></form></section>}

    {!(["completed", "cancelled"] as OrderStatus[]).includes(order.status) && <section className="rounded-[1.75rem] border border-red-200 bg-white p-5"><h2 className="text-xl font-black text-red-800">ยกเลิกออเดอร์</h2><form action={transitionMarinatedOrder} className="mt-3 space-y-3"><input type="hidden" name="order_id" value={order.id}/><input type="hidden" name="new_status" value="cancelled"/><textarea name="note" required maxLength={1000} rows={3} placeholder="ระบุเหตุผลที่ยกเลิก" className="w-full rounded-2xl border-2 border-red-100 p-4 font-bold"/><button className="rounded-2xl border-2 border-red-600 px-5 py-3 font-black text-red-700">ยืนยันการยกเลิก</button></form></section>}

    <section className="rounded-[1.75rem] border border-black/10 bg-white p-5 shadow-sm"><h2 className="text-xl font-black">ประวัติสถานะ</h2><div className="mt-4 space-y-3">{history.map((item) => <div key={item.id} className="border-l-4 border-black/20 pl-4"><p className="font-black">{STATUS_LABELS[item.new_status]}</p><p className="text-sm font-bold text-black/45">{formatDateTime(item.created_at)}</p>{item.note && <p className="mt-1 text-sm font-bold text-black/70">{item.note}</p>}</div>)}</div></section>
  </div>;
}
