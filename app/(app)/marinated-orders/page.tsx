import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentProfile, isOwner } from "@/lib/auth";
import { CUSTOMER_MASTER } from "@/lib/marinated-order-parser";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { bindLineOrderSourceAndProcess, ignoreLineOrderMessage } from "./actions";

type OrderStatus = "draft" | "confirmed" | "sent_to_production" | "completed" | "cancelled";

type OrderRow = {
  id: string;
  order_number: string;
  customer_name: string;
  customer_group: "A" | "B" | "C";
  delivery_date: string;
  status: OrderStatus;
  total_kg: number | string;
  total_amount: number | string;
  created_at: string;
};

type LineInboxRow = {
  id: string;
  source_type: "user" | "group" | "room";
  display_name: string | null;
  raw_message: string;
  event_at: string;
  processing_status: "unmatched_customer" | "needs_review";
  customer_master_id: string | null;
  parser_errors: string[] | null;
  parser_warnings: string[] | null;
};

const STATUS_LABELS: Record<OrderStatus, string> = {
  draft: "รอตรวจยืนยัน",
  confirmed: "ยืนยันแล้ว",
  sent_to_production: "ส่งต่อโรงหมักแล้ว",
  completed: "เสร็จสมบูรณ์",
  cancelled: "ยกเลิก",
};

const STATUS_STYLES: Record<OrderStatus, string> = {
  draft: "bg-amber-100 text-amber-900",
  confirmed: "bg-blue-100 text-blue-900",
  sent_to_production: "bg-purple-100 text-purple-900",
  completed: "bg-green-100 text-green-900",
  cancelled: "bg-red-100 text-red-800",
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("th-TH", { day: "numeric", month: "short", year: "numeric" }).format(new Date(`${value}T00:00:00+07:00`));
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("th-TH", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Bangkok",
  }).format(new Date(value));
}

function reviewHref(inbox: LineInboxRow) {
  const query = new URLSearchParams({
    raw: inbox.raw_message,
    line_inbox: inbox.id,
  });
  if (inbox.customer_master_id) query.set("customer", inbox.customer_master_id);
  return `/marinated-order-test?${query.toString()}`;
}

