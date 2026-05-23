import { redirect } from "next/navigation";
import { getCurrentProfile, isOwner } from "@/lib/auth";
import { formatThaiDate, moneyFormatter, numberFormatter } from "@/lib/format";
import { formatStructuredOrderItems } from "@/lib/report-items";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import type { DailyReport } from "@/lib/types";

export default async function MyReportsPage() {
  const profile = await getCurrentProfile();
  if (isOwner(profile)) redirect("/reports");

  const supabase = await createSupabaseServerClient();
  if (!supabase) redirect("/login?setup=supabase");

  const { data } = await supabase.from("daily_reports").select("*").order("report_date", { ascending: false }).limit(60).returns<DailyReport[]>();
  const reports = data ?? [];

  return (
    <div className="space-y-4">
      <section className="rounded-[2rem] bg-[#111111] p-5 text-white shadow-xl">
        <p className="text-sm font-bold text-[#ffc400]">สำหรับพนักงาน</p>
        <h1 className="mt-2 text-3xl font-black">รายงานของฉัน</h1>
      </section>
      {reports.map((report) => (
        <article key={report.id} className="rounded-[1.5rem] border border-black/10 bg-white p-4 shadow-sm">
          <h2 className="text-lg font-black">{formatThaiDate(report.report_date)}</h2>
          <div className="mt-3 grid grid-cols-3 gap-2 text-center text-sm font-bold">
            <div className="rounded-xl bg-[#ffc400]/25 p-2">รวม {moneyFormatter.format(report.total_sales)}</div>
            <div className="rounded-xl bg-black/5 p-2">สด {moneyFormatter.format(report.cash_sales)}</div>
            <div className="rounded-xl bg-black/5 p-2">โอน {moneyFormatter.format(report.transfer_sales)}</div>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2 text-sm font-bold">
            <div className="rounded-xl bg-black/5 p-2">BL {numberFormatter.format(report.used_bl)}</div>
            <div className="rounded-xl bg-black/5 p-2">BB {numberFormatter.format(report.used_bb)}</div>
            <div className="rounded-xl bg-black/5 p-2">หนังไก่ {numberFormatter.format(report.used_chicken_skin)}</div>
            <div className="rounded-xl bg-black/5 p-2">น้ำมัน {numberFormatter.format(report.used_oil)}</div>
            <div className="rounded-xl bg-black/5 p-2">ข้าวเหนียว {numberFormatter.format(report.used_sticky_rice)}</div>
          </div>
          <p className="mt-3 whitespace-pre-wrap rounded-xl bg-black/5 p-3 text-sm font-bold">{formatStructuredOrderItems(report)}</p>
        </article>
      ))}
    </div>
  );
}
