import { redirect } from "next/navigation";
import { DateShortcuts } from "@/components/date-shortcuts";
import { getCurrentProfile, isOwner } from "@/lib/auth";
import { formatThaiDate, moneyFormatter, numberFormatter, todayISO } from "@/lib/format";
import { ORDER_REQUEST_ITEMS, RECEIVED_INGREDIENT_ITEMS, REMAINING_INVENTORY_ITEMS, USED_INGREDIENT_ITEMS, getRemainingChickenTotal } from "@/lib/report-items";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import type { DailyReport } from "@/lib/types";
import { canAccessMyReport } from "@/lib/marination-access";

type SearchParams = {
  from?: string;
  to?: string;
};

type MyReportsPageProps = {
  searchParams?: Promise<SearchParams>;
};

function isIsoDate(value: string | undefined) {
  return Boolean(value?.match(/^\d{4}-\d{2}-\d{2}$/));
}

export default async function MyReportsPage({ searchParams }: MyReportsPageProps) {
  const profile = await getCurrentProfile();
  if (!canAccessMyReport(profile)) redirect("/marination");
  const supabase = await createSupabaseServerClient();
  if (!supabase) redirect("/login?setup=supabase");

  const params = searchParams ? await searchParams : {};
  const today = todayISO();
  const from = isIsoDate(params.from) ? params.from! : today;
  const to = isIsoDate(params.to) ? params.to! : today;

  let query = supabase
    .from("daily_reports")
    .select("*")
    .gte("report_date", from)
    .lte("report_date", to)
    .order("report_date", { ascending: false });
  if (!isOwner(profile)) {
    query = query.eq("submitted_by", profile.id);
  }

  const { data } = await query.returns<DailyReport[]>();
  const reports = data ?? [];

  return (
    <div className="space-y-4">
      {process.env.NODE_ENV === "development" && <div className="rounded-full bg-[#E60012]/20 px-4 py-2 text-sm font-black text-black">Debug: MyReportsPage</div>}
      <section className="rounded-[2rem] bg-[#111111] p-5 text-white shadow-xl">
        <p className="text-sm font-bold text-[#E60012]">{isOwner(profile) ? "สำหรับเจ้าของร้าน" : "สำหรับพนักงาน"}</p>
        <h1 className="mt-2 text-3xl font-black">รายงานของฉัน</h1>
        <p className="mt-1 text-sm text-white/80">{isOwner(profile) ? "เห็นรายงานทุกสาขา" : "เห็นเฉพาะสาขาของคุณ"}</p>
      </section>

      <form className="grid gap-3 rounded-[1.75rem] border border-black/10 bg-white p-5 shadow-sm sm:grid-cols-[1fr_1fr_auto]" action="/my-reports">
        <div className="sm:col-span-3">
          <p className="mb-2 text-sm font-black text-black/60">ปุ่มลัดช่วงวันที่</p>
          <DateShortcuts basePath="/my-reports" />
        </div>
        <label className="block">
          <span className="mb-2 block font-black">วันที่เริ่มต้น</span>
          <input className="focus-ring min-h-14 w-full rounded-2xl border-2 border-black/10 px-4 text-lg font-bold" type="date" name="from" defaultValue={from} />
        </label>
        <label className="block">
          <span className="mb-2 block font-black">วันที่สิ้นสุด</span>
          <input className="focus-ring min-h-14 w-full rounded-2xl border-2 border-black/10 px-4 text-lg font-bold" type="date" name="to" defaultValue={to} />
        </label>
        <button className="focus-ring min-h-14 self-end rounded-2xl bg-[#E60012] px-6 text-lg font-black text-white shadow-sm">ดูรายงาน</button>
      </form>

      <section className="rounded-[1.75rem] border border-black/10 bg-white p-5 shadow-sm">
        <h2 className="text-2xl font-black">ช่วงวันที่ {formatThaiDate(from)} - {formatThaiDate(to)}</h2>
        <p className="mt-1 text-sm font-bold text-black/60">พบ {numberFormatter.format(reports.length)} รายการ</p>
      </section>

      {reports.map((report) => {
        const receivedItems = RECEIVED_INGREDIENT_ITEMS.filter((item) => Number(report[item.name] ?? 0) > 0);
        const usedItems = USED_INGREDIENT_ITEMS.filter((item) => Number(report[item.name] ?? 0) > 0);
        const orderItems = ORDER_REQUEST_ITEMS.filter((item) => Number(report[item.name] ?? 0) > 0);
        const otherItems = Array.isArray(report.order_other_items)
          ? report.order_other_items.filter((item) => String(item?.name ?? "").trim() && Number(item?.amount ?? 0) > 0)
          : [];

        return (
          <article key={report.id} className="rounded-[1.5rem] border border-black/10 bg-white p-4 shadow-sm">
            <div className="mb-3">
              <h2 className="text-lg font-black">{formatThaiDate(report.report_date)}</h2>
              <p className="text-sm font-bold text-black/60">สาขา: {report.branch_name}</p>
            </div>

            <div className="space-y-3">
              <section className="rounded-2xl border border-[#E60012]/40 bg-[#fff7db] p-3">
                <h3 className="text-base font-black text-black">หมวด 1: ยอดขายประจำวัน</h3>
                <div className="mt-2 grid grid-cols-1 gap-2 text-sm font-bold sm:grid-cols-3">
                  <div className="rounded-xl bg-white p-2">ยอดขายรวม {moneyFormatter.format(report.total_sales)}</div>
                  <div className="rounded-xl bg-white p-2">เงินสด {moneyFormatter.format(report.cash_sales)}</div>
                  <div className="rounded-xl bg-white p-2">เงินโอน {moneyFormatter.format(report.transfer_sales)}</div>
                </div>
              </section>

              <section className="rounded-2xl border border-black/10 bg-black/[0.03] p-3">
                <h3 className="text-base font-black text-black">หมวด 2: วัตถุดิบรับเข้า</h3>
                {receivedItems.length > 0 ? (
                  <div className="mt-2 grid grid-cols-1 gap-2 text-sm font-bold sm:grid-cols-2">
                    {receivedItems.map((item) => (
                      <div key={item.name} className="rounded-xl bg-white p-2">
                        {item.label} {numberFormatter.format(report[item.name] ?? 0)} {item.unit}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="mt-2 rounded-xl bg-white p-2 text-sm font-bold text-black/60">ไม่มีข้อมูลวัตถุดิบรับเข้า</p>
                )}
              </section>

              <section className="rounded-2xl border border-black/10 bg-black/[0.03] p-3">
                <h3 className="text-base font-black text-black">หมวด 3: วัตถุดิบใช้ไป</h3>
                {usedItems.length > 0 ? (
                  <div className="mt-2 grid grid-cols-1 gap-2 text-sm font-bold sm:grid-cols-2">
                    {usedItems.map((item) => (
                      <div key={item.name} className="rounded-xl bg-white p-2">
                        {item.label} {numberFormatter.format(report[item.name] ?? 0)} {item.unit}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="mt-2 rounded-xl bg-white p-2 text-sm font-bold text-black/60">ไม่มีข้อมูลวัตถุดิบใช้ไป</p>
                )}
              </section>

              <section className="rounded-2xl border border-black/10 bg-black/[0.03] p-3">
                <h3 className="text-base font-black text-black">หมวด 4: สินค้าคงเหลือปิดร้าน</h3>
                <div className="mt-2 rounded-xl bg-[#E60012]/30 p-3 text-sm font-black text-black">
                  รวมไก่คงเหลือทั้งหมด {numberFormatter.format(getRemainingChickenTotal(report))} กิโลกรัม
                </div>
                <div className="mt-2 grid grid-cols-1 gap-2 text-sm font-bold sm:grid-cols-2">
                  {REMAINING_INVENTORY_ITEMS.map((item) => (
                    <div key={item.name} className="rounded-xl bg-white p-2">
                      {item.label} {numberFormatter.format(report[item.name] ?? 0)} {item.unit}
                    </div>
                  ))}
                </div>
              </section>

              <section className="rounded-2xl border border-black/10 bg-black/[0.03] p-3">
                <h3 className="text-base font-black text-black">หมวด 5: สั่งของพรุ่งนี้</h3>
                {orderItems.length > 0 || otherItems.length > 0 ? (
                  <div className="mt-2 grid grid-cols-1 gap-2 text-sm font-bold sm:grid-cols-2">
                    {orderItems.map((item) => (
                      <div key={item.name} className="rounded-xl bg-white p-2">
                        {item.label} {numberFormatter.format(report[item.name] ?? 0)} {item.unit}
                      </div>
                    ))}
                    {otherItems.map((item, index) => (
                      <div key={`${item.name}-${index}`} className="rounded-xl bg-white p-2">
                        {item.name}: {item.amount}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="mt-2 rounded-xl bg-white p-2 text-sm font-bold text-black/60">ไม่มีรายการสั่งวัตถุดิบเพิ่ม</p>
                )}
              </section>
            </div>
          </article>
        );
      })}
    </div>
  );
}
