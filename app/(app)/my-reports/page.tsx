import { redirect } from "next/navigation";
import { getCurrentProfile, isOwner } from "@/lib/auth";
import { formatThaiDate, moneyFormatter, numberFormatter } from "@/lib/format";
import { ORDER_REQUEST_ITEMS, RECEIVED_INGREDIENT_ITEMS, USED_INGREDIENT_ITEMS } from "@/lib/report-items";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import type { DailyReport } from "@/lib/types";

export default async function MyReportsPage() {
  const profile = await getCurrentProfile();

  const supabase = await createSupabaseServerClient();
  if (!supabase) redirect("/login?setup=supabase");

  let query = supabase.from("daily_reports").select("*").order("report_date", { ascending: false }).limit(60);
  if (!isOwner(profile) && profile.branch_id) {
    query = query.eq("branch_id", profile.branch_id);
  }

  const { data } = await query.returns<DailyReport[]>();
  const reports = data ?? [];

  return (
    <div className="space-y-4">
      <section className="rounded-[2rem] bg-[#111111] p-5 text-white shadow-xl">
        <p className="text-sm font-bold text-[#ffc400]">{isOwner(profile) ? "สำหรับเจ้าของร้าน" : "สำหรับพนักงาน"}</p>
        <h1 className="mt-2 text-3xl font-black">รายงานของฉัน</h1>
        <p className="mt-1 text-sm text-white/80">{isOwner(profile) ? "เห็นรายงานทุกสาขา" : "เห็นเฉพาะสาขาของคุณ"}</p>
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
              <section className="rounded-2xl border border-[#ffc400]/40 bg-[#fff7db] p-3">
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
                <h3 className="text-base font-black text-black">หมวด 4: คงเหลือปิดร้าน</h3>
                <div className="mt-2 grid grid-cols-1 gap-2 text-sm font-bold sm:grid-cols-3">
                  <div className="rounded-xl bg-white p-2">ไก่ {numberFormatter.format(report.remaining_chicken)} กิโลกรัม</div>
                  <div className="rounded-xl bg-white p-2">ข้าวเหนียว {numberFormatter.format(report.remaining_sticky_rice)} กิโลกรัม</div>
                  <div className="rounded-xl bg-white p-2">น้ำมัน {numberFormatter.format(report.remaining_oil)} กิโลกรัม</div>
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
