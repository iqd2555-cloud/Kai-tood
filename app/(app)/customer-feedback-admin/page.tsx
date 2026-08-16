import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/auth";
import { createSupabaseAdminClient } from "@/lib/supabase-admin";
import { updateFeedbackStatus } from "./actions";

export const dynamic = "force-dynamic";

const typeLabel: Record<string, string> = {
  complaint: "แจ้งปัญหา",
  suggestion: "ข้อเสนอแนะ",
  compliment: "ชื่นชมพนักงาน",
};

const statusLabel: Record<string, string> = {
  received: "รับเรื่องแล้ว",
  investigating: "กำลังตรวจสอบ",
  resolved: "ดำเนินการแล้ว",
  closed: "ปิดเรื่อง",
};

export default async function CustomerFeedbackAdminPage() {
  const profile = await getCurrentProfile();
  if (profile.role !== "owner") redirect("/");

  const supabase = createSupabaseAdminClient();
  const { data, error } = supabase
    ? await supabase
        .from("customer_feedback")
        .select("id,case_number,branch_name,service_date,service_time,feedback_type,details,customer_name,customer_contact,status,admin_note,created_at")
        .order("created_at", { ascending: false })
        .limit(200)
    : { data: [], error: null };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-black text-slate-950">เสียงจากลูกค้า</h1>
        <p className="mt-1 text-sm text-slate-600">ตรวจสอบข้อร้องเรียน ข้อเสนอแนะ และคำชมจากทุกสาขา</p>
      </div>

      {error && <div className="rounded-xl bg-red-50 p-4 text-sm text-red-700">โหลดข้อมูลไม่สำเร็จ: {error.message}</div>}
      {!error && (data ?? []).length === 0 && <div className="rounded-2xl border border-slate-200 bg-white p-6 text-slate-600">ยังไม่มีรายการ</div>}

      <div className="space-y-4">
        {(data ?? []).map((item) => (
          <article key={item.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="font-black text-slate-950">{item.case_number}</div>
                <div className="mt-1 text-sm text-slate-600">{item.branch_name} · {item.service_date}{item.service_time ? ` · ${String(item.service_time).slice(0,5)} น.` : ""}</div>
              </div>
              <div className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">
                {typeLabel[item.feedback_type] ?? item.feedback_type}
              </div>
            </div>

            <p className="mt-4 whitespace-pre-wrap text-sm leading-6 text-slate-800">{item.details}</p>

            {(item.customer_name || item.customer_contact) && (
              <div className="mt-4 rounded-xl bg-slate-50 p-3 text-sm text-slate-600">
                ผู้แจ้ง: {item.customer_name || "ไม่ระบุชื่อ"}{item.customer_contact ? ` · ${item.customer_contact}` : ""}
              </div>
            )}

            <form action={updateFeedbackStatus} className="mt-4 grid gap-3 sm:grid-cols-[180px_1fr_auto] sm:items-end">
              <input type="hidden" name="id" value={item.id} />
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-600">สถานะ</label>
                <select name="status" defaultValue={item.status} className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm">
                  {Object.entries(statusLabel).map(([value,label]) => <option key={value} value={value}>{label}</option>)}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-600">บันทึกการตรวจสอบ</label>
                <input name="admin_note" defaultValue={item.admin_note ?? ""} maxLength={3000} placeholder="เช่น ตรวจกล้องแล้ว เวลา 07:42 น. ..." className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm" />
              </div>
              <button className="rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-bold text-white">บันทึก</button>
            </form>
          </article>
        ))}
      </div>
    </div>
  );
}
