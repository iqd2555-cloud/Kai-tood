import { redirect } from "next/navigation";
import { DateShortcuts } from "@/components/date-shortcuts";
import { getCurrentProfile, isOwner } from "@/lib/auth";
import { formatThaiDate, numberFormatter, todayISO } from "@/lib/format";
import { formatStructuredOrderItems } from "@/lib/report-items";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import type { DailyReport } from "@/lib/types";

type SearchParams = {
  from?: string;
  to?: string;
};

type OrdersPageProps = {
  searchParams?: Promise<SearchParams>;
};

function isIsoDate(value: string | undefined) {
  return Boolean(value?.match(/^\d{4}-\d{2}-\d{2}$/));
}

export default async function OrdersPage({ searchParams }: OrdersPageProps) {
  const profile = await getCurrentProfile();
  if (!isOwner(profile)) redirect("/dashboard");

  const supabase = await createSupabaseServerClient();
  if (!supabase) redirect("/login?setup=supabase");

  const params = searchParams ? await searchParams : {};
  const today = todayISO();
  const from = isIsoDate(params.from) ? params.from! : today;
  const to = isIsoDate(params.to) ? params.to! : today;

  const { data: reportsData } = await supabase
    .from("daily_reports")
    .select("*, branches(name, code, low_chicken_threshold, low_sticky_rice_threshold, low_oil_threshold)")
    .or("requested_items.neq.,order_original_chicken.gt.0,order_spicy_chicken.gt.0,order_offal.gt.0,order_chopped_chicken.gt.0,order_drumstick.gt.0,order_chicken_skin.gt.0,order_sticky_rice.gt.0,order_oil.gt.0,order_palm_sugar.gt.0")
    .gte("report_date", from)
    .lte("report_date", to)
    .order("report_date", { ascending: false })
    .returns<DailyReport[]>();
  const reports = reportsData ?? [];

  return (
    <div className="space-y-5">
      <section className="rounded-[2rem] bg-[#111111] p-5 text-white shadow-xl">
        <p className="text-sm font-bold text-[#ffc400]">รายการสั่งของ</p>
        <h1 className="mt-2 text-3xl font-black">วัตถุดิบที่ต้องการ</h1>
        <p className="mt-2 text-white/70">รวมรายการที่พนักงานขอสำหรับวันถัดไป</p>
      </section>

      <form className="grid gap-3 rounded-[1.75rem] border border-black/10 bg-white p-5 shadow-sm sm:grid-cols-[1fr_1fr_auto]" action="/orders">
        <div className="sm:col-span-3">
          <p className="mb-2 text-sm font-black text-black/60">ปุ่มลัดช่วงวันที่</p>
          <DateShortcuts basePath="/orders" />
        </div>
        <label className="block">
          <span className="mb-2 block font-black">วันที่เริ่มต้น</span>
          <input className="focus-ring min-h-14 w-full rounded-2xl border-2 border-black/10 px-4 text-lg font-bold" type="date" name="from" defaultValue={from} />
        </label>
        <label className="block">
          <span className="mb-2 block font-black">วันที่สิ้นสุด</span>
          <input className="focus-ring min-h-14 w-full rounded-2xl border-2 border-black/10 px-4 text-lg font-bold" type="date" name="to" defaultValue={to} />
        </label>
        <button className="focus-ring min-h-14 self-end rounded-2xl bg-[#ffc400] px-6 text-lg font-black text-black shadow-sm">ดูรายการ</button>
      </form>

      <section className="rounded-[1.75rem] border border-black/10 bg-white p-5 shadow-sm">
        <h2 className="text-2xl font-black">ช่วงวันที่ {formatThaiDate(from)} - {formatThaiDate(to)}</h2>
        <p className="mt-1 text-sm font-bold text-black/60">พบ {numberFormatter.format(reports.length)} รายการสั่งของ</p>
      </section>

      <div className="space-y-3">
        {reports.map((report) => (
          <article key={report.id} className="rounded-[1.5rem] border border-black/10 bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-start justify-between gap-3">
              <div>
                <h2 className="text-xl font-black">{report.branches?.name}</h2>
                <p className="text-sm font-bold text-black/50">ข้อมูลวันที่ {formatThaiDate(report.report_date)}</p>
              </div>
              <span className="rounded-full bg-[#ffc400] px-3 py-1 text-sm font-black">สั่งพรุ่งนี้</span>
            </div>
            <p className="whitespace-pre-wrap rounded-2xl bg-black/5 p-4 text-lg font-bold">{formatStructuredOrderItems(report)}</p>
          </article>
        ))}
      </div>
    </div>
  );
}