export default async function MarinatedOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; error?: string }>;
}) {
  const profile = await getCurrentProfile();
  if (!isOwner(profile)) redirect("/dashboard");

  const params = await searchParams;
  const requestedStatus = Object.keys(STATUS_LABELS).includes(params.status ?? "")
    ? (params.status as OrderStatus)
    : null;
  const supabase = await createSupabaseServerClient();
  if (!supabase) return <p className="rounded-2xl bg-red-50 p-5 font-bold text-red-800">ระบบฐานข้อมูลยังไม่พร้อม</p>;

  let query = supabase
    .from("marinated_orders")
    .select("id, order_number, customer_name, customer_group, delivery_date, status, total_kg, total_amount, created_at")
    .order("created_at", { ascending: false })
    .limit(100);

  if (requestedStatus) query = query.eq("status", requestedStatus);
  const [{ data, error }, { data: inboxData, error: inboxError }] = await Promise.all([
    query.returns<OrderRow[]>(),
    supabase
      .from("marinated_order_line_inbox")
      .select("id,source_type,display_name,raw_message,event_at,processing_status,customer_master_id,parser_errors,parser_warnings")
      .in("processing_status", ["unmatched_customer", "needs_review"])
      .order("event_at", { ascending: false })
      .limit(30)
      .returns<LineInboxRow[]>(),
  ]);
  const orders = data ?? [];
  const inbox = inboxData ?? [];

  return <div className="space-y-5">
    <section className="rounded-[2rem] bg-[#111] p-5 text-white shadow-xl">
      <p className="text-sm font-black text-[#FFD43B]">OWNER CONTROL · ORDER DATABASE</p>
      <div className="mt-2 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black">ออเดอร์ไก่หมัก</h1>
          <p className="mt-2 text-white/70">ทุกออเดอร์ต้องผ่านการตรวจและยืนยันก่อนเปลี่ยนสถานะ</p>
        </div>
        <Link href="/marinated-order-test" className="rounded-2xl bg-[#E60012] px-5 py-3 font-black text-white">+ รับออเดอร์ใหม่</Link>
      </div>
    </section>

    <section className="rounded-[1.75rem] border border-blue-200 bg-blue-50 p-4 text-sm font-bold text-blue-950">
      ระบบรับออเดอร์เฉพาะจากกลุ่ม LINE ที่เชิญ OA และสร้างเป็น Draft เท่านั้น แชตส่วนตัวกับ OA ยังทำงานรับสลิปและ Cash Flow ตามเดิม
    </section>

    {params.error && <p className="rounded-2xl bg-red-50 p-4 font-bold text-red-800">{params.error}</p>}
    {error && <p className="rounded-2xl bg-red-50 p-4 font-bold text-red-800">โหลดออเดอร์ไม่สำเร็จ: {error.message}</p>}
    {inboxError && <p className="rounded-2xl bg-red-50 p-4 font-bold text-red-800">โหลดกล่องข้อความ LINE ไม่สำเร็จ: {inboxError.message}</p>}

    {!inboxError && inbox.length > 0 && <section className="space-y-3 rounded-[1.75rem] border-2 border-[#06C755] bg-[#effff4] p-4 shadow-sm">
      <div>
        <p className="text-sm font-black text-[#07883d]">กลุ่ม LINE + OA · รอตรวจ {inbox.length} ข้อความ</p>
        <h2 className="mt-1 text-2xl font-black">ผูกผู้ส่งกับลูกค้าครั้งแรก / แก้ข้อความ</h2>
        <p className="mt-1 text-sm font-bold text-black/55">ระบบจำบัญชี LINE ของผู้ส่งแต่ละคน แม้อยู่ในกลุ่มรวมเดียวกัน ข้อความครั้งต่อไปที่ข้อมูลครบจะสร้าง Draft อัตโนมัติ</p>
      </div>
      {inbox.map((message) => <article key={message.id} className="rounded-2xl border border-black/10 bg-white p-4">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <p className="font-black">{message.display_name || "ผู้ส่ง LINE ที่ยังไม่ทราบชื่อ"}</p>
            <p className="text-xs font-bold text-black/45">ผู้ส่งในกลุ่ม LINE · {formatDateTime(message.event_at)}</p>
          </div>
          <span className={`rounded-full px-3 py-1 text-xs font-black ${message.processing_status === "unmatched_customer" ? "bg-amber-100 text-amber-900" : "bg-red-100 text-red-800"}`}>
            {message.processing_status === "unmatched_customer" ? "รอผูกลูกค้า" : "ต้องแก้ข้อความ"}
          </span>
        </div>
        <p className="mt-3 whitespace-pre-wrap rounded-2xl bg-black/5 p-3 font-bold">{message.raw_message}</p>
        {(message.parser_errors ?? []).map((item, index) => <p key={index} className="mt-2 text-sm font-black text-red-700">• {item}</p>)}
        <div className="mt-4 grid gap-2 sm:grid-cols-[1fr_auto]">
          <form action={bindLineOrderSourceAndProcess} className="grid gap-2 sm:grid-cols-[1fr_auto]">
            <input type="hidden" name="inbox_id" value={message.id}/>
            <select name="customer_id" defaultValue={message.customer_master_id ?? ""} required className="min-h-12 rounded-xl border-2 border-black/10 bg-white px-3 font-bold">
              <option value="">-- เลือกลูกค้าให้ผู้ส่งคนนี้ --</option>
              {CUSTOMER_MASTER.map((customer) => <option key={customer.id} value={customer.id}>{customer.name} · กลุ่ม {customer.group}</option>)}
            </select>
            <button className="min-h-12 rounded-xl bg-[#06C755] px-4 font-black text-white">ผูกผู้ส่งและสร้าง Draft</button>
          </form>
          <div className="flex gap-2">
            <Link href={reviewHref(message)} className="inline-flex min-h-12 items-center rounded-xl bg-black px-4 font-black text-white">เปิดแก้ไข</Link>
            <form action={ignoreLineOrderMessage}>
              <input type="hidden" name="inbox_id" value={message.id}/>
              <button className="min-h-12 rounded-xl border-2 border-black/10 px-4 font-black">ข้าม</button>
            </form>
          </div>
        </div>
      </article>)}
    </section>}

    <nav className="flex gap-2 overflow-x-auto pb-1">
      <Link href="/marinated-orders" className={`shrink-0 rounded-full px-4 py-2 text-sm font-black ${!requestedStatus ? "bg-black text-white" : "bg-white text-black"}`}>ทั้งหมด</Link>
      {(Object.keys(STATUS_LABELS) as OrderStatus[]).map((status) =>
        <Link key={status} href={`/marinated-orders?status=${status}`} className={`shrink-0 rounded-full px-4 py-2 text-sm font-black ${requestedStatus === status ? "bg-black text-white" : "bg-white text-black"}`}>{STATUS_LABELS[status]}</Link>
      )}
    </nav>

    <section className="space-y-3">
      {orders.map((order) => <Link key={order.id} href={`/marinated-orders/${order.id}`} className="block rounded-[1.5rem] border border-black/10 bg-white p-5 shadow-sm transition hover:border-black/30">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-black text-black/45">{order.order_number}</p>
            <h2 className="mt-1 text-xl font-black">{order.customer_name} · กลุ่ม {order.customer_group}</h2>
            <p className="mt-1 font-bold text-black/60">ส่ง {formatDate(order.delivery_date)}</p>
          </div>
          <span className={`rounded-full px-3 py-1 text-sm font-black ${STATUS_STYLES[order.status]}`}>{STATUS_LABELS[order.status]}</span>
        </div>
        <div className="mt-4 flex items-end justify-between rounded-2xl bg-black/5 p-4">
          <div><p className="text-xs font-black text-black/45">น้ำหนักรวม</p><p className="text-xl font-black">{Number(order.total_kg).toLocaleString("th-TH")} กก.</p></div>
          <div className="text-right"><p className="text-xs font-black text-black/45">ยอดรวม</p><p className="text-2xl font-black">{Number(order.total_amount).toLocaleString("th-TH")} บาท</p></div>
        </div>
      </Link>)}
      {!error && orders.length === 0 && <p className="rounded-[1.5rem] bg-white p-8 text-center font-bold text-black/50">ยังไม่มีออเดอร์ในสถานะนี้</p>}
    </section>
  </div>;
}
