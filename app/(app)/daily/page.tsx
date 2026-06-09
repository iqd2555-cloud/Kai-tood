import { redirect } from "next/navigation";
import { DailyForm } from "./daily-form";
import { getCurrentProfile, isOwner } from "@/lib/auth";
import { canUseStaffCounterOrder } from "@/lib/counter-access";
import { todayISO } from "@/lib/format";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import type { Branch, DailyReport } from "@/lib/types";

export default async function DailyPage() {
  const profile = await getCurrentProfile();
  if (canUseStaffCounterOrder(profile)) redirect("/counter-orders");
  const supabase = await createSupabaseServerClient();
  if (!supabase) redirect("/login?setup=supabase");

  const today = todayISO();

  const profileIsOwner = isOwner(profile);
  const branchesQuery = supabase.from("branches").select("*").order("name");
  if (!profileIsOwner && profile.branch_id) branchesQuery.eq("id", profile.branch_id);
  const { data: branchesData } = await branchesQuery.returns<Branch[]>();
  const staffProfileBranch =
    !profileIsOwner && profile.branch_id
      ? { id: profile.branch_id, name: profile.branch_name ?? profile.branch?.name ?? "สาขาของคุณ" }
      : null;
  const branches = staffProfileBranch
    ? [
        {
          ...branchesData?.find((branch) => branch.id === staffProfileBranch.id),
          id: staffProfileBranch.id,
          name: staffProfileBranch.name,
        },
      ]
    : branchesData ?? [];
  const defaultBranchId = profileIsOwner ? branches[0]?.id ?? "" : profile.branch_id ?? "";

  const { data: existingReport } = await supabase
    .from("daily_reports")
    .select("*")
    .eq("report_date", today)
    .eq("branch_id", defaultBranchId)
    .maybeSingle();

  return (
    <div className="space-y-5">
      <section className="rounded-[2rem] bg-[#111111] p-5 text-white shadow-xl">
        <p className="text-sm font-bold text-[#ffc400]">สำหรับพนักงาน</p>
        <h1 className="mt-2 text-3xl font-black">กรอกข้อมูลประจำวัน</h1>
        <p className="mt-2 text-white/70">ปุ่มและช่องกรอกขนาดใหญ่ ใช้งานง่ายบนมือถือ Android และ iPhone</p>
      </section>
      <DailyForm branches={branches} defaultBranchId={defaultBranchId} reportDate={today} existingReport={existingReport as DailyReport | null} canSelectBranch={profileIsOwner} />
    </div>
  );
}
