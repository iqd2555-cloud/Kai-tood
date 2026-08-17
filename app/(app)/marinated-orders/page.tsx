import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentProfile, isOwner } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase-server";

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
  const { data, error } = await query.returns<OrderRow[]>();
  const orders = data ?? [];

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
      ระบบนี้แยกจากสต๊อก, Cash Flow และใบจัด–ส่งสินค้า จึงยังไม่มีรายการใดถูกตัดสต๊อกหรือบันทึกรายรับอัตโนมัติ
    </section>

    {params.error && <p className="rounded-2xl bg-red-50 p-4 font-bold text-red-800">{params.error}</p>}
    {error && <p className="rounded-2xl bg-red-50 p-4 font-bold text-red-800">โหลดออเดอร์ไม่สำเร็จ: {error.message}</p>}

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
