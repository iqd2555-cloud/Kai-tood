import { redirect } from "next/navigation";
import { getCurrentProfile, isOwner } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import type { FranchiseLead, LeadStatus } from "@/lib/types";
import { updateLead } from "./actions";

const statusLabels: Record<LeadStatus, string> = { new: "ใหม่", contacted: "ติดต่อแล้ว", qualified: "ผ่านคัดกรอง", not_qualified: "ไม่ผ่าน", pending_payment: "รอชำระเงิน", converted: "เป็นแฟรนไชส์แล้ว" };
const statuses = Object.keys(statusLabels) as LeadStatus[];

type SearchParams = { status?: string; q?: string };

function formatDate(value: string) {
  return new Intl.DateTimeFormat("th-TH", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Bangkok" }).format(new Date(value));
}

export default async function LeadsPage({ searchParams }: { searchParams?: Promise<SearchParams> }) {
  const profile = await getCurrentProfile();
  if (!isOwner(profile)) redirect("/dashboard");
  const params = await searchParams;
  const status = statuses.includes(params?.status as LeadStatus) ? (params?.status as LeadStatus) : "";
  const q = params?.q?.trim() ?? "";
  const supabase = await createSupabaseServerClient();
  if (!supabase) redirect("/login?setup=supabase");

  let query = supabase.from("franchise_leads").select("*");
  if (status) query = query.eq("status", status);
  if (q) query = query.or(`full_name.ilike.%${q}%,phone.ilike.%${q}%,province.ilike.%${q}%`);
  const { data, error } = await query.order("created_at", { ascending: false }).returns<FranchiseLead[]>();
  const leads = data ?? [];

  return (
    <div className="space-y-5">
      <div><h1 className="text-3xl font-black">รายชื่อผู้สนใจแฟรนไชส์</h1><p className="mt-1 font-bold text-black/55">ดู ค้นหา และอัปเดตสถานะ Lead จากเว็บไซต์</p></div>
      <form className="grid gap-3 rounded-[1.5rem] bg-white p-4 shadow-sm sm:grid-cols-[1fr_220px_auto]">
        <input name="q" defaultValue={q} placeholder="ค้นหาชื่อ เบอร์โทร จังหวัด" className="rounded-2xl border border-black/10 px-4 py-3 font-bold" />
        <select name="status" defaultValue={status} className="rounded-2xl border border-black/10 px-4 py-3 font-bold"><option value="">ทุกสถานะ</option>{statuses.map((s) => <option key={s} value={s}>{statusLabels[s]}</option>)}</select>
        <button className="rounded-2xl bg-[#111111] px-5 py-3 font-black text-white">ค้นหา</button>
      </form>
      {error && <div className="rounded-2xl bg-red-50 p-4 font-bold text-red-700">โหลดข้อมูลไม่สำเร็จ: {error.message}</div>}
      <div className="space-y-4">
        {leads.map((lead) => (
          <article key={lead.id} className="rounded-[1.5rem] border border-black/10 bg-white p-5 shadow-sm">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div><h2 className="text-xl font-black">{lead.full_name}</h2><p className="font-bold text-black/60">{lead.phone} • {lead.province}{lead.district ? ` / ${lead.district}` : ""}</p><p className="mt-1 text-sm font-bold text-black/45">ส่งเมื่อ {formatDate(lead.created_at)}</p></div><span className="w-fit rounded-full bg-[#ffc400] px-3 py-1 text-sm font-black">{statusLabels[lead.status]}</span></div>
            <dl className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
              <div><b>Line:</b> {lead.line_id || "-"}</div>
              <div><b>จังหวัด/อำเภอ:</b> {lead.province}{lead.district ? ` / ${lead.district}` : ""}</div>
              <div><b>มีทำเล:</b> {lead.has_location}</div>
              <div><b>ประเภททำเล:</b> {lead.location_type}</div>
              <div><b>งบ:</b> {lead.budget_range}</div>
              <div><b>ทุนสำรอง:</b> {lead.working_capital}</div>
              <div><b>เวลา:</b> {lead.available_time_per_day}</div>
              <div><b>ประสบการณ์:</b> {lead.business_experience}</div>
              <div><b>รายได้คาดหวัง:</b> {lead.expected_daily_income}</div>
              <div><b>ยืนยันความเข้าใจ:</b> {lead.understanding_confirmed ? "ยืนยันแล้ว" : "ยังไม่ยืนยัน"}</div>
            </dl>
            {lead.note && <p className="mt-3 text-sm"><b>หมายเหตุผู้สมัคร:</b> {lead.note}</p>}
            <form action={updateLead} className="mt-4 grid gap-3 border-t border-black/10 pt-4 sm:grid-cols-[220px_1fr_auto]"><input type="hidden" name="id" value={lead.id} /><select name="status" defaultValue={lead.status} className="rounded-2xl border border-black/10 px-4 py-3 font-bold">{statuses.map((s) => <option key={s} value={s}>{statusLabels[s]}</option>)}</select><input name="internal_note" defaultValue={lead.internal_note ?? ""} placeholder="บันทึกภายใน" className="rounded-2xl border border-black/10 px-4 py-3 font-bold" /><button className="rounded-2xl bg-[#ffc400] px-5 py-3 font-black text-black">บันทึก</button></form>
          </article>
        ))}
        {leads.length === 0 && <div className="rounded-[1.5rem] bg-white p-6 text-center font-black text-black/50">ยังไม่มีข้อมูลตามเงื่อนไขนี้</div>}
      </div>
    </div>
  );
}
