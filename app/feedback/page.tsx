import type { Metadata } from "next";
import FeedbackForm from "./feedback-form";
import { createSupabaseAdminClient } from "@/lib/supabase-admin";
import { isReportableBranch } from "@/lib/branches";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "ความคิดเห็นและการบริการลูกค้า",
  description: "แจ้งปัญหา ข้อเสนอแนะ หรือชื่นชมการบริการ",
};

export default async function FeedbackPage() {
  const supabase = createSupabaseAdminClient();
  const { data } = supabase
    ? await supabase.from("branches").select("id,name,code,is_active").order("name")
    : { data: [] };

  const branches = (data ?? [])
    .filter(isReportableBranch)
    .map((branch) => ({ id: String(branch.id), name: String(branch.name ?? "") }))
    .filter((branch) => branch.name);

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 sm:py-12">
      <div className="mx-auto max-w-2xl">
        <div className="mb-6 text-center">
          <p className="text-sm font-bold tracking-wide text-red-700">เหนียวไก่เยอะโคตรอินสไปร์</p>
          <h1 className="mt-2 text-3xl font-black text-slate-950">ความคิดเห็นและการบริการลูกค้า</h1>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-slate-600">
            หากพบปัญหาการบริการ มีข้อเสนอแนะ หรืออยากชื่นชมพนักงาน บอกเราได้โดยตรง ข้อมูลของคุณจะช่วยให้เราตรวจสอบและพัฒนาการบริการให้ดีขึ้น
          </p>
        </div>
        <FeedbackForm branches={branches} />
      </div>
    </main>
  );
}
