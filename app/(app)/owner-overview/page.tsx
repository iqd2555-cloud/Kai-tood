import { redirect } from "next/navigation";
import { getCurrentProfile, isOwner } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { todayISO, moneyFormatter } from "@/lib/format";
import { MobileOwnerOverview } from "@/components/mobile-owner-overview";

type Rollup = { branch_name: string | null; branch_code: string | null; total_sales: number | string | null };
type Note = { note: string | null };

export default async function OwnerOverviewPage() {
  const profile = await getCurrentProfile();
  if (!isOwner(profile)) redirect("/dashboard");
  const supabase = await createSupabaseServerClient();
  if (!supabase) redirect("/login?setup=supabase");

  const today = todayISO();
  const [{ data: sales }, { data: notes }] = await Promise.all([
    supabase.from("daily_report_rollups").select("branch_name,branch_code,total_sales").eq("report_date", today).returns<Rollup[]>(),
    supabase.from("daily_reports").select("note").eq("report_date", today).not("note", "is", null).returns<Note[]>(),
  ]);

  const totalSales = (sales ?? []).reduce((sum, row) => sum + Number(row.total_sales ?? 0), 0);
  const branchProblemCount = (notes ?? []).filter((row) => row.note?.trim()).length;
  const branchMetrics = (sales ?? []).slice(0, 4).map((row) => ({
    label: row.branch_name || row.branch_code || "สาขา",
    value: moneyFormatter.format(Number(row.total_sales ?? 0)),
    status: "good" as const,
  }));

  const sections = [
    {
      icon: "💰",
      title: "วันนี้",
      href: "/cash-flow",
      metrics: [
        { label: "ยอดขาย", value: moneyFormatter.format(totalSales), status: "good" as const },
        { label: "เงินเข้า", value: "เปิดดู", status: "neutral" as const },
        { label: "เงินออก", value: "เปิดดู", status: "neutral" as const },
        { label: "กำไรประมาณ", value: moneyFormatter.format(totalSales * 0.35), status: "good" as const },
      ],
    },
    {
      icon: "🏪",
      title: "ร้าน",
      href: "/owner-dashboard",
      metrics: branchMetrics.length ? branchMetrics : [{ label: "ยอดขายสาขา", value: "ยังไม่มีรายงาน", status: "watch" as const }, { label: "ปัญหา", value: `${branchProblemCount}`, status: branchProblemCount ? "alert" as const : "good" as const }],
    },
    {
      icon: "👥",
      title: "คน",
      href: "/reports",
      metrics: [
        { label: "มาสาย / ขาด", value: "เปิดดู", status: "neutral" as const },
        { label: "KPI / งานค้าง", value: "เปิดดู", status: "neutral" as const },
      ],
    },
    {
      icon: "🏭",
      title: "โรงหมัก",
      href: "/marination",
      metrics: [
        { label: "สต็อก", value: "เปิดดู", status: "neutral" as const },
        { label: "ผลิต / ส่ง", value: "เปิดดู", status: "neutral" as const },
      ],
    },
    {
      icon: "🐔",
      title: "แฟรนไชส์",
      href: "/leads",
      metrics: [
        { label: "ผู้สมัครใหม่", value: "เปิดดู", status: "neutral" as const },
        { label: "รอพิจารณา / ชำระ", value: "เปิดดู", status: "neutral" as const },
      ],
    },
  ];

  return (
    <main className="mx-auto max-w-md space-y-3 pb-8">
      <div className="px-1">
        <p className="text-xs font-bold text-black/50">OWNER • วันนี้</p>
        <h1 className="text-2xl font-black">ภาพรวมร้าน</h1>
      </div>
      <MobileOwnerOverview sections={sections} />
      <div className="hidden md:block rounded-3xl bg-white p-6 text-center font-bold">หน้านี้ออกแบบสำหรับเปิดดูบนมือถือ</div>
    </main>
  );
}
