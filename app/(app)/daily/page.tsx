import { redirect } from "next/navigation";
import { DailyForm } from "./daily-form";
import { getCurrentProfile, isOwner } from "@/lib/auth";
import { todayISO } from "@/lib/format";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import type { Branch, DailyReport } from "@/lib/types";
import { canAccessDailyInput } from "@/lib/marination-access";

export default async function DailyPage() {
  const profile = await getCurrentProfile();
  if (!canAccessDailyInput(profile)) redirect("/marination");
  const supabase = await createSupabaseServerClient();
  if (!supabase) redirect("/login?setup=supabase");

  const today = todayISO();

  const profileIsOwner = isOwner(profile);
  const branchesQuery = supabase.from("branches").select("*").order("name");
  if (!profileIsOwner && profile.branch_id)
    branchesQuery.eq("id", profile.branch_id);
  const { data: branchesData, error: branchesError } = await branchesQuery.returns<Branch[]>();
  if (branchesError) {
    console.error("daily_page_branches_load_failed", { userId: profile.id, error: branchesError });
    return <div className="rounded-2xl bg-red-50 p-4 font-bold text-red-900">โหลดรายชื่อสาขาไม่สำเร็จ: {branchesError.message}</div>;
  }
  const staffProfileBranch =
    !profileIsOwner && profile.branch_id
      ? {
          id: profile.branch_id,
          name: profile.branch_name ?? profile.branch?.name ?? "สาขาของคุณ",
        }
      : null;
  const branches = staffProfileBranch
    ? [
        {
          ...branchesData?.find(
            (branch) => branch.id === staffProfileBranch.id,
          ),
          id: staffProfileBranch.id,
          name: staffProfileBranch.name,
        },
      ]
    : (branchesData ?? []);
  const defaultBranchId = profileIsOwner
    ? (branches[0]?.id ?? "")
    : (profile.branch_id ?? "");

  const { data: existingReport, error: existingReportError } = await supabase
    .from("daily_reports")
    .select("*")
    .eq("report_date", today)
    .eq("branch_id", defaultBranchId)
    .maybeSingle();
  if (existingReportError) {
    console.error("daily_page_existing_report_load_failed", { branchId: defaultBranchId, reportDate: today, error: existingReportError });
    return <div className="rounded-2xl bg-red-50 p-4 font-bold text-red-900">โหลดรายงานวันนี้ไม่สำเร็จ: {existingReportError.message}</div>;
  }

  const { data: previousReport, error: previousReportError } = await supabase
    .from("daily_reports")
    .select("*")
    .eq("branch_id", defaultBranchId)
    .lt("report_date", today)
    .order("report_date", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (previousReportError) {
    console.error("daily_page_previous_report_load_failed", { branchId: defaultBranchId, beforeDate: today, error: previousReportError });
    return <div className="rounded-2xl bg-red-50 p-4 font-bold text-red-900">โหลดรายงานก่อนหน้าไม่สำเร็จ: {previousReportError.message}</div>;
  }

  return (
    <div className="space-y-5">
      {process.env.NODE_ENV === "development" && (
        <div className="rounded-full bg-[#E60012]/20 px-4 py-2 text-sm font-black text-black">
          Debug: DailyInputPage
        </div>
      )}
      <section className="rounded-[2rem] bg-[#111111] p-5 text-white shadow-xl">
        <p className="text-sm font-bold text-[#E60012]">สำหรับพนักงาน</p>
        <h1 className="mt-2 text-3xl font-black">กรอกข้อมูลประจำวัน</h1>
        <p className="mt-2 text-white/70">
          ปุ่มและช่องกรอกขนาดใหญ่ ใช้งานง่ายบนมือถือ Android และ iPhone
        </p>
      </section>
      <DailyForm
        branches={branches}
        defaultBranchId={defaultBranchId}
        reportDate={today}
        existingReport={existingReport as DailyReport | null}
        previousReport={previousReport as DailyReport | null}
        canSelectBranch={profileIsOwner}
      />
    </div>
  );
}
