import { redirect } from "next/navigation";
import { getCurrentProfile, isOwner } from "@/lib/auth";
import { formatThaiDate } from "@/lib/format";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import type { DailyReport } from "@/lib/types";

export default async function OrdersPage() {
  const profile = await getCurrentProfile();
  if (!isOwner(profile)) redirect("/dashboard");

  const supabase = await createSupabaseServerClient();
  const { data: reportsData } = await supabase
    .from("daily_reports")
    .select("*, branches(name, code, low_chicken_threshold, low_sticky_rice_threshold, low_oil_threshold)")
    .neq("requested_items", "")
    .order("report_date", { ascending: false })
    .limit(50)
    .returns<DailyReport[]>();
  const reports = reportsData ?? [];

  return (
    <div className="space-y-5">
      <section className="rounded-[2rem] bg-[#111111] p-5 text-white shadow-xl">
        <p className="text-sm font-bold text-[#ffc400]">รายการสั่งของ</p>
        <h1 className="mt-2 text-3xl font-black">วัตถุดิบที่ต้องการ</h1>
        <p className="mt-2 text-white/70">รวมรายการที่พนักงานขอสำหรับวันถัดไป</p>
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
            <p className="whitespace-pre-wrap rounded-2xl bg-black/5 p-4 text-lg font-bold">{report.requested_items}</p>
          </article>
        ))}
      </div>
    </div>
  );
}
