import Link from "next/link";
import { redirect } from "next/navigation";
import { CounterOrderConsole, StaffCounterOrderInput } from "./counter-order-console";
import { getCurrentProfile, isOwner } from "@/lib/auth";
import { canUseStaffCounterOrder } from "@/lib/counter-access";
import { canAccessOrderCount } from "@/lib/marination-access";
import { formatThaiDate, moneyFormatter, numberFormatter, todayISO } from "@/lib/format";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import type { Branch, CounterCancellation, CounterOrder, CounterPriceItem } from "@/lib/types";

type SearchParams = {
  branch?: string;
};

type CounterOrdersPageProps = {
  searchParams?: Promise<SearchParams>;
};

type PriceRollup = {
  price: number;
  itemName: string;
  quantity: number;
  total: number;
};

const DEFAULT_COUNTER_PRICE_ITEMS = [
  { item_name: "ไก่ทอดห่อ 20 บาท", price: 20 },
  { item_name: "ไก่ทอดห่อ 25 บาท", price: 25 },
  { item_name: "ไก่ทอดห่อ 30 บาท", price: 30 },
];

function isUuid(value: string | undefined) {
  return Boolean(value?.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i));
}

function timeShort(value: string) {
  return value.slice(0, 5);
}

function statusLabel(status: CounterOrder["status"]) {
  return status === "success" ? "สำเร็จ" : "ยกเลิก";
}

function printStatusLabel(status: CounterOrder["print_status"]) {
  if (status === "printed") return "พิมพ์แล้ว";
  if (status === "reprinted") return "พิมพ์ซ้ำ";
  return "รอพิมพ์";
}

function buildRollups(orders: CounterOrder[]) {
  const rollups = new Map<number, PriceRollup>();
  orders
    .filter((order) => order.status === "success")
    .flatMap((order) => order.counter_order_items ?? [])
    .forEach((item) => {
      const current = rollups.get(Number(item.price)) ?? { price: Number(item.price), itemName: item.item_name, quantity: 0, total: 0 };
      current.quantity += Number(item.quantity);
      current.total += Number(item.line_total);
      rollups.set(Number(item.price), current);
    });
  return [...rollups.values()].sort((a, b) => a.price - b.price);
}

