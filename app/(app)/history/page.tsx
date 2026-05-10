import { redirect } from "next/navigation";
import { getCurrentProfile, isOwner } from "@/lib/auth";
import { formatThaiDate, moneyFormatter, numberFormatter } from "@/lib/format";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import type { DailyReport } from "@/lib/types";

export default async function HistoryPage() {
  const profile = await getCurrentProfile();
  if (!isOwner(profile)) redirect("/dashboard");

  const supabase = await createSupabaseServerClient();
  if (!supabase) redirect("/login?setup=supabase");

  const { data: reportsData } = await supabase
    .from("daily_reports")
    .select("*, branches(name, code, low_chicken_threshold, low_sticky_rice_threshold, low_oil_threshold)")
    .order("report_date", { ascending: false })
    .limit(60)
    .returns<DailyReport[]>();
  const reports = reportsData ?? [];

  return (
    <div className="space-y-5">
      <section className="rounded-[2rem] bg-[#111111] p-5 text-white shadow-xl">
        <p className="text-sm font-bold text-[#ffc400]">เจ้าของร้าน</p>
        <h1 className="mt-2 text-3xl font-black">สรุปย้อนหลัง</h1>
        <p className="mt-2 text-white/70">แสดงข้อมูลล่าสุด 60 รายการจากทุกสาขา</p>
      </section>
      <div className="space-y-3">
        {reports.map((report) => (
          <article key={report.id} className="rounded-[1.5rem] border border-black/10 bg-white p-4 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-xl font-black">{report.branches?.name}</h2>
                <p className="text-sm font-bold text-black/50">{formatThaiDate(report.report_date)}</p>
              </div>
              <div className="text-right text-xl font-black text-green-700">{moneyFormatter.format(report.total_sales)}</div>
            </div>
            <div className="mt-4 grid grid-cols-3 gap-2 text-center text-sm">
              <div className="rounded-2xl bg-black/5 p-3"><b>ไก่</b><br />{numberFormatter.format(report.remaining_chicken)}</div>
              <div className="rounded-2xl bg-black/5 p-3"><b>ข้าว</b><br />{numberFormatter.format(report.remaining_sticky_rice)}</div>
              <div className="rounded-2xl bg-black/5 p-3"><b>น้ำมัน</b><br />{numberFormatter.format(report.remaining_oil)}</div>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