export default async function CounterOrdersPage({ searchParams }: CounterOrdersPageProps) {
  const profile = await getCurrentProfile();
  if (!canAccessOrderCount(profile)) redirect("/marination");

  const staffOrderInputEnabled = canUseStaffCounterOrder(profile);

  if (!isOwner(profile) && !staffOrderInputEnabled) {
    return (
      <div className="space-y-4">
        <section className="rounded-[2rem] bg-[#111111] p-5 text-white shadow-xl">
          <p className="text-sm font-bold text-[#E60012]">เหนียวไก่เยอะโคตร</p>
          <h1 className="mt-2 text-3xl font-black">ระบบนับออเดอร์หน้าร้าน</h1>
          <p className="mt-2 text-white/70">บัญชี Staff นี้ยังไม่ได้เปิดใช้ระบบนับออเดอร์หน้าร้าน</p>
        </section>
        <Link href="/dashboard" className="focus-ring block rounded-3xl bg-[#E60012] px-5 py-5 text-center text-xl font-black text-white shadow-lg">กลับหน้า Dashboard</Link>
      </div>
    );
  }

  const supabase = await createSupabaseServerClient();
  if (!supabase) redirect("/login?setup=supabase");

  const today = todayISO();
  const params = searchParams ? await searchParams : {};

  const branchesQuery = supabase.from("branches").select("*").order("name");
  if (!isOwner(profile) && profile.branch_id) branchesQuery.eq("id", profile.branch_id);
  const { data: branchesData } = await branchesQuery.returns<Branch[]>();
  const branches = branchesData ?? [];

  const selectedBranchId = isOwner(profile)
    ? (isUuid(params.branch) && branches.some((branch) => branch.id === params.branch) ? params.branch! : branches[0]?.id)
    : profile.branch_id;

  if (!selectedBranchId) {
    return (
      <div className="rounded-[2rem] bg-white p-5 shadow-sm">
        <h1 className="text-2xl font-black">ยังไม่มีสาขา</h1>
        <p className="mt-2 font-bold text-black/60">กรุณาตั้งค่าสาขาก่อนเริ่มใช้งานระบบนับออเดอร์หน้าร้าน</p>
      </div>
    );
  }

  const selectedBranch = branches.find((branch) => branch.id === selectedBranchId) ?? profile.branch;

  const { data: priceItemsData } = await supabase.rpc("get_counter_price_items");
  const rawPriceItems = Array.isArray(priceItemsData) && priceItemsData.length > 0
    ? (priceItemsData as Pick<CounterPriceItem, "item_name" | "price">[])
    : DEFAULT_COUNTER_PRICE_ITEMS;
  const priceItems = rawPriceItems.map((item) => ({ ...item, price: Number(item.price) }));

  if (staffOrderInputEnabled) {
    return (
      <div className="space-y-4">
        {process.env.NODE_ENV === "development" && <div className="rounded-full bg-[#E60012]/20 px-4 py-2 text-sm font-black text-black">Debug: StaffCounterOrderPage</div>}
        <StaffCounterOrderInput
          branchId={selectedBranchId}
          priceItems={priceItems.map((item) => ({ price: item.price, item_name: item.item_name }))}
        />
      </div>
    );
  }

  const { data: ordersData } = await supabase
    .from("counter_orders")
    .select("*, branches(name, code), profiles(full_name, role), counter_order_items(*), counter_cancellations(*, profiles(full_name, role))")
    .eq("branch_id", selectedBranchId)
    .eq("order_date", today)
    .order("created_at", { ascending: false })
    .limit(80)
    .returns<CounterOrder[]>();
  const orders = ordersData ?? [];
  const activeOrders = orders.filter((order) => order.status === "success");
  const latestSuccessfulOrder = activeOrders[0];
  const rollups = buildRollups(orders);
  const totalSales = activeOrders.reduce((sum, order) => sum + Number(order.total_amount), 0);
  const totalQuantity = rollups.reduce((sum, item) => sum + item.quantity, 0);
  const cancellations = orders.flatMap((order) => (order.counter_cancellations ?? []).map((cancellation) => ({ ...cancellation, order }))) as (CounterCancellation & { order: CounterOrder })[];

  if (process.env.NODE_ENV === "development") {
    console.info("accounting_report_branch_debug", {
      selectedBranchId,
      reportBranchId: [...new Set(orders.map((order) => order.branch_id))],
    });
  }

  return (
    <div className="space-y-5">
      <section className="rounded-[2rem] bg-[#111111] p-5 text-white shadow-xl">
        <p className="text-sm font-bold text-[#E60012]">เหนียวไก่เยอะโคตร</p>
        <h1 className="mt-2 text-3xl font-black">ระบบนับออเดอร์หน้าร้าน</h1>
        <p className="mt-2 text-white/70">Owner Test Mode: กดราคา + กดจำนวน แล้วบันทึกยอดขายทันที โดยข้อมูลเก็บใน Supabase จริง</p>
        <div className="mt-4 grid gap-2 text-sm font-bold sm:grid-cols-4">
          <div className="rounded-2xl bg-white/10 p-3"><span className="block text-white/50">วันที่</span>{formatThaiDate(today)}</div>
          <div className="rounded-2xl bg-white/10 p-3"><span className="block text-white/50">สาขา</span>{selectedBranch?.name ?? "ไม่ระบุ"}</div>
          <div className="rounded-2xl bg-white/10 p-3"><span className="block text-white/50">ผู้ใช้งาน</span>{profile.full_name} ({profile.role === "owner" ? "Owner" : "Staff"})</div>
          <div className="rounded-2xl bg-[#E60012] p-3 text-white"><span className="block text-black/60">ยอดขายวันนี้</span>{moneyFormatter.format(totalSales)}</div>
        </div>
      </section>

      {isOwner(profile) && branches.length > 1 && (
        <form className="rounded-[1.5rem] border border-black/10 bg-white p-4 shadow-sm" action="/counter-orders">
          <label className="block">
            <span className="mb-2 block font-black">เลือกสาขาสำหรับ Owner Test Mode</span>
            <select className="focus-ring min-h-14 w-full rounded-2xl border-2 border-black/10 px-4 text-lg font-bold" name="branch" defaultValue={selectedBranchId}>
              {branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name} ({branch.code})</option>)}
            </select>
          </label>
          <button className="focus-ring mt-3 min-h-12 rounded-2xl bg-[#E60012] px-5 font-black text-white">ใช้สาขานี้</button>
        </form>
      )}

      <CounterOrderConsole
        branchId={selectedBranchId}
        latestOrderId={latestSuccessfulOrder?.id}
        latestOrderNumber={latestSuccessfulOrder?.order_number}
        priceItems={priceItems.map((item) => ({ price: item.price, item_name: item.item_name }))}
      />

      <section id="today-report" className="rounded-[1.75rem] border border-black/10 bg-white p-5 shadow-sm scroll-mt-24">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-sm font-black text-black/50">รายงานยอดขายวันนี้</p>
            <h2 className="text-2xl font-black">{formatThaiDate(today)} · {selectedBranch?.name ?? "ไม่ระบุสาขา"}</h2>
          </div>
          <Link href="#accounting-report" className="focus-ring rounded-full bg-black px-4 py-2 text-sm font-black text-white">รายงานส่งบัญชี</Link>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl bg-[#E60012]/30 p-4 text-center"><div className="text-sm font-bold">ยอดขายรวมวันนี้</div><div className="text-3xl font-black">{moneyFormatter.format(totalSales)}</div></div>
          <div className="rounded-2xl bg-black/5 p-4 text-center"><div className="text-sm font-bold">จำนวนออเดอร์วันนี้</div><div className="text-3xl font-black">{numberFormatter.format(activeOrders.length)}</div></div>
          <div className="rounded-2xl bg-black/5 p-4 text-center"><div className="text-sm font-bold">จำนวนห่อรวม</div><div className="text-3xl font-black">{numberFormatter.format(totalQuantity)}</div></div>
        </div>
        <div className="mt-4 overflow-hidden rounded-2xl border border-black/10">
          <table className="w-full text-left text-sm">
            <thead className="bg-[#111111] text-white"><tr><th className="p-3">รายการ</th><th className="p-3 text-right">ราคา</th><th className="p-3 text-right">จำนวน</th><th className="p-3 text-right">ยอดขาย</th></tr></thead>
            <tbody>
              {rollups.map((item) => (
                <tr key={item.price} className="border-t border-black/10 font-bold"><td className="p-3">{item.itemName}</td><td className="p-3 text-right">{numberFormatter.format(item.price)}</td><td className="p-3 text-right">{numberFormatter.format(item.quantity)}</td><td className="p-3 text-right">{moneyFormatter.format(item.total)}</td></tr>
              ))}
              <tr className="border-t-2 border-black bg-[#E60012]/20 text-base font-black"><td className="p-3">รวม</td><td className="p-3" /><td className="p-3 text-right">{numberFormatter.format(totalQuantity)}</td><td className="p-3 text-right">{moneyFormatter.format(totalSales)}</td></tr>
            </tbody>
          </table>
        </div>
      </section>

      <section id="latest-orders" className="rounded-[1.75rem] border border-black/10 bg-white p-5 shadow-sm scroll-mt-24">
        <h2 className="text-2xl font-black">ออเดอร์ล่าสุด / ตรวจสอบย้อนหลังกับกล้องวงจรปิด</h2>
        <p className="mt-1 text-sm font-bold text-black/50">บันทึกเวลา ผู้กดขาย สถานะออเดอร์ และสถานะพิมพ์ เพื่อเทียบกับกล้องวงจรปิดได้</p>
        <div className="mt-4 space-y-3">
          {orders.slice(0, 20).map((order) => {
            const firstItem = order.counter_order_items?.[0];
            return (
              <article key={order.id} className={`rounded-2xl border p-4 ${order.status === "cancelled" ? "border-red-200 bg-red-50" : "border-black/10 bg-white"}`}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="text-xl font-black">{order.order_number}</h3>
                    <p className="text-sm font-bold text-black/50">{formatThaiDate(order.order_date)} เวลา {timeShort(order.order_time)} · ผู้กดขาย {order.profiles?.full_name ?? "ไม่ระบุ"}</p>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-black">{moneyFormatter.format(Number(order.total_amount))}</div>
                    <div className="text-xs font-black text-black/50">{statusLabel(order.status)} · {printStatusLabel(order.print_status)}</div>
                  </div>
                </div>
                <p className="mt-3 rounded-2xl bg-black/5 p-3 font-bold">{firstItem?.item_name ?? "รายการขาย"} × {numberFormatter.format(Number(firstItem?.quantity ?? 0))} = {moneyFormatter.format(Number(firstItem?.line_total ?? order.total_amount))}</p>
              </article>
            );
          })}
          {orders.length === 0 && <p className="rounded-2xl bg-black/5 p-4 font-bold text-black/50">ยังไม่มีออเดอร์วันนี้</p>}
        </div>
      </section>

      <section className="rounded-[1.75rem] border border-red-200 bg-white p-5 shadow-sm">
        <h2 className="text-2xl font-black">ประวัติยกเลิกวันนี้</h2>
        <div className="mt-4 space-y-2">
          {cancellations.map((cancellation) => (
            <div key={cancellation.id} className="rounded-2xl bg-red-50 p-4 font-bold text-red-950">
              {cancellation.order.order_number} · {cancellation.reason} · ยอดเดิม {moneyFormatter.format(Number(cancellation.original_total))} · ยกเลิกโดย {cancellation.profiles?.full_name ?? "ไม่ระบุ"} เวลา {new Date(cancellation.cancelled_at).toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Bangkok" })}
            </div>
          ))}
          {cancellations.length === 0 && <p className="rounded-2xl bg-black/5 p-4 font-bold text-black/50">ยังไม่มีรายการยกเลิกวันนี้</p>}
        </div>
      </section>

      <section id="accounting-report" className="rounded-[1.75rem] border-4 border-[#E60012] bg-white p-5 shadow-sm scroll-mt-24">
        <p className="text-sm font-black text-black/50">รายงานส่งสำนักงานบัญชี</p>
        <h2 className="mt-1 text-2xl font-black">รายงานรายได้หน้าร้าน</h2>
        <div className="mt-3 rounded-2xl bg-black/5 p-4 font-bold">
          <p>ร้าน: เหนียวไก่เยอะโคตร</p>
          <p>สาขา: {selectedBranch?.name ?? "ไม่ระบุ"}</p>
          <p>วันที่: {formatThaiDate(today)}</p>
        </div>
        <div className="mt-4 overflow-hidden rounded-2xl border border-black/10">
          <table className="w-full text-left text-sm">
            <thead className="bg-[#111111] text-white"><tr><th className="p-3">รายการ</th><th className="p-3 text-right">ราคา</th><th className="p-3 text-right">จำนวนรวม</th><th className="p-3 text-right">ยอดรวม</th></tr></thead>
            <tbody>
              {rollups.map((item) => (
                <tr key={item.price} className="border-t border-black/10 font-bold"><td className="p-3">{item.itemName}</td><td className="p-3 text-right">{numberFormatter.format(item.price)}</td><td className="p-3 text-right">{numberFormatter.format(item.quantity)}</td><td className="p-3 text-right">{moneyFormatter.format(item.total)}</td></tr>
              ))}
              <tr className="border-t-2 border-black bg-[#E60012]/20 text-base font-black"><td className="p-3">รวม</td><td className="p-3" /><td className="p-3 text-right">{numberFormatter.format(totalQuantity)}</td><td className="p-3 text-right">{moneyFormatter.format(totalSales)}</td></tr>
            </tbody>
          </table>
        </div>
        <p className="mt-3 rounded-2xl bg-[#FDECEC] p-3 text-sm font-bold text-[#7A0008]">อนาคตรองรับ Export PDF / Excel / CSV โดยรายงานนี้รวมเฉพาะออเดอร์สถานะสำเร็จเท่านั้น</p>
      </section>
    </div>
  );
}
